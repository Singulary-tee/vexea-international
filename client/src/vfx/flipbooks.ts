/**
 * flipbooks.ts
 * High-performance, authoritative WebGPU TSL flipbook and static composite VFX system.
 * Zero-GC at 60Hz: preallocated typed arrays, static scratch math, single-billboard event pools.
 */

import * as THREE from "three/webgpu";
import {
  uv,
  float,
  vec2,
  vec4,
  mix,
  smoothstep,
  uniform,
  texture,
  floor,
  mod,
  clamp,
} from "three/tsl";
import { VFX_CONSTANTS } from "./constants";
import { getAssetUrl } from "../../asset-cache";

// Module-level preallocated math scratchpads (Strict Zero-GC)
const _fbPos = new THREE.Vector3();
const _fbQuat = new THREE.Quaternion();
const _fbScale = new THREE.Vector3();
const _fbRotQuat = new THREE.Quaternion();
const _fbZAxis = new THREE.Vector3(0, 0, 1);
const _fbNormal = new THREE.Vector3();
const _fbTempVec = new THREE.Vector3();

// Flipbook individual billboard descriptor
interface FlipbookBillboard {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicNodeMaterial;
  progressUniform: any;
  alphaUniform: any;
  duration: number;
  frameCount: number;
  cols: number;
  rows: number;
  isLuminanceKeyed: boolean;
}

// Pool item
interface FlipbookSlot {
  billboard: FlipbookBillboard;
  active: boolean;
  life: number;
  maxLife: number;
  scale: number;
  rotZ: number;
  posX: number;
  posY: number;
  posZ: number;
}

// Pools for each gameplay event category
let impactPool: FlipbookSlot[] = [];
let explosionPool: FlipbookSlot[] = [];
let muzzlePool: FlipbookSlot[] = [];
let firePool: FlipbookSlot[] = [];

// Static composite layers
let staticFlareMesh: THREE.Mesh | null = null;
let staticFlareMat: THREE.MeshBasicNodeMaterial | null = null;
let staticFlareLife = 0;
let staticFlareMaxLife = 0.06;

let _scene: THREE.Scene | null = null;
let _billboardGeom: THREE.PlaneGeometry | null = null;

// Texture cache to prevent redundant fetches
const textureCache = new Map<string, THREE.Texture>();

function getOrCreateTexture(key: string): THREE.Texture {
  let tex = textureCache.get(key);
  if (!tex) {
    const url = getAssetUrl(key, "Image");
    tex = new THREE.TextureLoader().load(url);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    textureCache.set(key, tex);
  }
  return tex;
}

/**
 * Creates a dedicated TSL Node Material for a given flipbook spritesheet.
 * Includes half-texel insets to eliminate neighbor bleed and optional luminance-keyed alpha.
 */
function createFlipbookMaterial(
  texKey: string,
  cols: number,
  rows: number,
  frameCount: number,
  isLuminanceKeyed: boolean,
  isAdditive: boolean
): { material: THREE.MeshBasicNodeMaterial; progressUniform: any; alphaUniform: any } {
  const tex = getOrCreateTexture(texKey);
  const material = new THREE.MeshBasicNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.side = THREE.DoubleSide;
  if (isAdditive) {
    material.blending = THREE.AdditiveBlending;
  }

  const progressUniform = uniform(0.0);
  const alphaUniform = uniform(1.0);

  const uCols = float(cols);
  const uRows = float(rows);
  const uFrameCount = float(frameCount);

  // Compute frame index [0 .. frameCount - 1]
  const currentFrame = floor(progressUniform.mul(uFrameCount.sub(float(1.0))).clamp(float(0.0), uFrameCount.sub(float(1.0))));
  const colIndex = mod(currentFrame, uCols);
  const rowIndex = floor(currentFrame.div(uCols));

  // Half-texel clamp inside each cell to avoid atlas bleed
  const cellUv = uv();
  const clampedCellU = clamp(cellUv.x, float(0.002), float(0.998));
  const clampedCellV = clamp(cellUv.y, float(0.002), float(0.998));

  // Map to global sheet coordinates (Row 0 is top)
  const sheetU = clampedCellU.add(colIndex).div(uCols);
  const sheetV = float(1.0).sub(rowIndex.add(float(1.0)).sub(clampedCellV).div(uRows));

  const texColor = texture(tex, vec2(sheetU, sheetV));

  if (isLuminanceKeyed) {
    // Luminance-keyed alpha for fire_01 - fire_04 black background correction
    const lum = texColor.r.mul(0.299).add(texColor.g.mul(0.587)).add(texColor.b.mul(0.114));
    const lumAlpha = smoothstep(float(0.03), float(0.18), lum);
    const finalAlpha = texColor.a.mul(lumAlpha).mul(alphaUniform);
    material.colorNode = vec4(texColor.rgb, finalAlpha);
  } else {
    material.colorNode = vec4(texColor.rgb, texColor.a.mul(alphaUniform));
  }

  return { material, progressUniform, alphaUniform };
}

