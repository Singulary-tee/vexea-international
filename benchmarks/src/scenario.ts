export interface BenchmarkClientIdentity {
  roomIndex: number;
  clientIndex: number;
  matchId: string;
  uid: string;
  displayName: string;
}

export interface BenchmarkJoinRequest extends BenchmarkClientIdentity {
  mapId: string;
}

export interface BenchmarkInput {
  sequence: number;
  moveForward: boolean;
  pitch: number;
  yaw: number;
}

export interface BenchmarkPosition {
  x: number;
  y: number;
  z: number;
}

export type BenchmarkSpawn =
  | { kind: "bots"; count: number }
  | { kind: "drone"; type: number; position: BenchmarkPosition }
  | { kind: "projectiles"; count: number };

export type BenchmarkAdvance =
  | { kind: "loading-complete" }
  | { kind: "ready" }
  | { kind: "disable-ai" };

export type BenchmarkReliableAction =
  | { kind: "objective-hold"; holding: boolean }
  | { kind: "fire"; weaponSlot: "primary" | "secondary" };

export type BenchmarkObservation = "session-initialized" | "match-ready";

export interface BenchmarkScenarioDriver {
  join(identity: BenchmarkJoinRequest): void;
  spawn(command: BenchmarkSpawn): void;
  input(command: BenchmarkInput): void;
  reliable(command: BenchmarkReliableAction): void;
  advance(command: BenchmarkAdvance): void;
  observe(observation: BenchmarkObservation, callback: (data: unknown) => void): void;
  probe(): void;
}
