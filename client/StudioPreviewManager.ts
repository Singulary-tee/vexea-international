import * as THREE from "three/webgpu";
import { DS } from "./design-system";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { getCachedOrFetchUrl, createConfiguredGLTFLoader } from "./asset-cache";
import { applyScenicGripPose } from "./weapons/GripSystem";

export type StudioMode = 'MAIN_MENU' | 'ARMORY' | 'STORE' | 'LOBBY' | 'INACTIVE';

export interface WeaponSkin {
  id: string;
  name: string;
  textureFile: string | null; // null represents base gltf texture
  previewBg: string;
}

export const AVAILABLE_SKINS: Record<string, WeaponSkin> = {
  STANDARD: { id: 'STANDARD', name: 'STANDARD FINISH', textureFile: null, previewBg: '#111111' },
  HAZARD: { id: 'HAZARD', name: 'HAZARD COATING', textureFile: null, previewBg: '#2a1a10' }
};

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

  constructor() {
    this.studioScene = new THREE.Scene();
    this.studioScene.background = null; // TRANSPARENT CANVAS

    this.studioCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
    this.studioCamera.position.set(0, 0.0, 2.0);
    this.studioCamera.lookAt(0, 0, 0);

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

    // Build default character model
    this.buildShowcaseModel('Player_one-optimized.glb', 'STANDARD');
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
    this.currentMode = mode;
    this.containerEl = container;

    let itemToLoad = options?.itemKey || this.activeItemKey;
    if (mode === 'MAIN_MENU' && !options?.itemKey) {
      itemToLoad = "Player_one-optimized.glb";
    }

    this.setShowcaseItem(itemToLoad, options?.skinId || this.activeSkinId);

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

  public setShowcaseItem(itemKey: string, skinId?: string): void {
    this.activeItemKey = itemKey;
    if (skinId !== undefined) {
      this.activeSkinId = skinId;
    }
    this.buildShowcaseModel(itemKey, this.activeSkinId);
  }

  private async buildShowcaseModel(itemKey: string, skinId: string): Promise<void> {
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
      const loader = createConfiguredGLTFLoader();
      const url = await getCachedOrFetchUrl(glbName, "Asset");
      const gltf = await loader.loadAsync(url);
      
      // Use SkeletonUtils to clone model safely
      const model = SkeletonUtils.clone(gltf.scene) as THREE.Group;
      
      // Fix bone binding mapping for SkinnedMesh in cloned WebGPU model hierarchy
      fixSkinnedMeshBones(model, gltf.scene);
      
      // Setup Animation Mixer if clips are available
      this.activeMixer = null;
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        this.activeMixer = mixer;
        let clip = gltf.animations.find(a => a.name.toLowerCase().includes("idle"));
        if (!clip) {
          clip = gltf.animations[0];
        }
        if (clip) {
          mixer.clipAction(clip).play();
        }
      }

      // Initial clean rotation
      model.rotation.set(0, -Math.PI / 2, 0);

      // Hide temporarily during calculations and texture setup
      model.visible = false;
      this.activeModelGroup.add(model);
      model.updateMatrixWorld(true);

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

      const isCharacter = glbName.toLowerCase().includes('player') || 
                          glbName.toLowerCase().includes('character') || 
                          glbName.toLowerCase().includes('humanoid') || 
                          glbName.toLowerCase().includes('soldier');

      let targetScaleVal = 1.0;

      if (isCharacter) {
        model.position.set(-0.43, -1.35, 0.69);
        model.rotation.set(-0.001592653589793, 2.09840734641021, 0);
        model.scale.set(1.35, 1.35, 1.35);

        if (this.keyLight) this.keyLight.intensity = 0;
        if (this.rimLight) this.rimLight.intensity = 1.9;
        if (this.ambientLight) this.ambientLight.intensity = 0.2;
      } else {
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

        if (weaponMeshes.length > 0) {
          const box = new THREE.Box3();
          weaponMeshes.forEach(mesh => {
            mesh.updateMatrixWorld(true);
            const meshBox = new THREE.Box3().setFromObject(mesh);
            box.union(meshBox);
          });

          const center = new THREE.Vector3();
          box.getCenter(center);
          const size = new THREE.Vector3();
          box.getSize(size);

          model.position.sub(center);

          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            targetScaleVal = 0.65 / maxDim;
          }
        } else {
          model.position.set(0, 0, 0);
          targetScaleVal = 1.5;
        }
      }

      model.userData.baseScaleVal = targetScaleVal;

      const skin = AVAILABLE_SKINS[skinId] || AVAILABLE_SKINS.STANDARD;
      await this.applySkinToModelAsync(model, skin.textureFile);

      model.userData.targetScale = new THREE.Vector3(targetScaleVal, targetScaleVal, targetScaleVal);
      model.scale.copy(model.userData.targetScale);
      model.visible = true;

      const childrenToRemove = this.activeModelGroup.children.filter(child => child !== model);
      childrenToRemove.forEach(child => {
        this.activeModelGroup.remove(child);
      });

      this.lastLoadedModel = model;
      this.lastLoadedGlbName = glbName;
      if (this._onModelLoaded) {
        this._onModelLoaded(model, glbName);
      }

    } catch (err) {
      console.error("[StudioPreview] GLTF Showcase Load Failed:", err);
    }
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
    const baseAspect = 16 / 9;
    const baseFov = 45;

    if (aspect < baseAspect) {
      const vFovRad = 2 * Math.atan(Math.tan((baseFov * Math.PI / 180) / 2) * (baseAspect / aspect));
      this.studioCamera.fov = vFovRad * (180 / Math.PI);
    } else {
      this.studioCamera.fov = baseFov;
    }

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

    // Slow turntable rotation when idle
    if (!this.isDragging && this.turntableEnabled) {
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
