import * as THREE from "three/webgpu";
import { VFX_CONSTANTS } from "./constants";
import { MatchController } from "../../MatchController";
import { triggerMuzzleFlipbook } from "./flipbooks";

export interface NiagaraMuzzleFlash {
  light: THREE.PointLight | null;
  life: number;
  maxLife: number;
  scaleFactor: number;
  
  // Zero-Allocation Attachment Fields
  attachToPlayer: boolean;
  attachToDroneId: number | null;
  localOffset: THREE.Vector3;
  localSpikeQuat: THREE.Quaternion;
}

const flashPool: NiagaraMuzzleFlash[] = [];
const POOL_SIZE = 8;
const POOL_LIGHTS_COUNT = 2; // Capped to 2 point lights max to preserve fragment shader performance
let _scene: THREE.Scene;

// Pre-allocated math cache objects for Zero-GC during ticks
const _tempDronePos = new THREE.Vector3();
const _tempDroneQuat = new THREE.Quaternion();
const _tempOffset = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempFlashQuat = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);

export function getFirstNiagaraFlash(): NiagaraMuzzleFlash | null {
  return flashPool.length > 0 ? flashPool[0] : null;
}

export function initFiringVFX(scene: THREE.Scene, hasLights: boolean) {
  _scene = scene;
  flashPool.length = 0;

  for (let i = 0; i < POOL_SIZE; i++) {
    let light: THREE.PointLight | null = null;
    if (hasLights && i < POOL_LIGHTS_COUNT) {
      light = new THREE.PointLight(
        VFX_CONSTANTS.FIRING.LIGHT_COLOR,
        0,
        VFX_CONSTANTS.FIRING.LIGHT_DISTANCE,
        VFX_CONSTANTS.FIRING.LIGHT_DECAY
      );
      // Keep visible = true constant under WebGPU to avoid cache invalidations/pipeline rebuilds.
      // Modulate intensity between 0 and active intensity instead.
      light.visible = true;
      _scene.add(light);
    }

    flashPool.push({
      light,
      life: 0,
      maxLife: VFX_CONSTANTS.FIRING.FLASH_DURATION,
      scaleFactor: 1.0,
      attachToPlayer: false,
      attachToDroneId: null,
      localOffset: new THREE.Vector3(),
      localSpikeQuat: new THREE.Quaternion()
    });
  }
}

export function triggerNiagaraFlash(
  muzzlePos: THREE.Vector3,
  direction: THREE.Vector3,
  scale = 1.0,
  attachToPlayer = false,
  attachToDroneId: number | null = null,
  match?: MatchController
) {
  const sFactor = scale * VFX_CONSTANTS.FIRING.FLASH_SCALE_MULTIPLIER;
  triggerMuzzleFlipbook(muzzlePos.x, muzzlePos.y, muzzlePos.z, sFactor);

  let inst: NiagaraMuzzleFlash | null = null;
  for (let i = 0; i < POOL_SIZE; i++) {
    if (flashPool[i].life <= 0) {
      inst = flashPool[i];
      break;
    }
  }

  // Fallback to oldest
  if (!inst && flashPool.length > 0) {
    let oldestIdx = 0;
    let minLife = flashPool[0].life;
    for (let i = 1; i < POOL_SIZE; i++) {
      if (flashPool[i].life < minLife) {
        minLife = flashPool[i].life;
        oldestIdx = i;
      }
    }
    inst = flashPool[oldestIdx];
  }

  if (inst) {
    inst.life = VFX_CONSTANTS.FIRING.FLASH_DURATION;
    inst.maxLife = VFX_CONSTANTS.FIRING.FLASH_DURATION;
    inst.scaleFactor = sFactor;
    inst.attachToPlayer = attachToPlayer;
    inst.attachToDroneId = attachToDroneId;

    _tempFlashQuat.setFromUnitVectors(_zAxis, direction);

    if (attachToPlayer) {
      // Store camera relative local orientation and offset so it rotates with player camera
      const camera = (window as any).camera;
      if (camera) {
        _tempQuat.copy(camera.quaternion).invert();
        inst.localSpikeQuat.copy(_tempFlashQuat).premultiply(_tempQuat);
        
        inst.localOffset.copy(muzzlePos).sub(camera.position);
        inst.localOffset.applyQuaternion(_tempQuat);
      } else {
        inst.localOffset.set(0, 0, 0);
        inst.localSpikeQuat.copy(_tempFlashQuat);
      }
    } else if (attachToDroneId !== null && match && match.droneJitterMap) {
      const buffer = match.droneJitterMap.get(attachToDroneId);
      if (buffer && buffer.count > 0) {
        const latest = buffer.getLatest();
        const clientX = (latest as any).clientPosX !== undefined ? (latest as any).clientPosX : latest.posX;
        const clientY = (latest as any).clientPosY !== undefined ? (latest as any).clientPosY : latest.posY;
        const clientZ = (latest as any).clientPosZ !== undefined ? (latest as any).clientPosZ : latest.posZ;
        
        _tempDronePos.set(clientX, clientY, clientZ);
        inst.localOffset.copy(muzzlePos).sub(_tempDronePos);

        const clientRotX = (latest as any).clientRotX !== undefined ? (latest as any).clientRotX : latest.rotX;
        const clientRotY = (latest as any).clientRotY !== undefined ? (latest as any).clientRotY : latest.rotY;
        const clientRotZ = (latest as any).clientRotZ !== undefined ? (latest as any).clientRotZ : latest.rotZ;
        const clientRotW = (latest as any).clientRotW !== undefined ? (latest as any).clientRotW : latest.rotW;

        _tempDroneQuat.set(clientRotX, clientRotY, clientRotZ, clientRotW);
        inst.localOffset.applyQuaternion(_tempDroneQuat.invert());

        // Compute local rotation relative to the drone's orientation
        _tempDroneQuat.set(clientRotX, clientRotY, clientRotZ, clientRotW).invert();
        inst.localSpikeQuat.copy(_tempFlashQuat).premultiply(_tempDroneQuat);
      } else {
        inst.localOffset.set(0, 0, 0);
        inst.localSpikeQuat.copy(_tempFlashQuat);
      }
    } else {
      inst.localOffset.set(0, 0, 0);
      inst.localSpikeQuat.copy(_tempFlashQuat);
    }

    if (inst.light) {
      inst.light.position.copy(muzzlePos);
      inst.light.intensity = VFX_CONSTANTS.FIRING.LIGHT_INTENSITY * sFactor;
    }
  }
}

