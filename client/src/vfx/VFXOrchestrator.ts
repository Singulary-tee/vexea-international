import * as THREE from "three/webgpu";
import { uv, float, smoothstep, length as tslLength, vec2, vec4, mix, texture } from "three/tsl";
import { getSettings } from "../../settings";
import { MatchController } from "../../MatchController";
import { getAssetUrl } from "../../asset-cache";

// Import modular VFX components
import { initFiringVFX, triggerNiagaraFlash, updateFiringVFX, clearFiringVFX, getFirstNiagaraFlash } from "./firing";
import { initHitsVFX, spawnImpactSparks as hitsSpawnSparks, spawnEnvironmentDecalAndDust as hitsSpawnDecal, updateHitsVFX, clearHitsVFX, sparkBatch as hitsSparkBatch, dustBatch as hitsDustBatch, decalBatch as hitsDecalBatch, decalBatches as hitsDecalBatches, sparkActive as hitsSparkActive, dustActive as hitsDustActive } from "./hits";
import { initLargeVFX, triggerExplosion as largeTriggerExplosion, updateLargeVFX, clearLargeVFX } from "./large";
import {
  initFlipbooks,
  triggerImpactFlipbook,
  triggerExplosionFlipbook,
  triggerMuzzleFlipbook,
  triggerFireFlipbook,
  updateFlipbooks,
  clearFlipbooks
} from "./flipbooks";
import { VFX_CONSTANTS } from "./constants";

// Pre-allocated math objects for Zero-GC loops
const _vfxPos = new THREE.Vector3();
const _vfxDir = new THREE.Vector3();
const _vfxUp = new THREE.Vector3();
const _vfxRight = new THREE.Vector3();
const _vfxCamFwd = new THREE.Vector3();
const _vfxCamUp = new THREE.Vector3(0, 1, 0);
const _vfxQuat = new THREE.Quaternion();
const _vfxScale = new THREE.Vector3();
const _vfxMatrix = new THREE.Matrix4();

const VISUAL_CONFIG: Record<string, any> = {
  High:   { decalSlots: 30, dustPerHit: 8,  sparksPerHit: 10, tracerSlots: 10, barrelSmokeSprites: 4,  flashLight: true  },
  Medium: { decalSlots: 15, dustPerHit: 4,  sparksPerHit: 5,  tracerSlots: 6,  barrelSmokeSprites: 2,  flashLight: true  },
  Low:    { decalSlots: 0,  dustPerHit: 0,  sparksPerHit: 0,  tracerSlots: 4,  barrelSmokeSprites: 0,  flashLight: false },
} as const;

// Pool batch references (bound/aliased for backwards compatibility)
export let tracerBatch: THREE.BatchedMesh | null = null;
export let sparkBatch: THREE.BatchedMesh | null = null;
export let decalBatch: THREE.BatchedMesh | null = null;
export let dustBatch: THREE.BatchedMesh | null = null;
export let smokeBatch: THREE.BatchedMesh | null = null;

export const tracerBatches: THREE.BatchedMesh[] = [];
export { hitsDecalBatches as decalBatches };

// Kept for backward compatibility signatures but initialized to null
export let flashMesh: THREE.Mesh | null = null;
export let flashLight: THREE.PointLight | null = null;

// Re-export modular functions directly
export {
  triggerImpactFlipbook,
  triggerExplosionFlipbook,
  triggerMuzzleFlipbook,
  triggerFireFlipbook,
  getFirstNiagaraFlash
};

export function triggerExplosion(pos: THREE.Vector3, scale = 1.0) {
  largeTriggerExplosion(pos, scale);
  triggerExplosionFlipbook(pos.x, pos.y, pos.z, scale);
}

// Pool slot counts
export let tracerSlots = 0;
export let sparksPerHitCount = 0;
export let decalSlots = 0;
export let dustPerHitCount = 0;
export let barrelSmokeCount = 0;

// Tracer arrays for variant pools (0 = warm, 1 = cool, 2 = white)
export const tracerInstIdsList: Int32Array[] = [];
export const tracerActiveList: Uint8Array[] = [];
export const tracerLifeList: Float32Array[] = [];
export const tracerPosXList: Float32Array[] = [];
export const tracerPosYList: Float32Array[] = [];
export const tracerPosZList: Float32Array[] = [];
export const tracerDirXList: Float32Array[] = [];
export const tracerDirYList: Float32Array[] = [];
export const tracerDirZList: Float32Array[] = [];
export const tracerSpeedList: Float32Array[] = [];
export const tracerLengthList: Float32Array[] = [];

