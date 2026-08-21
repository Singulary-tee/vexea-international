import * as THREE from "three/webgpu";
import { VFX_CONSTANTS } from "./constants";

export interface ExplosionInstance {
  pos: THREE.Vector3;
  light: THREE.PointLight | null;
  life: number;
  maxLife: number;
  scale: number;
  active: boolean;
}

const POOL_SIZE = 4;
const LARGE_LIGHTS_COUNT = 1; // Cap explosion point lights to 1 max
const explosionPool: ExplosionInstance[] = [];

let _scene: THREE.Scene;

export function initLargeVFX(scene: THREE.Scene, hasLights: boolean) {
  _scene = scene;
  explosionPool.length = 0;

  // Create Explosion light instances
  for (let i = 0; i < POOL_SIZE; i++) {
    let light: THREE.PointLight | null = null;
    if (hasLights && i < LARGE_LIGHTS_COUNT) {
      light = new THREE.PointLight(
        VFX_CONSTANTS.FIRING.LIGHT_COLOR,
        0,
        VFX_CONSTANTS.LARGE.EXPLOSION_LIGHT_DISTANCE,
        1.5
      );
      // Keep PointLights visible at all times under WebGPU, setting intensity to 0 when inactive.
      light.visible = true;
      _scene.add(light);
    }

    explosionPool.push({
      pos: new THREE.Vector3(),
      light,
      life: 0,
      maxLife: VFX_CONSTANTS.LARGE.EXPLOSION_LIFETIME,
      scale: 1.0,
      active: false
    });
  }
}

export function triggerExplosion(pos: THREE.Vector3, scale = 1.0) {
  let inst: ExplosionInstance | null = null;
  for (let i = 0; i < POOL_SIZE; i++) {
    if (!explosionPool[i].active) {
      inst = explosionPool[i];
      break;
    }
  }

  if (!inst && explosionPool.length > 0) {
    inst = explosionPool[0]; // Recycle first
  }

  if (inst) {
    inst.active = true;
    inst.pos.copy(pos);
    inst.life = VFX_CONSTANTS.LARGE.EXPLOSION_LIFETIME;
    inst.scale = scale;

    if (inst.light) {
      inst.light.position.copy(pos);
      inst.light.intensity = VFX_CONSTANTS.LARGE.EXPLOSION_LIGHT_INTENSITY * scale;
    }
  }
}

export function updateLargeVFX(deltaTime: number, _camera?: THREE.PerspectiveCamera) {
  // Update explosion lights
  for (let i = 0; i < POOL_SIZE; i++) {
    const inst = explosionPool[i];
    if (inst.active) {
      inst.life -= deltaTime;
      if (inst.life <= 0) {
        inst.active = false;
        if (inst.light) {
          inst.light.intensity = 0;
        }
      } else {
        const progress = inst.life / inst.maxLife; // 1.0 -> 0.0
        if (inst.light) {
          inst.light.intensity = VFX_CONSTANTS.LARGE.EXPLOSION_LIGHT_INTENSITY * inst.scale * progress;
        }
      }
    }
  }
}

export function clearLargeVFX() {
  for (let i = 0; i < POOL_SIZE; i++) {
    const inst = explosionPool[i];
    inst.active = false;
    inst.life = 0;
    if (inst.light) {
      inst.light.intensity = 0;
    }
  }
}

