import { ServerDrone, PlayerState } from "../MatchRoom";
import { DroneState } from "../../shared/constants";
import {
  PLAYER_COLLISION_RADIUS,
  PLAYER_COLLISION_HALF_HEIGHT,
  PLAYER_MASS,
  getDroneCollisionDimensions,
  resolveCylinderSeparation
} from "../../shared/dynamicCollision";

// Zero-GC module-level scratch arrays for storing living references
const MAX_SCRATCH_PLAYERS = 32;
const livingPlayers: PlayerState[] = [];

// Scratch object interfaces to prevent allocations
const p1Pos = { x: 0, y: 0, z: 0 };
const p2Pos = { x: 0, y: 0, z: 0 };
const dronePos = { x: 0, y: 0, z: 0 };

/**
 * DynamicCollisionSystem:
 * Handles unified, modular server-side separation for:
 * 1. Player vs. Player
 * 2. Player vs. Bot
 * 3. Player vs. Drone
 *
 * Keeps MatchRoom.ts clean and decoupled.
 */
export class DynamicCollisionSystem {
  /**
   * Run one separation tick across all dynamic entities.
   * Modifies player and drone coordinates in place.
   */
  public static resolve(players: Map<string, PlayerState>, drones: ServerDrone[]): void {
    livingPlayers.length = 0;
    for (const p of players.values()) {
      if (p.isAlive && !p.isDead) {
        livingPlayers.push(p);
        if (livingPlayers.length >= MAX_SCRATCH_PLAYERS) break;
      }
    }

    const pCount = livingPlayers.length;

    // 1. Player vs. Player & Player vs. Bot
    for (let i = 0; i < pCount; i++) {
      const p1 = livingPlayers[i];
      p1Pos.x = p1.posX;
      p1Pos.y = p1.posY;
      p1Pos.z = p1.posZ;

      for (let j = i + 1; j < pCount; j++) {
        const p2 = livingPlayers[j];
        p2Pos.x = p2.posX;
        p2Pos.y = p2.posY;
        p2Pos.z = p2.posZ;

        const collided = resolveCylinderSeparation(
          p1Pos,
          PLAYER_COLLISION_RADIUS,
          PLAYER_COLLISION_HALF_HEIGHT,
          PLAYER_MASS,
          p2Pos,
          PLAYER_COLLISION_RADIUS,
          PLAYER_COLLISION_HALF_HEIGHT,
          PLAYER_MASS,
          false
        );

        if (collided) {
          p1.posX = p1Pos.x;
          p1.posZ = p1Pos.z;
          if (p1.body) {
            p1.body.setNextKinematicTranslation({ x: p1.posX, y: p1.posY, z: p1.posZ });
          }

          p2.posX = p2Pos.x;
          p2.posZ = p2Pos.z;
          if (p2.body) {
            p2.body.setNextKinematicTranslation({ x: p2.posX, y: p2.posY, z: p2.posZ });
          }
        }
      }
    }

    // 2. Player vs. Drone & Bot vs. Drone
    const droneCount = drones.length;
    for (let i = 0; i < pCount; i++) {
      const p = livingPlayers[i];
      p1Pos.x = p.posX;
      p1Pos.y = p.posY;
      p1Pos.z = p.posZ;

      for (let dIdx = 0; dIdx < droneCount; dIdx++) {
        const d = drones[dIdx];
        if (d.state === DroneState.DEAD) continue;

        dronePos.x = d.posX;
        dronePos.y = d.posY;
        dronePos.z = d.posZ;

        const dDim = getDroneCollisionDimensions(d.type);

        const collided = resolveCylinderSeparation(
          p1Pos,
          PLAYER_COLLISION_RADIUS,
          PLAYER_COLLISION_HALF_HEIGHT,
          PLAYER_MASS,
          dronePos,
          dDim.radius,
          dDim.halfHeight,
          dDim.mass,
          false
        );

        if (collided) {
          p.posX = p1Pos.x;
          p.posZ = p1Pos.z;
          if (p.body) {
            p.body.setNextKinematicTranslation({ x: p.posX, y: p.posY, z: p.posZ });
          }

          d.posX = dronePos.x;
          d.posZ = dronePos.z;
          if (d.body) {
            d.body.setNextKinematicTranslation({ x: d.posX, y: d.posY, z: d.posZ });
          }
        }
      }
    }
  }
}