const TRACER_TEXTURE_KEYS = [
  'tracer_warm_core.webp',
  'tracer_cool_core.webp',
  'tracer_white_core.webp'
];

let smokeInstIds: Int32Array | null = null;

// Active/life flat typed arrays
export let tracerActive: Uint8Array | null = null;

export let sparkActive: Uint8Array | null = null;
export let dustActive: Uint8Array | null = null;

export let smokeActive: Uint8Array | null = null;
let smokeLife: Float32Array | null = null;
let smokePosX: Float32Array | null = null;
let smokePosY: Float32Array | null = null;
let smokePosZ: Float32Array | null = null;

export let decalIndex = 0;
export let flashLife = 0;
export let vfxInitialized = false;
export let currentVisualConfig: any = null;

let _scene: THREE.Scene;

export function getVFXInitialized(): boolean {
  return vfxInitialized;
}

export function getCurrentVisualConfig(): any {
  return currentVisualConfig;
}

export function initMatchVisuals(scene: THREE.Scene) {
  if (vfxInitialized) return;
  _scene = scene;
  
  const settings = getSettings();
  const preset = settings.graphicsPreset || 'Medium';
  const cfg = { ...(VISUAL_CONFIG[preset] || VISUAL_CONFIG['Medium']) };
  if (typeof settings.flashLight === 'boolean') {
    cfg.flashLight = settings.flashLight;
  }
  currentVisualConfig = cfg;

  // Initialize Modular Sub-systems
  initFiringVFX(scene, cfg.flashLight);
  initHitsVFX(scene, cfg);
  initLargeVFX(scene, cfg.flashLight);
  const presetKey = preset === 'High' ? 'HIGH' : preset === 'Low' ? 'LOW' : 'MEDIUM';
  initFlipbooks(scene, presetKey);

  // Map references to hits module batches
  sparkBatch = hitsSparkBatch;
  dustBatch = hitsDustBatch;
  decalBatch = hitsDecalBatch;
  sparkActive = hitsSparkActive;
  dustActive = hitsDustActive;

  // SMOKE MAT
  const smokeMat = new THREE.MeshBasicNodeMaterial();
  smokeMat.transparent = true;
  smokeMat.depthWrite = false;
  smokeMat.side = THREE.DoubleSide;
  const smokeUV = uv().sub(vec2(0.5, 0.5));
  const smokeDist = tslLength(smokeUV).mul(float(2.0));
  const smokeAlpha = smoothstep(float(1.0), float(0.1), smokeDist).mul(float(0.5));
  const smokeGrey = vec4(0.53, 0.53, 0.53, 0.0);
  smokeMat.colorNode = vec4(smokeGrey.x, smokeGrey.y, smokeGrey.z, smokeAlpha);

  tracerBatches.length = 0;
  tracerInstIdsList.length = 0;
  tracerActiveList.length = 0;
  tracerLifeList.length = 0;
  tracerPosXList.length = 0;
  tracerPosYList.length = 0;
  tracerPosZList.length = 0;
  tracerDirXList.length = 0;
  tracerDirYList.length = 0;
  tracerDirZList.length = 0;
  tracerSpeedList.length = 0;
  tracerLengthList.length = 0;

  // Setup tracer batches (3 variants: warm, cool, white)
  if (cfg.tracerSlots > 0) {
    tracerSlots = cfg.tracerSlots;
    const perVariantSlots = Math.max(1, Math.ceil(tracerSlots / TRACER_TEXTURE_KEYS.length));
    const texLoader = new THREE.TextureLoader();
    const _tracerGeom = new THREE.PlaneGeometry(1.0, 0.18);

    for (let v = 0; v < TRACER_TEXTURE_KEYS.length; v++) {
      const texKey = TRACER_TEXTURE_KEYS[v];
      const tex = texLoader.load(getAssetUrl(texKey));

      const tracerMat = new THREE.MeshBasicNodeMaterial();
      tracerMat.transparent = true;
      tracerMat.blending = THREE.AdditiveBlending;
      tracerMat.depthWrite = false;
      tracerMat.side = THREE.DoubleSide;
      tracerMat.colorNode = texture(tex);

      const b = new THREE.BatchedMesh(perVariantSlots, 4, 6, tracerMat);
      b.name = `VFX_Tracer_${v}`;
      b.frustumCulled = false;
      const geomId = b.addGeometry(_tracerGeom);

      const instIds = new Int32Array(perVariantSlots);
      for (let i = 0; i < perVariantSlots; i++) {
        instIds[i] = b.addInstance(geomId);
        b.setVisibleAt(instIds[i], false);
      }
      _scene.add(b);

      tracerBatches.push(b);
      tracerInstIdsList.push(instIds);

      tracerActiveList.push(new Uint8Array(perVariantSlots));
      tracerLifeList.push(new Float32Array(perVariantSlots));
      tracerPosXList.push(new Float32Array(perVariantSlots));
      tracerPosYList.push(new Float32Array(perVariantSlots));
      tracerPosZList.push(new Float32Array(perVariantSlots));
      tracerDirXList.push(new Float32Array(perVariantSlots));
      tracerDirYList.push(new Float32Array(perVariantSlots));
      tracerDirZList.push(new Float32Array(perVariantSlots));
      tracerSpeedList.push(new Float32Array(perVariantSlots));
      tracerLengthList.push(new Float32Array(perVariantSlots));
    }

    tracerBatch = tracerBatches[0];
    tracerActive = tracerActiveList[0];
  } else {
    tracerBatch = null;
    tracerActive = null;
  }

  // Setup smoke batch
  barrelSmokeCount = cfg.barrelSmokeSprites;
  if (barrelSmokeCount > 0) {
    const smSlots = barrelSmokeCount;
    smokeInstIds = new Int32Array(smSlots);
    smokeActive = new Uint8Array(smSlots);
    smokeLife = new Float32Array(smSlots);
    smokePosX = new Float32Array(smSlots);
    smokePosY = new Float32Array(smSlots);
    smokePosZ = new Float32Array(smSlots);

    smokeBatch = new THREE.BatchedMesh(smSlots, 4, 6, smokeMat);
    smokeBatch.name = "VFX_Smoke";
    smokeBatch.frustumCulled = false;
    const _smokeGeom = new THREE.PlaneGeometry(0.12, 0.12);
    const _smokeGeomId = smokeBatch.addGeometry(_smokeGeom);
    for (let i = 0; i < smSlots; i++) {
        smokeInstIds[i] = smokeBatch.addInstance(_smokeGeomId);
        smokeBatch.setVisibleAt(smokeInstIds[i], false);
    }
    _scene.add(smokeBatch);
  }

  console.log('[VFX:INIT] Modular pipeline loaded successfully. Preset:', preset);
  vfxInitialized = true;
}

