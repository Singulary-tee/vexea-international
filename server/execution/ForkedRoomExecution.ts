import { ChildProcess, fork } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { RoomExecution, RoomExecutionStatus, RoomInboundEvent, RoomOutboundEvent } from "./RoomExecution";
import { ParentToChildMessage, ChildToParentMessage } from "./protocol";
import { connectionRegistry } from "../connection-registry";
import type { ChannelAdapter } from "../transport/adapter";
import { recordRemoteTelemetry, removeWorkerTelemetry, writeBenchmarkEventRecord } from "../benchmark/telemetry";

export interface ForkedRoomExecutionOptions {
  geminiKey?: string;
  mapId?: string;
  readyTimeoutMs?: number;
  onCrash?: (roomId: string, error?: string) => void;
  onShutdown?: (roomId: string) => void;
}

export function resolveWorkerPath(): { scriptPath: string; execArgv: string[] } {
  let baseDir: string;
  try {
    if (typeof __dirname !== "undefined") {
      baseDir = __dirname;
    } else {
      baseDir = path.dirname(fileURLToPath(import.meta.url));
    }
  } catch (e) {
    baseDir = path.resolve(process.cwd(), "server/execution");
  }

  const sourceWorker = path.resolve(baseDir, "room-worker.ts");
  const isSourceCheckout = path.basename(baseDir) === "execution"
    && path.basename(path.dirname(baseDir)) === "server";
  const cjsCandidate = path.resolve(baseDir, "room-worker.cjs");
  if (!isSourceCheckout && !fs.existsSync(cjsCandidate)) {
    const tsSource = path.resolve(process.cwd(), "server/execution/room-worker.ts");
    if (fs.existsSync(tsSource)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const esbuild = typeof require !== "undefined" ? require("esbuild") : null;
        if (esbuild && typeof esbuild.buildSync === "function") {
          esbuild.buildSync({
            entryPoints: [tsSource],
            bundle: true,
            platform: "node",
            format: "cjs",
            packages: "external",
            outfile: cjsCandidate,
          });
        }
      } catch (e) {
        // Fallback to runtime candidates
      }
    }
  }

  const candidates = [
    ...(isSourceCheckout ? [sourceWorker] : [cjsCandidate]),
    path.resolve(baseDir, "room-worker.js"),
    sourceWorker,
    path.resolve(process.cwd(), "server/execution/room-worker.ts"),
    path.resolve(baseDir, "../../server/execution/room-worker.ts"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      let execArgv = [...process.execArgv];
      if (candidate.endsWith(".ts")) {
        const hasLoader = execArgv.some((arg) => arg.includes("tsx") || arg.includes("ts-node"));
        if (!hasLoader) {
          execArgv.push("--import", "tsx");
        }
      } else {
        // Strip tsx-specific imports and loaders when spawning pre-compiled javascript
        execArgv = execArgv.filter((arg) => {
          return !arg.includes("tsx") && !arg.includes("ts-node") && arg !== "--import";
        });
      }
      return { scriptPath: candidate, execArgv };
    }
  }

  return { scriptPath: path.resolve(baseDir, "room-worker.js"), execArgv: [...process.execArgv] };
}

export class ForkedRoomExecution implements RoomExecution {
  public readonly roomId: string;
  private child: ChildProcess | null = null;
  private status: RoomExecutionStatus = "starting";
  private outboundListeners: Array<(playerId: string | "broadcast", event: RoomOutboundEvent) => void> = [];
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (err: Error) => void;
  private readySettled = false;
  private options: ForkedRoomExecutionOptions;
  private childPid: number | null = null;
  private isExplicitTermination = false;
  private terminalNotification: "crash" | "shutdown" | null = null;
  private crashDisconnectSent = false;
  private crashLifecycleSent = false;
  private registeredPlayerIds = new Set<string>();
  private pendingMessages: ParentToChildMessage[] = [];
  private reconnectRequestSequence = 0;
  private invalidatedReconnects = new Set<string>();
  private pendingReconnects = new Map<string, {
    resolve: (accepted: boolean) => void;
    timer: NodeJS.Timeout;
    playerId: string;
    channel: ChannelAdapter;
    generation: number;
  }>();

