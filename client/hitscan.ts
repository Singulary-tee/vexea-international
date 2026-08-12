import * as THREE from "three";
import { spawnEnvironmentDecalAndDust, spawnImpactSparks } from "./src/vfx/VFXOrchestrator";
import { DroneType, DRONE_CONFIGS } from "../shared/constants";

export class HitscanSystem {
  private raycaster = new THREE.Raycaster();
  private targets: THREE.Object3D[] = [];

  constructor() {}

  public performClientHitscan(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    direction: THREE.Vector3,
    maxFalloffDist: number
  ): { entityType: string; object: THREE.Object3D; distance: number } | null {
    this.raycaster.set(camera.position, direction);
    this.raycaster.camera = camera;

    this.targets.length = 0;
    for (let i = 0; i < scene.children.length; i++) {
      const child = scene.children[i];

      // Skip local player weapon models, laser lines, lights, dynamic particle/VFX systems, and floating HUD elements
      if (child.name === "WeaponsContainer" || child.name === "WeaponsGroup" || child.name === "DynamicMuzzle") continue;
      if (child.name.includes("VFX") || child.name.includes("Light") || child.name.includes("Helper")) continue;
      if (child.name === "floatingUI" || child.type === "Sprite" || child.type === "LineSegments" || child.type === "PointLight" || child.type === "DirectionalLight") continue;

      // NEW: Bounding sphere cull for standalone models with deep skeleton hierarchies
      // If the model's bounding sphere misses the ray entirely, don't add it to targets.
      // This avoids expensive recursive SkinnedMesh traversal on misses.
      let cullRadius = 0;
      if (child.name === "HumanoidDrone") {
        cullRadius = DRONE_CONFIGS[DroneType.HUMANOID].visualRadius || 1.0;
      } else if (child.name === "RobotDogDrone") {
        cullRadius = DRONE_CONFIGS[DroneType.ROBOT_DOG].visualRadius || 0.8;
      } else if (child.name === "FixedWingDrone") {
        cullRadius = DRONE_CONFIGS[DroneType.FIXED_WING].visualRadius || 2.0;
      } else if (child.name === "RemotePlayer" || child.name === "RemotePlayerFallback") {
        cullRadius = 0.65; // covers player capsule: sqrt(0.4² + 0.5²)
      }

      if (cullRadius > 0) {
        const distToRay = this.raycaster.ray.distanceToPoint(child.position);
        if (distToRay > cullRadius) continue; // bounding sphere misses ray — skip entirely
      }

      this.targets.push(child);
    }

    const intersects = this.raycaster.intersectObjects(this.targets, true);

    for (let i = 0; i < intersects.length; i++) {
      const hit = intersects[i];
      if (!hit.object.visible) continue;

      // Ignore weapons container entirely, block if RemotePlayer
      let currItems: THREE.Object3D | null = hit.object;
      let isWeapon = false;
      let isPlayer = false;
      let isDrone = false;
      while (currItems) {
        if (currItems.name === "WeaponsContainer") {
          isWeapon = true;
          break;
        }
        if (currItems.name === "RemotePlayer") {
          isPlayer = true;
        }
        if (currItems.name === "DroneBatch" || (currItems as any).isDrone || currItems.name === "FixedWingStandalone" || currItems.name === "FixedWingDrone" || currItems.name === "TestDrone") {
          isDrone = true;
        }
        currItems = currItems.parent;
      }
      if (isWeapon) continue;

      if (hit.object.name === "floatingUI" || hit.object.type === "Sprite") continue;

      // VFX batches and objects are ignored
      if (hit.object.name.includes("VFX")) continue;

      let entityType = "environment";
      if (isPlayer) entityType = "player";
      else if (isDrone) entityType = "drone";

      // If we hit a drone or player, we just stop the ray (let the server handle the hit confirmation)
      if (isDrone || isPlayer) {
        return {
          entityType,
          object: hit.object,
          distance: hit.distance
        };
      }

      // If we reach here, it's environment geometry!
      const impact = hit.point;
      if (impact.distanceTo(camera.position) < maxFalloffDist * 2.0) {
        // Calculate world-space surface normal
        const normal = new THREE.Vector3(0, 1, 0);
        if (hit.face) {
          normal.copy(hit.face.normal);
          normal.transformDirection(hit.object.matrixWorld);
        }
        
        // Spawn decal, dust, and sparks immediately with correct orientation
        spawnEnvironmentDecalAndDust(impact.x, impact.y, impact.z, normal.x, normal.y, normal.z);
        spawnImpactSparks(impact.x, impact.y, impact.z, 10, normal.x, normal.y, normal.z);
      }
      return {
        entityType: "environment",
        object: hit.object,
        distance: hit.distance
      };
    }
    return null;
  }
}

export const hitscanSystem = new HitscanSystem();
