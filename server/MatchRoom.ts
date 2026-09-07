/**
 * VEXEA MatchRoom
 * Decomposed match orchestrator coordinating SimulationEngine, CombatResolver,
 * SwarmLifecycle, PlayerSessionManager, and NetworkBroadcaster.
 */

import RAPIER from "@dimforge/rapier3d-compat";
import * as fs from "fs";
import * as path from "path";
import { ACTIVE_GAMEMODE } from "../shared/gamemode-configs.js";
import {
  TOTAL_STATE_BUFFER_SIZE,
  ZONES,
  TOPOLOGY,
  ZONE_BOUNDS,
  DroneState,
  DroneType,
  ZoneName,
  ZONES_ARRAY,
  isRuntimeWeaponId,
} from "../shared/constants";
import { validateEntityAnimationContracts } from "../shared/state-animation-contract";
import { ChannelAdapter } from "./transport/adapter";
import { ClassId, CLASSES } from "../shared/classes.js";
import { getMapById } from "../shared/maps/map-registry";
import { ZoneRegistry } from "./map/ZoneRegistry";
import { OutOfBoundsEnforcer } from "./map/OutOfBoundsEnforcer";
import { CollisionSystem } from "../shared/collision";
import { Sentry } from "./sentry";
import { LLMCommander } from "./ai/LLMCommander";
import { CommanderMemory } from "./ai/CommanderMemory";
import { GroupTacticalState } from "./ai/GroupTacticalState";
import { PhysicsWorldManager } from "./physics/PhysicsWorldManager";
import {
  PlayerState,
  ServerDrone,
  ServerCamera,
  LiveZoneSummary,
  ServerZoneState,
  astarPath,
  getWeaponReloadTicks,
} from "./match/types";
import { SimulationEngine } from "./match/SimulationEngine";
import { CombatResolver } from "./match/CombatResolver";
import { SwarmLifecycle } from "./match/SwarmLifecycle";
import { PlayerSessionManager } from "./match/PlayerSessionManager";
import { NetworkBroadcaster } from "./match/NetworkBroadcaster";
import { benchmarkCounter, benchmarkEvent, benchmarkGauge, benchmarkTimer } from "./benchmark/telemetry";

export type {
  PlayerState,
  ServerDrone,
  ServerCamera,
  ServerZoneState,
};
export {
  astarPath,
  getWeaponReloadTicks,
};

export class MatchRoom {
  public roomId: string;
  public mapId: string;
  public serverTick = 0;
  public matchActive = false;
  public matchStartTime = 0;
  public apiCallCount = 0;
  public llmTokensUsedThisMatch = 0;
  public commanderAP: number = ACTIVE_GAMEMODE.llmApStartPool;
  public fixedWingDeploymentsThisMatch = 0;
  public groupTacticalState = new GroupTacticalState();
  public outstandingOrders = new Map<
    string,
    { targetZone: ZoneName; cyclesOutstanding: number; holdRemainingCycles?: number }
  >();
  public failedOperations: string[] = [];
  public zoneSummary!: Record<ZoneName, ServerZoneState>;

  // Subsystems
  public simulationEngine!: SimulationEngine;
  public combatResolver!: CombatResolver;
  public swarmLifecycle!: SwarmLifecycle;
  public sessionManager!: PlayerSessionManager;
  public networkBroadcaster = new NetworkBroadcaster();

  // Physics & Collision
  public rapierWorld!: RAPIER.World;
  public physicsManager!: PhysicsWorldManager;
  public colliderToEntityMap = new Map<
    number,
    { type: "player"; obj: PlayerState } | { type: "drone"; obj: ServerDrone }
  >();
  public zoneRegistry: ZoneRegistry | null = null;
  public outOfBoundsEnforcer = new OutOfBoundsEnforcer();
  public collisionMap: CollisionSystem | null = null;
  public specJson: any = null;

  // AI
  public llmCommander: LLMCommander | null = null;
  public commanderMemory: CommanderMemory;
  public aiCommanderActive = false;
  public llmCommanderDisabled = false;
  public lastLLMToolCall: string | null = null;

