import { ChannelAdapter } from "./transport/adapter";

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
