/**
 * ClientEngineContext
 * Strongly-typed engine context eliminating (window as any) global state anti-patterns.
 * Encapsulates renderer, active camera, scene, audio, cached models, and match references.
 */

import * as THREE from "three/webgpu";
import type { ClientTransport } from "../transport/adapter";
import type { MatchController } from "../MatchController";

export interface ClientTelemetryData {
  devServerTickMs: number;
  devServerMemory: { heapUsedMb: number; heapTotalMb: number };
  testEntityTelemetryData: any;
  collisionLogs: any[];
  lastCollisionTelemetry: any;
  latency: number;
}

export interface ClientEngineContext {
  renderer: THREE.WebGPURenderer | null;
  camera: THREE.PerspectiveCamera | null;
  audioListener: THREE.AudioListener | null;
  playerModel: THREE.Group | null;
  buildingColliders: any[];
  activeMatch: MatchController | null;
  transport: ClientTransport | null;
  physicsWorker: Worker | null;
  telemetry: ClientTelemetryData;
  setRenderer(r: THREE.WebGPURenderer | null): void;
  setCamera(c: THREE.PerspectiveCamera | null): void;
  setPlayerModel(model: THREE.Group | null): void;
  setPhysicsWorker(worker: Worker | null): void;
  setActiveMatch(match: MatchController | null): void;
}

class EngineContextManager implements ClientEngineContext {
  public renderer: THREE.WebGPURenderer | null = null;
  public camera: THREE.PerspectiveCamera | null = null;
  public audioListener: THREE.AudioListener | null = null;
  public playerModel: THREE.Group | null = null;
  public buildingColliders: any[] = [];
  public activeMatch: MatchController | null = null;
  public transport: ClientTransport | null = null;
  public physicsWorker: Worker | null = null;
  public telemetry: ClientTelemetryData = {
    devServerTickMs: 0,
    devServerMemory: { heapUsedMb: 0, heapTotalMb: 0 },
    testEntityTelemetryData: null,
    collisionLogs: [],
    lastCollisionTelemetry: null,
    latency: 30,
  };

  public setRenderer(r: THREE.WebGPURenderer | null): void {
    this.renderer = r;
  }

  public setCamera(c: THREE.PerspectiveCamera | null): void {
    this.camera = c;
  }

  public setPlayerModel(model: THREE.Group | null): void {
    this.playerModel = model;
  }

  public setPhysicsWorker(worker: Worker | null): void {
    this.physicsWorker = worker;
  }

  public setActiveMatch(match: MatchController | null): void {
    this.activeMatch = match;
  }
}

export const engineContext = new EngineContextManager();