  private settlePendingReconnects(accepted = false): void {
    for (const [requestId, pending] of this.pendingReconnects) {
      clearTimeout(pending.timer);
      this.pendingReconnects.delete(requestId);
      pending.resolve(accepted);
    }
    this.invalidatedReconnects.clear();
  }

  private resolveReady(): void {
    if (this.readySettled) return;
    this.readySettled = true;
    this.readyResolve();
  }

  private rejectReady(error: Error): void {
    if (this.readySettled) return;
    this.readySettled = true;
    this.readyReject(error);
  }

  private notifyCrash(error?: string): void {
    if (this.terminalNotification) return;
    this.terminalNotification = "crash";
    this.options.onCrash?.(this.roomId, error);
  }

  private notifyShutdown(): void {
    if (this.terminalNotification) return;
    this.terminalNotification = "shutdown";
    this.options.onShutdown?.(this.roomId);
  }

  private emitCrashLifecycle(error?: string): void {
    if (this.crashLifecycleSent) return;
    this.crashLifecycleSent = true;
    this.emitCrashDisconnect();
    this.emitOutbound("broadcast", {
      type: "DISCONNECT",
      reason: "ROOM_CRASHED",
    });
    this.outboundListeners = [];
    this.notifyCrash(error);
  }

  private emitCrashDisconnect(): void {
    if (this.crashDisconnectSent) return;
    this.crashDisconnectSent = true;
    const playerIds = new Set([
      ...this.registeredPlayerIds,
      ...Array.from(this.pendingReconnects.values(), (pending) => pending.playerId),
    ]);
    for (const playerId of playerIds) {
      const pendingReconnect = Array.from(this.pendingReconnects.values()).find(
        (pending) => pending.playerId === playerId,
      );
      const channel = pendingReconnect?.channel || connectionRegistry.get(playerId);
      if (!channel || channel.connected === false) continue;
      try {
        channel.emit("reliable_event", {
          type: "DISCONNECT",
          reason: "ROOM_CRASHED",
        });
      } catch (e) {}
    }
  }

  constructor(roomId: string, options: ForkedRoomExecutionOptions = {}) {
    this.roomId = roomId;
    this.options = options;

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
  }

  public start(): void {
    if (this.child) return;
    this.spawnWorker();
  }

  public get pid(): number | null {
    return this.childPid;
  }

