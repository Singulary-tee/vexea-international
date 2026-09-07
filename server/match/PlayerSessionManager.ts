import RAPIER from "@dimforge/rapier3d-compat";
import {
  PlayerState,
  ServerDrone,
  ChannelAdapter,
  isRuntimeWeaponId,
  resetWeaponSlotState,
  getResolvedWeaponPerformance,
  getWeaponReserveCapacity,
} from "./types";
import {
  ClassId,
  CLASSES,
  isClassWeaponAllowed,
} from "../../shared/classes.js";
import {
  createInitialUtilityState,
} from "../../shared/utilities.js";
import {
  PLAYER_MAX_HP,
  ZONES,
} from "../../shared/constants";
import { ACTIVE_GAMEMODE } from "../../shared/gamemode-configs.js";
import { MatchAbuseStore } from "../player-data/MatchAbuseStore";
import { benchmarkCounter } from "../benchmark/telemetry";

export interface PlayerSessionManagerContext {
  getRapierWorld: () => RAPIER.World | null;
  getColliderToEntityMap: () => Map<
    number,
    { type: "player"; obj: PlayerState } | { type: "drone"; obj: ServerDrone }
  >;
  getMapId: () => string;
  getSpecJson: () => any;
  getOutOfBoundsEnforcer: () => any;
  isMatchActive: () => boolean;
  isShutdown: () => boolean;
  broadcastReliableEvent: (evt: any) => void;
  triggerStartMatch: () => void;
  shutdown: () => void;
}

export class PlayerSessionManager {
  public players = new Map<string, PlayerState>();
  public abandonedPlayerIds = new Set<string>();

  constructor(private context: PlayerSessionManagerContext) {}

  public applyPlayerClassLoadout(
    pStateOrId: PlayerState | string,
    classId: ClassId,
    requestedPrimaryWeaponId?: string,
    requestedSecondaryWeaponId?: string
  ): void {
    const pState =
      typeof pStateOrId === "string"
        ? this.players.get(pStateOrId)
        : pStateOrId;
    if (!pState) return;
    const classDef = CLASSES[classId] || CLASSES.ASSAULT;
    const primaryWeaponId =
      requestedPrimaryWeaponId &&
      isRuntimeWeaponId(requestedPrimaryWeaponId) &&
      isClassWeaponAllowed(classDef.id, "primary", requestedPrimaryWeaponId)
        ? requestedPrimaryWeaponId
        : classDef.primaryWeapon;
    const secondaryWeaponId =
      requestedSecondaryWeaponId &&
      isRuntimeWeaponId(requestedSecondaryWeaponId) &&
      isClassWeaponAllowed(classDef.id, "secondary", requestedSecondaryWeaponId)
        ? requestedSecondaryWeaponId
        : classDef.secondaryWeapon;

    pState.classId = classDef.id;
    pState.weapon = primaryWeaponId;
    resetWeaponSlotState(pState.weaponState.primary, primaryWeaponId);
    resetWeaponSlotState(pState.weaponState.secondary, secondaryWeaponId);
    pState.hp = 100;
    pState.maxHp = PLAYER_MAX_HP;
    pState.utilityState = createInitialUtilityState(
      classDef.id,
      ACTIVE_GAMEMODE.utilityCooldownMultiplier
    );
    pState.channel.emit("reliable_event", {
      type: "WEAPON_LOADOUT",
      classId: classDef.id,
      primaryWeaponId,
      secondaryWeaponId,
    });
    pState.channel.emit("reliable_event", {
      type: "UTILITY_STATE",
      state: pState.utilityState,
    });
    console.log(
      `[MATCH] Applied class ${classDef.id} loadout to player ${pState.id}: Primary=${primaryWeaponId}, Secondary=${secondaryWeaponId}, Utility1=${classDef.utility1}, Utility2=${classDef.utility2}`
    );
  }

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
    const mapId = this.context.getMapId();
    console.log(
      `[SERVER registerPlayer] playerId: "${playerId}", displayName: "${
        displayName || playerId
      }", mapId: "${mapId}", class: "${playerClass || "ASSAULT"}"`
    );

