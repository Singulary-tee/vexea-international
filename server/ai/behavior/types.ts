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
  };
  dt: number;
  nowMs: number;
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