export function spawnTracer(
  muzzlePos: THREE.Vector3,
  direction: THREE.Vector3,
  variant: 'warm' | 'cool' | 'white' | number = 'warm',
  endPos?: THREE.Vector3
) {
  if (!vfxInitialized || tracerBatches.length === 0) return;

  let vIdx = 0;
  if (variant === 'cool' || variant === 1) vIdx = 1;
  else if (variant === 'white' || variant === 2) vIdx = 2;

  const active = tracerActiveList[vIdx];
  const instIds = tracerInstIdsList[vIdx];
  const batch = tracerBatches[vIdx];
  if (!active || !instIds || !batch) return;

  const count = instIds.length;
  let slot = -1;
  for (let i = 0; i < count; i++) {
    if (!active[i]) { slot = i; break; }
  }

  if (slot !== -1) {
    tracerPosXList[vIdx][slot] = muzzlePos.x;
    tracerPosYList[vIdx][slot] = muzzlePos.y;
    tracerPosZList[vIdx][slot] = muzzlePos.z;

    tracerDirXList[vIdx][slot] = direction.x;
    tracerDirYList[vIdx][slot] = direction.y;
    tracerDirZList[vIdx][slot] = direction.z;

    let streakLen = 3.5;
    if (endPos) {
      streakLen = Math.min(80.0, muzzlePos.distanceTo(endPos));
    }
    tracerLengthList[vIdx][slot] = streakLen;
    tracerSpeedList[vIdx][slot] = 180.0;
    tracerLifeList[vIdx][slot] = 8.0; // 8 frames
    active[slot] = 1;

    batch.setVisibleAt(instIds[slot], true);
  }
}