  // Lifecycle & Callbacks
  public onShutdown?: (roomId: string) => void;
  public isShutdown = false;

  // Loop Handles
  private physicsInterval: any = null;
  private syncInterval: any = null;
  private aiInterval: any = null;
  private afkInterval: any = null;

  // Direct Subsystem Aliases for backwards-compatibility
  public get players(): Map<string, PlayerState> {
    return this.sessionManager.players;
  }
  public get drones(): ServerDrone[] {
    return this.swarmLifecycle.drones;
  }
  public get cameras(): ServerCamera[] {
    return this.swarmLifecycle.cameras;
  }
  public get nextDroneId(): number {
    return this.swarmLifecycle.nextDroneId;
  }
  public set nextDroneId(val: number) {
    this.swarmLifecycle.nextDroneId = val;
  }

  // Combat Resolver Pool Aliases
  public get projActive(): Uint8Array {
    return this.combatResolver.projActive;
  }
  public get projPosX(): Float32Array {
    return this.combatResolver.projPosX;
  }
  public get projPosY(): Float32Array {
    return this.combatResolver.projPosY;
  }
  public get projPosZ(): Float32Array {
    return this.combatResolver.projPosZ;
  }
  public get projVelX(): Float32Array {
    return this.combatResolver.projVelX;
  }
  public get projVelY(): Float32Array {
    return this.combatResolver.projVelY;
  }
  public get projVelZ(): Float32Array {
    return this.combatResolver.projVelZ;
  }
  public get projDamage(): Float32Array {
    return this.combatResolver.projDamage;
  }
  public get projDist(): Float32Array {
    return this.combatResolver.projDist;
  }
  public get projEnemy(): Uint8Array {
    return this.combatResolver.projEnemy;
  }
  public get projSourceId(): string[] {
    return this.combatResolver.projSourceId;
  }
  public get historicalAABBHistory(): Float32Array {
    return this.combatResolver.historicalAABBHistory;
  }
  public get historicalAABBIndex(): number {
    return this.combatResolver.historicalAABBIndex;
  }
  public set historicalAABBIndex(val: number) {
    this.combatResolver.historicalAABBIndex = val;
  }
  public get activeC4Map(): Map<string, { x: number; y: number; z: number }> {
    return this.combatResolver.activeC4Map;
  }
  public get proximityMines(): {
    id: string;
    ownerId: string;
    x: number;
    y: number;
    z: number;
    triggered: boolean;
  }[] {
    return this.combatResolver.proximityMines;
  }

  // Debug Cube Properties
  public get devCubeBody(): RAPIER.RigidBody | null {
    return this.simulationEngine.devCubeBody;
  }
  public set devCubeBody(body: RAPIER.RigidBody | null) {
    this.simulationEngine.devCubeBody = body;
  }
  public get devCubeCollider(): RAPIER.Collider | null {
    return this.simulationEngine.devCubeCollider;
  }
  public set devCubeCollider(collider: RAPIER.Collider | null) {
    this.simulationEngine.devCubeCollider = collider;
  }
  public get devCubeEvents(): string[] {
    return this.simulationEngine.devCubeEvents;
  }
  public set devCubeEvents(evts: string[]) {
    this.simulationEngine.devCubeEvents = evts;
  }
  public get devCubePrevState(): "air" | "ground" | "none" {
    return this.simulationEngine.devCubePrevState;
  }
  public set devCubePrevState(state: "air" | "ground" | "none") {
    this.simulationEngine.devCubePrevState = state;
  }
  public get devCubeSpawned(): boolean {
    return this.simulationEngine.devCubeSpawned;
  }
  public set devCubeSpawned(spawned: boolean) {
    this.simulationEngine.devCubeSpawned = spawned;
  }
  public get devPhysicsGravityY(): number {
    return this.simulationEngine.devPhysicsGravityY;
  }
  public set devPhysicsGravityY(val: number) {
    this.simulationEngine.devPhysicsGravityY = val;
  }
  public get devPhysicsSpeedMultiplier(): number {
    return this.simulationEngine.devPhysicsSpeedMultiplier;
  }
  public set devPhysicsSpeedMultiplier(val: number) {
    this.simulationEngine.devPhysicsSpeedMultiplier = val;
  }
  public get devPhysicsPaused(): boolean {
    return this.simulationEngine.devPhysicsPaused;
  }
  public set devPhysicsPaused(val: boolean) {
    this.simulationEngine.devPhysicsPaused = val;
  }
  public get devPhysicsStepOnceRequested(): boolean {
    return this.simulationEngine.devPhysicsStepOnceRequested;
  }
  public set devPhysicsStepOnceRequested(val: boolean) {
    this.simulationEngine.devPhysicsStepOnceRequested = val;
  }

