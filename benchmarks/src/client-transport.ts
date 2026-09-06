import { io } from "socket.io-client";

export interface ClientTransportStats {
  connected: boolean;
  incomingBytes: number;
  outgoingBytes: number;
  wireIncomingBytes: number;
  wireOutgoingBytes: number;
  incomingMessages: number;
  outgoingMessages: number;
  rawIncomingBytes: number;
  rawOutgoingBytes: number;
  stateSyncMessages: number;
  reliableMessages: number;
  disconnects: number;
  errors: number;
  rttMs?: number;
}

export interface BenchmarkClientTransport {
  readonly stats: ClientTransportStats;
  connect(): Promise<void>;
  on(event: string, callback: (data: unknown) => void): void;
  emit(event: string, data: unknown): void;
  emitReliable(event: string, data: unknown): void;
  rawEmit(buffer: Uint8Array): void;
  disconnect(): void;
}

function jsonBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value));
  } catch {
    return 0;
  }
}

function payloadBytes(value: unknown): number {
  if (Buffer.isBuffer(value)) return value.byteLength;
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (ArrayBuffer.isView(value)) return value.byteLength;
  return jsonBytes(value);
}

function wireBytes(event: string, value: unknown): number {
  return Buffer.byteLength(event) + payloadBytes(value) + 4;
}

export interface GeckosIncomingAccounting {
  incomingMessages: number;
  incomingBytes: number;
  wireIncomingBytes: number;
  rawIncomingBytes: number;
  stateSyncMessages: number;
  reliableMessages: number;
}

export function geckosIncomingAccounting(event: string, data: unknown): GeckosIncomingAccounting {
  const empty: GeckosIncomingAccounting = {
    incomingMessages: 0,
    incomingBytes: 0,
    wireIncomingBytes: 0,
    rawIncomingBytes: 0,
    stateSyncMessages: 0,
    reliableMessages: 0,
  };
  if (event === "disconnected" || event === "error") return empty;
  if (event === "rawMessage") {
    const bytes = payloadBytes(data);
    return { ...empty, incomingMessages: 1, incomingBytes: bytes, rawIncomingBytes: bytes, wireIncomingBytes: wireBytes("raw", data) };
  }
  const payload = data && typeof data === "object" && "MESSAGE" in data
    ? (data as { MESSAGE: unknown }).MESSAGE
    : data;
  return {
    ...empty,
    incomingMessages: 1,
    incomingBytes: payloadBytes(payload),
    wireIncomingBytes: wireBytes(event, payload),
    stateSyncMessages: event === "state_sync" ? 1 : 0,
    reliableMessages: event === "reliable_event" ? 1 : 0,
  };
}

export function createBenchmarkClientTransport(
  mode: "socketio" | "geckos",
  url: string,
): BenchmarkClientTransport {
  return mode === "socketio"
    ? new SocketIoBenchmarkClient(url)
    : new GeckosBenchmarkClient(url);
}