export function triggerFlash(
  muzzlePos?: THREE.Vector3,
  scaleFactor = 1.0,
  attachToPlayer = false,
  attachToDroneId: number | null = null,
  match?: MatchController
) {
  if (!vfxInitialized || !muzzlePos) return;

  // 1. Point Camera direction Vector
  const camera = (window as any).camera;
  _vfxDir.set(0, 0, 1);
  if (camera) {
    camera.getWorldDirection(_vfxDir);
  }

  // 2. Trigger Advanced Niagara Muzzle Flash
  triggerNiagaraFlash(muzzlePos, _vfxDir, scaleFactor, attachToPlayer, attachToDroneId, match);
  triggerMuzzleFlipbook(muzzlePos.x, muzzlePos.y, muzzlePos.z, scaleFactor);
}

export function spawnImpactSparks(x: number, y: number, z: number, sparksToSpawn: number, nx = 0, ny = 1, nz = 0) {
  hitsSpawnSparks(x, y, z, sparksToSpawn, nx, ny, nz);
}

export function spawnEnvironmentDecalAndDust(ix: number, iy: number, iz: number, nx = 0, ny = 1, nz = 0) {
  hitsSpawnDecal(ix, iy, iz, nx, ny, nz);
  triggerImpactFlipbook(ix, iy, iz, nx, ny, nz);
}

export function spawnBarrelSmoke(camera: THREE.PerspectiveCamera, muzzlePos?: THREE.Vector3): void {
  if (smokeBatch && smokeActive && smokeInstIds && barrelSmokeCount > 0) {
    if (muzzlePos) {
      _vfxPos.copy(muzzlePos);
    } else {
      camera.getWorldPosition(_vfxPos);
      camera.getWorldDirection(_vfxDir);
      _vfxPos.addScaledVector(_vfxDir, 0.5);
      _vfxPos.y -= 0.15;
    }
    
    for (let i = 0; i < barrelSmokeCount; i++) {
      if (smokeInstIds[i] !== undefined) {
        smokeActive[i] = 1;
        smokeLife![i] = VFX_CONSTANTS.FIRING.SMOKE_LIFETIME;
        smokePosX![i] = _vfxPos.x + (Math.random() - 0.5) * 0.05;
        smokePosY![i] = _vfxPos.y;
        smokePosZ![i] = _vfxPos.z + (Math.random() - 0.5) * 0.05;
        smokeBatch.setVisibleAt(smokeInstIds[i], true);
      }
    }
    if ((smokeBatch as any).instanceMatrix) {
      (smokeBatch as any).instanceMatrix.needsUpdate = true;
    }
  }
}

