import * as THREE from "three/webgpu";
import { DS } from "./design-system";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { getCachedOrFetchUrl } from "./asset-cache";

export type StudioMode = 'MAIN_MENU' | 'ARMORY' | 'STORE' | 'LOBBY' | 'INACTIVE';

export interface WeaponSkin {
  id: string;
  name: string;
  textureFile: string | null; // null represents base gltf texture
  previewBg: string;
}

export const AVAILABLE_SKINS: Record<string, WeaponSkin> = {
  STANDARD: { id: 'STANDARD', name: 'STANDARD FINISH', textureFile: null, previewBg: '#111111' },
  HAZARD: { id: 'HAZARD', name: 'HAZARD COATING', textureFile: 'asphalt_02_diff_1k.jpg', previewBg: '#2a1a10' }
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
  
  // Interactive Drag State
  private isDragging = false;
  private previousMouseX = 0;
  private dragSensitivity = 0.008;

  // Active showcase item state
  private activeItemKey = 'rifle';
  private activeSkinId = 'STANDARD';

  constructor() {
    this.studioScene = new THREE.Scene();
    this.studioScene.background = null; // TRANSPARENT CANVAS

    this.studioCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
    this.studioCamera.position.set(0, 0.0, 2.0);
    this.studioCamera.lookAt(0, 0, 0);

    // Setup Studio Lighting (Clean, neutral colors - NO NEON)
    const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.keyLight.position.set(3, 4, 3);

    this.rimLight = new THREE.DirectionalLight(0x8899aa, 1.5);
    this.rimLight.position.set(-3, 2, -3);

    this.studioScene.add(ambLight, this.keyLight, this.rimLight);

    // Build Studio Stage - No pedestal or grid helpers
    this.stageGroup = new THREE.Group();
    
    this.activeModelGroup = new THREE.Group();
    this.activeModelGroup.position.set(0, 0, 0);
    this.stageGroup.add(this.activeModelGroup);

    this.studioScene.add(this.stageGroup);

    // Build default model
    this.buildShowcaseModel('rifle', 'STANDARD');
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

  public attachTo(container: HTMLElement, mode: StudioMode, options?: { itemKey?: string; skinId?: string }): void {
    this.currentMode = mode;
    this.containerEl = container;

    if (options?.itemKey || options?.skinId) {
      this.setShowcaseItem(options.itemKey || this.activeItemKey, options.skinId || this.activeSkinId);
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
    if (itemKey === 'rifle' || itemKey === 'm4_rifle' || itemKey === 'lmg' || itemKey === 'shotgun' || itemKey === 'sniper' || itemKey.includes('rifle_')) {
      glbName = "smg_fps_animations.glb";
    } else if (itemKey === 'pistol' || itemKey === 'viper_pistol' || itemKey.includes('pistol_')) {
      glbName = "animated_pistol.glb";
    } else if (itemKey === 'grenade' || itemKey === 'frag_grenade' || itemKey.includes('grenade_') || itemKey.includes('flash_') || itemKey.includes('emp_') || itemKey.includes('c4_')) {
      glbName = "grenade.glb";
    } else {
      // Fallback for other items (e.g. medkit, radio, disruptor, revive)
      glbName = "grenade.glb";
    }

    if (glbName) {
      try {
        const loader = new GLTFLoader();
        const url = await getCachedOrFetchUrl(glbName, "Asset");
        const gltf = await loader.loadAsync(url);
        
        // Clone the model so we don't interfere with other instances
        const model = gltf.scene.clone();
        
        // Initial clean rotation
        model.rotation.set(0, -Math.PI / 2, 0); // Side view

        // Hide temporarily during calculations and texture setup
        model.visible = false;
        this.activeModelGroup.add(model);
        model.updateMatrixWorld(true);

        // Senior Engine Implementer Trick: Auto-center and auto-scale model based on weapon mesh bounding box, ignoring pelvis rig offset
        let weaponMeshes: THREE.Mesh[] = [];
        model.traverse((child: any) => {
          if (child.isMesh && child.visible) {
            const name = child.name.toLowerCase();
            // Avoid including arms or player character body meshes in bounds calculations
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

        let targetScaleVal = 1.0;
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

          // Center the entire model relative to the weapon mesh center
          model.position.sub(center);

          // Scale so the weapon's largest dimension is exactly 0.65 units inside the 2.0 distance camera view
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            targetScaleVal = 0.65 / maxDim;
          }
        } else {
          // Fallback static sizing
          model.position.set(0, 0, 0);
          targetScaleVal = 1.5;
        }

        // Apply skin texture asynchronously
        const skin = AVAILABLE_SKINS[skinId] || AVAILABLE_SKINS.STANDARD;
        await this.applySkinToModelAsync(model, skin.textureFile);

        // Store target scale and start at 0 for a beautiful transition
        model.userData.targetScale = new THREE.Vector3(targetScaleVal, targetScaleVal, targetScaleVal);
        model.scale.set(0, 0, 0);
        model.visible = true;

        // Clean up older model instances seamlessly with no empty frames/popping
        const childrenToRemove = this.activeModelGroup.children.filter(child => child !== model);
        childrenToRemove.forEach(child => {
          this.activeModelGroup.remove(child);
        });

      } catch (err) {
        console.error("[StudioPreview] GLTF Showcase Load Failed:", err);
      }
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

    this.studioCamera.aspect = width / height;
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

    // Slow turntable rotation when idle
    if (!this.isDragging) {
      this.activeModelGroup.rotation.y += dt * 0.4;
    }

    // Subtle lighting motion
    this.keyLight.position.x = 3 + Math.sin(performance.now() * 0.001) * 0.5;
  }
}

export const StudioPreviewManager = new StudioPreviewManagerImpl();
