export type RoomExecutionStatus = "starting" | "active" | "ending" | "crashed";

export type RoomInboundEvent =
  | { type: "INPUT"; seq: number; inputMask: number; pitch: number; yaw: number }
  | { type: "USE_UTILITY"; slot: "utility1" | "utility2" }
  | { type: "OBJECTIVE_HOLD"; holding: boolean }
  | { type: "TOGGLE_FIRE_MODE" }
  | { type: "RELOAD"; weaponSlot?: "primary" | "secondary" }
  | { type: "CANCEL_RELOAD"; weaponSlot?: "primary" | "secondary" }
  | { type: "FIRE"; weaponSlot?: "primary" | "secondary"; [key: string]: any }
  | { type: "CHAT_MESSAGE"; message: string; sender?: string }
  | { type: "QUICK_COMM"; optionId: string; sender?: string }
  | { type: "PLAYER_READY" }
  | { type: "PLAYER_QUIT" }
  | { type: "PLAYER_DISCONNECT" }
  | { type: "SELECT_CLASS"; classId: any }
  | { type: "REGISTER_PLAYER"; [key: string]: any }
  | { type: "REMOVE_PLAYER" }
  | { type: string; [key: string]: any };

export type RoomOutboundEvent =
  | { type: "MATCH_FORMED"; roomId: string; playerState?: any; room?: any }
  | { type: "CHAT_MESSAGE"; sender: string; message: string }
  | { type: "QUICK_COMM"; sender: string; optionId: string }
  | { type: "FIRE_MODE_CHANGED"; mode: string }
  | { type: "AMMO_STATE"; primary: any; secondary: any }
  | { type: "RELIABLE_EVENT"; payload: any }
  | { type: "RAW_BROADCAST"; buffer: ArrayBuffer }
  | { type: "ROOM_STATE"; state: any }
  | { type: "DISCONNECT"; reason?: string }
  | { type: string; [key: string]: any };

export interface RoomExecution {
  readonly roomId: string;
  // Async by design, even though the first backend is synchronous under the hood.
  // This is what allows a future out-of-process backend to implement the same interface
  // without a second migration.
  send(playerId: string | "broadcast", event: RoomInboundEvent): Promise<void>;
  spawnBots(count: number): Promise<void>;
  spawnDrones(count: number, type?: number): Promise<void>;
  spawnProjectiles(count: number): Promise<void>;
  onOutbound(callback: (playerId: string | "broadcast", event: RoomOutboundEvent) => void): void;
  getStatus(): Promise<RoomExecutionStatus>;
  terminate(reason: string): Promise<void>;
}