export function updateVFX(deltaTime: number, camera: THREE.PerspectiveCamera, match?: MatchController): void {
  if (!vfxInitialized) return;

  // 1. Update modular components
  updateFiringVFX(deltaTime, camera, match);
  updateHitsVFX(deltaTime, camera);
  updateLargeVFX(deltaTime, camera);
  updateFlipbooks(deltaTime, camera);

  // 2. Update Tracers across all variants
  if (tracerBatches.length > 0) {
    camera.getWorldDirection(_vfxCamFwd);
    for (let vIdx = 0; vIdx < tracerBatches.length; vIdx++) {
      const batch = tracerBatches[vIdx];
      const active = tracerActiveList[vIdx];
      const instIds = tracerInstIdsList[vIdx];
      const life = tracerLifeList[vIdx];
      const posX = tracerPosXList[vIdx];
      const posY = tracerPosYList[vIdx];
      const posZ = tracerPosZList[vIdx];
      const dirX = tracerDirXList[vIdx];
      const dirY = tracerDirYList[vIdx];
      const dirZ = tracerDirZList[vIdx];
      const speed = tracerSpeedList[vIdx];
      const length = tracerLengthList[vIdx];

      if (!batch || !active || !instIds) continue;

      let tracerUpdateNeeded = false;
      for (let i = 0; i < instIds.length; i++) {
        if (!active[i]) continue;

        life[i] -= 60 * deltaTime;
        if (life[i] <= 0) {
          active[i] = 0;
          batch.setVisibleAt(instIds[i], false);
          tracerUpdateNeeded = true;
          continue;
        }

        const spd = speed[i];
        posX[i] += dirX[i] * spd * deltaTime;
        posY[i] += dirY[i] * spd * deltaTime;
        posZ[i] += dirZ[i] * spd * deltaTime;

        _vfxPos.set(posX[i], posY[i], posZ[i]);
        _vfxDir.set(dirX[i], dirY[i], dirZ[i]).normalize();

        _vfxUp.crossVectors(_vfxDir, _vfxCamFwd).normalize();
        if (_vfxUp.lengthSq() < 0.001) {
          _vfxCamUp.set(0, 1, 0);
          _vfxUp.crossVectors(_vfxDir, _vfxCamUp).normalize();
          if (_vfxUp.lengthSq() < 0.001) {
            _vfxUp.set(0, 1, 0);
          }
        }

        _vfxRight.crossVectors(_vfxDir, _vfxUp).normalize();
        _vfxMatrix.makeBasis(_vfxDir, _vfxUp, _vfxRight);
        _vfxQuat.setFromRotationMatrix(_vfxMatrix);

        const clampedLife = Math.max(0, life[i]);
        const fadeProgress = clampedLife / 8.0;
        const len = length[i] * Math.min(1.0, fadeProgress + 0.3);
        _vfxScale.set(len, 1.0, 1.0);

        _vfxMatrix.compose(_vfxPos, _vfxQuat, _vfxScale);
        batch.setMatrixAt(instIds[i], _vfxMatrix);
        tracerUpdateNeeded = true;
      }
      if (tracerUpdateNeeded && (batch as any).instanceMatrix) {
        (batch as any).instanceMatrix.needsUpdate = true;
      }
    }
  }

  // 3. Update Smoke
  if (smokeBatch && smokeActive && smokeInstIds) {
    let smokeUpdateNeeded = false;
    for (let i = 0; i < barrelSmokeCount; i++) {
      if (!smokeActive[i]) continue;
      
      smokeLife![i] -= 60 * deltaTime;
      if (smokeLife![i] <= 0) {
        smokeActive[i] = 0;
        smokeBatch.setVisibleAt(smokeInstIds[i], false);
        smokeUpdateNeeded = true;
        continue;
      }
      
      smokePosY![i] += VFX_CONSTANTS.FIRING.SMOKE_RISE_SPEED;
      _vfxPos.set(smokePosX![i], smokePosY![i], smokePosZ![i]);
      _vfxQuat.copy(camera.quaternion);
      const clampedSmokeLife = Math.max(0, smokeLife![i]);
      const sProgress = 1 - (clampedSmokeLife / VFX_CONSTANTS.FIRING.SMOKE_LIFETIME);
      _vfxScale.setScalar(0.1 + sProgress * VFX_CONSTANTS.FIRING.SMOKE_GROWTH_SPEED);
      
      _vfxMatrix.compose(_vfxPos, _vfxQuat, _vfxScale);
      smokeBatch.setMatrixAt(smokeInstIds[i], _vfxMatrix);
      smokeUpdateNeeded = true;
    }
    if (smokeUpdateNeeded && (smokeBatch as any).instanceMatrix) {
      (smokeBatch as any).instanceMatrix.needsUpdate = true;
    }
  }
}

export function clearAllVisuals() {
  vfxInitialized = false;

  // Clear modular systems
  clearFiringVFX();
  clearHitsVFX();
  clearLargeVFX();
  clearFlipbooks();

  for (let v = 0; v < tracerBatches.length; v++) {
    const b = tracerBatches[v];
    const instIds = tracerInstIdsList[v];
    const active = tracerActiveList[v];
    if (b) {
      if (instIds && active) {
        active.fill(0);
        for (let i = 0; i < instIds.length; i++) b.setVisibleAt(instIds[i], false);
      }
      _scene?.remove(b);
      if (b.material) b.material.dispose();
      b.dispose();
    }
  }
  tracerBatches.length = 0;
  tracerInstIdsList.length = 0;
  tracerActiveList.length = 0;
  tracerLifeList.length = 0;
  tracerPosXList.length = 0;
  tracerPosYList.length = 0;
  tracerPosZList.length = 0;
  tracerDirXList.length = 0;
  tracerDirYList.length = 0;
  tracerDirZList.length = 0;
  tracerSpeedList.length = 0;
  tracerLengthList.length = 0;
  tracerBatch = null;
  tracerActive = null;

  if (smokeBatch) {
    if (smokeInstIds && smokeActive) {
      smokeActive.fill(0);
      for (let i = 0; i < smokeInstIds.length; i++) smokeBatch.setVisibleAt(smokeInstIds[i], false);
    }
    _scene?.remove(smokeBatch);
    smokeBatch.material?.dispose();
    smokeBatch.dispose();
    smokeBatch = null;
  }
  flashLife = 0;
}
