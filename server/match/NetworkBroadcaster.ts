import {
  CONST_BUFFER_SIZE,
  HEADER_SIZE,
  DRONE_STRUCT_SIZE,
  CAMERA_STRUCT_SIZE,
  MAX_PROJECTILES,
  PlayerState,
  ServerDrone,
  ServerCamera,
  LiveZoneSummary,
} from "./types";
import { DroneState } from "../../shared/constants";
import { ACTIVE_GAMEMODE } from "../../shared/gamemode-configs.js";
import {
  benchmarkCounter,
  benchmarkInstrumentationEnabled,
} from "../benchmark/telemetry";

export class NetworkBroadcaster {
  public preallocatedBuffer = new ArrayBuffer(CONST_BUFFER_SIZE);
  public payloadWriter = new DataView(this.preallocatedBuffer);

  public playerSyncBuffer = new ArrayBuffer(20);
  public playerSyncView = new DataView(this.playerSyncBuffer);

  public broadcastReliableEvent(
    players: Map<string, PlayerState>,
    evt: any
  ): void {
    const json = JSON.stringify(evt);
    if (benchmarkInstrumentationEnabled()) {
      benchmarkCounter("network.reliable.events", players.size);
      benchmarkCounter("network.reliable.bytes", Buffer.byteLength(json) * players.size);
    }
    for (const p of players.values()) {
      try {
        p.channel.emit("reliable_event", JSON.parse(json));
      } catch (e) {}
    }
  }

  public packWorldNetworkData(
    drones: ServerDrone[],
    cameras: ServerCamera[],
    serverTick: number
  ): ArrayBuffer {
    this.payloadWriter.setUint32(0, serverTick, true);

    let activeCount = 0;
    for (let i = 0; i < drones.length; i++) {
      if (drones[i].state !== DroneState.DEAD) {
        activeCount++;
      }
    }
    this.payloadWriter.setUint16(4, activeCount, true);

    let camCount = 0;
    for (let i = 0; i < cameras.length; i++) {
      if (cameras[i].isActive) {
        camCount++;
      }
    }
    this.payloadWriter.setUint16(6, camCount, true);

    let byteOffset = HEADER_SIZE;
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (d.state !== DroneState.DEAD) {
        this.payloadWriter.setUint16(byteOffset, d.id, true);
        this.payloadWriter.setFloat32(byteOffset + 2, d.posX, true);
        this.payloadWriter.setFloat32(byteOffset + 6, d.posY, true);
        this.payloadWriter.setFloat32(byteOffset + 10, d.posZ, true);
        this.payloadWriter.setFloat32(byteOffset + 14, d.rotX, true);
        this.payloadWriter.setFloat32(byteOffset + 18, d.rotY, true);
        this.payloadWriter.setFloat32(byteOffset + 22, d.rotZ, true);
        this.payloadWriter.setFloat32(byteOffset + 26, d.rotW, true);
        this.payloadWriter.setUint8(byteOffset + 30, d.state);
        let finalType = d.type;
        if (d.playerInFOV) {
          finalType |= 128;
        }
        this.payloadWriter.setUint8(byteOffset + 31, finalType);

        byteOffset += DRONE_STRUCT_SIZE;
        if (byteOffset >= CONST_BUFFER_SIZE) {
          break;
        }
      }
    }

    for (let i = 0; i < cameras.length; i++) {
      const c = cameras[i];
      if (c.isActive) {
        if (byteOffset + CAMERA_STRUCT_SIZE > CONST_BUFFER_SIZE) break;
        this.payloadWriter.setUint16(byteOffset, c.id, true);
        this.payloadWriter.setUint8(byteOffset + 2, 1);
        this.payloadWriter.setUint8(byteOffset + 3, 0);
        byteOffset += CAMERA_STRUCT_SIZE;
      }
    }