  public async waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  private spawnWorker(): void {
    const { scriptPath, execArgv } = resolveWorkerPath();
    const timeoutMs = this.options.readyTimeoutMs || 25000;

    try {
      this.child = fork(scriptPath, [], {
        execArgv,
        env: {
          ...process.env,
          ROOM_ID: this.roomId,
          IS_ROOM_WORKER: "true",
        },
        stdio: ["inherit", "inherit", "inherit", "ipc"],
      });
      this.childPid = this.child.pid || null;

      const timer = setTimeout(() => {
        if (this.status === "starting") {
          console.error(`[ForkedRoomExecution] Room ${this.roomId} timed out waiting for ready state (${timeoutMs}ms)`);
          this.status = "crashed";
          this.pendingMessages = [];
          this.rejectReady(new Error(`Room process ${this.roomId} timed out waiting for ready state`));
          this.killChild();
          this.notifyCrash("READY_TIMEOUT");
        }
      }, timeoutMs);

      this.child.on("message", (msg: ChildToParentMessage) => {
        this.handleChildMessage(msg, timer);
      });

      this.child.on("error", (err) => {
        console.error(`[ForkedRoomExecution] Child process error for room ${this.roomId}:`, err);
        const wasEnding = this.status === "ending" || this.isExplicitTermination;
        if (this.status === "starting") {
          clearTimeout(timer);
          this.status = "crashed";
          this.rejectReady(err);
        } else if (!wasEnding) {
          this.status = "crashed";
        }
        this.pendingMessages = [];
        if (!wasEnding) {
          this.emitCrashLifecycle(err.message);
        }
        this.settlePendingReconnects();
      });

      this.child.on("exit", (code, signal) => {
        clearTimeout(timer);
        removeWorkerTelemetry(this.roomId);
        const wasEnding = this.status === "ending" || this.isExplicitTermination;
        if (!wasEnding) {
          console.warn(`[ForkedRoomExecution] Room process for ${this.roomId} exited unexpectedly (code: ${code}, signal: ${signal})`);
          const wasStarting = this.status === "starting";
          const exitError = new Error(`Room process ${this.roomId} exited before becoming ready`);
          this.status = "crashed";
          if (wasStarting) {
            this.rejectReady(exitError);
          }
          this.emitCrashLifecycle(`EXIT_${code || signal}`);
        } else {
          this.status = "ending";
          this.notifyShutdown();
          this.outboundListeners = [];
        }
        this.settlePendingReconnects();
        this.pendingMessages = [];
        this.child = null;
      });

      // Send initialization message to worker
      const initMsg: ParentToChildMessage = {
        type: "init",
        roomId: this.roomId,
        geminiKey: this.options.geminiKey,
        mapId: this.options.mapId,
      };
      this.child.send(initMsg);
    } catch (err: any) {
      this.status = "crashed";
      this.rejectReady(err);
      this.notifyCrash(err.message);
    }
  }

