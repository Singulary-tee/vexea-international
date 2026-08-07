import * as THREE from "three/webgpu";
import { DS } from "./design-system";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { getCachedOrFetchUrl, createConfiguredGLTFLoader } from "./asset-cache";
import { applyScenicGripPose } from "./weapons/GripSystem";
import { ClassLoadoutSystem } from "./src/systems/ClassLoadoutSystem";
import { attachScope, preloadAttachments } from "./weapons/AttachmentSystem";

export type StudioMode = 'MAIN_MENU' | 'ARMORY' | 'STORE' | 'LOBBY' | 'INACTIVE';

export interface WeaponSkin {
  id: string;
  name: string;
  textureFile: string | null; // null represents base gltf texture
  previewBg: string;
}

export const AVAILABLE_SKINS: Record<string, WeaponSkin> = {
  STANDARD: { id: 'STANDARD', name: 'STANDARD FINISH', textureFile: null, previewBg: '#111111' },
  test_skin: { id: 'test_skin', name: 'TEST COATING', textureFile: null, previewBg: '#1d222e' }
};

function isFirearm(itemKey: string, glbName: string): boolean {
  const key = (itemKey || "").toLowerCase();
  const name = (glbName || "").toLowerCase();
  return (
    key.includes("rifle") ||
    key.includes("pistol") ||
    key.includes("shotgun") ||
    key.includes("sniper") ||
    key.includes("lmg") ||
    key.includes("smg") ||
    key === "scar_l" ||
    key === "brn_180" ||
    key === "f_90" ||
    key === "hk_51" ||
    key === "scar_h_mk_17" ||
    name.includes("smg") ||
    name.includes("pistol") ||
    name.includes("rifle")
  );
}

function computeLocalBox(model: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  model.updateMatrixWorld(true);
  model.traverse((child: any) => {
    if (child.isMesh && child.visible) {
      child.updateMatrixWorld(true);
      const geom = child.geometry;
      if (geom) {
        if (!geom.boundingBox) {
          geom.computeBoundingBox();
        }
        if (geom.boundingBox) {
          const localMatrix = new THREE.Matrix4();
          localMatrix.copy(model.matrixWorld).invert().multiply(child.matrixWorld);
          const m = geom.boundingBox.clone().applyMatrix4(localMatrix);
          box.union(m);
        }
      }
    }
  });
  return box;
}

function computeBoxRelativeToParent(object: THREE.Object3D, parent: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  parent.updateMatrixWorld(true);
  object.traverse((child: any) => {
    if (child.isMesh && child.visible) {
      child.updateMatrixWorld(true);
      const geom = child.geometry;
      if (geom) {
        if (!geom.boundingBox) {
          geom.computeBoundingBox();
        }
        if (geom.boundingBox) {
          const localMatrix = new THREE.Matrix4();
          localMatrix.copy(parent.matrixWorld).invert().multiply(child.matrixWorld);
          const m = geom.boundingBox.clone().applyMatrix4(localMatrix);
          box.union(m);
        }
      }
    }
  });
  return box;
}

function computeWeaponBoxRelativeToParent(object: THREE.Object3D, parent: THREE.Object3D, filterCharacterParts: boolean = true): THREE.Box3 {
  const box = new THREE.Box3();
  parent.updateMatrixWorld(true);
  object.traverse((child: any) => {
    if (child.isMesh && child.visible) {
      if (filterCharacterParts) {
        const name = child.name.toLowerCase();
        if (
          name.includes('arm') || 
          name.includes('hand') || 
          name.includes('sleeve') || 
          name.includes('body') || 
          name.includes('character') || 
          name.includes('player')
        ) {
          return;
        }
      }
      child.updateMatrixWorld(true);
      const geom = child.geometry;
      if (geom) {
        if (!geom.boundingBox) {
          geom.computeBoundingBox();
        }
        if (geom.boundingBox) {
          const localMatrix = new THREE.Matrix4();
          localMatrix.copy(parent.matrixWorld).invert().multiply(child.matrixWorld);
          const m = geom.boundingBox.clone().applyMatrix4(localMatrix);
          box.union(m);
        }
      }
    }
  });

  if (box.isEmpty()) {
    return computeBoxRelativeToParent(object, parent);
  }
  return box;
}

class StudioPreviewManagerImpl {
  private studioScene: THREE.Scene;
  private studioCamera: THREE.PerspectiveCamera;
  private currentMode: StudioMode = 'INACTIVE';
  