  constructor(roomId: string, geminiKey?: string, mapId = "map_1_facility") {
    this.roomId = roomId;
    this.mapId = mapId;
    this.initMapConfig();
    this.physicsManager = new PhysicsWorldManager(this.specJson);
    this.physicsManager.initPhysics();
    this.rapierWorld = this.physicsManager.rapierWorld;

    this.initSubsystems();
    this.initEntities();

    const contractValidation = validateEntityAnimationContracts();
    if (!contractValidation.valid) {
      console.error(
        "[MatchRoom] Entity animation contract validation errors:",
        contractValidation.errors
      );
    }

    this.commanderMemory = new CommanderMemory(this);
    benchmarkCounter("rooms.created");
    benchmarkEvent("room_created", {
      roomId: this.roomId,
      mapId: this.mapId,
      mapSpecLoaded: Boolean(this.specJson),
    });

    if (geminiKey) {
      try {
        this.llmCommander = new LLMCommander(this, geminiKey);
        this.aiCommanderActive = true;
      } catch (e) {
        console.error(
          `[VEXEA SERVER] Failed to initialize LLMCommander in room ${this.roomId}:`,
          e
        );
      }
    }
  }

  private initSubsystems(): void {
    this.swarmLifecycle = new SwarmLifecycle({
      getRapierWorld: () => this.rapierWorld,
      getColliderToEntityMap: () => this.colliderToEntityMap,
      getMapId: () => this.mapId,
      getSpecJson: () => this.specJson,
      getCommanderMemory: () => this.commanderMemory,
      broadcastReliableEvent: (evt) => this.broadcastReliableEvent(evt),
    });

    this.sessionManager = new PlayerSessionManager({
      getRapierWorld: () => this.rapierWorld,
      getColliderToEntityMap: () => this.colliderToEntityMap,
      getMapId: () => this.mapId,
      getSpecJson: () => this.specJson,
      getOutOfBoundsEnforcer: () => this.outOfBoundsEnforcer,
      isMatchActive: () => this.matchActive,
      isShutdown: () => this.isShutdown,
      broadcastReliableEvent: (evt) => this.broadcastReliableEvent(evt),
      triggerStartMatch: () => this.triggerStartMatch(),
      shutdown: () => this.shutdown(),
    });

    this.combatResolver = new CombatResolver({
      getPlayers: () => this.sessionManager.players,
      getDrones: () => this.swarmLifecycle.drones,
      getCameras: () => this.swarmLifecycle.cameras,
      getRapierWorld: () => this.rapierWorld,
      getCollisionMap: () => this.collisionMap,
      getServerTick: () => this.serverTick,
      isShutdown: () => this.isShutdown,
      broadcastReliableEvent: (evt) => this.broadcastReliableEvent(evt),
      despawnDrone: (d) => this.swarmLifecycle.despawnDrone(d),
      getCommanderMemory: () => this.commanderMemory,
      getLLMCommander: () => this.llmCommander,
    });

    this.simulationEngine = new SimulationEngine({
      getRapierWorld: () => this.rapierWorld,
      getPlayers: () => this.sessionManager.players,
      getDrones: () => this.swarmLifecycle.drones,
      getCameras: () => this.swarmLifecycle.cameras,
      getColliderToEntityMap: () => this.colliderToEntityMap,
      getCollisionMap: () => this.collisionMap,
      getOutOfBoundsEnforcer: () => this.outOfBoundsEnforcer,
      getSpecJson: () => this.specJson,
      getZoneSummary: () => this.zoneSummary,
      getServerTick: () => this.serverTick,
      setServerTick: (t) => {
        this.serverTick = t;
      },
      getMatchStartTime: () => this.matchStartTime,
      isMatchActive: () => this.matchActive,
      isShutdown: () => this.isShutdown,
      broadcastReliableEvent: (evt) => this.broadcastReliableEvent(evt),
      handleMatchEnd: (res) => this.handleMatchEnd(res),
      applyDamage: (playerId, rawDamage, type, entityId, entityType) =>
        this.combatResolver.applyDamage(
          playerId,
          rawDamage,
          type,
          entityId,
          entityType
        ),
      updateProjectiles: () => this.combatResolver.updateProjectiles(),
      updateProximityMines: () => this.combatResolver.updateProximityMines(),
      recordDroneHistory: () => this.combatResolver.recordDroneHistory(),
      despawnDrone: (d) => this.swarmLifecycle.despawnDrone(d),
      processDroneKillAssists: (d, killerId) =>
        this.combatResolver.processDroneKillAssists(d, killerId),
      spawnServerProjectile: (x, y, z, dirX, dirY, dirZ, isEnemy, damage, sourceId) =>
        this.combatResolver.spawnServerProjectile(x, y, z, dirX, dirY, dirZ, isEnemy, damage, sourceId),
      initDronePhysics: (d) => this.initDronePhysics(d),
    });
  }