    if (this.players.has(playerId)) {
      const existing = this.players.get(playerId)!;
      this.handlePlayerReconnect(playerId, channel);
      if (reqUid) existing.reqUid = reqUid;
      if (displayName) existing.displayName = displayName;
      if (playerClass && CLASSES[playerClass]) {
        this.applyPlayerClassLoadout(
          existing,
          playerClass,
          requestedPrimaryWeaponId,
          requestedSecondaryWeaponId
        );
      }
      console.log(
        `[MATCH] Player ${playerId} reconnected. Rebinding to existing session state at [${existing.posX.toFixed(
          2
        )}, ${existing.posY.toFixed(2)}, ${existing.posZ.toFixed(2)}]`
      );

      channel.emit("handshake", {
        id: existing.id,
        mapId: mapId,
        posX: existing.posX,
        posY: existing.posY,
        posZ: existing.posZ,
        hp: existing.hp,
        weapon: existing.weapon,
        classId: existing.classId,
        primaryWeaponId: existing.weaponState.primary.weaponId,
        secondaryWeaponId: existing.weaponState.secondary.weaponId,
        stats: existing.stats,
      });

      return existing;
    }

    const specJson = this.context.getSpecJson();
    const spawnX =
      specJson?.playerSpawn?.position?.x ?? (Math.random() - 0.5) * 40;
    const spawnY = (specJson?.playerSpawn?.position?.y ?? 0) + 5.0;
    const spawnZ =
      specJson?.playerSpawn?.position?.z ?? 120 + (Math.random() - 0.5) * 10;

    const chosenClassId: ClassId =
      playerClass && CLASSES[playerClass] ? playerClass : "ASSAULT";
    const classDef = CLASSES[chosenClassId];
    const primaryWeaponId =
      requestedPrimaryWeaponId &&
      isRuntimeWeaponId(requestedPrimaryWeaponId) &&
      isClassWeaponAllowed(chosenClassId, "primary", requestedPrimaryWeaponId)
        ? requestedPrimaryWeaponId
        : classDef.primaryWeapon;
    const secondaryWeaponId =
      requestedSecondaryWeaponId &&
      isRuntimeWeaponId(requestedSecondaryWeaponId) &&
      isClassWeaponAllowed(chosenClassId, "secondary", requestedSecondaryWeaponId)
        ? requestedSecondaryWeaponId
        : classDef.secondaryWeapon;
    const primaryPerformance = getResolvedWeaponPerformance(primaryWeaponId);
    const secondaryPerformance = getResolvedWeaponPerformance(secondaryWeaponId);

    const pState: PlayerState = {
      id: playerId,
      reqUid: reqUid || playerId,
      displayName: displayName || playerId,
      channel,
      kcc: null,
      body: null,
      collider: null,
      isReady: false,
      isBot: false,
      inputMask: 0,
      fire: 0,
      timestamp: Date.now(),
      posX: spawnX,
      posY: spawnY,
      posZ: spawnZ,
      velX: 0,
      velY: 0,
      velZ: 0,
      pitch: 0,
      yaw: 0,
      hp: 100,
      score: 0,
      classId: chosenClassId,
      weapon: primaryWeaponId,
      weaponState: {
        primary: {
          weaponId: primaryWeaponId,
          currentMag: primaryPerformance.capacity,
          reserve: getWeaponReserveCapacity(primaryWeaponId),
          isReloading: false,
          reloadTimer: 0,
          fireMode: "auto",
          lastConfirmedShotT: 0,
          leakyBucket: 0,
        },
        secondary: {
          weaponId: secondaryWeaponId,
          currentMag: secondaryPerformance.capacity,
          reserve: getWeaponReserveCapacity(secondaryWeaponId),
          isReloading: false,
          reloadTimer: 0,
          fireMode: "auto",
          lastConfirmedShotT: 0,
          leakyBucket: 0,
        },
      },
      ping: 30,
      lastSequence: 0,
      leakyRateLimit: 0,
      lastFireTime: 0,
      lastInputChangeTime: Date.now(),
      afkWarningIssued: false,
      velEmaX: 0,
      velEmaY: 0,
      velEmaZ: 0,
      adMultiplier: 1,
      firedThisTick: false,
      maxHp: PLAYER_MAX_HP,
      isAlive: true,
      isDead: false,
      respawnTimer: 0,
      lastDamageSource: { type: "bullet", entityId: "", entityType: "player" },
      deathPosition: { x: 0, y: 0, z: 0 },
      stats: {
        damageDealt: 0,
        damageReceived: 0,
        deaths: 0,
        droneEliminations: 0,
        assists: 0,
        objectiveTimeHeld: 0,
        revivesPerformed: 0,
        distanceTravelled: 0,
        timeAlive: 0,
        scoreIndividual: 0,
      },
      lastFallStartY: 1.2,
      utilityState: createInitialUtilityState(
        chosenClassId,
        ACTIVE_GAMEMODE.utilityCooldownMultiplier
      ),
    };

