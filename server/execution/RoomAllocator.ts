import { RoomExecution } from "./RoomExecution";
import { InProcessRoomExecution } from "./InProcessRoomExecution";
import { ForkedRoomExecution } from "./ForkedRoomExecution";
import { matchManager } from "../MatchManager";

export type RoomExecutionBackendType = "in-process" | "isolated" | "forked";

export class RoomAllocator {
  private executions: Map<string, RoomExecution> = new Map();
  private backendType: RoomExecutionBackendType =
    (process.env.ROOM_BACKEND as RoomExecutionBackendType) || "in-process";

  public setBackend(backend: RoomExecutionBackendType): void {
    this.backendType = backend;
  }

  public getBackend(): RoomExecutionBackendType {
    return this.backendType;
  }

  /**
   * Allocates or retrieves an execution instance for the designated matchId.
   */
  public async allocate(
    matchId: string,
    geminiKey?: string,
    mapId?: string,
    overrideBackend?: RoomExecutionBackendType
  ): Promise<RoomExecution> {
    let execution = this.executions.get(matchId);
    if (!execution) {
      const backend = overrideBackend || this.backendType;

      if (backend === "isolated" || backend === "forked") {
        const forkedExec = new ForkedRoomExecution(matchId, {
          geminiKey,
          mapId,
          onCrash: (id) => this.release(id),
          onShutdown: (id) => this.release(id),
        });
        await forkedExec.waitUntilReady();
        execution = forkedExec;
      } else {
        const room = matchManager.getOrCreateRoom(matchId, geminiKey, mapId);
        execution = new InProcessRoomExecution(room);
        const prevShutdown = room.onShutdown;
        room.onShutdown = (id: string) => {
          this.executions.delete(id);
          if (prevShutdown) prevShutdown(id);
        };
      }

      this.executions.set(matchId, execution);
    }
    return execution;
  }

  public getExecution(roomId: string): RoomExecution | undefined {
    return this.executions.get(roomId);
  }

  /**
   * Returns total active room executions count.
   */
  public getActiveRoomCount(): number {
    return this.executions.size;
  }

  /**
   * Releases an execution when a room ends or crashes.
   */
  public release(roomId: string): void {
    const execution = this.executions.get(roomId);
    if (execution) {
      this.executions.delete(roomId);
      if (execution instanceof InProcessRoomExecution) {
        matchManager.deleteRoom(roomId);
      } else if (execution instanceof ForkedRoomExecution) {
        if (execution.currentStatus !== "crashed") {
          execution.terminate("RELEASED");
        }
      }
    }
  }
}

export const roomAllocator = new RoomAllocator();
export default roomAllocator;