  private initMapConfig(): void {
    if (this.mapId === "benchmark_synthetic") {
      this.specJson = {
        id: "benchmark_synthetic",
        version: "1",
        playerSpawn: { position: { x: 0, y: 0, z: 120 } },
        buildings: [],
      };
      this.zoneRegistry = new ZoneRegistry();
      this.outOfBoundsEnforcer = new OutOfBoundsEnforcer();
      this.collisionMap = new CollisionSystem();
      return;
    }
    const mapDef = getMapById(this.mapId);
    this.zoneRegistry = new ZoneRegistry();
    this.outOfBoundsEnforcer = new OutOfBoundsEnforcer();
    this.collisionMap = new CollisionSystem();

    const specPath = (mapDef as any)?.specFile || "specs/map_1_facility.json";
    try {
      if (fs.existsSync(path.resolve(specPath))) {
        const specRaw = fs.readFileSync(path.resolve(specPath), "utf-8");
        this.specJson = JSON.parse(specRaw);
        this.collisionMap.loadFromSpec(this.specJson);
      }
    } catch (e) {
      console.error(
        `[MatchRoom] Failed to load map spec file from ${specPath}:`,
        e
      );
    }
  }

  private initEntities(): void {
    this.swarmLifecycle.initCameras();

    this.zoneSummary = {
      [ZONES.SPAWN]: {
        id: ZONES.SPAWN,
        name: "SPAWN",
        bounds: { minX: 0, maxX: 128, minZ: 640, maxZ: 768 },
        connectedZones: [ZONES.COURTYARD],
        droneGroups: [],
        confidence: 1.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: false,
        allowsAirUnits: false,
      },
      [ZONES.COURTYARD]: {
        id: ZONES.COURTYARD,
        name: "COURTYARD",
        bounds: { minX: 0, maxX: 288, minZ: 352, maxZ: 640 },
        connectedZones: [ZONES.SPAWN, ZONES.WAREHOUSE, ZONES.BRIDGE],
        droneGroups: [],
        confidence: 1.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: true,
      },
      [ZONES.WAREHOUSE]: {
        id: ZONES.WAREHOUSE,
        name: "WAREHOUSE",
        bounds: { minX: 0, maxX: 288, minZ: 128, maxZ: 352 },
        connectedZones: [ZONES.COURTYARD, ZONES.TUNNELS],
        droneGroups: [],
        confidence: 1.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: false,
      },
      [ZONES.BRIDGE]: {
        id: ZONES.BRIDGE,
        name: "BRIDGE",
        bounds: { minX: 248, maxX: 328, minZ: 456, maxZ: 536 },
        connectedZones: [ZONES.COURTYARD, ZONES.PLANT, ZONES.CORE],
        droneGroups: [],
        confidence: 1.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: true,
      },
      [ZONES.PLANT]: {
        id: ZONES.PLANT,
        name: "PLANT",
        bounds: { minX: 288, maxX: 768, minZ: 128, maxZ: 768 },
        connectedZones: [ZONES.BRIDGE, ZONES.CORE, ZONES.TUNNELS],
        droneGroups: [],
        confidence: 1.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: true,
      },
      [ZONES.TUNNELS]: {
        id: ZONES.TUNNELS,
        name: "TUNNELS",
        bounds: { minX: 128, maxX: 768, minZ: 0, maxZ: 128 },
        connectedZones: [ZONES.WAREHOUSE, ZONES.PLANT, ZONES.CORE],
        droneGroups: [],
        confidence: 1.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: false,
      },
      [ZONES.CORE]: {
        id: ZONES.CORE,
        name: "CORE",
        bounds: { minX: 320, maxX: 448, minZ: 320, maxZ: 448 },
        connectedZones: [ZONES.BRIDGE, ZONES.PLANT, ZONES.TUNNELS],
        droneGroups: [],
        confidence: 1.0,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: true,
      },
    };
  }