function createBillboard(
  texKey: string,
  cols: number,
  rows: number,
  frameCount: number,
  duration: number,
  isLuminanceKeyed: boolean,
  isAdditive: boolean,
  baseSize: number
): FlipbookBillboard {
  if (!_billboardGeom) {
    _billboardGeom = new THREE.PlaneGeometry(1, 1);
  }

  const { material, progressUniform, alphaUniform } = createFlipbookMaterial(
    texKey,
    cols,
    rows,
    frameCount,
    isLuminanceKeyed,
    isAdditive
  );

  const mesh = new THREE.Mesh(_billboardGeom, material);
  mesh.name = `VFX_FB_${texKey}`;
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.scale.set(baseSize, baseSize, baseSize);

  return {
    mesh,
    material,
    progressUniform,
    alphaUniform,
    duration,
    frameCount,
    cols,
    rows,
    isLuminanceKeyed,
  };
}

/**
 * Initialize all flipbook pools according to visual preset (High/Medium/Low)
 */
export function initFlipbooks(scene: THREE.Scene, presetName: "HIGH" | "MEDIUM" | "LOW" = "HIGH") {
  _scene = scene;
  clearFlipbooks();

  const cfg = VFX_CONSTANTS.FLIPBOOKS.POOLS[presetName] || VFX_CONSTANTS.FLIPBOOKS.POOLS.HIGH;
  const entries = VFX_CONSTANTS.FLIPBOOKS.ENTRIES;

  // 1. IMPACT DUST / SMOKE POOL (wispy_smoke_01, wispy_smoke_02, cloud_01)
  const impactKeys = [entries.wispy_smoke_01, entries.wispy_smoke_02, entries.cloud_01];
  for (let i = 0; i < cfg.impactSlots; i++) {
    const entry = impactKeys[i % impactKeys.length];
    const bb = createBillboard(
      entry.key,
      entry.cols,
      entry.rows,
      entry.frameCount,
      entry.duration,
      entry.luminanceKeyed,
      entry.additive,
      VFX_CONSTANTS.FLIPBOOKS.DEFAULT_SIZES.IMPACT_SMOKE
    );
    scene.add(bb.mesh);
    impactPool.push({
      billboard: bb,
      active: false,
      life: 0,
      maxLife: entry.duration,
      scale: 1.0,
      rotZ: 0,
      posX: 0,
      posY: 0,
      posZ: 0,
    });
  }

  // 2. EXPLOSION POOL (explosion_01, explosion_02, explosion_smoke_01)
  const expKeys = [entries.explosion_01, entries.explosion_02, entries.explosion_smoke_01];
  for (let i = 0; i < cfg.explosionSlots; i++) {
    const entry = expKeys[i % expKeys.length];
    const bb = createBillboard(
      entry.key,
      entry.cols,
      entry.rows,
      entry.frameCount,
      entry.duration,
      entry.luminanceKeyed,
      entry.additive,
      VFX_CONSTANTS.FLIPBOOKS.DEFAULT_SIZES.EXPLOSION
    );
    scene.add(bb.mesh);
    explosionPool.push({
      billboard: bb,
      active: false,
      life: 0,
      maxLife: entry.duration,
      scale: 1.0,
      rotZ: 0,
      posX: 0,
      posY: 0,
      posZ: 0,
    });
  }

  // 3. MUZZLE FLASH POOL (muzzle_flash_01_5frame_q90.webp)
  const muzzleEntry = entries.muzzle_flash_01;
  for (let i = 0; i < cfg.muzzleSlots; i++) {
    const bb = createBillboard(
      muzzleEntry.key,
      muzzleEntry.cols,
      muzzleEntry.rows,
      muzzleEntry.frameCount,
      muzzleEntry.duration,
      muzzleEntry.luminanceKeyed,
      muzzleEntry.additive,
      VFX_CONSTANTS.FLIPBOOKS.DEFAULT_SIZES.MUZZLE
    );
    scene.add(bb.mesh);
    muzzlePool.push({
      billboard: bb,
      active: false,
      life: 0,
      maxLife: muzzleEntry.duration,
      scale: 1.0,
      rotZ: 0,
      posX: 0,
      posY: 0,
      posZ: 0,
    });
  }

  // 4. FIRE & FLAME POOL (fire_01, flame_01)
  const fireKeys = [entries.fire_01, entries.flame_01];
  for (let i = 0; i < cfg.fireSlots; i++) {
    const entry = fireKeys[i % fireKeys.length];
    const bb = createBillboard(
      entry.key,
      entry.cols,
      entry.rows,
      entry.frameCount,
      entry.duration,
      entry.luminanceKeyed,
      entry.additive,
      VFX_CONSTANTS.FLIPBOOKS.DEFAULT_SIZES.FIRE
    );
    scene.add(bb.mesh);
    firePool.push({
      billboard: bb,
      active: false,
      life: 0,
      maxLife: entry.duration,
      scale: 1.0,
      rotZ: 0,
      posX: 0,
      posY: 0,
      posZ: 0,
    });
  }

  // 5. STATIC FLARE COMPOSITE LAYER (flare_01_a.webp)
  if (cfg.enableStaticLayers) {
    const flareTex = getOrCreateTexture(VFX_CONSTANTS.FLIPBOOKS.STATIC_LAYERS.flare);
    staticFlareMat = new THREE.MeshBasicNodeMaterial();
    staticFlareMat.transparent = true;
    staticFlareMat.blending = THREE.AdditiveBlending;
    staticFlareMat.depthWrite = false;
    staticFlareMat.side = THREE.DoubleSide;
    const flareTexNode = texture(flareTex);
    staticFlareMat.colorNode = vec4(flareTexNode.rgb.mul(1.5), flareTexNode.a);

    staticFlareMesh = new THREE.Mesh(_billboardGeom || new THREE.PlaneGeometry(1, 1), staticFlareMat);
    staticFlareMesh.name = "VFX_Static_Flare";
    staticFlareMesh.frustumCulled = false;
    staticFlareMesh.visible = false;
    scene.add(staticFlareMesh);
  }
}

