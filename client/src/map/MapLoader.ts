import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MapRegistryEntry } from '../../../shared/maps/map-registry';
import { getCachedOrFetchUrl, blobUrlMap, createConfiguredGLTFLoader } from '../../asset-cache';
import { texture, uv, normalMap, uniform, parallaxUV } from 'three/tsl';
import { getSettings } from '../../settings';
import { DS } from '../../design-system';
import { engineContext } from '../../context/ClientEngineContext';

export interface MapSpec {
  id: string;
  version: string;
  displayName: string;
  worldSize: { x: number; z: number };
  sceneGlb?: string;
  zones: any[];
  buildings: any[];
  spawnPoints: any[];
  restrictedGates: any[];
  objective: any;
  props?: { cameras?: any[] };
}

export class MapLoader {
  private spec: MapSpec | null = null;
  private loadedAssets: Map<string, THREE.Group> = new Map();
  private scene: THREE.Scene;
  private mergedMeshes: THREE.Mesh[] = [];
  private centerpieceFlickerTime: number = 0;
  private centerpieceDisc: THREE.Mesh | null = null;
  private sceneAddCallCount: number = 0;
  private concreteWallMat: THREE.MeshStandardMaterial | null = null;
  private disposed = false;
  private groundMap: THREE.CanvasTexture | null = null;
  private groundRoughnessMap: THREE.CanvasTexture | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async load(mapEntry: MapRegistryEntry, isCurrent: () => boolean = () => true): Promise<void> {
    if (this.disposed || !isCurrent()) return;
    if (!mapEntry.specFile) return;

    try {
      const resp = await fetch('/' + mapEntry.specFile);
      this.spec = await resp.json() as MapSpec;
    } catch (e) {
      console.error('Failed to load map spec:', e);
      throw e;
    }

    if (this.disposed || !this.spec || !isCurrent()) return;

    const uniqueMeshes = new Set<string>();
    if (this.spec.sceneGlb) {
      uniqueMeshes.add(this.spec.sceneGlb);
    }
    this.spec.buildings.forEach(b => {
      if (b.meshFile && b.meshType !== 'TYPE_CENTERPIECE') uniqueMeshes.add(b.meshFile);
    });
    if (this.spec.props?.cameras) {
      this.spec.props.cameras.forEach(c => {
        if (c.meshFile) uniqueMeshes.add(c.meshFile);
      });
    }

    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      const baseName = url.substring(url.lastIndexOf("/") + 1);
      if (blobUrlMap.has(baseName)) {
        return blobUrlMap.get(baseName)!;
      }
      return url;
    });

    const loader = createConfiguredGLTFLoader(manager, engineContext.renderer || (window as any).renderer);

    let loaded = 0;
    const total = uniqueMeshes.size;

    const assetDir = mapEntry.assetDirectory || '';
    let browserDir = assetDir;
    if (browserDir.startsWith('client/public/')) {
      browserDir = '/' + browserDir.substring('client/public/'.length);
    }

    const loadPromises = Array.from(uniqueMeshes).map(async (meshFile) => {
      const fullUrl = browserDir + meshFile;
      let cachedUrl = fullUrl;
      try {
          cachedUrl = await getCachedOrFetchUrl(fullUrl, 'Asset');
        } catch (e) {
          console.warn(`[MapLoader] Cache routing failed, falling back:`, e);
        }

        if (this.disposed || !isCurrent()) return;

      return new Promise<void>((resolve, reject) => {
        loader.load(
          cachedUrl,
          (gltf) => {
            if (this.disposed || !isCurrent()) {
              resolve();
              return;
            }
            this.loadedAssets.set(meshFile, gltf.scene);
            loaded++;
            window.dispatchEvent(new CustomEvent('map_load_progress', { detail: { loaded, total } }));
            resolve();
          },
          undefined,
          (err) => {
            console.error('Failed to load ' + meshFile, err);
            reject(err);
          }
        );
      });
    });

    await Promise.all(loadPromises);
  }

  async buildScene(isCurrent: () => boolean = () => true): Promise<void> {
    this.sceneAddCallCount = 0;
    if (this.disposed || !this.spec || !isCurrent()) return;
    console.log('[MAP DEBUG] buildScene called with spec:', JSON.stringify(this.spec).slice(0, 200));

    await this.setupEnvironment();
    if (this.disposed || !isCurrent()) return;

    const zoneGeometries: Map<string, { geom: THREE.BufferGeometry, mat: THREE.Material }[]> = new Map();

    const addMeshToZone = (zoneId: string, mesh: THREE.Mesh) => {
        if (!zoneGeometries.has(zoneId)) zoneGeometries.set(zoneId, []);
        
        // Clone geometry and apply world matrix to bake transformations
        const bGeom = mesh.geometry.clone();
        bGeom.applyMatrix4(mesh.matrixWorld);
        
        if (!bGeom.attributes.uv) {
            const count = bGeom.attributes.position.count;
            bGeom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
        }
        if (!bGeom.attributes.normal) {
            bGeom.computeVertexNormals();
        }
        
        // Ensure standard attributes only, or match them. For simple merging we drop morph targets etc if any.
        const list = zoneGeometries.get(zoneId);
        if (list) {
          list.push({ geom: bGeom, mat: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material });
        }
    };

    const traverseAndCollect = (group: THREE.Group, zoneId: string) => {
        group.updateMatrixWorld(true);
        group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                addMeshToZone(zoneId, child);
            }
        });
    };

    if (this.spec.sceneGlb && this.loadedAssets.has(this.spec.sceneGlb)) {
      const sceneAsset = this.loadedAssets.get(this.spec.sceneGlb)!;
      const clone = sceneAsset.clone();
      const worldCenterX = this.spec.worldSize?.x ? this.spec.worldSize.x / 2 : 384;
      const worldCenterZ = this.spec.worldSize?.z ? this.spec.worldSize.z / 2 : 384;
      clone.position.set(worldCenterX, 0, worldCenterZ);
      clone.updateMatrixWorld(true);
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
      this.scene.add(clone);
      this.mergedMeshes.push(clone as any);
      this.sceneAddCallCount++;
      console.log('[MAP DEBUG] Placed sceneGlb', this.spec.sceneGlb, 'at center:', worldCenterX, 0, worldCenterZ);
    }

    for (const b of this.spec.buildings) {
      if (b.meshType === 'TYPE_CENTERPIECE') {
        if (this.spec.sceneGlb) {
          continue; // Facility GLB already contains the core structure
        }
        const cp = this.buildCenterpiece();
        cp.position.set(b.position.x, b.position.y, b.position.z);
        // Note: Blueprint X=x, Y=z, Z=y typically, but map spec uses x/y/z directly as THREE coordinates.
        // wait, the config coordinateSystem note says: "Blueprint X maps to Three.js X. Blueprint Y maps to Three.js Z. Elevation maps to Three.js Y. Z=0 is ground level"
        // But the spec JSON has y=0 and z=tunnels/depth. Wait, the spec has 'y' as elevation. e.g. position: x:40, y:0, z:200.
        cp.rotation.y = b.rotation.y ? b.rotation.y * Math.PI / 180 : 0;
        this.scene.add(cp);
        this.mergedMeshes.push(cp as any);
      } else if (b.meshFile && this.loadedAssets.has(b.meshFile)) {
        const asset = this.loadedAssets.get(b.meshFile)!;
        const clone = asset.clone();
        
        clone.position.set(b.position.x, b.position.y, b.position.z);
        if (b.rotation) {
          clone.rotation.set(
            b.rotation.x ? b.rotation.x * Math.PI / 180 : 0,
            b.rotation.y ? b.rotation.y * Math.PI / 180 : 0,
            b.rotation.z ? b.rotation.z * Math.PI / 180 : 0
          );
        }
        if (b.scale) {
          clone.scale.set(b.scale.x, b.scale.y, b.scale.z);
        }

        traverseAndCollect(clone, b.zone || 'default');
      }
    }

    // Merge static geometries per zone
    zoneGeometries.forEach((geoms, zoneId) => {
      // Group by material uuid to safely merge
      const matGroups = new Map<string, {geoms: THREE.BufferGeometry[], mat: THREE.Material}>();
      for (const g of geoms) {
          if (!g || !g.geom) continue;
          const mat = g.mat || new THREE.MeshStandardMaterial({ color: 0x888888 });
          const matId = mat.uuid;
          if (!matGroups.has(matId)) matGroups.set(matId, { geoms: [], mat });
          matGroups.get(matId)!.geoms.push(g.geom);
      }

      matGroups.forEach((group) => {
          if (group.geoms.length === 0) return;
          try {
              const mergedGeom = BufferGeometryUtils.mergeGeometries(group.geoms, false);
              if (mergedGeom) {
                  const mesh = new THREE.Mesh(mergedGeom, group.mat);
                  // Spec: "The entire group casts no shadows — shadow maps are disabled"
                  mesh.castShadow = false;
                  mesh.receiveShadow = false;
                  this.mergedMeshes.push(mesh);
                  this.scene.add(mesh);
                  this.sceneAddCallCount++;
              } else {
                  console.warn(`[MAP DEBUG] Failed to merge geometry for zone ${zoneId}: BufferGeometryUtils.mergeGeometries returned null for a group of ${group.geoms.length} geometries.`);
              }
          } catch(e) {
              console.error("Failed to merge geometry for zone", zoneId, e);
          }
      });
    });

    // Add CollisionMap exact representation
    if (this.spec && Array.isArray(this.spec.buildings)) {
      for (const b of this.spec.buildings) {
        if (b && b.position && b.size) {
          const angleRad = b.rotation && b.rotation.y ? (b.rotation.y * Math.PI) / 180 : 0;
          let sizeX = b.size.x || 10;
          let sizeZ = b.size.z || 10;
          if (Math.abs(Math.sin(angleRad)) > 0.707) {
            const temp = sizeX;
            sizeX = sizeZ;
            sizeZ = temp;
          }
          const halfX = sizeX / 2;
          const halfY = (b.size.y || 10) / 2;
          const halfZ = sizeZ / 2;

          const cx = b.position.x;
          const cy = b.position.y + halfY;
          const cz = b.position.z;

          const box3 = new THREE.Box3(
            new THREE.Vector3(cx - halfX, cy - halfY, cz - halfZ),
            new THREE.Vector3(cx + halfX, cy + halfY, cz + halfZ)
          );

          const boxHelper = new THREE.Box3Helper(box3, new THREE.Color(DS.colors.info));
          this.scene.add(boxHelper);
          this.mergedMeshes.push(boxHelper as any);
          (window as any).buildingColliders = (window as any).buildingColliders || [];
          (window as any).buildingColliders.push(boxHelper);
          boxHelper.visible = (window as any).GlobalState?.visDiag?.colliders || false;
        }
      }
    }

    console.log('[MAP DEBUG] Scene build complete. Zones merged:', this.mergedMeshes.length, 'Total draw calls added:', this.sceneAddCallCount);
  }

  private createNoiseTexture(mean: number, amp: number, seed: number): THREE.CanvasTexture {
    const S = 256;
    const G = 16;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);

    const img = ctx.createImageData(S, S);
    let s = seed >>> 0;
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    const lat = new Float32Array(G * G);
    for (let i = 0; i < lat.length; i++) lat[i] = rnd();
    const sm = (t: number) => t * t * (3 - 2 * t);
    const oct = (u: number, v: number, g: number) => {
      const x = u * g;
      const y = v * g;
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const fx = sm(x - xi);
      const fy = sm(y - yi);
      const x0 = xi % G;
      const y0 = yi % G;
      const x1 = (x0 + 1) % G;
      const y1 = (y0 + 1) % G;
      const a = lat[y0 * G + x0];
      const b = lat[y0 * G + x1];
      const d = lat[y1 * G + x0];
      const e = lat[y1 * G + x1];
      return (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
    };
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        const n = oct(u, v, 4) * 0.35 + oct(u, v, 8) * 0.3 + oct(u, v, 16) * 0.2 + oct(u, v, 32) * 0.15;
        const m = mean + (n - 0.5) * 2 * amp;
        const i = (y * S + x) * 4;
        const g = Math.max(0, Math.min(255, Math.round(m * 255)));
        img.data[i] = g;
        img.data[i + 1] = g;
        img.data[i + 2] = g;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(60, 49);
    t.anisotropy = 4;
    return t;
  }

  async setupEnvironment(): Promise<void> {
    if (!this.spec) return;

    this.concreteWallMat = new THREE.MeshStandardMaterial({
      color: 0x5a6372,
      roughness: 0.8,
      metalness: 0.1
    });

    // Ground micro-variation pass matching authoring benchmarks
    this.groundMap = this.createNoiseTexture(0.75, 0.05, 0x9e3779b9);
    this.groundRoughnessMap = this.createNoiseTexture(0.9, 0.04, 0x85ebca6b);

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x7b7567,
      roughness: 1.0,
      metalness: 0.0,
      map: this.groundMap,
      roughnessMap: this.groundRoughnessMap
    });

    const { x: wX, z: wZ } = this.spec.worldSize;
    const groundW = Math.max(wX, 2200);
    const groundZ = Math.max(wZ, 1800);
    const groundGeom = new THREE.PlaneGeometry(groundW, groundZ);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    // Center at world center, slightly below Y=0 to avoid z-fighting with facility ground elements
    groundMesh.position.set(wX / 2, -0.05, wZ / 2);
    groundMesh.castShadow = false;
    groundMesh.receiveShadow = false;
    this.scene.add(groundMesh);
    this.mergedMeshes.push(groundMesh);

    // Background and Fog setup
    const SKY = new THREE.Color(0xa8bdd2);
    this.scene.background = SKY;
    this.scene.fog = new THREE.FogExp2(SKY.getHex(), 0.0007);

    if ((this.scene as any).fogNode) {
      (this.scene as any).fogNode = null;
    }

    // HDR skybox enhancement if available
    try {
      const skyboxUrl = await getCachedOrFetchUrl('qwantani_dusk_2_puresky_4k.hdr', 'Asset');
      if (skyboxUrl) {
        const rgbeLoader = new HDRLoader();
        rgbeLoader.load(skyboxUrl, (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          this.scene.background = texture;
          this.scene.environment = texture;
          console.log('[ENV DEBUG] Skybox loaded successfully.');
        }, undefined, () => {});
      }
    } catch (e) {}

    // Key directional light: raking sunlight across the facility
    const dirLight = new THREE.DirectionalLight(0xfff2dd, 1.8);
    dirLight.position.set(-450 + (wX / 2), 380, 320 + (wZ / 2));
    this.scene.add(dirLight);
    this.mergedMeshes.push(dirLight as any);

    // Atmosphere ambient fill
    const hemiLight = new THREE.HemisphereLight(SKY, 0x4a4842, 0.35);
    this.scene.add(hemiLight);
    this.mergedMeshes.push(hemiLight as any);
  }

  private buildCenterpiece(): THREE.Group {
    const group = new THREE.Group();
    
    // Base 80x24x80 dark concrete #1a1a1a
    const baseGeom = new THREE.BoxGeometry(80, 24, 80);
    // Move base up so bottom is at y=0 (height is 24, center is y=12)
    baseGeom.translate(0, 12, 0);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.1 });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    group.add(baseMesh);

    // 3 server tower columns, 8x20x8 #0d0d0d emissive #FF4500
    const towerGeom = new THREE.BoxGeometry(8, 20, 8);
    towerGeom.translate(0, 10, 0); // Center above base
    const towerMat = new THREE.MeshStandardMaterial({ 
        color: 0x0A0A0A, 
        emissive: DS.colors.accent, 
        emissiveIntensity: 0.3,
        roughness: 0.7
    });

    const tower1 = new THREE.Mesh(towerGeom, towerMat);
    tower1.position.set(0, 24, 0); // Center column
    group.add(tower1);
    
    const tower2 = new THREE.Mesh(towerGeom, towerMat);
    tower2.position.set(-20, 24, 20); // Side column
    group.add(tower2);

    const tower3 = new THREE.Mesh(towerGeom, towerMat);
    tower3.position.set(20, 24, -20); // Side column
    group.add(tower3);

    // Flat disc geometry 6 diameter
    const discGeom = new THREE.CylinderGeometry(3, 3, 0.5, 32);
    const discMat = new THREE.MeshStandardMaterial({
        color: 0xE8E8E8,
        emissive: 0xE8E8E8,
        emissiveIntensity: 1.0
    });
    this.centerpieceDisc = new THREE.Mesh(discGeom, discMat);
    this.centerpieceDisc.position.set(0, 24 + 20 + 2, 0);
    
    // Face forward
    this.centerpieceDisc.rotation.x = Math.PI / 2;
    group.add(this.centerpieceDisc);

    return group;
  }

  placeProps(isCurrent: () => boolean = () => true): void {
    if (this.disposed || !this.spec?.props?.cameras || !isCurrent()) return;

    for (const prop of this.spec.props.cameras) {
      if (this.disposed || !isCurrent()) return;
      if (prop.meshFile && this.loadedAssets.has(prop.meshFile)) {
        const asset = this.loadedAssets.get(prop.meshFile)!;
        const clone = asset.clone();
        clone.position.set(prop.position.x, prop.position.y, prop.position.z);
        if (prop.rotation) {
          clone.rotation.set(
            prop.rotation.x ? prop.rotation.x * Math.PI / 180 : 0,
            prop.rotation.y ? prop.rotation.y * Math.PI / 180 : 0,
            prop.rotation.z ? prop.rotation.z * Math.PI / 180 : 0
          );
        }
        if (prop.scale) {
          clone.scale.set(prop.scale.x, prop.scale.y, prop.scale.z);
        } else {
          clone.scale.set(1, 1, 1);
        }
        this.mergedMeshes.push(clone as any as THREE.Mesh); // Track to dispose
        this.scene.add(clone);
        this.sceneAddCallCount++;
      } else if (prop.placeholder || !prop.meshFile) {
        // Create a simple red sphere as a placeholder for cameras
        const geom = new THREE.SphereGeometry(0.2, 8, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(prop.position.x, prop.position.y, prop.position.z);
        this.scene.add(mesh);
        this.mergedMeshes.push(mesh);
        this.sceneAddCallCount++;
      }
    }
  }

  update(deltaTime: number) {
      if (this.centerpieceDisc) {
          this.centerpieceFlickerTime += deltaTime;
          const mat = this.centerpieceDisc.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.5 + 0.5 * Math.sin(this.centerpieceFlickerTime * 5.0);
      }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const collectResources = (root: THREE.Object3D) => {
      root.traverse((child: any) => {
        if (child.geometry) geometries.add(child.geometry);
        if (child.material) {
          for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
            materials.add(material);
          }
        }
      });
    };

    for (const mesh of this.mergedMeshes) {
      this.scene.remove(mesh);
      collectResources(mesh);
    }
    for (const asset of this.loadedAssets.values()) {
      collectResources(asset);
    }

    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.mergedMeshes = [];
    this.loadedAssets.clear();
    this.spec = null;
    this.concreteWallMat?.dispose();
    this.concreteWallMat = null;
    if (this.groundMap) {
      this.groundMap.dispose();
      this.groundMap = null;
    }
    if (this.groundRoughnessMap) {
      this.groundRoughnessMap.dispose();
      this.groundRoughnessMap = null;
    }
    if (this.centerpieceDisc) {
        this.centerpieceDisc = null;
    }
  }
}