  // --- Session Delegation ---
  public registerPlayer(
    playerId: string,
    channel: ChannelAdapter,
    stats?: any,
    playerClass?: ClassId,
    displayName?: string,
    reqUid?: string,
    requestedPrimaryWeaponId?: string,
    requestedSecondaryWeaponId?: string
  ): PlayerState {
    const player = this.sessionManager.registerPlayer(
      playerId,
      channel,
      stats,
      playerClass,
      displayName,
      reqUid,
      requestedPrimaryWeaponId,
      requestedSecondaryWeaponId
    );
    benchmarkCounter("players.registered");
    return player;
  }

  public registerBotPlayer(): PlayerState {
    return this.sessionManager.registerBotPlayer();
  }

  public spawnTestBots(count: number): void {
    this.sessionManager.spawnTestBots(count);
  }

  public applyPlayerClassLoadout(
    pStateOrId: PlayerState | string,
    classId: ClassId,
    requestedPrimaryWeaponId?: string,
    requestedSecondaryWeaponId?: string
  ): void {
    this.sessionManager.applyPlayerClassLoadout(
      pStateOrId,
      classId,
      requestedPrimaryWeaponId,
      requestedSecondaryWeaponId
    );
  }

  public handlePlayerDisconnect(playerId: string): void {
    this.sessionManager.handlePlayerDisconnect(playerId);
  }

  public handlePlayerReconnect(
    playerId: string,
    newChannel: ChannelAdapter
  ): void {
    this.sessionManager.handlePlayerReconnect(playerId, newChannel);
  }

  public async handlePlayerAbandonment(playerId: string): Promise<void> {
    await this.sessionManager.handlePlayerAbandonment(playerId);
  }

  public removePlayer(playerId: string): void {
    this.sessionManager.removePlayer(playerId);
  }

  public updatePlayerInput(
    p: PlayerState,
    inputMask: number,
    pitch: number,
    yaw: number
  ): void {
    this.sessionManager.updatePlayerInput(p, inputMask, pitch, yaw);
  }

  public recordPlayerActivity(p: PlayerState): void {
    this.sessionManager.recordPlayerActivity(p);
  }

  public setPlayerReady(playerId: string): void {
    this.sessionManager.setPlayerReady(playerId);
  }

  public setObjectiveHold(playerId: string, holding: boolean): void {
    const player = this.sessionManager.players.get(playerId);
    if (player && player.isAlive) {
      player.isHoldingObjective = holding;
      if (!holding && ACTIVE_GAMEMODE.objectiveResetOnExit) {
        player.currentObjectiveProgress = 0;
      }
    }
  }