export function updateFiringVFX(deltaTime: number, camera: THREE.PerspectiveCamera, match?: MatchController) {
  for (let i = 0; i < flashPool.length; i++) {
    const inst = flashPool[i];
    if (inst.life > 0) {
      inst.life -= deltaTime;
      if (inst.life <= 0) {
        if (inst.light) {
          // Never change PointLight visibility under WebGPU. Keep visible = true and set intensity = 0 instead.
          inst.light.intensity = 0;
        }
      } else {
        // Handle Dynamic Attachment for pooled PointLight
        if (inst.attachToPlayer) {
          _tempOffset.copy(inst.localOffset).applyQuaternion(camera.quaternion);
          if (inst.light) {
            inst.light.position.copy(camera.position).add(_tempOffset);
          }
        } else if (inst.attachToDroneId !== null && match && match.droneJitterMap) {
          const buffer = match.droneJitterMap.get(inst.attachToDroneId);
          if (buffer && buffer.count > 0) {
            const latest = buffer.getLatest();
            const clientX = (latest as any).clientPosX !== undefined ? (latest as any).clientPosX : latest.posX;
            const clientY = (latest as any).clientPosY !== undefined ? (latest as any).clientPosY : latest.posY;
            const clientZ = (latest as any).clientPosZ !== undefined ? (latest as any).clientPosZ : latest.posZ;
            
            const clientRotX = (latest as any).clientRotX !== undefined ? (latest as any).clientRotX : latest.rotX;
            const clientRotY = (latest as any).clientRotY !== undefined ? (latest as any).clientRotY : latest.rotY;
            const clientRotZ = (latest as any).clientRotZ !== undefined ? (latest as any).clientRotZ : latest.rotZ;
            const clientRotW = (latest as any).clientRotW !== undefined ? (latest as any).clientRotW : latest.rotW;

            _tempDronePos.set(clientX, clientY, clientZ);
            _tempDroneQuat.set(clientRotX, clientRotY, clientRotZ, clientRotW);

            _tempOffset.copy(inst.localOffset).applyQuaternion(_tempDroneQuat);

            if (inst.light) {
              inst.light.position.copy(_tempDronePos).add(_tempOffset);
            }
          }
        }

        const progress = inst.life / inst.maxLife; // 1.0 -> 0.0
        if (inst.light) {
          inst.light.intensity = VFX_CONSTANTS.FIRING.LIGHT_INTENSITY * inst.scaleFactor * progress;
        }
      }
    }
  }
}

export function clearFiringVFX() {
  for (let i = 0; i < flashPool.length; i++) {
    const inst = flashPool[i];
    inst.life = 0;
    if (inst.light) {
      inst.light.intensity = 0;
    }
  }
}