  private handleChildMessage(msg: ChildToParentMessage, timer: NodeJS.Timeout): void {
    if (!msg || typeof msg !== "object") return;

    switch (msg.type) {
      case "ready": {
        clearTimeout(timer);
        this.childPid = msg.pid || this.child?.pid || null;
        if (this.status !== "starting") {
          this.pendingMessages = [];
          break;
        }
        this.status = "active";
        this.resolveReady();
        if (this.child && this.child.connected) {
          for (const queuedMsg of this.pendingMessages) {
            this.child.send(queuedMsg);
          }
        }
        this.pendingMessages = [];
        break;
      }
      case "status": {
        this.status = msg.status;
        break;
      }
      case "outbound": {
        this.emitOutbound(msg.targetPlayerId, msg.event);
        break;
      }
      case "reconnect_result": {
        if (this.invalidatedReconnects.delete(msg.requestId)) {
          break;
        }
        const pending = this.pendingReconnects.get(msg.requestId);
        if (pending && (msg.generation === undefined || msg.generation === pending.generation)) {
          clearTimeout(pending.timer);
          this.pendingReconnects.delete(msg.requestId);
          pending.resolve(msg.accepted);
        }
        break;
      }
      case "emit_channel": {
        const pendingReconnect = Array.from(this.pendingReconnects.values()).find(
          (pending) => pending.playerId === msg.playerId,
        );
        const channel = pendingReconnect?.channel || connectionRegistry.get(msg.playerId);
        if (channel) {
          try {
            channel.emit(msg.eventName, msg.data, msg.options);
          } catch (e) {}
        }
        break;
      }
      case "raw_emit_channel": {
        const pendingReconnect = Array.from(this.pendingReconnects.values()).find(
          (pending) => pending.playerId === msg.playerId,
        );
        const channel = pendingReconnect?.channel || connectionRegistry.get(msg.playerId);
        if (channel) {
          try {
            const buf = Buffer.isBuffer(msg.buffer)
              ? msg.buffer
              : Array.isArray(msg.buffer)
              ? Buffer.from(msg.buffer)
              : Buffer.from(msg.buffer as Uint8Array);
            channel.rawEmit(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
          } catch (e) {}
        }
        break;
      }
      case "broadcast_channel": {
        this.emitOutbound("broadcast", {
          type: msg.eventName,
          ...msg.data,
        });
        break;
      }
      case "shutdown": {
        clearTimeout(timer);
        if (this.status === "starting") {
          this.rejectReady(new Error(`Room process ${this.roomId} shut down before becoming ready`));
        }
        this.status = "ending";
        this.pendingMessages = [];
        this.settlePendingReconnects();
        this.notifyShutdown();
        this.outboundListeners = [];
        break;
      }
      case "telemetry": {
        recordRemoteTelemetry(msg.counters, msg.gauges, msg.timers, this.roomId);
        break;
      }
      case "benchmark_event": {
        writeBenchmarkEventRecord(msg.event);
        break;
      }
      case "error": {
        console.error(`[ForkedRoomExecution] Worker reported error for room ${this.roomId}:`, msg.error);
        const wasEnding = this.status === "ending" || this.isExplicitTermination;
        if (!wasEnding) {
          if (this.status === "starting") {
            clearTimeout(timer);
            this.rejectReady(new Error(msg.error));
          }
          this.status = "crashed";
          this.pendingMessages = [];
        }
        if (!wasEnding) {
          this.emitCrashLifecycle(msg.error);
        }
        this.settlePendingReconnects();
        break;
      }
    }
  }

  public onOutbound(callback: (playerId: string | "broadcast", event: RoomOutboundEvent) => void): () => void {
    this.outboundListeners.push(callback);
    return () => {
      const idx = this.outboundListeners.indexOf(callback);
      if (idx !== -1) this.outboundListeners.splice(idx, 1);
    };
  }

  private emitOutbound(playerId: string | "broadcast", event: RoomOutboundEvent): void {
    for (const listener of [...this.outboundListeners]) {
      try {
        listener(playerId, event);
      } catch (err) {
        console.error(`[ForkedRoomExecution] Outbound listener error in room ${this.roomId}:`, err);
      }
    }
  }

  public async send(playerId: string | "broadcast", event: RoomInboundEvent): Promise<void> {
    if (
      playerId !== "broadcast" &&
      event.type === "PLAYER_QUIT" &&
      (!event.channelId || connectionRegistry.get(playerId)?.id === event.channelId)
    ) {
      this.registeredPlayerIds.delete(playerId);
      this.clearReconnectStateForPlayer(playerId);
    }
    const msg: ParentToChildMessage = {
      type: "inbound",
      playerId,
      event,
    };
    if (this.status === "starting") {
      this.pendingMessages.push(msg);
      return;
    }
    if (this.status !== "active") {
      return;
    }
    if (this.child && this.child.connected) {
      this.child.send(msg);
    }
  }

  public async spawnBots(count: number): Promise<void> {
    const msg: ParentToChildMessage = { type: "spawn_bots", count };
    if (this.status === "starting") {
      this.pendingMessages.push(msg);
    } else if (this.child && this.child.connected) {
      this.child.send(msg);
    }
  }

  public async spawnDrones(count: number, type?: number): Promise<void> {
    const msg: ParentToChildMessage = { type: "spawn_drones", count, droneType: type };
    if (this.status === "starting") {
      this.pendingMessages.push(msg);
    } else if (this.child && this.child.connected) {
      this.child.send(msg);
    }
  }

  public async spawnProjectiles(count: number): Promise<void> {
    const msg: ParentToChildMessage = { type: "spawn_projectiles", count };
    if (this.status === "starting") {
      this.pendingMessages.push(msg);
    } else if (this.child && this.child.connected) {
      this.child.send(msg);
    }
  }

  public async registerPlayer(
    playerId: string,
    classId?: string,
    displayName?: string,
    reqUid?: string,
    primaryWeaponId?: string,
    secondaryWeaponId?: string,
    channelId?: string,
    channel?: ChannelAdapter,
  ): Promise<void> {
    const wasRegistered = this.registeredPlayerIds.has(playerId);
    const previousChannel = connectionRegistry.get(playerId);
    this.registeredPlayerIds.add(playerId);
    if (channel) {
      connectionRegistry.register(playerId, channel);
    }
    const msg: ParentToChildMessage = {
      type: "register_player",
      playerId,
      channelId,
      classId,
      displayName,
      reqUid,
      primaryWeaponId,
      secondaryWeaponId,
    };
    try {
      if (this.status === "starting") {
        this.pendingMessages.push(msg);
        return;
      }
      if (this.child && this.child.connected) {
        this.child.send(msg);
      }
    } catch (error) {
      if (!wasRegistered) this.registeredPlayerIds.delete(playerId);
      if (channel) connectionRegistry.unregister(playerId, channel);
      if (previousChannel) connectionRegistry.register(playerId, previousChannel);
      throw error;
    }
  }

  public reconnectPlayer(
    playerId: string,
    reqUid: string,
    channel: ChannelAdapter,
  ): Promise<boolean> {
    if (this.status !== "starting" && this.status !== "active") {
      return Promise.resolve(false);
    }

    const generation = ++this.reconnectRequestSequence;
    const requestId = `${this.roomId}:reconnect:${generation}`;
    const msg: ParentToChildMessage = {
      type: "reconnect_player",
      requestId,
      generation,
      playerId,
      reqUid,
      channelId: channel.id,
    };

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingReconnects.delete(requestId);
        this.pendingMessages = this.pendingMessages.filter(
          (queuedMsg) => queuedMsg.type !== "reconnect_player" || queuedMsg.requestId !== requestId,
        );
        this.invalidatedReconnects.add(requestId);
        const cancelMessage: ParentToChildMessage = {
          type: "cancel_reconnect",
          requestId,
          generation,
          playerId,
        };
        if (this.status === "starting" && this.child?.connected) {
          this.pendingMessages.push(cancelMessage);
        } else if (this.child && this.child.connected) {
          this.child.send(cancelMessage);
        }
        resolve(false);
      }, 5000);
      this.pendingReconnects.set(requestId, { resolve, timer, playerId, channel, generation });

