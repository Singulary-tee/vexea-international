import { MatchController } from "../../MatchController";
import map1Spec from "../../../shared/maps/map_1_facility.spec.json";
import { GlobalState } from "../../state";
import { DroneState } from "../../../shared/constants";
import {
  PLAYER_COLLISION_RADIUS,
  PLAYER_COLLISION_HALF_HEIGHT,
  getDroneCollisionDimensions,
  resolvePointAgainstCylinder
} from "../../../shared/dynamicCollision";

// Scratch object to avoid allocations in tick
const _obstaclePos = { x: 0, y: 0, z: 0 };
const _playerScratch = { x: 0, y: 0, z: 0 };

export class SimulationSystem {
  constructor(private match: MatchController) {}

  public init() {
    // Re-init Physics Worker for fresh match state
    this.match.physicsWorker = new Worker(
      new URL("../../physics.worker.ts", import.meta.url),
      { type: "module" },
    );
    
    if (typeof SharedArrayBuffer !== "undefined") {
      try {
        this.match.physicsSAB = new SharedArrayBuffer(12 * 4); // 12 floats
        this.match.physicsData = new Float32Array(this.match.physicsSAB);
      } catch (err) {
        console.warn("Failed to create SharedArrayBuffer", err);
        this.match.physicsSAB = null;
        this.match.physicsData = null;
      }
    } else {
      this.match.physicsSAB = null;
      this.match.physicsData = null;
    }
    
    const spec = this.match.mapId === "map_1_facility" ? map1Spec : null;
    let buildingsToPass: any[] = [];
    if (spec && spec.buildings) {
        buildingsToPass = spec.buildings;
    }

    try {
      this.match.physicsWorker.postMessage({ 
        type: "INIT", 
        sab: this.match.physicsSAB, 
        buildings: buildingsToPass 
      });
    } catch (err) {
      console.warn("Failed to postMessage SharedArrayBuffer, falling back", err);
      this.match.physicsSAB = null;
      this.match.physicsData = null;
      this.match.physicsWorker.postMessage({ 
        type: "INIT", 
        sab: null, 
        buildings: buildingsToPass 
      });
    }

    this.match.physicsWorker.onmessage = (e: MessageEvent) => {
      this.handleWorkerMessage(e);
    };
  }

  private handleWorkerMessage(e: MessageEvent) {
    if (e.data.type === "CUBE_UPDATE") {
      (window as any).clientCubeTelemetry = {
        pos: e.data.pos,
        vel: e.data.vel,
        events: e.data.events
      };
      if (typeof (window as any).updateClientCubeMesh === "function") {
        (window as any).updateClientCubeMesh(e.data.pos);
      }
    } else if (e.data.type === "CUBE_CLEARED") {
      (window as any).clientCubeTelemetry = null;
      if (typeof (window as any).removeClientCubeMesh === "function") {
        (window as any).removeClientCubeMesh();
      }
    } else if (e.data.type === "PLAYER_COLLISIONS") {
      (window as any).clientPlayerCollisions = e.data.collisions;
    } else if (e.data.type === "PLAYER_UPDATE") {
      if (!GlobalState.isFlying) {
        this.match.playerPos.set(e.data.pos.x, e.data.pos.y, e.data.pos.z);
        this.applyDynamicSeparation();
      }
      // We need a way to pass localGrounded back to main.ts or store it in match
      // For now, let's store it in match
      (this.match as any).localGrounded = e.data.grounded;
    }
  }

  /**
   * Zero-GC client-side soft separation pass against dynamic obstacles:
   * 1. Other remote players
   * 2. Active drones
   * Uses identical cylinder radii as server simulation.
   */
  public applyDynamicSeparation(): void {
    if (GlobalState.isFlying) return;

    _playerScratch.x = this.match.playerPos.x;
    _playerScratch.y = this.match.playerPos.y;
    _playerScratch.z = this.match.playerPos.z;

    let adjusted = false;

    // 1. Separate against remote players
    if (this.match.remotePlayersTargetData.size > 0) {
      for (const p of this.match.remotePlayersTargetData.values()) {
        if (!p.isAlive) continue;
        _obstaclePos.x = p.pos.x;
        _obstaclePos.y = p.pos.y;
        _obstaclePos.z = p.pos.z;

        if (
          resolvePointAgainstCylinder(
            _playerScratch,
            PLAYER_COLLISION_RADIUS,
            PLAYER_COLLISION_HALF_HEIGHT,
            _obstaclePos,
            PLAYER_COLLISION_RADIUS,
            PLAYER_COLLISION_HALF_HEIGHT
          )
        ) {
          adjusted = true;
        }
      }
    }

    // 2. Separate against drones
    if (this.match.droneJitterMap.size > 0) {
      for (const ring of this.match.droneJitterMap.values()) {
        const latest = ring.states[ring.head];
        if (!latest || latest.state === DroneState.DEAD) continue;

        // Use client-interpolated position if present, else latest network position
        _obstaclePos.x = (latest as any).clientPosX ?? latest.posX;
        _obstaclePos.y = (latest as any).clientPosY ?? latest.posY;
        _obstaclePos.z = (latest as any).clientPosZ ?? latest.posZ;

        const dDim = getDroneCollisionDimensions(latest.type);

        if (
          resolvePointAgainstCylinder(
            _playerScratch,
            PLAYER_COLLISION_RADIUS,
            PLAYER_COLLISION_HALF_HEIGHT,
            _obstaclePos,
            dDim.radius,
            dDim.halfHeight
          )
        ) {
          adjusted = true;
        }
      }
    }

    if (adjusted) {
      this.match.playerPos.x = _playerScratch.x;
      this.match.playerPos.z = _playerScratch.z;
    }
  }

  public step(dt: number) {
    if (this.match.physicsWorker) {
      this.match.physicsWorker.postMessage({ type: "STEP", delta: dt * 1000 });
    }
    // In SAB mode or after frame step, ensure separation pass is also evaluated
    if (this.match.physicsData) {
      this.applyDynamicSeparation();
    }
  }

  public dispose() {
    if (this.match.physicsWorker) {
      console.log("[SimulationSystem] Terminating physics worker.");
      this.match.physicsWorker.terminate();
      this.match.physicsWorker = null;
    }
    this.match.physicsSAB = null;
    this.match.physicsData = null;
    (window as any).clientCubeTelemetry = null;
  }
}
