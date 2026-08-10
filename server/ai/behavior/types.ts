import { Posture } from "../GroupTacticalState";

export interface BehaviorContext {
  room: {
    rapierWorld: any; // RAPIER.World
    collisionMap: any; // CollisionSystem | null
    players: Map<string, any>;
    drones: any[];
    serverTick: number;
    spawnServerProjectile: (x: number, y: number, z: number, dirX: number, dirY: number, dirZ: number, isEnemy: boolean, damage: number, sourceId: string) => void;
    broadcastReliableEvent: (evt: any) => void;
    applyExplosionDamage: (origin: { x: number; y: number; z: number }, radius: number, damage: number, sourceId: string, sourceType: string) => void;
    despawnDrone?: (drone: any) => void;
    groupTacticalState?: any;
  };
  dt: number;
  nowMs: number;
  getGroupPosture: (groupId: string) => Posture | null;
  countSquadMatesInPosture: (drone: any, posture: Posture) => number;
  countSquadMatesWithinRange: (drone: any, range: number) => number;
  getPlayerVelEma: (playerId: string) => { x: number; y: number; z: number } | null;
}

export interface BehaviorOutput {
  steerX: number;
  steerY: number;
  steerZ: number;
  targetSpeed: number;
  shouldFire: boolean;
  nextState: number | null; // DroneState enum value, or null for no change
  forceHeadingX: number;
  forceHeadingZ: number;
}