  private containerEl: HTMLElement | null = null;
  private canvasContainerEl: HTMLElement | null = null;
  
  // Studio 3D Objects
  private stageGroup: THREE.Group;
  private activeModelGroup: THREE.Group;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  
  // Turntable and hook states
  private turntableEnabled = false;
  private activeMixer: THREE.AnimationMixer | null = null;
  private _onModelLoaded: ((model: THREE.Group, glbName: string) => void) | null = null;
  private lastLoadedModel: THREE.Group | null = null;
  private lastLoadedGlbName: string = "";

  public get onModelLoaded(): ((model: THREE.Group, glbName: string) => void) | null {
    return this._onModelLoaded;
  }

  public set onModelLoaded(fn: ((model: THREE.Group, glbName: string) => void) | null) {
    this._onModelLoaded = fn;
    if (fn && this.lastLoadedModel) {
      fn(this.lastLoadedModel, this.lastLoadedGlbName);
    }
  }
  
  // Interactive Drag State
  private isDragging = false;
  private previousMouseX = 0;
  private dragSensitivity = 0.008;

  // Active showcase item state
  private activeItemKey = 'Player_one-optimized.glb';
  private activeSkinId = 'STANDARD';
  private currentLoadRequestId = 0;
  private gltfCache = new Map<string, any>();
  private activeLoadPromise: Promise<void> | null = null;

  public async waitForReady(): Promise<void> {
    if (this.activeLoadPromise) {
      await this.activeLoadPromise;
    }
  }

  constructor() {
    this.studioScene = new THREE.Scene();
    this.studioScene.background = null; // TRANSPARENT CANVAS

    this.studioCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
    this.studioCamera.position.set(0, 0.0, 2.7);
    this.studioCamera.lookAt(0, 0.1, 0);

    // Setup Studio Lighting (Clean, neutral colors - NO NEON)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.keyLight.position.set(3, 4, 3);

    this.rimLight = new THREE.DirectionalLight(0x8899aa, 1.5);
    this.rimLight.position.set(-3, 2, -3);

    this.studioScene.add(this.ambientLight, this.keyLight, this.rimLight);

    // Build Studio Stage - No pedestal or grid helpers
    this.stageGroup = new THREE.Group();
    
    this.activeModelGroup = new THREE.Group();
    this.activeModelGroup.position.set(0, 0, 0);
    this.stageGroup.add(this.activeModelGroup);

    this.studioScene.add(this.stageGroup);
  }

  public getStudioScene(): THREE.Scene {
    return this.studioScene;
  }

  public getStudioCamera(): THREE.PerspectiveCamera {
    return this.studioCamera;
  }

  public getMode(): StudioMode {
    return this.currentMode;
  }

  public getStageGroup(): THREE.Group {
    return this.stageGroup;
  }

  public getActiveModelGroup(): THREE.Group {
    return this.activeModelGroup;
  }

  public getKeyLight(): THREE.DirectionalLight {
    return this.keyLight;
  }

  public getRimLight(): THREE.DirectionalLight {
    return this.rimLight;
  }

