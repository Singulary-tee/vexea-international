import { ChildProcess, fork } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { RoomExecution, RoomExecutionStatus, RoomInboundEvent, RoomOutboundEvent } from "./RoomExecution";
import { ParentToChildMessage, ChildToParentMessage } from "./protocol";
import { connectionRegistry } from "../connection-registry";
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

  const cjsCandidate = path.resolve(baseDir, "room-worker.cjs");
  if (!fs.existsSync(cjsCandidate)) {
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
    cjsCandidate,
    path.resolve(baseDir, "room-worker.js"),
    path.resolve(baseDir, "room-worker.ts"),
    path.resolve(process.cwd(), "server/execution/room-worker.ts"),
    path.resolve(baseDir, "../../server/execution/room-worker.ts"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const execArgv = [...process.execArgv];
      if (candidate.endsWith(".ts")) {
        const hasLoader = execArgv.some((arg) => arg.includes("tsx") || arg.includes("ts-node"));
        if (!hasLoader) {
          execArgv.push("--import", "tsx");
        }
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
  private options: ForkedRoomExecutionOptions;
  private childPid: number | null = null;
  private isExplicitTermination = false;

  constructor(roomId: string, options: ForkedRoomExecutionOptions = {}) {
    this.roomId = roomId;
    this.options = options;

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

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
          this.readyReject(new Error(`Room process ${this.roomId} timed out waiting for ready state`));
          this.killChild();
          if (this.options.onCrash) {
            this.options.onCrash(this.roomId, "READY_TIMEOUT");
          }
        }
      }, timeoutMs);

      this.child.on("message", (msg: ChildToParentMessage) => {
        this.handleChildMessage(msg, timer);
      });

      this.child.on("error", (err) => {
        console.error(`[ForkedRoomExecution] Child process error for room ${this.roomId}:`, err);
        if (this.status === "starting") {
          clearTimeout(timer);
          this.status = "crashed";
          this.readyReject(err);
        } else if (this.status !== "ending") {
          this.status = "crashed";
        }
        if (this.options.onCrash) {
          this.options.onCrash(this.roomId, err.message);
        }
      });

      this.child.on("exit", (code, signal) => {
        clearTimeout(timer);
        removeWorkerTelemetry(this.roomId);
        const wasEnding = this.status === "ending" || this.isExplicitTermination;
        if (!wasEnding) {
          console.warn(`[ForkedRoomExecution] Room process for ${this.roomId} exited unexpectedly (code: ${code}, signal: ${signal})`);
          this.status = "crashed";
          this.emitOutbound("broadcast", {
            type: "DISCONNECT",
            reason: "ROOM_CRASHED",
          });
          if (this.options.onCrash) {
            this.options.onCrash(this.roomId, `EXIT_${code || signal}`);
          }
        } else {
          this.status = "ending";
          if (this.options.onShutdown) {
            this.options.onShutdown(this.roomId);
          }
        }
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
      this.readyReject(err);
      if (this.options.onCrash) {
        this.options.onCrash(this.roomId, err.message);
      }
    }
  }

  private handleChildMessage(msg: ChildToParentMessage, timer: NodeJS.Timeout): void {
    if (!msg || typeof msg !== "object") return;

    switch (msg.type) {
      case "ready": {
        clearTimeout(timer);
        this.childPid = msg.pid || this.child?.pid || null;
        this.status = "active";
        this.readyResolve();
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
      case "emit_channel": {
        const channel = connectionRegistry.get(msg.playerId);
        if (channel) {
          try {
            channel.emit(msg.eventName, msg.data, msg.options);
          } catch (e) {}
        }
        break;
      }
      case "raw_emit_channel": {
        const channel = connectionRegistry.get(msg.playerId);
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
        this.status = "ending";
        if (this.options.onShutdown) {
          this.options.onShutdown(this.roomId);
        }
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
        if (this.status === "starting") {
          clearTimeout(timer);
          this.status = "crashed";
          this.readyReject(new Error(msg.error));
        }
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
    for (const listener of this.outboundListeners) {
      try {
        listener(playerId, event);
      } catch (err) {
        console.error(`[ForkedRoomExecution] Outbound listener error in room ${this.roomId}:`, err);
      }
    }
  }

  public async send(playerId: string | "broadcast", event: RoomInboundEvent): Promise<void> {
    if (this.status !== "active") {
      return;
    }
    if (this.child && this.child.connected) {
      const msg: ParentToChildMessage = {
        type: "inbound",
        playerId,
        event,
      };
      this.child.send(msg);
    }
  }

  public async registerPlayer(
    playerId: string,
    classId?: string,
    displayName?: string,
    reqUid?: string,
    primaryWeaponId?: string,
    secondaryWeaponId?: string
  ): Promise<void> {
    if (this.child && this.child.connected) {
      const msg: ParentToChildMessage = {
        type: "register_player",
        playerId,
        classId,
        displayName,
        reqUid,
        primaryWeaponId,
        secondaryWeaponId,
      };
      this.child.send(msg);
    }
  }

  public async removePlayer(playerId: string): Promise<void> {
    if (this.child && this.child.connected) {
      const msg: ParentToChildMessage = {
        type: "remove_player",
        playerId,
      };
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
    this.isExplicitTermination = true;
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

  private killChild(): void {
    if (this.child) {
      try {
        this.child.kill("SIGTERM");
      } catch (e) {}
      this.child = null;
    }
  }
}
