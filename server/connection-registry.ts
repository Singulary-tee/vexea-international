import { ChannelAdapter } from "./transport/adapter";

/**
 * ConnectionRegistry
 *
 * NOTE (Architecture / RoomExecution Boundary):
 * This registry holds direct in-memory references to ChannelAdapter instances within the current
 * server process. This remains a same-process assumption and will need to be revisited or adapted
 * with distributed messaging / routing when a non-in-process RoomExecution backend (e.g. child_process,
 * worker_threads, or multi-node cluster) is introduced.
 */
export class ConnectionRegistry {
  private connections = new Map<string, { channel: ChannelAdapter; connectedAt: number }>();

  register(playerId: string, channel: ChannelAdapter): void {
    this.connections.set(playerId, { channel, connectedAt: Date.now() });
  }

  unregister(playerId: string): void {
    this.connections.delete(playerId);
  }

  get(playerId: string): ChannelAdapter | undefined {
    return this.connections.get(playerId)?.channel;
  }

  getAll(): Array<{ playerId: string; channel: ChannelAdapter }> {
    return Array.from(this.connections.entries()).map(([id, data]) => ({
      playerId: id,
      channel: data.channel,
    }));
  }
}

export const connectionRegistry = new ConnectionRegistry();
