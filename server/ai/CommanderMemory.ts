import { MatchRoom } from "../MatchRoom";
import { ACTIVE_GAMEMODE } from "../../shared/gamemode-configs";
import { DroneType, ZoneName, ZONES_ARRAY } from "../../shared/constants";

export interface CasualtyRecord {
  groupId: string;
  unitType: DroneType;
  zone: ZoneName;
  timestamp: number;
}

export interface UtilityUsageRecord {
  playerId: string;
  utilityId: string;
  timestamp: number;
  elapsedSec: number;
}

/**
 * CommanderMemory
 * Modular, Zero-GC-friendly situational awareness compression for the LLM Commander.
 * Computes a compressed text payload (<250 tokens) containing match clock, squad state,
 * drone asset ledger, recent casualties, utility log, objective state, and clean zone summaries.
 */
export class CommanderMemory {
  private lastCycleCasualties: CasualtyRecord[] = [];
  private utilityLog: UtilityUsageRecord[] = [];
  private utilityLogHead = 0;

  constructor(private room: MatchRoom) {}

  public onDroneDespawned(drone: { id: number; groupId: string; type: DroneType; zone: ZoneName }) {
    this.lastCycleCasualties.push({
      groupId: drone.groupId || "G_UNK",
      unitType: drone.type,
      zone: drone.zone,
      timestamp: Date.now(),
    });
  }

  public onUtilityUsed(playerId: string, utilityId: string) {
    const elapsedSec = Math.max(0, Math.floor((Date.now() - (this.room.matchStartTime || Date.now())) / 1000));
    let displayId = utilityId;
    if (utilityId === "Radio") {
      displayId = "Radio intercepted";
    } else if (utilityId === "Signal Jammer") {
      displayId = "Signal Jammer activated";
    }
    const rec: UtilityUsageRecord = {
      playerId,
      utilityId: displayId,
      timestamp: Date.now(),
      elapsedSec,
    };

    if (this.utilityLog.length < 16) {
      this.utilityLog.push(rec);
    } else {
      this.utilityLog[this.utilityLogHead] = rec;
      this.utilityLogHead = (this.utilityLogHead + 1) % 16;
    }
  }