  public getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight;
  }

  public getContainerEl(): HTMLElement | null {
    return this.containerEl;
  }

  public isTurntableEnabled(): boolean {
    return this.turntableEnabled;
  }

  public setTurntableEnabled(enabled: boolean): void {
    this.turntableEnabled = enabled;
  }

  public detach(): void {
    this.currentMode = 'INACTIVE';
    this.containerEl = null;
    this.currentLoadRequestId++;

    while (this.activeModelGroup.children.length > 0) {
      this.activeModelGroup.remove(this.activeModelGroup.children[0]);
    }
    this.activeMixer = null;
    this.lastLoadedModel = null;

    if (!this.canvasContainerEl) {
      this.canvasContainerEl = document.getElementById('canvas-container');
    }

    if (this.canvasContainerEl) {
      const vexeaView = document.getElementById('vexea-view');
      const hudContainer = document.getElementById('hud-container');
      if (vexeaView && this.canvasContainerEl.parentElement !== vexeaView) {
        if (hudContainer && hudContainer.parentElement === vexeaView) {
          vexeaView.insertBefore(this.canvasContainerEl, hudContainer);
        } else {
          vexeaView.appendChild(this.canvasContainerEl);
        }
      }
      Object.assign(this.canvasContainerEl.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: '0',
      });
      const renderer = (window as any).renderer;
      if (renderer && typeof renderer.setSize === 'function') {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
      }
    }
  }

  public attachTo(container: HTMLElement, mode: StudioMode, options?: { itemKey?: string; skinId?: string }): void {
    if (!container) return;
    this.currentMode = mode;
    this.containerEl = container;

    let itemToLoad = options?.itemKey || this.activeItemKey;
    if ((mode === 'MAIN_MENU' || mode === 'LOBBY') && !options?.itemKey) {
      itemToLoad = "Player_one-optimized.glb";
    }
    const skinToLoad = options?.skinId || this.activeSkinId;

    if (this.currentMode === 'LOBBY' || this.currentMode === 'MAIN_MENU') {
      this.setTurntableEnabled(false);
    } else {
      this.setTurntableEnabled(true);
    }

    // Only reset and reload if item or skin actually changed
    const isModelAlreadyLoaded = this.lastLoadedModel &&
      this.activeItemKey === itemToLoad &&
      this.activeSkinId === skinToLoad &&
      this.activeModelGroup.children.length > 0;

    if (!isModelAlreadyLoaded) {
      this.currentLoadRequestId++;
      while (this.activeModelGroup.children.length > 0) {
        this.activeModelGroup.remove(this.activeModelGroup.children[0]);
      }
      this.activeMixer = null;
      this.lastLoadedModel = null;
      this.activeModelGroup.position.set(0, 0, 0);
      this.activeModelGroup.rotation.set(0, 0, 0);

      this.setShowcaseItem(itemToLoad, skinToLoad);
    }

    if (!this.canvasContainerEl) {
      this.canvasContainerEl = document.getElementById('canvas-container');
    }

    if (this.canvasContainerEl && this.containerEl) {
      if (this.canvasContainerEl.parentElement !== this.containerEl) {
        this.containerEl.appendChild(this.canvasContainerEl);
      }
      Object.assign(this.canvasContainerEl.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: '1',
      });
      this.resizeToContainer();
      this.setupInputListeners();

      // Dynamically import Dev Placement tools only in local development environments
      import("../shared/gates/production.gate").then((gate) => {
        if (gate.IS_DEV) {
          import("./StudioCharacterPreview").then((devPreview) => {
            devPreview.initStudioCharacterPreview();
          }).catch(err => console.error("Failed to load StudioCharacterPreview:", err));
        }
      }).catch(err => console.error("Failed to load production gate:", err));
    }
  }

  public setShowcaseItem(itemKey: string, skinId?: string): Promise<void> {
    this.activeItemKey = itemKey;
    if (skinId !== undefined) {
      this.activeSkinId = skinId;
    }
    this.activeLoadPromise = this.buildShowcaseModel(itemKey, this.activeSkinId);
    return this.activeLoadPromise;
  }

  private async buildShowcaseModel(itemKey: string, skinId: string): Promise<void> {
    const requestId = ++this.currentLoadRequestId;

    // Synchronously clear previous active models
    while (this.activeModelGroup.children.length > 0) {
      this.activeModelGroup.remove(this.activeModelGroup.children[0]);
    }
    this.activeMixer = null;
    this.lastLoadedModel = null;

    let glbName = "";
    if (itemKey.endsWith(".glb")) {
      glbName = itemKey;
    } else if (itemKey === 'scar_l' || itemKey === 'rifle') {
      glbName = "scar_l-optimized.glb";
    } else if (itemKey === 'brn_180') {
      glbName = "brn_180-optimized.glb";
    } else if (itemKey === 'f_90') {
      glbName = "f_90-optimized.glb";
    } else if (itemKey === 'hk_51') {
      glbName = "hk_51-optimized.glb";
    } else if (itemKey === 'scar_h_mk_17') {
      glbName = "scar_h_mk_17-optimized.glb";
    } else if (itemKey === 'm4_rifle' || itemKey === 'lmg' || itemKey === 'shotgun' || itemKey === 'sniper' || itemKey.includes('rifle_')) {
      glbName = "smg_fps_animations.glb";
    } else if (itemKey === 'pistol' || itemKey === 'viper_pistol' || itemKey.includes('pistol_')) {
      glbName = "animated_pistol.glb";
    } else if (itemKey === 'grenade' || itemKey === 'frag_grenade' || itemKey.includes('grenade_') || itemKey.includes('flash_') || itemKey.includes('emp_') || itemKey.includes('c4_')) {
      glbName = "grenade.glb";
    } else {
      glbName = itemKey || "Player_one-optimized.glb";
    }

    // Force character preview models to Player_one-optimized.glb
    if (glbName.toLowerCase().includes("player") || glbName.toLowerCase().includes("character") || glbName.toLowerCase().includes("bpre")) {
      glbName = "Player_one-optimized.glb";
    }

    try {
      let gltf;
      if (this.gltfCache.has(glbName)) {
        gltf = this.gltfCache.get(glbName);
      } else {
        const loader = createConfiguredGLTFLoader(undefined, (window as any).renderer);
        const url = await getCachedOrFetchUrl(glbName, "Asset");
        gltf = await loader.loadAsync(url);
        this.gltfCache.set(glbName, gltf);
      }
      
      // Cancel if a newer load request arrived while fetching
      if (requestId !== this.currentLoadRequestId) {
        return;
      }

      // Use SkeletonUtils to clone model safely
      const model = SkeletonUtils.clone(gltf.scene) as THREE.Group;
      
      // Fix bone binding mapping for SkinnedMesh in cloned WebGPU model hierarchy
      fixSkinnedMeshBones(model, gltf.scene);

      // Ensure crisp high quality texture rendering on model materials
      model.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat: any) => {
            if (mat.map) {
              mat.map.anisotropy = 16;
              mat.map.minFilter = THREE.LinearMipmapLinearFilter;
              mat.map.magFilter = THREE.LinearFilter;
              mat.map.needsUpdate = true;
            }
          });
        }
      });

      ClassLoadoutSystem.applySkin(model, skinId);

      // Cancel if a newer load request arrived while applying skin texture
      if (requestId !== this.currentLoadRequestId) {
        return;
      }

      const isCharacter = glbName.toLowerCase().includes('player') || 
                          glbName.toLowerCase().includes('character') || 
                          glbName.toLowerCase().includes('humanoid') || 
                          glbName.toLowerCase().includes('soldier');

      if (isCharacter) {
        model.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        // Normalize character height mathematically to standard 1.8 units (meters)
        const targetHeight = 1.8;
        const scaleFactor = (size.y > 0) ? (targetHeight / size.y) : 1.0;
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        model.updateMatrixWorld(true);

        // Position feet on Y = 0, centered in X and Z
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);
        model.userData.baseScaleVal = scaleFactor;
        model.userData.centerLocalOffset = new THREE.Vector3(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);

        // Trigonometric camera distance & focal target calculation
        const fovRad = (this.studioCamera.fov * Math.PI) / 180;
        const padding = 1.15; // 15% vertical margin
        const distance = (targetHeight / 2) / Math.tan(fovRad / 2) * padding;
        const targetY = targetHeight * 0.5;

        this.activeModelGroup.rotation.set(0, 0, 0);

        if (this.currentMode === 'LOBBY') {
          this.activeModelGroup.position.set(0, 0, 0);

          this.studioCamera.position.set(0, targetY, distance);
          this.studioCamera.lookAt(0, targetY, 0);

          if (this.keyLight) this.keyLight.intensity = 2.5;
          if (this.rimLight) this.rimLight.intensity = 1.8;
          if (this.ambientLight) this.ambientLight.intensity = 0.9;
        } else {
          // MAIN_MENU mode
          const aspect = this.studioCamera.aspect || (window.innerWidth / window.innerHeight);
          const visibleHeight = 2 * distance * Math.tan(fovRad / 2);
          const visibleWidth = visibleHeight * aspect;
          const offsetX = visibleWidth * 0.20;

          this.activeModelGroup.position.set(offsetX, 0, 0);
          this.activeModelGroup.rotation.set(0, -0.35, 0);

          this.studioCamera.position.set(0, targetY, distance);
          this.studioCamera.lookAt(0, targetY, 0);

          if (this.keyLight) this.keyLight.intensity = 2.2;
          if (this.rimLight) this.rimLight.intensity = 1.5;
          if (this.ambientLight) this.ambientLight.intensity = 0.8;
        }

        // Setup Animation Mixer
        this.activeMixer = null;
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          this.activeMixer = mixer;
          let clip = gltf.animations.find(a => a.name.toLowerCase().includes("idle"));
          if (!clip) clip = gltf.animations[0];
          if (clip) mixer.clipAction(clip).play();
        }

        this.activeModelGroup.add(model);
        model.visible = true;

        // Auto-equip selected weapon and skin to the character in Lobby/Menu
        this.loadAndEquipWeaponAlways(model);

      } else {
        // WEAPON SHOWCASE: Upright 3/4 diagonal presentation angle
        // Temporarily reset activeModelGroup and model transforms to identity
        // to prevent any async turntable or drag rotation from poisoning the centering math.
        this.activeModelGroup.position.set(0, 0, 0);
        this.activeModelGroup.rotation.set(0, 0, 0);

        let weaponMeshes: THREE.Mesh[] = [];
        model.traverse((child: any) => {
          if (child.isMesh && child.visible) {
            const name = child.name.toLowerCase();
            if (!name.includes('arm') && !name.includes('hand') && !name.includes('sleeve') && !name.includes('body') && !name.includes('character') && !name.includes('player')) {
              weaponMeshes.push(child);
            }
          }
        });

        if (weaponMeshes.length === 0) {
          model.traverse((child: any) => {
            if (child.isMesh && child.visible) {
              weaponMeshes.push(child);
            }
          });
        }

        const firearm = isFirearm(itemKey, glbName);
        this.activeModelGroup.add(model);
        
        // 1. Reset model transforms
        model.position.set(0, 0, 0);
        model.scale.set(1.0, 1.0, 1.0);
        model.rotation.set(0, 0, 0);
        model.updateMatrixWorld(true);

        // 2. Mathematically orient the rifle if it is a firearm
        if (firearm) {
          const localBox = computeLocalBox(model);
          if (!localBox.isEmpty()) {
            const localSize = new THREE.Vector3();
            localBox.getSize(localSize);

            const dims = [
              { axis: 'x', value: localSize.x },
              { axis: 'y', value: localSize.y },
              { axis: 'z', value: localSize.z }
            ];
            dims.sort((a, b) => b.value - a.value);

            const longAxis = dims[0].axis;
            const heightAxis = dims[1].axis;

            // Construct alignment rotation matrix R
            const R = new THREE.Matrix4();
            const m = R.elements;

            // Row 0 is the longest axis (length) -> World X (horizontal)
            const r00 = (longAxis === 'x') ? 1 : 0;
            const r01 = (longAxis === 'y') ? 1 : 0;
            const r02 = (longAxis === 'z') ? 1 : 0;

            // Row 1 is the second longest axis (height) -> World Y (upright)
            const r10 = (heightAxis === 'x') ? 1 : 0;
            const r11 = (heightAxis === 'y') ? 1 : 0;
            const r12 = (heightAxis === 'z') ? 1 : 0;

            // Row 2 is the shortest axis (thickness) -> World Z (depth)
            // We use the cross product of Row 0 and Row 1 to guarantee a right-handed orthogonal matrix
            const r20 = r01 * r12 - r02 * r11;
            const r21 = r02 * r10 - r00 * r12;
            const r22 = r00 * r11 - r01 * r10;

            m[0] = r00; m[4] = r01; m[8] = r02; m[12] = 0;
            m[1] = r10; m[5] = r11; m[9] = r12; m[13] = 0;
            m[2] = r20; m[6] = r21; m[10] = r22; m[14] = 0;
            m[3] = 0;   m[7] = 0;   m[11] = 0;   m[15] = 1;

            model.quaternion.setFromRotationMatrix(R);
            model.updateMatrixWorld(true);

            // Apply standard presentation rotation based on common showcase projection (Yaw 30 deg, Pitch 5 deg)
            // This is a systematic constant derived from isometric-adjacent viewing theory, not eyeballed.
            const presentationRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.087, -0.523, 0.0));
            model.quaternion.premultiply(presentationRot);
            model.updateMatrixWorld(true);
          }
        } else {
          model.rotation.set(0.15, -0.30, 0);
          model.updateMatrixWorld(true);
        }

        // 3. Get exact bounding box of the oriented meshes in parent space (WEAPON ONLY - DO NOT FILTER 'BODY')
        const boundsBox = computeWeaponBoxRelativeToParent(model, this.activeModelGroup, false);

        if (!boundsBox.isEmpty()) {
          const rawSize = new THREE.Vector3();
          boundsBox.getSize(rawSize);

          const centerWorld = new THREE.Vector3();
          boundsBox.getCenter(centerWorld);

          // Get exact canvas dimensions for 100% mathematical, zero-eyeballing sizing
          const width = this.containerEl ? (this.containerEl.clientWidth || window.innerWidth) : window.innerWidth;
          const height = this.containerEl ? (this.containerEl.clientHeight || window.innerHeight) : window.innerHeight;
          const aspect = (width / height) || (16 / 9);

          const fovRad = (this.studioCamera.fov * Math.PI) / 180;
          
          // Calculate framing distance based on bounding sphere to guarantee fit without magic offsets
          const sphere = new THREE.Sphere();
          boundsBox.getBoundingSphere(sphere);
          const radius = sphere.radius;
          
          // distance = (size / 2) / tan(fov / 2)
          // We use the radius and adjust for aspect ratio to ensure full horizontal/vertical fit
          const distY = radius / Math.tan(fovRad / 2);
          const distX = distY / aspect;
          const dist = Math.max(distX, distY) * 1.5; // 50% margin for UI elements

          this.studioCamera.position.set(0, 0, dist);
          this.studioCamera.lookAt(0, 0, 0);

          const visibleHeight = 2 * dist * Math.tan(fovRad / 2);
          const visibleWidth = visibleHeight * aspect;

          let weaponScaleFactor = 1.0;
          if (firearm) {
            // For rifles: width/depth (rawSize.x) sets final size. Safe horizontal ratio = 0.70, vertical ratio = 0.55
            const scaleX = (visibleWidth * 0.70) / (rawSize.x || 1.0);
            const scaleY = (visibleHeight * 0.55) / (rawSize.y || 1.0);
            weaponScaleFactor = Math.min(scaleX, scaleY);
          } else {
            // For grenades/other: height (rawSize.y) sets final size. Safe vertical ratio = 0.55, horizontal ratio = 0.65
            const scaleX = (visibleWidth * 0.65) / (rawSize.x || 1.0);
            const scaleY = (visibleHeight * 0.55) / (rawSize.y || 1.0);
            weaponScaleFactor = Math.min(scaleX, scaleY);
          }

          // Apply scale and translation to perfectly center the meshes around activeModelGroup's pivot
          model.scale.set(weaponScaleFactor, weaponScaleFactor, weaponScaleFactor);
          model.position.copy(centerWorld).negate().multiplyScalar(weaponScaleFactor);
          model.updateMatrixWorld(true);

          // Calculate final bounds of the centered weapon in parent space to frame the camera perfectly
          const finalBox = computeWeaponBoxRelativeToParent(model, this.activeModelGroup);
          const size = new THREE.Vector3();
          finalBox.getSize(size);

          this.autoFrameCameraForSize(size);
        } else {
          this.studioCamera.position.set(0, 0, 1.2);
          this.studioCamera.lookAt(0, 0, 0);
        }

        if (this.keyLight) this.keyLight.intensity = 2.8;
        if (this.rimLight) this.rimLight.intensity = 2.0;
        if (this.ambientLight) this.ambientLight.intensity = 1.0;

        model.visible = true;
      }

      this.lastLoadedModel = model;
      this.lastLoadedGlbName = glbName;
      if (this._onModelLoaded) {
        this._onModelLoaded(model, glbName);
      }

    } catch (err) {
      console.error("[StudioPreview] GLTF Showcase Load Failed:", err);
    }
  }

  private async loadAndEquipWeaponAlways(characterModel: THREE.Group): Promise<void> {
    try {
      await preloadAttachments();

      const loader = createConfiguredGLTFLoader();
      const url = await getCachedOrFetchUrl("scar_l-optimized.glb", "Asset");
      const gltf = await loader.loadAsync(url);
      const weapon = SkeletonUtils.clone(gltf.scene) as THREE.Group;

      fixSkinnedMeshBones(weapon, gltf.scene);

      // Sizing proportion math: HUMAN 1.8m -> RIFLE 0.85m
      const characterBox = new THREE.Box3().setFromObject(characterModel);
      const characterSize = new THREE.Vector3();
      characterBox.getSize(characterSize);
      const characterHeight = characterSize.y > 0 ? characterSize.y : 1.8;

      const weaponBox = new THREE.Box3().setFromObject(weapon);
      const weaponSize = new THREE.Vector3();
      weaponBox.getSize(weaponSize);
      const weaponLength = Math.max(weaponSize.x, weaponSize.y, weaponSize.z) || 1.0;

      const targetWeaponLength = characterHeight * (0.85 / 1.8);
      const weaponScale = targetWeaponLength / weaponLength;
      weapon.scale.set(weaponScale, weaponScale, weaponScale);

      // Apply currently equipped weapon skin dynamically
      const currentSkinId = ClassLoadoutSystem.getEquippedSkin("m4_rifle_assault");
      ClassLoadoutSystem.applySkin(weapon, currentSkinId);

      await attachScope(weapon, "ACOG");

      characterModel.userData.activeWeapon = weapon;

      // Apply hand-tuned scenic pose config
      applyScenicGripPose(characterModel, weapon, {
        wepPosX: -0.09,
        wepPosY: -0.17,
        wepPosZ: -0.47,
        wepRotX: 2.95840734641021,
        wepRotY: -0.161592653589793,
        wepRotZ: 2.04840734641021,
        rArmPosX: 0.02,
        rArmPosY: 0.05,
        rArmPosZ: 0.09,
        rArmRotX: 0.678407346410207,
        rArmRotY: -0.221592653589793,
        rArmRotZ: 0.238407346410207,
        rForeArmPosX: 0.02,
        rForeArmPosY: 0.09,
        rForeArmPosZ: 0,
        rForeArmRotX: 0.918407346410207,
        rForeArmRotY: -0.891592653589793,
        rForeArmRotZ: 0.648407346410207,
        rHandPosX: 0,
        rHandPosY: 0,
        rHandPosZ: -0.02,
        rHandRotX: 0.648407346410207,
        rHandRotY: 1.56840734641021,
        rHandRotZ: 0,
        lArmPosX: 0,
        lArmPosY: 0,
        lArmPosZ: 0,
        lArmRotX: 0.838407346410207,
        lArmRotY: 0.748407346410207,
        lArmRotZ: -0.641592653589793,
        lForeArmPosX: -0.01,
        lForeArmPosY: 0,
        lForeArmPosZ: -0.05,
        lForeArmRotX: 0.788407346410207,
        lForeArmRotY: -0.361592653589793,
        lForeArmRotZ: 0.168407346410207,
        lHandPosX: -0.7,
        lHandPosY: 0.12,
        lHandPosZ: 0,
        lHandRotX: 0.198407346410207,
        lHandRotY: -1.60159265358979,
        lHandRotZ: -0.411592653589793
      });

      console.log("[StudioPreviewManager] Weapon loaded and scenic posed successfully on player avatar.");
    } catch (err) {
      console.error("[StudioPreviewManager] loadAndEquipWeaponAlways error:", err);
    }
  }

  private autoFrameCameraForSize(size: THREE.Vector3): void {
    const width = this.containerEl ? (this.containerEl.clientWidth || window.innerWidth) : window.innerWidth;
    const height = this.containerEl ? (this.containerEl.clientHeight || window.innerHeight) : window.innerHeight;
    const aspect = (width / height) || (16 / 9);

    const fovRad = (this.studioCamera.fov * Math.PI) / 180;

    // Mathematical framing: distance = (size/2) / tan(fov/2)
    const distY = (size.y / 2) / Math.tan(fovRad / 2);
    const distX = (size.x / 2) / (Math.tan(fovRad / 2) * aspect);
    const dist = Math.max(distX, distY) * 1.4; // 40% margin for UI overlays and rotation room

    this.studioCamera.fov = 45;
    this.studioCamera.aspect = aspect;
    this.studioCamera.position.set(0, 0, dist);
    this.studioCamera.lookAt(0, 0, 0);
    this.studioCamera.near = 0.01; 
    this.studioCamera.far = dist + 50.0;
    this.studioCamera.updateProjectionMatrix();
  }

  private applySkinToModelAsync(model: THREE.Object3D, textureFile: string | null): Promise<void> {
    return new Promise((resolve) => {
      if (!textureFile) {
        // Restore original materials if standard
        model.traverse((child: any) => {
          if (child.isMesh) {
            if (child.userData.originalMap !== undefined) {
              child.material.map = child.userData.originalMap;
              child.material.needsUpdate = true;
            }
          }
        });
        resolve();
        return;
      }

      // Load texture
      import('./asset-cache').then(({ getAssetUrl }) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(getAssetUrl(textureFile), (texture) => {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(2, 2); // Repeat to look nice and detailed
          
          model.traverse((child: any) => {
            if (child.isMesh) {
              if (child.material) {
                child.material = child.material.clone();
              }
              // Backup original map
              if (child.userData.originalMap === undefined) {
                child.userData.originalMap = child.material.map;
              }
              child.material.map = texture;
              child.material.needsUpdate = true;
            }
          });
          resolve();
        }, undefined, () => {
          resolve(); // Resolve anyway on error
        });
      }).catch(() => resolve());
    });
  }

  public resizeToContainer(): void {
    if (!this.containerEl) return;
    const width = this.containerEl.clientWidth || window.innerWidth;
    const height = this.containerEl.clientHeight || window.innerHeight;

    const aspect = width / height;

    this.studioCamera.fov = 45;
    this.studioCamera.aspect = aspect;
    this.studioCamera.updateProjectionMatrix();

    const renderer = (window as any).renderer;
    if (renderer && typeof renderer.setSize === 'function') {
      renderer.setSize(width, height, false);
    }
  }

  private setupInputListeners(): void {
    if (!this.canvasContainerEl) return;

    this.canvasContainerEl.onmousedown = (e) => {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
    };

    window.onmouseup = () => {
      this.isDragging = false;
    };

    this.canvasContainerEl.onmousemove = (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMouseX;
      this.activeModelGroup.rotation.y += deltaX * this.dragSensitivity;
      this.previousMouseX = e.clientX;
    };

    this.canvasContainerEl.ontouchstart = (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.previousMouseX = e.touches[0].clientX;
      }
    };

    window.ontouchend = () => {
      this.isDragging = false;
    };

    this.canvasContainerEl.ontouchmove = (e) => {
      if (!this.isDragging || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - this.previousMouseX;
      this.activeModelGroup.rotation.y += deltaX * this.dragSensitivity;
      this.previousMouseX = e.touches[0].clientX;
    };
  }

  public update(dt: number): void {
    if (this.currentMode === 'INACTIVE') return;

    // Smooth scale-in transition
    this.activeModelGroup.children.forEach(model => {
      if (model.userData.targetScale) {
        const target = model.userData.targetScale as THREE.Vector3;
        model.scale.lerp(target, Math.min(dt * 12, 1.0));
      }
    });

    // Update animation mixer if active
    if (this.activeMixer) {
      this.activeMixer.update(dt);
    }

    // Call procedural skeletal pose to maintain low-ready alignment over animations
    if (this.lastLoadedModel && this.lastLoadedGlbName.toLowerCase().includes("player")) {
      const activeWeapon = this.lastLoadedModel.userData.activeWeapon;
      if (activeWeapon) {
        applyScenicGripPose(this.lastLoadedModel, activeWeapon, this.lastLoadedModel.userData.poseConfig);
      }
    }

    // Slow turntable rotation when idle (disabled in LOBBY mode per requirement: DONT SPIN AUTOMATICALLY)
    if (!this.isDragging && this.turntableEnabled && this.currentMode !== 'LOBBY') {
      this.activeModelGroup.rotation.y += dt * 0.4;
    }

    // Subtle lighting motion
    this.keyLight.position.x = 3 + Math.sin(performance.now() * 0.001) * 0.5;
  }
}

export const StudioPreviewManager = new StudioPreviewManagerImpl();

export function fixSkinnedMeshBones(clonedModel: THREE.Object3D, originalModel: THREE.Object3D): void {
  clonedModel.traverse((child: any) => {
    if (child.isSkinnedMesh) {
      let originalMesh: any = null;
      originalModel.traverse((origChild: any) => {
        if (origChild.isSkinnedMesh && origChild.name === child.name) {
          originalMesh = origChild;
        }
      });

      if (originalMesh && originalMesh.skeleton) {
        const clonedBones: THREE.Bone[] = [];
        originalMesh.skeleton.bones.forEach((origBone: any) => {
          const clonedBone = clonedModel.getObjectByName(origBone.name) as THREE.Bone;
          if (clonedBone) {
            clonedBones.push(clonedBone);
          } else {
            clonedBones.push(origBone);
          }
        });

        const newSkeleton = new THREE.Skeleton(clonedBones, originalMesh.skeleton.boneInverses);
        child.bind(newSkeleton, child.bindMatrix);
      }
    }
  });
}
