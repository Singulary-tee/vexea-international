import { RoomExecution } from "./RoomExecution";

export type RoomExecutionBackendType = "in-process" | "isolated" | "forked";

export interface RoomAllocationOptions {
  geminiKey?: string;
  mapId?: string;
  [key: string]: any;
}

export interface ExecutionHostMetrics {
  activeRooms: number;
  capacity: number;
  remainingCapacity: number;
  backendType: RoomExecutionBackendType;
}

/**
 * ExecutionHost represents an execution environment capable of hosting one or more RoomExecution instances.
 * Stage D abstraction layer between RoomAllocator and concrete RoomExecution instances.
 */
export interface ExecutionHost {
  /** Unique identifier for the host */
  readonly id: string;

  /** Total room capacity this host can handle concurrently */
  readonly capacity: number;

  /** The execution backend type this host provides */
  readonly backendType: RoomExecutionBackendType;

  /** Current number of active rooms hosted */
  getActiveRoomCount(): number;

  /** Remaining room slots available */
  getRemainingCapacity(): number;

  /** Whether the host has available capacity for another room */
  hasCapacity(): boolean;

  /** Checks if the host owns the specified room */
  hasRoom(roomId: string): boolean;

  /** Gets the RoomExecution instance for a room owned by this host */
  getRoomExecution(roomId: string): RoomExecution | undefined;

  /** Returns all room IDs currently hosted on this host */
  getAllocatedRooms(): string[];

  /** Allocates a new room on this host */
  allocateRoom(roomId: string, options?: RoomAllocationOptions): Promise<RoomExecution>;

  /** Releases a room hosted on this host */
  releaseRoom(roomId: string): Promise<void>;

  /** Gets operational metrics for placement decisions */
  getMetrics(): ExecutionHostMetrics;

  /** Shuts down all rooms on this host */
  shutdown(): Promise<void>;
}