  // --- Combat & Utility Delegation ---
  public spawnServerProjectile(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    isEnemy: boolean,
    damage: number,
    sourceId: string
  ): void {
    this.combatResolver.spawnServerProjectile(
      x,
      y,
      z,
      dirX,
      dirY,
      dirZ,
      isEnemy,
      damage,
      sourceId
    );
  }

  public executeAABBShotValidation(
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    timestamp: number
  ): { hit: boolean; droneId: number } {
    return this.combatResolver.executeAABBShotValidation(
      origin,
      dir,
      timestamp
    );
  }

  public applyDamage(
    playerId: string,
    rawDamage: number,
    type: "bullet" | "explosion" | "fall" | "melee",
    entityId: string,
    entityType: "drone" | "environment" | "player"
  ): void {
    this.combatResolver.applyDamage(
      playerId,
      rawDamage,
      type,
      entityId,
      entityType
    );
  }

  public applyExplosionDamage(
    origin: { x: number; y: number; z: number },
    radius: number,
    maxDamage: number,
    sourceId: string,
    sourceType: "drone" | "environment" | "player"
  ): void {
    this.combatResolver.applyExplosionDamage(
      origin,
      radius,
      maxDamage,
      sourceId,
      sourceType
    );
  }

  public useUtility(playerId: string, slot: "utility1" | "utility2"): void {
    this.combatResolver.useUtility(playerId, slot);
  }

  public resolveGrenadeExplosion(
    attackerId: string,
    origin: { x: number; y: number; z: number }
  ): void {
    this.combatResolver.resolveGrenadeExplosion(attackerId, origin);
  }

  public resolveFlashbangDetonation(
    attackerId: string,
    origin: { x: number; y: number; z: number }
  ): void {
    this.combatResolver.resolveFlashbangDetonation(attackerId, origin);
  }

  public processDroneKillAssists(drone: ServerDrone, killerId: string): void {
    this.combatResolver.processDroneKillAssists(drone, killerId);
  }

  // --- Swarm Delegation ---
  public initDronePhysics(d: ServerDrone): void {
    this.swarmLifecycle.initDronePhysics(d);
  }

  public despawnDrone(d: ServerDrone): void {
    this.swarmLifecycle.despawnDrone(d);
  }

  public resetDroneToDefaults(d: ServerDrone): void {
    this.swarmLifecycle.resetDroneToDefaults(d);
  }

  public registerDeveloperSpawner(
    type: number,
    pos?: { x: number; y: number; z: number }
  ): boolean {
    return this.swarmLifecycle.registerDeveloperSpawner(type, pos);
  }

  public getNextSpawnPoint(
    spawnType: "AIR_HANGAR" | "GROUND_GARAGE" | "ELEVATOR_SHAFT"
  ): { x: number; y: number; z: number } | null {
    return this.swarmLifecycle.getNextSpawnPoint(spawnType);
  }

  public findHitEntity(
    colliderHandle: number
  ): { type: "player"; obj: PlayerState } | { type: "drone"; obj: ServerDrone } | null {
    return this.colliderToEntityMap.get(colliderHandle) || null;
  }

  // --- Physics Dev Tools ---
  public devSpawnCube(
    playerId: string,
    customPos?: { x: number; y: number; z: number }
  ): void {
    this.simulationEngine.devSpawnCube(playerId, customPos);
  }

  public devClearCube(): void {
    this.simulationEngine.devClearCube();
  }

  public setDevPhysicsGravityY(gY: number): void {
    this.simulationEngine.setDevPhysicsGravityY(gY);
  }

  public setDevPhysicsSpeedMultiplier(sM: number): void {
    this.simulationEngine.setDevPhysicsSpeedMultiplier(sM);
  }

  public setDevPhysicsPaused(p: boolean): void {
    this.simulationEngine.setDevPhysicsPaused(p);
  }

  public setDevPhysicsStepOnce(): void {
    this.simulationEngine.setDevPhysicsStepOnce();
  }

