/**
 * TempDebugEnvironment.ts
 *
 * Temporary self-contained debug skybox and illumination rig for map debugging.
 * ponytail: Temporary self-contained debug lighting and skybox for map visibility.
 * Ceiling: Procedural daylight/overcast gradient equirectangular texture, sky dome mesh, directional sun + fill lights, ambient light.
 * Upgrade path: Remove this module and its single hook in VisualsSystem.ts once finalized HDRI and baked lighting passes are loaded.
 */
import * as THREE from 'three/webgpu';

export interface TempDebugEnvironmentHandle {
  remove: () => void;
}

const DEBUG_TAG_PREFIX = 'TEMP_DEBUG_ENV_';

interface StoredEnvironmentState {
  prevBackground: THREE.Color | THREE.Texture | null;
  prevEnvironment: THREE.Texture | null;
  prevFog: THREE.Fog | THREE.FogExp2 | null;
  prevFogNode: any;
}

export function applyTempDebugEnvironment(
  scene: THREE.Scene,
  renderer?: any
): TempDebugEnvironmentHandle {
  // 1. Remove any existing debug environment to prevent duplicates
  removeTempDebugEnvironment(scene);

  // 2. Save previous scene properties for clean restoration
  const savedState: StoredEnvironmentState = {
    prevBackground: scene.background,
    prevEnvironment: scene.environment,
    prevFog: scene.fog,
    prevFogNode: (scene as any).fogNode ?? null
  };

  // 3. Generate a clean procedural daylight/overcast gradient equirectangular texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#4a75a0');  // Zenith sky blue
    grad.addColorStop(0.46, '#9cb8d9'); // Atmospheric horizon
    grad.addColorStop(0.50, '#cad8e6'); // Horizon haze line
    grad.addColorStop(0.53, '#8b918d'); // Ground horizon haze
    grad.addColorStop(1.0, '#36393b');  // Neutral ground base
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
  }

  const skyTexture = new THREE.CanvasTexture(canvas);
  skyTexture.mapping = THREE.EquirectangularReflectionMapping;
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  skyTexture.needsUpdate = true;

  // Apply to scene background and environment
  scene.background = skyTexture;

  if (renderer && typeof (THREE as any).PMREMGenerator === 'function') {
    try {
      const pmrem = new (THREE as any).PMREMGenerator(renderer);
      scene.environment = pmrem.fromEquirectangular(skyTexture).texture;
      pmrem.dispose();
    } catch {
      scene.environment = skyTexture;
    }
  } else {
    scene.environment = skyTexture;
  }

  // Disable/lift the pitch-black 70-unit fog so map visibility is unobstructed
  scene.fog = null;
  if ((scene as any).fogNode) {
    (scene as any).fogNode = null;
  }

  // 4. Procedural Sky Dome Mesh (1400 radius, centered around world center 384, 0, 384)
  const skyGeom = new THREE.SphereGeometry(1400, 32, 16);
  skyGeom.scale(-1, 1, 1);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTexture,
    depthWrite: false,
    side: THREE.BackSide
  });
  const skyMesh = new THREE.Mesh(skyGeom, skyMat);
  skyMesh.name = `${DEBUG_TAG_PREFIX}SKY_DOME`;
  skyMesh.position.set(384, 0, 384);
  skyMesh.renderOrder = -1000;
  scene.add(skyMesh);

  // 5. Directional Sun Light (high angle, broad coverage over facility 768x768)
  const sunLight = new THREE.DirectionalLight(0xfff6eb, 2.4);
  sunLight.name = `${DEBUG_TAG_PREFIX}SUN_LIGHT`;
  sunLight.position.set(200, 350, 200);
  sunLight.target.position.set(384, 0, 384);
  sunLight.castShadow = false;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // 6. Secondary Fill Directional Light (opposite angle, cooler bounce)
  const fillLight = new THREE.DirectionalLight(0xaad0f0, 1.2);
  fillLight.name = `${DEBUG_TAG_PREFIX}FILL_LIGHT`;
  fillLight.position.set(550, 250, 550);
  fillLight.target.position.set(384, 0, 384);
  fillLight.castShadow = false;
  scene.add(fillLight);
  scene.add(fillLight.target);

  // 7. Hemisphere Light (sky / ground balance)
  const hemiLight = new THREE.HemisphereLight(0xccddf0, 0x66635a, 1.4);
  hemiLight.name = `${DEBUG_TAG_PREFIX}HEMI_LIGHT`;
  hemiLight.position.set(384, 400, 384);
  scene.add(hemiLight);

  // 8. Ambient light for baseline visibility in shadowed corridors
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  ambientLight.name = `${DEBUG_TAG_PREFIX}AMBIENT_LIGHT`;
  scene.add(ambientLight);

  const cleanup = () => {
    removeTempDebugEnvironment(scene, savedState);
  };

  (window as any).__removeTempDebugEnvironment = cleanup;
  console.log('[TempDebugEnvironment] Temporary skybox and lighting active for debugging.');

  return { remove: cleanup };
}

export function removeTempDebugEnvironment(
  scene: THREE.Scene,
  restore?: StoredEnvironmentState
): void {
  const toRemove: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.name && obj.name.startsWith(DEBUG_TAG_PREFIX)) {
      toRemove.push(obj);
    }
  });

  for (const obj of toRemove) {
    scene.remove(obj);
    if ((obj as THREE.Mesh).geometry) {
      (obj as THREE.Mesh).geometry.dispose();
    }
    if ((obj as THREE.Mesh).material) {
      const mat = (obj as THREE.Mesh).material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => {
          if ((m as any).map) (m as any).map.dispose();
          m.dispose();
        });
      } else {
        if ((mat as any).map) (mat as any).map.dispose();
        mat.dispose();
      }
    }
  }

  if (restore) {
    scene.background = restore.prevBackground;
    scene.environment = restore.prevEnvironment;
    scene.fog = restore.prevFog;
    if ((scene as any).fogNode !== undefined) {
      (scene as any).fogNode = restore.prevFogNode;
    }
  }

  delete (window as any).__removeTempDebugEnvironment;
}
