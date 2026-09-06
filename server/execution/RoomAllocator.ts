import { RoomExecution } from "./RoomExecution";
import { InProcessRoomExecution } from "./InProcessRoomExecution";
import { matchManager } from "../MatchManager";

export class RoomAllocator {
  private executions: Map<string, InProcessRoomExecution> = new Map();

  /**
   * Allocates or retrieves an execution instance for the designated matchId.
   */
  public async allocate(matchId: string, geminiKey?: string, mapId?: string): Promise<RoomExecution> {
    let execution = this.executions.get(matchId);
    if (!execution) {
      const room = matchManager.getOrCreateRoom(matchId, geminiKey, mapId);
      execution = new InProcessRoomExecution(room);
      this.executions.set(matchId, execution);

      const prevShutdown = room.onShutdown;
      room.onShutdown = (id: string) => {
        this.executions.delete(id);
        if (prevShutdown) prevShutdown(id);
      };
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
      matchManager.deleteRoom(roomId);
    }
  }
}

export const roomAllocator = new RoomAllocator();
export default roomAllocator;