    if (stats) {
      Object.assign(pState.stats, stats);
    }

    const rapierWorld = this.context.getRapierWorld();
    if (rapierWorld) {
      const bodyDesc =
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
          pState.posX,
          pState.posY,
          pState.posZ
        );
      pState.body = rapierWorld.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.4);
      pState.collider = rapierWorld.createCollider(colliderDesc, pState.body);
      this.context.getColliderToEntityMap().set(pState.collider.handle, {
        type: "player",
        obj: pState,
      });
      pState.kcc = rapierWorld.createCharacterController(0.01);
      pState.kcc.setUp({ x: 0, y: 1, z: 0 });
      pState.kcc.setApplyImpulsesToDynamicBodies(true);
    }

    this.players.set(playerId, pState);

    channel.emit("handshake", {
      type: "handshake",
      id: playerId,
      zones: Object.values(ZONES),
      position: { x: pState.posX, y: pState.posY, z: pState.posZ },
      classId: pState.classId,
      primaryWeaponId: pState.weaponState.primary.weaponId,
      secondaryWeaponId: pState.weaponState.secondary.weaponId,
    });

    channel.emit("reliable_event", {
      type: "WEAPON_LOADOUT",
      classId: pState.classId,
      primaryWeaponId: pState.weaponState.primary.weaponId,
      secondaryWeaponId: pState.weaponState.secondary.weaponId,
    });
    channel.emit("reliable_event", {
      type: "UTILITY_STATE",
      state: pState.utilityState,
    });
    return pState;
  }

  public registerBotPlayer(): PlayerState {
    const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
    const dummyChannel: any = {
      emit: () => {},
      rawEmit: () => {},
      raw: { emit: () => {} },
    };

    const pState = this.registerPlayer(
      botId,
      dummyChannel as ChannelAdapter,
      {}
    );
    pState.inputMask = 0;
    pState.isBot = true;
    pState.isReady = true;
    pState.botActionId = 0;
    pState.botTargetId = "";
    pState.botTargetDist = 0;
    pState.botFireCooldown = 0;
    pState.botAimYaw = 0;
    pState.botAimPitch = 0;
    benchmarkCounter("bots.spawned");
    return pState;
  }

  public spawnTestBots(count: number): void {
    for (let i = 0; i < count; i++) {
      this.registerBotPlayer();
    }
  }

  public handlePlayerDisconnect(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;

    if (p.disconnectTimer) {
      clearTimeout(p.disconnectTimer);
    }

    console.log(
      `[MATCH] Starting 75-second grace period for player ${playerId}`
    );
    p.disconnectTimer = setTimeout(async () => {
      const pCheck = this.players.get(playerId);
      if (pCheck && (!pCheck.channel || !pCheck.channel.connected)) {
        console.log(
          `[MATCH] Disconnect grace period (75s) expired for ${playerId}. Triggering match abandonment.`
        );
        await this.handlePlayerAbandonment(playerId);
      }
    }, 75000);
  }

  public handlePlayerReconnect(
    playerId: string,
    newChannel: ChannelAdapter
  ): void {
    const p = this.players.get(playerId);
    if (p) {
      if (p.disconnectTimer) {
        clearTimeout(p.disconnectTimer);
        p.disconnectTimer = undefined;
        console.log(
          `[MATCH] Player ${playerId} reconnected during 75s grace period.`
        );
      }
      p.channel = newChannel;
      p.lastInputChangeTime = Date.now();
      p.afkWarningIssued = false;
    }
  }

  public async handlePlayerAbandonment(playerId: string): Promise<void> {
    const p = this.players.get(playerId);
    if (!p) {
      this.abandonedPlayerIds.add(playerId);
      return;
    }

    if (p.disconnectTimer) {
      clearTimeout(p.disconnectTimer);
      p.disconnectTimer = undefined;
    }

    p.abandonedMatch = true;
    this.abandonedPlayerIds.add(playerId);
    const uid = p.reqUid || p.id;

    if (!p.isBot) {
      console.log(
        `[MatchRoom] Recording abandonment offense for player ${uid}...`
      );
      await MatchAbuseStore.recordOffense(uid);
    }

    this.removePlayer(playerId);
  }

  public removePlayer(playerId: string): void {
    const p = this.players.get(playerId);
    if (p) {
      if (p.disconnectTimer) {
        clearTimeout(p.disconnectTimer);
        p.disconnectTimer = undefined;
      }
      const outOfBoundsEnforcer = this.context.getOutOfBoundsEnforcer();
      if (outOfBoundsEnforcer) {
        outOfBoundsEnforcer.resetPlayer(playerId);
      }
      if (p.collider) {
        this.context.getColliderToEntityMap().delete(p.collider.handle);
      }
      const rapierWorld = this.context.getRapierWorld();
      if (p.body && rapierWorld) {
        rapierWorld.removeRigidBody(p.body);
      }
      this.players.delete(playerId);
      this.context.broadcastReliableEvent({ type: "PLAYER_LEFT", playerId });

      let hasRealPlayers = false;
      for (const player of this.players.values()) {
        if (!player.isBot) {
          hasRealPlayers = true;
          break;
        }
      }

      if (!hasRealPlayers) {
        this.context.shutdown();
      }
    }
  }

  public updatePlayerInput(
    p: PlayerState,
    inputMask: number,
    pitch: number,
    yaw: number
  ): void {
    const inputChanged =
      p.inputMask !== inputMask ||
      Math.abs(p.pitch - pitch) > 0.0001 ||
      Math.abs(p.yaw - yaw) > 0.0001;

    p.inputMask = inputMask;
    p.pitch = pitch;
    p.yaw = yaw;

    if (inputChanged) {
      if (p.afkWarningIssued) {
        p.afkWarningIssued = false;
        try {
          p.channel.emit("reliable_event", { type: "afk_cleared" });
        } catch (e) {}
      }
      p.lastInputChangeTime = Date.now();
    }
  }

  public recordPlayerActivity(p: PlayerState): void {
    if (p.afkWarningIssued) {
      p.afkWarningIssued = false;
      try {
        p.channel.emit("reliable_event", { type: "afk_cleared" });
      } catch (e) {}
    }
    p.lastInputChangeTime = Date.now();
  }

  public checkPlayerAFK(): void {
    if (!this.context.isMatchActive() || this.context.isShutdown()) return;

    const now = Date.now();
    for (const player of this.players.values()) {
      if (player.isBot) continue;

      const idleMs = now - (player.lastInputChangeTime || now);

      if (idleMs >= 120000) {
        console.log(
          `[AFK] Kicking player ${player.id} due to ${Math.round(
            idleMs / 1000
          )}s inactivity`
        );
        try {
          player.channel.emit("reliable_event", {
            type: "KICKED_AFK",
            reason: "Kicked for inactivity (AFK)",
          });
        } catch (e) {}
        this.removePlayer(player.id);
      } else if (idleMs >= 60000 && !player.afkWarningIssued) {
        player.afkWarningIssued = true;
        console.log(
          `[AFK] Issuing AFK warning to player ${player.id} (${Math.round(
            idleMs / 1000
          )}s idle)`
        );
        try {
          player.channel.emit("reliable_event", {
            type: "afk_warning",
            remainingSec: Math.ceil((120000 - idleMs) / 1000),
          });
        } catch (e) {}
      }
    }
  }

  public setPlayerReady(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;

    p.isReady = true;
    console.log(`[VEXEA SERVER] Received player_ready for player: ${playerId}`);

    if (!this.context.isMatchActive()) {
      console.log(`[VEXEA SERVER] Player ready. Starting match loop`);
      this.context.triggerStartMatch();
    }
  }
}