  // --- AI Fallback ---
  public offlineSystemFallbackAI(): void {
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state !== DroneState.DEAD && d.state === DroneState.IDLE) {
        d.state = DroneState.PATROLLING;
      }
    }
  }

  // --- Broadcasting ---
  public broadcastReliableEvent(evt: any): void {
    this.networkBroadcaster.broadcastReliableEvent(
      this.sessionManager.players,
      evt
    );
  }

  // --- Match Flow & Loop Management ---
  public async triggerStartMatch(): Promise<void> {
    if (this.matchActive) return;

    this.matchActive = true;
    this.serverTick = 0;
    this.matchStartTime = Date.now();
    this.apiCallCount = 0;
    this.llmTokensUsedThisMatch = 0;
    this.commanderAP = ACTIVE_GAMEMODE.llmApStartPool;
    this.fixedWingDeploymentsThisMatch = 0;
    this.outstandingOrders.clear();
    console.log(
      `[VEXEA SERVER] Match active! Triggering Loops in Room: ${this.roomId}`
    );

    this.startSimulationLoops();
    this.broadcastReliableEvent({ type: "match_ready", mapId: this.mapId });

    for (const p of this.sessionManager.players.values()) {
      p.channel.emit("match_ready", { mapId: this.mapId });
    }
  }

  private startSimulationLoops(): void {
    const PHYSICS_TICK_RATE = 60n;
    const PHYSICS_TIMESTEP = 1000000000n / PHYSICS_TICK_RATE;
    let lastPhysicsTime = process.hrtime.bigint();
    let physicsAccumulator = 0n;
    const schedulerInterval = 5_000_000n;

    this.physicsInterval = setInterval(() => {
      const now = process.hrtime.bigint();
      let elapsed = now - lastPhysicsTime;
      lastPhysicsTime = now;
      benchmarkCounter("simulation.scheduler_callbacks");
      benchmarkTimer("simulation.scheduler_lateness", Math.max(0, Number(elapsed - schedulerInterval) / 1e6));

      if (this.simulationEngine.devPhysicsPaused) {
        elapsed = 0n;
      } else {
        elapsed = BigInt(
          Math.floor(
            Number(elapsed) * this.simulationEngine.devPhysicsSpeedMultiplier
          )
        );
      }
      physicsAccumulator += elapsed;

      if (this.simulationEngine.devPhysicsStepOnceRequested) {
        physicsAccumulator += PHYSICS_TIMESTEP;
        this.simulationEngine.devPhysicsStepOnceRequested = false;
      }

      const maxAccumulator = PHYSICS_TIMESTEP * 10n;
      if (physicsAccumulator > maxAccumulator) {
        const discardedTime = physicsAccumulator - maxAccumulator;
        benchmarkCounter("simulation.dropped_ticks", Number(discardedTime / PHYSICS_TIMESTEP));
        benchmarkCounter("simulation.discarded_time_ms", Number(discardedTime) / 1e6);
        physicsAccumulator = maxAccumulator;
      }

      let catchUpSteps = 0;
      while (physicsAccumulator >= PHYSICS_TIMESTEP) {
        this.simulationEngine.tickSimulation();
        physicsAccumulator -= PHYSICS_TIMESTEP;
        catchUpSteps += 1;
      }
      if (catchUpSteps > 1) benchmarkCounter("simulation.catch_up_steps", catchUpSteps - 1);
      benchmarkGauge("simulation.accumulator_ms", Number(physicsAccumulator) / 1e6);
      benchmarkGauge("entities.players", this.sessionManager.players.size);
      let clientCount = 0;
      let botCount = 0;
      for (const player of this.sessionManager.players.values()) {
        if (player.isBot) botCount += 1;
        else clientCount += 1;
      }
      benchmarkGauge("entities.clients", clientCount);
      benchmarkGauge("entities.bots", botCount);
      benchmarkGauge("entities.drones", this.swarmLifecycle.drones.filter((drone) => drone.state !== DroneState.DEAD).length);
      benchmarkGauge("entities.projectiles", this.combatResolver.projActive.reduce((sum, active) => sum + active, 0));
    }, 5);

    // AI timing loop (8s)
    this.aiInterval = setInterval(() => {
      if (!this.matchActive) return;
      if (this.llmCommanderDisabled) return;
      if (
        this.aiCommanderActive &&
        this.llmCommander &&
        Date.now() > this.llmCommander.geminiThrottleCooldownUntil
      ) {
        this.llmCommander.executeLLMStep();
      }
    }, 8000);

    // Sync broadcast networking updates (20Hz)
    this.syncInterval = setInterval(() => {
      if (this.sessionManager.players.size === 0) return;
      if (!this.matchActive) return;

      let cubeSyncData = undefined;
      if (this.simulationEngine.devCubeBody) {
        const t = this.simulationEngine.devCubeBody.translation();
        const vel = this.simulationEngine.devCubeBody.linvel();
        cubeSyncData = {
          x: t.x,
          y: t.y,
          z: t.z,
          vx: vel.x,
          vy: vel.y,
          vz: vel.z,
          events: [...this.simulationEngine.devCubeEvents],
        };
      }

      this.networkBroadcaster.broadcastSync(
        this.sessionManager.players,
        this.swarmLifecycle.drones,
        this.swarmLifecycle.cameras,
        this.combatResolver.projActive,
        this.combatResolver.projPosX,
        this.combatResolver.projPosY,
        this.combatResolver.projPosZ,
        this.combatResolver.projEnemy,
        this.serverTick,
        this.zoneSummary,
        cubeSyncData
      );
    }, 50.0);

    // Periodic AFK detection pass (1s granularity)
    this.afkInterval = setInterval(() => {
      this.sessionManager.checkPlayerAFK();
    }, 1000);
  }

  public handleMatchEnd(result: "win" | "loss"): void {
    this.matchActive = false;
    this.serverTick = 0;
    for (let i = 0; i < this.swarmLifecycle.drones.length; i++) {
      this.swarmLifecycle.drones[i].state = DroneState.DEAD;
    }
    for (let i = 0; i < this.combatResolver.projActive.length; i++) {
      this.combatResolver.projActive[i] = 0;
    }

    const allStats: Record<string, any> = {};
    for (const [id, p] of this.sessionManager.players.entries()) {
      allStats[id] = p.stats;
      this.networkBroadcaster.processMatchEndTransaction(
        id,
        p.stats,
        result,
        p.adMultiplier || 1,
        this.sessionManager.players,
        this.sessionManager.abandonedPlayerIds
      );
    }

    this.broadcastReliableEvent({
      type: "MATCH_END",
      result,
      stats: allStats,
      message: result === "win" ? "SYSTEM TERMINATED" : "CONTRACT FAILED",
    });
  }

  public shutdown(): void {
    if (this.isShutdown) return;
    this.isShutdown = true;
    this.matchActive = false;
    benchmarkCounter("rooms.shutdown");
    benchmarkEvent("room_shutdown", { roomId: this.roomId });

    if (this.physicsInterval) clearInterval(this.physicsInterval);
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.aiInterval) clearInterval(this.aiInterval);
    if (this.afkInterval) clearInterval(this.afkInterval);

    for (const p of this.sessionManager.players.values()) {
      if (p.body) {
        try {
          this.rapierWorld.removeRigidBody(p.body);
        } catch (e) {}
      }
      try {
        p.channel.emit("reliable_event", {
          type: "MATCH_TERMINATED",
          reason: "server_shutdown",
        });
      } catch (e) {}
    }
    this.sessionManager.players.clear();
    this.colliderToEntityMap.clear();

    for (let i = 0; i < this.swarmLifecycle.drones.length; i++) {
      const d = this.swarmLifecycle.drones[i];
      if (d.body) {
        try {
          this.rapierWorld.removeRigidBody(d.body);
        } catch (e) {}
        d.body = null;
      }
      d.collider = null;
      d.state = DroneState.DEAD;
    }

    if (this.rapierWorld) {
      try {
        this.rapierWorld.free();
        (this as any).rapierWorld = null;
      } catch (e) {
        console.error("[VEXEA SERVER] Error freeing rapierWorld:", e);
      }
    }

    if (this.onShutdown) {
      this.onShutdown(this.roomId);
    }
  }
}