    return this.preallocatedBuffer;
  }

  public broadcastSync(
    players: Map<string, PlayerState>,
    drones: ServerDrone[],
    cameras: ServerCamera[],
    projActive: Uint8Array,
    projPosX: Float32Array,
    projPosY: Float32Array,
    projPosZ: Float32Array,
    projEnemy: Uint8Array,
    serverTick: number,
    zoneSummary: Record<string, LiveZoneSummary>,
    cubeSyncData?: any,
    devDrones?: any[]
  ): void {
    if (players.size === 0) return;

    const packedData = this.packWorldNetworkData(drones, cameras, serverTick);
    const activeProj = [];
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (projActive[i]) {
        activeProj.push({
          x: projPosX[i],
          y: projPosY[i],
          z: projPosZ[i],
          enemy: projEnemy[i] === 1,
        });
      }
    }

    const detailedPlayers = Array.from(players.values()).map((p) => ({
      id: p.id,
      hp: p.hp,
      score: p.score,
      posX: p.posX,
      posY: p.posY,
      posZ: p.posZ,
      yaw: p.yaw,
      currentWeapon: p.weapon || "rifle",
      isFiring: p.firedThisTick || false,
      isReloading:
        p.weaponState.primary.isReloading || p.weaponState.secondary.isReloading,
      isAlive: p.isAlive,
      activeCollisions: (p as any).activeCollisions || [],
    }));

    if (benchmarkInstrumentationEnabled()) {
      const stateBytes = Buffer.byteLength(JSON.stringify({
        type: "state_sync",
        tick: serverTick,
        projectiles: activeProj,
        players: detailedPlayers,
        serverCube: cubeSyncData,
        devDrones,
        liveZoneSummary: zoneSummary,
      }));
      benchmarkCounter("network.raw.messages", players.size * 2);
      benchmarkCounter(
        "network.raw.bytes",
        (packedData.byteLength + this.playerSyncBuffer.byteLength) * players.size,
      );
      benchmarkCounter("network.state_sync.messages", players.size);
      benchmarkCounter("network.state_sync.bytes", stateBytes * players.size);
    }

    for (const player of players.values()) {
      try {
        player.channel.rawEmit(packedData);

        this.playerSyncView.setUint32(0, serverTick, true);
        this.playerSyncView.setUint32(4, player.lastSequence, true);
        this.playerSyncView.setFloat32(8, player.posX, true);
        this.playerSyncView.setFloat32(12, player.posY, true);
        this.playerSyncView.setFloat32(16, player.posZ, true);
        player.channel.rawEmit(this.playerSyncBuffer);

        player.channel.emit("state_sync", {
          type: "state_sync",
          tick: serverTick,
          projectiles: activeProj,
          players: detailedPlayers,
          serverCube: cubeSyncData,
          devDrones: devDrones,
          liveZoneSummary: zoneSummary,
        });
      } catch (e) {}
    }
  }

  public async processMatchEndTransaction(
    playerId: string,
    playerStats: any,
    result: "win" | "loss",
    adMultiplier: number,
    players: Map<string, PlayerState>,
    abandonedPlayerIds: Set<string>
  ): Promise<void> {
    if (abandonedPlayerIds.has(playerId)) {
      console.log(
        `[MatchRoom] Rewards withheld for abandoned match: ${playerId}`
      );
      return;
    }
    const p = players.get(playerId);
    if (p && p.abandonedMatch) {
      console.log(
        `[MatchRoom] Rewards withheld for abandoned match: ${playerId}`
      );
      return;
    }

    const isWin = result === "win";

    const payload = {
      playerId,
      matchDurationSec: ACTIVE_GAMEMODE.matchDuration,
      kills: playerStats.droneEliminations || 0,
      deaths: playerStats.deaths || 0,
      damageDealt: playerStats.damageDealt || 0,
      objectiveTimeHeld: playerStats.objectiveTimeHeld || 0,
      revives: playerStats.revivesPerformed || 0,
      scoreIndividual: playerStats.scoreIndividual || 0,
      isWin,
      gameMode: ACTIVE_GAMEMODE.id || "INFILTRATION",
      adMultiplier,
    };

    try {
      const port = process.env.PORT || 3000;
      const response = await fetch(
        `http://127.0.0.1:${port}/api/economy/match-rewards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error(
          `[MatchRoom] API call to match-rewards failed for ${playerId}: ${response.status} ${text}`
        );
      } else {
        const data = await response.json();
        console.log(
          `[MatchRoom] Successfully updated rewards via API for ${playerId}:`,
          data
        );
      }
    } catch (err) {
      console.error(
        `[MatchRoom] Error calling match-rewards API for ${playerId}:`,
        err
      );
    }
  }
}