/**
 * Trigger an impact smoke/dust flipbook event (1 single billboard per hit)
 */
export function triggerImpactFlipbook(x: number, y: number, z: number, nx = 0, ny = 1, nz = 0, scale = 1.0) {
  let slot: FlipbookSlot | null = null;
  for (let i = 0; i < impactPool.length; i++) {
    if (!impactPool[i].active) {
      slot = impactPool[i];
      break;
    }
  }
  if (!slot && impactPool.length > 0) {
    slot = impactPool[0]; // Recycle
  }
  if (!slot) return;

  slot.active = true;
  slot.life = slot.maxLife;
  slot.scale = scale;
  slot.rotZ = Math.random() * Math.PI * 2;
  // Offset slightly along surface normal
  slot.posX = x + nx * 0.05;
  slot.posY = y + ny * 0.05;
  slot.posZ = z + nz * 0.05;

  slot.billboard.mesh.position.set(slot.posX, slot.posY, slot.posZ);
  slot.billboard.progressUniform.value = 0.0;
  slot.billboard.alphaUniform.value = 1.0;
  slot.billboard.mesh.visible = true;
}

/**
 * Trigger an explosion flipbook event (1 single billboard per explosion)
 */
export function triggerExplosionFlipbook(x: number, y: number, z: number, scale = 1.0) {
  let slot: FlipbookSlot | null = null;
  for (let i = 0; i < explosionPool.length; i++) {
    if (!explosionPool[i].active) {
      slot = explosionPool[i];
      break;
    }
  }
  if (!slot && explosionPool.length > 0) {
    slot = explosionPool[0]; // Recycle
  }
  if (!slot) return;

  slot.active = true;
  slot.life = slot.maxLife;
  slot.scale = scale;
  slot.rotZ = Math.random() * Math.PI * 2;
  slot.posX = x;
  slot.posY = y;
  slot.posZ = z;

  slot.billboard.mesh.position.set(x, y, z);
  slot.billboard.progressUniform.value = 0.0;
  slot.billboard.alphaUniform.value = 1.0;
  slot.billboard.mesh.visible = true;
}