  /**
   * Generates a compressed situational awareness text string under 250 tokens.
   */
  public buildCompressedPayload(): string {
    const now = Date.now();
    const elapsedSec = Math.max(0, Math.floor((now - (this.room.matchStartTime || now)) / 1000));
    const totalSec = ACTIVE_GAMEMODE.matchDuration || 600;

    const clockMin = Math.floor(elapsedSec / 60);
    const clockSec = (elapsedSec % 60).toString().padStart(2, "0");
    const totalMin = Math.floor(totalSec / 60);
    const totalSecStr = (totalSec % 60).toString().padStart(2, "0");

    // 1. Clock
    const clockStr = `T+${clockMin}:${clockSec}/${totalMin}:${totalSecStr}`;

    // 2. Squad Composition & Player Status
    let alivePlayers = 0;
    let deadPlayers = 0;
    const classCounts: Record<string, number> = {};
    const deadDetails: string[] = [];

    if (this.room.players) {
      for (const p of this.room.players.values()) {
        classCounts[p.classId || "UNKNOWN"] = (classCounts[p.classId || "UNKNOWN"] || 0) + 1;
        if (p.isAlive) {
          alivePlayers++;
        } else {
          deadPlayers++;
          const respawnIn = Math.max(0, p.respawnTimer || 0).toFixed(1);
          deadDetails.push(`${(p.id || "P").slice(0, 4)}(${(p.classId || "UNK").slice(0, 3)}, respawn ${respawnIn}s)`);
        }
      }
    }

    const classSummaryStr = Object.entries(classCounts)
      .map(([cls, count]) => `${count} ${cls}`)
      .join(", ") || "0 players";

    const totalPlayers = this.room.players ? this.room.players.size : 0;
    const squadStr = `SQUAD: ${totalPlayers} (${classSummaryStr}) | Alive: ${alivePlayers} | Dead: ${deadPlayers}${deadDetails.length > 0 ? ` [${deadDetails.join(", ")}]` : ""}`;

    // 3. Drone Asset Ledger (active groups)
    const activeGroupMap: Record<string, { zone: ZoneName; types: Record<string, number> }> = {};
    if (this.room.drones) {
      for (let i = 0; i < this.room.drones.length; i++) {
        const d = this.room.drones[i];
        if (d && d.state !== 0 /* DroneState.DEAD */) {
          const gid = d.groupId || "G_DEFAULT";
          if (!activeGroupMap[gid]) {
            activeGroupMap[gid] = { zone: d.zone, types: {} };
          }
          const tName = getDroneTypeName(d.type);
          activeGroupMap[gid].types[tName] = (activeGroupMap[gid].types[tName] || 0) + 1;
        }
      }
    }

    const groupStrParts: string[] = [];
    for (const [gid, data] of Object.entries(activeGroupMap)) {
      const typeStr = Object.entries(data.types)
        .map(([t, c]) => `${c}${t}`)
        .join("+");
      groupStrParts.push(`${gid}@${(data.zone || "zone").replace("zone_", "")}(${typeStr})`);
    }
    const assetLedgerStr = `OWNED GROUPS: ${groupStrParts.length > 0 ? groupStrParts.join(" ") : "None"}`;

    // 4. Casualty Delta (Last Cycle Only)
    const casualtyStrParts: string[] = [];
    if (this.lastCycleCasualties.length > 0) {
      const casByGroup: Record<string, number> = {};
      for (const cas of this.lastCycleCasualties) {
        const key = `${cas.groupId}@${(cas.zone || "zone").replace("zone_", "")}`;
        casByGroup[key] = (casByGroup[key] || 0) + 1;
      }
      for (const [key, count] of Object.entries(casByGroup)) {
        casualtyStrParts.push(`-${count} (${key})`);
      }
    }
    const casualtyStr = `CASUALTIES(last cycle): ${casualtyStrParts.length > 0 ? casualtyStrParts.join(", ") : "None"}`;
    // Flush last cycle casualties
    this.lastCycleCasualties.length = 0;

    // 5. Utility Usage Log
    const recentUtils: string[] = [];
    const logItems = [...this.utilityLog];
    logItems.sort((a, b) => a.timestamp - b.timestamp);
    for (const u of logItems.slice(-5)) {
      const m = Math.floor(u.elapsedSec / 60);
      const s = (u.elapsedSec % 60).toString().padStart(2, "0");
      recentUtils.push(`${u.utilityId}@${m}:${s}`);
    }
    const utilStr = `UTILITIES USED: ${recentUtils.length > 0 ? recentUtils.join(", ") : "None"}`;

    // 6. Core Objective Status
    let objectiveHolder: string | null = null;
    let maxHoldProg = 0;
    if (this.room.players) {
      for (const p of this.room.players.values()) {
        if (p.isHoldingObjective || (p.currentObjectiveProgress || 0) > 0) {
          if ((p.currentObjectiveProgress || 0) >= maxHoldProg) {
            maxHoldProg = p.currentObjectiveProgress || 0;
            objectiveHolder = p.id;
          }
        }
      }
    }
    const holdTimeTotal = ACTIVE_GAMEMODE.objectiveHoldTime || 8;
    const coreStr = objectiveHolder
      ? `CORE OBJECTIVE: CONTESTED by ${objectiveHolder.slice(0, 4)} | Held: ${maxHoldProg.toFixed(1)}s/${holdTimeTotal}s (resets on dmg/exit)`
      : `CORE OBJECTIVE: Uncontested | Held: 0.0s/${holdTimeTotal}s (resets on dmg/exit)`;

    // 7. Compressed Zone Summaries
    // Excludes: bounds, connectedZones, activeOperations, combatEffectiveness, droneSpawnEnabled, allowsAirUnits
    const zoneStrParts: string[] = [];
    if (this.room.zoneSummary) {
      for (const zName of ZONES_ARRAY) {
        const zs = this.room.zoneSummary[zName];
        if (!zs) continue;
        const shortName = zName.replace("zone_", "");
        const conf = zs.confidence !== undefined ? zs.confidence.toFixed(1) : "0.0";
        const groups = zs.droneGroups && zs.droneGroups.length > 0 ? zs.droneGroups.join(",") : "none";
        zoneStrParts.push(`${shortName}(conf:${conf},groups:${groups})`);
      }
    }
    const zoneSummaryStr = `ZONES: ${zoneStrParts.join(" ")}`;

    return `MATCH CLOCK: ${clockStr}\n${squadStr}\n${assetLedgerStr}\n${casualtyStr}\n${utilStr}\n${coreStr}\n${zoneSummaryStr}`;
  }

  public clear() {
    this.lastCycleCasualties.length = 0;
    this.utilityLog.length = 0;
    this.utilityLogHead = 0;
  }
}

function getDroneTypeName(type: DroneType): string {
  switch (type) {
    case DroneType.ROTARY_SHOOTER: return "rot";
    case DroneType.WHEELED: return "whe";
    case DroneType.BOMBER: return "bmb";
    case DroneType.FIXED_WING: return "fxd";
    case DroneType.RECON: return "rec";
    case DroneType.ROBOT_DOG: return "dog";
    case DroneType.HUMANOID: return "hum";
    case DroneType.TEST_ENTITY: return "tst";
    default: return "unk";
  }
}