class SocketIoBenchmarkClient implements BenchmarkClientTransport {
  public readonly stats: ClientTransportStats = {
    connected: false,
    incomingBytes: 0,
    outgoingBytes: 0,
    wireIncomingBytes: 0,
    wireOutgoingBytes: 0,
    incomingMessages: 0,
    outgoingMessages: 0,
    rawIncomingBytes: 0,
    rawOutgoingBytes: 0,
    stateSyncMessages: 0,
    reliableMessages: 0,
    disconnects: 0,
    errors: 0,
  };
  private socket: ReturnType<typeof io> | undefined;
  private callbacks = new Map<string, Array<(data: unknown) => void>>();

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    this.socket = io(this.url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      timeout: 10000,
    });
    for (const [event, callbacks] of this.callbacks) {
      this.socket.on(event, (data) => {
        for (const callback of callbacks) callback(data);
      });
    }
    this.socket.on("connect", () => {
      this.stats.connected = true;
    });
    this.socket.on("disconnect", () => {
      this.stats.connected = false;
      this.stats.disconnects += 1;
    });
    this.socket.on("connect_error", () => {
      this.stats.errors += 1;
    });
    this.socket.onAny((event, data) => {
      this.stats.incomingMessages += 1;
      this.stats.incomingBytes += payloadBytes(data);
      this.stats.wireIncomingBytes += wireBytes(event, data);
      if (event === "state_sync") this.stats.stateSyncMessages += 1;
      if (event === "reliable_event") this.stats.reliableMessages += 1;
    });
    await new Promise<void>((resolve, reject) => {
      const socket = this.socket!;
      const timeout = setTimeout(() => reject(new Error("Socket.IO connect timeout")), 10000);
      socket.once("connect", () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.once("connect_error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  on(event: string, callback: (data: unknown) => void): void {
    const callbacks = this.callbacks.get(event) || [];
    callbacks.push(callback);
    this.callbacks.set(event, callbacks);
    if (this.socket) this.socket.on(event, callback);
  }

  emit(event: string, data: unknown): void {
    this.stats.outgoingMessages += 1;
    this.stats.outgoingBytes += jsonBytes(data);
    this.stats.wireOutgoingBytes += wireBytes(event, data);
    this.socket?.emit(event, data);
  }

  emitReliable(event: string, data: unknown): void {
    this.emit(event, data);
  }

  rawEmit(buffer: Uint8Array): void {
    this.stats.outgoingMessages += 1;
    this.stats.outgoingBytes += buffer.byteLength;
    this.stats.rawOutgoingBytes += buffer.byteLength;
    this.stats.wireOutgoingBytes += wireBytes("raw", buffer);
    this.socket?.emit("raw", Buffer.from(buffer));
  }

  disconnect(): void {
    this.socket?.disconnect();
  }
}

class GeckosBenchmarkClient implements BenchmarkClientTransport {
  public readonly stats: ClientTransportStats = {
    connected: false,
    incomingBytes: 0,
    outgoingBytes: 0,
    wireIncomingBytes: 0,
    wireOutgoingBytes: 0,
    incomingMessages: 0,
    outgoingMessages: 0,
    rawIncomingBytes: 0,
    rawOutgoingBytes: 0,
    stateSyncMessages: 0,
    reliableMessages: 0,
    disconnects: 0,
    errors: 0,
  };
  private channel: any;
  private callbacks = new Map<string, Array<(data: unknown) => void>>();
  private bridgeInstrumented = false;

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    const webRtc = await import("node-datachannel/polyfill");
    const nodeGlobals = globalThis as typeof globalThis & {
      RTCPeerConnection?: typeof webRtc.RTCPeerConnection;
      RTCSessionDescription?: typeof webRtc.RTCSessionDescription;
    };
    nodeGlobals.RTCPeerConnection ??= webRtc.RTCPeerConnection;
    nodeGlobals.RTCSessionDescription ??= webRtc.RTCSessionDescription;
    const geckosModule = await import("@geckos.io/client");
    const geckos = geckosModule.default;
    const parsed = new URL(this.url);
    this.channel = geckos({ url: `${parsed.protocol}//${parsed.hostname}`, port: Number(parsed.port) });
    this.instrumentBridge();
    for (const [event, callbacks] of this.callbacks) {
      this.channel.on(event, (data: unknown) => {
        for (const callback of callbacks) callback(data);
      });
    }
    this.channel.onRaw((data: ArrayBuffer) => {
      for (const callback of this.callbacks.get("raw") || []) callback(data);
    });
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Geckos connect timeout")), 10000);
      this.channel.onConnect((error: unknown) => {
        if (error) {
          clearTimeout(timeout);
          this.stats.errors += 1;
          reject(error);
          return;
        }
        clearTimeout(timeout);
        this.stats.connected = true;
        resolve();
      });
      this.channel.onDisconnect(() => {
        this.stats.connected = false;
        this.stats.disconnects += 1;
      });
    });
  }

  on(event: string, callback: (data: unknown) => void): void {
    const callbacks = this.callbacks.get(event) || [];
    callbacks.push(callback);
    this.callbacks.set(event, callbacks);
    if (this.channel && event !== "raw") {
      this.channel.on(event, (data: unknown) => callback(data));
    }
  }

  emit(event: string, data: unknown): void {
    this.stats.outgoingMessages += 1;
    this.stats.outgoingBytes += jsonBytes(data);
    this.stats.wireOutgoingBytes += wireBytes(event, data);
    this.channel?.emit(event, data);
  }

  emitReliable(event: string, data: unknown): void {
    this.stats.outgoingMessages += 1;
    this.stats.outgoingBytes += jsonBytes(data);
    this.stats.wireOutgoingBytes += wireBytes(event, data);
    this.channel?.emit(event, data, { reliable: true });
  }

  rawEmit(buffer: Uint8Array): void {
    this.stats.outgoingMessages += 1;
    this.stats.outgoingBytes += buffer.byteLength;
    this.stats.rawOutgoingBytes += buffer.byteLength;
    this.stats.wireOutgoingBytes += wireBytes("raw", buffer);
    this.channel?.raw.emit(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  }

  disconnect(): void {
    this.channel?.close();
  }

  private instrumentBridge(): void {
    if (this.bridgeInstrumented || !this.channel?.bridge) return;
    this.bridgeInstrumented = true;
    const bridge = this.channel.bridge;
    const emit = bridge.emit.bind(bridge);
    bridge.emit = (event: string, data: unknown, ...args: unknown[]) => {
      const accounting = geckosIncomingAccounting(event, data);
      for (const [key, value] of Object.entries(accounting)) {
        this.stats[key as keyof GeckosIncomingAccounting] += value;
      }
      return emit(event, data, ...args);
    };
  }
}