/**
 * Trigger a muzzle flash flipbook event (1 single billboard per weapon shot)
 */
export function triggerMuzzleFlipbook(x: number, y: number, z: number, scale = 1.0) {
  let slot: FlipbookSlot | null = null;
  for (let i = 0; i < muzzlePool.length; i++) {
    if (!muzzlePool[i].active) {
      slot = muzzlePool[i];
      break;
    }
  }
  if (!slot && muzzlePool.length > 0) {
    slot = muzzlePool[0]; // Recycle
  }
  if (!slot) return;

  slot.active = true;
  slot.life = slot.maxLife;
  slot.scale = scale;
  slot.rotZ = (Math.random() - 0.5) * 0.5;
  slot.posX = x;
  slot.posY = y;
  slot.posZ = z;

  slot.billboard.mesh.position.set(x, y, z);
  slot.billboard.progressUniform.value = 0.0;
  slot.billboard.alphaUniform.value = 1.0;
  slot.billboard.mesh.visible = true;

  // Also trigger static flare layer if available
  if (staticFlareMesh) {
    staticFlareMesh.position.set(x, y, z);
    staticFlareMesh.scale.set(0.4 * scale, 0.4 * scale, 0.4 * scale);
    staticFlareMesh.visible = true;
    staticFlareLife = staticFlareMaxLife;
  }
}

/**
 * Trigger an environmental fire/flame flipbook event
 */
export function triggerFireFlipbook(x: number, y: number, z: number, scale = 1.0) {
  let slot: FlipbookSlot | null = null;
  for (let i = 0; i < firePool.length; i++) {
    if (!firePool[i].active) {
      slot = firePool[i];
      break;
    }
  }
  if (!slot && firePool.length > 0) {
    slot = firePool[0]; // Recycle
  }
  if (!slot) return;

  slot.active = true;
  slot.life = slot.maxLife;
  slot.scale = scale;
  slot.rotZ = (Math.random() - 0.5) * 0.2;
  slot.posX = x;
  slot.posY = y;
  slot.posZ = z;

  slot.billboard.mesh.position.set(x, y, z);
  slot.billboard.progressUniform.value = 0.0;
  slot.billboard.alphaUniform.value = 1.0;
  slot.billboard.mesh.visible = true;
}

/**
 * 60Hz Zero-GC Update loop for all active flipbooks
 */
