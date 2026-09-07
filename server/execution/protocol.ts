import { RoomExecutionStatus, RoomInboundEvent, RoomOutboundEvent } from "./RoomExecution";

/**
 * IPC Protocol: Discriminated messages between Parent (Server) and Child (Isolated Room Worker).
 */

// Parent -> Child Messages
export type ParentToChildMessage =
  | {
      type: "init";
      roomId: string;
      geminiKey?: string;
      mapId?: string;
    }
  | {
      type: "inbound";
      playerId: string | "broadcast";
      event: RoomInboundEvent;
    }
  | {
      type: "register_player";
      playerId: string;
      classId?: string;
      displayName?: string;
      reqUid?: string;
      primaryWeaponId?: string;
      secondaryWeaponId?: string;
    }
  | {
      type: "remove_player";
      playerId: string;
    }
  | {
      type: "spawn_bots";
      count: number;
    }
  | {
      type: "spawn_drones";
      count: number;
      droneType?: number;
    }
  | {
      type: "spawn_projectiles";
      count: number;
    }
  | {
      type: "terminate";
      reason?: string;
    };

// Child -> Parent Messages
export type ChildToParentMessage =
  | {
      type: "ready";
      roomId: string;
      pid: number;
    }
  | {
      type: "status";
      roomId: string;
      status: RoomExecutionStatus;
    }
  | {
      type: "outbound";
      targetPlayerId: string | "broadcast";
      event: RoomOutboundEvent;
    }
  | {
      type: "emit_channel";
      playerId: string;
      eventName: string;
      data: any;
      options?: { reliable?: boolean };
    }
  | {
      type: "raw_emit_channel";
      playerId: string;
      buffer: number[] | Buffer | Uint8Array;
    }
  | {
      type: "broadcast_channel";
      eventName: string;
      data: any;
    }
  | {
      type: "raw_broadcast_channel";
      buffer: number[] | Buffer | Uint8Array;
    }
  | {
      type: "shutdown";
      roomId: string;
      reason?: string;
    }
  | {
      type: "error";
      roomId: string;
      error: string;
    }
  | {
      type: "telemetry";
      counters?: Record<string, number>;
      gauges?: Record<string, number>;
      timers?: Record<string, { count: number; sumMs: number; maxMs: number; p95Ms: number; samples: number[] }>;
    }
  | {
      type: "benchmark_event";
      event: Record<string, unknown>;
    };