      if (this.status === "starting") {
        this.pendingMessages.push(msg);
      } else if (this.child && this.child.connected) {
        this.child.send(msg);
      } else {
        clearTimeout(timer);
        this.pendingReconnects.delete(requestId);
        resolve(false);
      }
    });
  }

  public async removePlayer(playerId: string): Promise<void> {
    this.registeredPlayerIds.delete(playerId);
    this.clearReconnectStateForPlayer(playerId);
    const msg: ParentToChildMessage = {
      type: "remove_player",
      playerId,
    };
    if (this.status === "starting") {
      this.pendingMessages.push(msg);
      return;
    }
    if (this.child && this.child.connected) {
      this.child.send(msg);
    }
  }

  public get currentStatus(): RoomExecutionStatus {
    return this.status;
  }

  public async getStatus(): Promise<RoomExecutionStatus> {
    return this.status;
  }

  public async terminate(reason: string = "TERMINATED"): Promise<void> {
    const wasStarting = this.status === "starting";
    this.isExplicitTermination = true;
    this.pendingMessages = [];
    this.settlePendingReconnects();
    if (wasStarting) {
      this.rejectReady(new Error(`Room process ${this.roomId} terminated before becoming ready`));
    }
    if (this.status !== "crashed") {
      this.status = "ending";
    }
    if (this.child && this.child.connected) {
      const msg: ParentToChildMessage = {
        type: "terminate",
        reason,
      };
      this.child.send(msg);
      setTimeout(() => {
        this.killChild();
      }, 500);
    } else {
      this.killChild();
    }
  }

  private clearReconnectStateForPlayer(playerId: string): void {
    for (const [requestId, pending] of this.pendingReconnects) {
      if (pending.playerId !== playerId) continue;
      clearTimeout(pending.timer);
      this.pendingReconnects.delete(requestId);
      pending.resolve(false);
    }
    this.invalidatedReconnects.clear();
  }

  private killChild(): void {
    this.settlePendingReconnects();
    if (this.child) {
      try {
        this.child.kill("SIGTERM");
      } catch (e) {}
      this.child = null;
    }
  }
}