export function updateFlipbooks(deltaTime: number, camera: THREE.PerspectiveCamera) {
  const camQuat = camera.quaternion;

  // 1. Update Impacts
  for (let i = 0; i < impactPool.length; i++) {
    const slot = impactPool[i];
    if (!slot.active) continue;

    slot.life -= deltaTime;
    if (slot.life <= 0) {
      slot.active = false;
      slot.billboard.mesh.visible = false;
      continue;
    }

    const progress = 1.0 - slot.life / slot.maxLife; // 0.0 -> 1.0
    slot.billboard.progressUniform.value = progress;
    // Smooth fadeout during final 30% of life
    slot.billboard.alphaUniform.value = progress > 0.7 ? (1.0 - progress) / 0.3 : 1.0;

    // Face camera + roll
    _fbRotQuat.setFromAxisAngle(_fbZAxis, slot.rotZ);
    _fbQuat.copy(camQuat).multiply(_fbRotQuat);
    slot.billboard.mesh.quaternion.copy(_fbQuat);

    // Expand gently over life
    const curSize = VFX_CONSTANTS.FLIPBOOKS.DEFAULT_SIZES.IMPACT_SMOKE * slot.scale * (1.0 + progress * 0.6);
    slot.billboard.mesh.scale.set(curSize, curSize, curSize);
  }

  // 2. Update Explosions
  for (let i = 0; i < explosionPool.length; i++) {
    const slot = explosionPool[i];
    if (!slot.active) continue;

    slot.life -= deltaTime;
    if (slot.life <= 0) {
      slot.active = false;
      slot.billboard.mesh.visible = false;
      continue;
    }

    const progress = 1.0 - slot.life / slot.maxLife;
    slot.billboard.progressUniform.value = progress;
    slot.billboard.alphaUniform.value = progress > 0.8 ? (1.0 - progress) / 0.2 : 1.0;

    _fbRotQuat.setFromAxisAngle(_fbZAxis, slot.rotZ);
    _fbQuat.copy(camQuat).multiply(_fbRotQuat);
    slot.billboard.mesh.quaternion.copy(_fbQuat);

    const curSize = VFX_CONSTANTS.FLIPBOOKS.DEFAULT_SIZES.EXPLOSION * slot.scale * (1.0 + progress * 0.4);
    slot.billboard.mesh.scale.set(curSize, curSize, curSize);
  }

  // 3. Update Muzzle Flashes
  for (let i = 0; i < muzzlePool.length; i++) {
    const slot = muzzlePool[i];
    if (!slot.active) continue;

    slot.life -= deltaTime;
    if (slot.life <= 0) {
      slot.active = false;
      slot.billboard.mesh.visible = false;
      continue;
    }

    const progress = 1.0 - slot.life / slot.maxLife;
    slot.billboard.progressUniform.value = progress;
    slot.billboard.alphaUniform.value = 1.0 - progress;

    _fbRotQuat.setFromAxisAngle(_fbZAxis, slot.rotZ);
    _fbQuat.copy(camQuat).multiply(_fbRotQuat);
    slot.billboard.mesh.quaternion.copy(_fbQuat);

    const curSize = VFX_CONSTANTS.FLIPBOOKS.DEFAULT_SIZES.MUZZLE * slot.scale;
    slot.billboard.mesh.scale.set(curSize, curSize, curSize);
  }

  // 4. Update Fire / Flames
  for (let i = 0; i < firePool.length; i++) {
    const slot = firePool[i];
    if (!slot.active) continue;

    slot.life -= deltaTime;
    if (slot.life <= 0) {
      slot.active = false;
      slot.billboard.mesh.visible = false;
      continue;
    }

    const progress = 1.0 - slot.life / slot.maxLife;
    slot.billboard.progressUniform.value = progress;
    slot.billboard.alphaUniform.value = progress > 0.75 ? (1.0 - progress) / 0.25 : 1.0;

    _fbRotQuat.setFromAxisAngle(_fbZAxis, slot.rotZ);
    _fbQuat.copy(camQuat).multiply(_fbRotQuat);
    slot.billboard.mesh.quaternion.copy(_fbQuat);

    const curSize = VFX_CONSTANTS.FLIPBOOKS.DEFAULT_SIZES.FIRE * slot.scale;
    slot.billboard.mesh.scale.set(curSize, curSize, curSize);
  }

  // 5. Update Static Flare
  if (staticFlareMesh && staticFlareMesh.visible) {
    staticFlareLife -= deltaTime;
    if (staticFlareLife <= 0) {
      staticFlareMesh.visible = false;
    } else {
      staticFlareMesh.quaternion.copy(camQuat);
    }
  }
}

/**
 * Clear and dispose all flipbook meshes and materials
 */
export function clearFlipbooks() {
  const allPools = [impactPool, explosionPool, muzzlePool, firePool];
  for (let p = 0; p < allPools.length; p++) {
    const pool = allPools[p];
    for (let i = 0; i < pool.length; i++) {
      const slot = pool[i];
      slot.active = false;
      if (slot.billboard.mesh) {
        slot.billboard.mesh.visible = false;
        _scene?.remove(slot.billboard.mesh);
        slot.billboard.material.dispose();
      }
    }
    pool.length = 0;
  }

  if (staticFlareMesh) {
    staticFlareMesh.visible = false;
    _scene?.remove(staticFlareMesh);
    staticFlareMat?.dispose();
    staticFlareMesh = null;
    staticFlareMat = null;
  }

  if (_billboardGeom) {
    _billboardGeom.dispose();
    _billboardGeom = null;
  }
}
