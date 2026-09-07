import { RoomExecution } from "./RoomExecution";
import {
  ExecutionHost,
  RoomAllocationOptions,
  RoomExecutionBackendType,
} from "./ExecutionHost";
import { LocalExecutionHost } from "./LocalExecutionHost";

export type { RoomExecutionBackendType };

/**
 * RoomAllocator coordinates execution hosts and explicitly decides where each room executes.
 *
 * Architecture Hierarchy:
 * Matchmaker -> RoomAllocator -> ExecutionHost -> RoomExecution -> MatchRoom
 */
export class RoomAllocator {
  private hosts: Map<string, ExecutionHost> = new Map();
  private roomHostMap: Map<string, string> = new Map();
  private backendType: RoomExecutionBackendType =
    (process.env.ROOM_BACKEND as RoomExecutionBackendType) || "in-process";
  private defaultHost: LocalExecutionHost;

  constructor() {
    this.defaultHost = new LocalExecutionHost({
      id: "default-local-host",
      backendType: this.backendType,
      capacity: 64,
      onRoomReleased: (hostId, roomId) => this.handleHostRoomReleased(hostId, roomId),
    });
    this.registerHost(this.defaultHost);
  }

  public registerHost(host: ExecutionHost): void {
    this.hosts.set(host.id, host);
  }

  public unregisterHost(hostId: string): void {
    const host = this.hosts.get(hostId);
    if (host) {
      const hostedRooms = host.getAllocatedRooms();
      for (const roomId of hostedRooms) {
        this.roomHostMap.delete(roomId);
      }
      this.hosts.delete(hostId);
    }
  }

  public getHosts(): ExecutionHost[] {
    return Array.from(this.hosts.values());
  }

  public getHost(hostId: string): ExecutionHost | undefined {
    return this.hosts.get(hostId);
  }

  public getHostForRoom(roomId: string): ExecutionHost | undefined {
    const hostId = this.roomHostMap.get(roomId);
    if (!hostId) return undefined;
    return this.hosts.get(hostId);
  }

  public setBackend(backend: RoomExecutionBackendType): void {
    this.backendType = backend;
    if (this.defaultHost.backendType !== backend && this.defaultHost.getActiveRoomCount() === 0) {
      this.unregisterHost(this.defaultHost.id);
      this.defaultHost = new LocalExecutionHost({
        id: "default-local-host",
        backendType: backend,
        capacity: 64,
        onRoomReleased: (hostId, roomId) => this.handleHostRoomReleased(hostId, roomId),
      });
      this.registerHost(this.defaultHost);
    }
  }

  public getBackend(): RoomExecutionBackendType {
    return this.backendType;
  }

  /**
   * Allocates or retrieves an execution instance for the designated matchId by selecting an eligible ExecutionHost.
   */
  public allocate(
    matchId: string,
    geminiKey?: string,
    mapId?: string,
    overrideBackend?: RoomExecutionBackendType
  ): Promise<RoomExecution> {
    // 1. Check if room is already placed on a host
    const existingHostId = this.roomHostMap.get(matchId);
    if (existingHostId) {
      const host = this.hosts.get(existingHostId);
      if (host) {
        const existingExec = host.getRoomExecution(matchId);
        if (existingExec) {
          return Promise.resolve(existingExec);
        }
      }
    }

    // 2. Determine target backend type
    const targetBackend = overrideBackend || this.backendType;

    // 3. Find eligible hosts matching backend and with remaining capacity
    let eligibleHosts = Array.from(this.hosts.values()).filter(
      (h) => h.backendType === targetBackend && h.hasCapacity()
    );

    // If no host with matching backend exists/has capacity, check if any host with capacity exists
    if (eligibleHosts.length === 0 && !overrideBackend) {
      eligibleHosts = Array.from(this.hosts.values()).filter((h) => h.hasCapacity());
    }

    if (eligibleHosts.length === 0) {
      return Promise.reject(
        new Error(
          `[RoomAllocator] No eligible ExecutionHost available with capacity for room "${matchId}" (Target Backend: ${targetBackend})`
        )
      );
    }

    // 4. Placement strategy: Least-Loaded Host (most remaining capacity / lowest active room count)
    eligibleHosts.sort((a, b) => {
      const loadA = a.getActiveRoomCount();
      const loadB = b.getActiveRoomCount();
      if (loadA !== loadB) return loadA - loadB;
      return b.getRemainingCapacity() - a.getRemainingCapacity();
    });

    const selectedHost = eligibleHosts[0];
    this.roomHostMap.set(matchId, selectedHost.id);

    // 5. Delegate room allocation to the selected host
    const allocationOptions: RoomAllocationOptions = {
      geminiKey,
      mapId,
    };

    const hostAllocPromise = selectedHost.allocateRoom(matchId, allocationOptions);
    return hostAllocPromise.catch((err) => {
      this.roomHostMap.delete(matchId);
      throw err;
    });
  }

  public getExecution(roomId: string): RoomExecution | undefined {
    const hostId = this.roomHostMap.get(roomId);
    if (!hostId) {
      // Fallback check across all hosts if not found in map
      for (const host of this.hosts.values()) {
        const exec = host.getRoomExecution(roomId);
        if (exec) {
          this.roomHostMap.set(roomId, host.id);
          return exec;
        }
      }
      return undefined;
    }
    const host = this.hosts.get(hostId);
    return host?.getRoomExecution(roomId);
  }

  /**
   * Returns total active room executions count across all hosts.
   */
  public getActiveRoomCount(): number {
    return this.roomHostMap.size;
  }

  /**
   * Releases an execution when a room ends or crashes.
   */
  public release(roomId: string): void {
    const hostId = this.roomHostMap.get(roomId);
    this.roomHostMap.delete(roomId);

    if (hostId) {
      const host = this.hosts.get(hostId);
      if (host) {
        host.releaseRoom(roomId).catch((err) => {
          console.error(`[RoomAllocator] Error releasing room ${roomId} on host ${hostId}:`, err);
        });
      }
    } else {
      // Fallback search
      for (const host of this.hosts.values()) {
        if (host.hasRoom(roomId)) {
          host.releaseRoom(roomId).catch(() => {});
        }
      }
    }
  }

  private handleHostRoomReleased(hostId: string, roomId: string): void {
    if (this.roomHostMap.get(roomId) === hostId) {
      this.roomHostMap.delete(roomId);
    }
  }

  public async shutdownAll(): Promise<void> {
    for (const host of this.hosts.values()) {
      await host.shutdown();
    }
    this.roomHostMap.clear();
  }
}

export const roomAllocator = new RoomAllocator();
export default roomAllocator;
