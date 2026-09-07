import {
  ExecutionHost,
  ExecutionHostMetrics,
  RoomAllocationOptions,
  RoomExecutionBackendType,
} from "./ExecutionHost";
import { RoomExecution } from "./RoomExecution";
import { InProcessRoomExecution } from "./InProcessRoomExecution";
import { ForkedRoomExecution } from "./ForkedRoomExecution";
import { matchManager } from "../MatchManager";

export interface LocalExecutionHostConfig {
  id?: string;
  capacity?: number;
  backendType?: RoomExecutionBackendType;
  onRoomReleased?: (hostId: string, roomId: string) => void;
}

/**
 * LocalExecutionHost runs room executions on the local machine process environment.
 * Supports both in-process and forked-process execution modes.
 */
export class LocalExecutionHost implements ExecutionHost {
  public readonly id: string;
  public readonly capacity: number;
  public readonly backendType: RoomExecutionBackendType;

  private executions: Map<string, RoomExecution> = new Map();
  private onRoomReleasedCallback?: (hostId: string, roomId: string) => void;

  constructor(config: LocalExecutionHostConfig = {}) {
    this.id = config.id || `local-host-${Math.random().toString(36).substring(2, 8)}`;
    this.capacity = config.capacity ?? 32;
    this.backendType =
      config.backendType ||
      (process.env.ROOM_BACKEND as RoomExecutionBackendType) ||
      "in-process";
    this.onRoomReleasedCallback = config.onRoomReleased;
  }

  public getActiveRoomCount(): number {
    return this.executions.size;
  }

  public getRemainingCapacity(): number {
    return Math.max(0, this.capacity - this.executions.size);
  }

  public hasCapacity(): boolean {
    return this.executions.size < this.capacity;
  }

  public hasRoom(roomId: string): boolean {
    return this.executions.has(roomId);
  }

  public getRoomExecution(roomId: string): RoomExecution | undefined {
    return this.executions.get(roomId);
  }

  public getAllocatedRooms(): string[] {
    return Array.from(this.executions.keys());
  }

  public getMetrics(): ExecutionHostMetrics {
    return {
      activeRooms: this.executions.size,
      capacity: this.capacity,
      remainingCapacity: this.getRemainingCapacity(),
      backendType: this.backendType,
    };
  }

  public allocateRoom(
    roomId: string,
    options: RoomAllocationOptions = {}
  ): Promise<RoomExecution> {
    const existing = this.executions.get(roomId);
    if (existing) {
      return Promise.resolve(existing);
    }

    if (!this.hasCapacity()) {
      return Promise.reject(
        new Error(
          `[LocalExecutionHost:${this.id}] Capacity reached (${this.capacity} rooms). Cannot allocate room ${roomId}.`
        )
      );
    }

    if (this.backendType === "isolated" || this.backendType === "forked") {
      const forkedExec = new ForkedRoomExecution(roomId, {
        geminiKey: options.geminiKey,
        mapId: options.mapId,
        onCrash: (id) => this.handleRoomTermination(id),
        onShutdown: (id) => this.handleRoomTermination(id),
      });
      this.executions.set(roomId, forkedExec);

      forkedExec.start();
      return Promise.resolve(forkedExec);
    }

    const room = matchManager.getOrCreateRoom(
      roomId,
      options.geminiKey,
      options.mapId
    );
    const execution = new InProcessRoomExecution(room);
    const prevShutdown = room.onShutdown;
    room.onShutdown = (id: string) => {
      this.handleRoomTermination(id);
      if (prevShutdown) prevShutdown(id);
    };

    this.executions.set(roomId, execution);
    return Promise.resolve(execution);
  }

  public async releaseRoom(roomId: string): Promise<void> {
    const execution = this.executions.get(roomId);
    if (!execution) return;

    this.executions.delete(roomId);

    if (execution instanceof InProcessRoomExecution) {
      matchManager.deleteRoom(roomId);
    } else if (execution instanceof ForkedRoomExecution) {
      if (execution.currentStatus !== "crashed") {
        await execution.terminate("RELEASED");
      }
    }

    if (this.onRoomReleasedCallback) {
      this.onRoomReleasedCallback(this.id, roomId);
    }
  }

  private handleRoomTermination(roomId: string): void {
    if (this.executions.has(roomId)) {
      this.executions.delete(roomId);
      if (this.onRoomReleasedCallback) {
        this.onRoomReleasedCallback(this.id, roomId);
      }
    }
  }

  public async shutdown(): Promise<void> {
    const rooms = Array.from(this.executions.keys());
    for (const roomId of rooms) {
      await this.releaseRoom(roomId);
    }
    this.executions.clear();
  }
}
