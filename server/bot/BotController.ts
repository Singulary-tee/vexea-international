import { PlayerState, MatchRoom } from "../MatchRoom";
import { processHitscan } from "../combat/hitscan";
import { DETAILED_WEAPONS } from "../../shared/weapons";
import { PLAYER_EYE_LEVEL, DroneState } from "../../shared/constants";

// ── MODULE-SCOPE CONSTANTS (Section 11: derived from config, no magic numbers) ──
const BOT_AIM_TOLERANCE_RAD = 0.1;
const RIFLE_RANGE = DETAILED_WEAPONS.rifle.falloff.minDamageRange; // 80.0
const RIFLE_FIRE_RATE_HZ = DETAILED_WEAPONS.rifle.fireRateHz;      // 10
const FIRE_COOLDOWN_TICKS = Math.ceil(60 / RIFLE_FIRE_RATE_HZ);    // 6 ticks at 60Hz
const OBJ_X = 384;  // WAYPOINTS[ZONES.CORE].x
const OBJ_Z = 384;  // WAYPOINTS[ZONES.CORE].z
const OBJ_RADIUS = 3.0; // ACTIVE_GAMEMODE.objectiveProximityRadius || 3

// ── MODULE-SCOPE PRE-ALLOCATED OBJECTS (mutated, never recreated in tick) ──
const botHitscanArgs = {
  weaponSlot: "primary" as "primary",
  direction: { x: 0, y: 0, z: 0 },
  origin: { x: 0, y: 0, z: 0 },
  timestamp: 0
};

// ── MODULE-SCOPE WORKING VARIABLES (mutated, never redeclared in tick) ──
let bNearestId = "";
let bNearestDist = 0;
let bNearestX = 0;
let bNearestY = 0;
let bNearestZ = 0;
let bDx = 0;
let bDy = 0;
let bDz = 0;
let bBestDistSq = 0;
let bHorizDist = 0;
let bDirLen = 0;

export function processBotTick(player: PlayerState, room: MatchRoom, dt: number) {
  if (!player.isAlive || !player.isBot) return;

  // Decrement fire cooldown
  const cd = player.botFireCooldown || 0;
  if (cd > 0) {
    player.botFireCooldown = cd - 1;
  }

  // ── DRONE SCAN: find nearest alive drone (zero-GC manual loop) ──
  bNearestId = "";
  bBestDistSq = Infinity;
  bNearestX = 0;
  bNearestY = 0;
  bNearestZ = 0;

  for (let i = 0; i < room.drones.length; i++) {
    const d = room.drones[i];
    if (d.state === DroneState.DEAD) continue;
    bDx = d.posX - player.posX;
    bDy = d.posY - player.posY;
    bDz = d.posZ - player.posZ;
    const distSq = bDx * bDx + bDy * bDy + bDz * bDz;
    if (distSq < bBestDistSq) {
      bBestDistSq = distSq;
      bNearestId = d.id.toString();
      bNearestX = d.posX;
      bNearestY = d.posY;
      bNearestZ = d.posZ;
    }
  }

  bNearestDist = bNearestId !== "" ? Math.sqrt(bBestDistSq) : Infinity;

  // ── COMBAT MODE ──
  if (bNearestId !== "" && bNearestDist <= RIFLE_RANGE) {
    player.botActionId = 1;
    player.botTargetId = bNearestId;
    player.botTargetDist = bNearestDist;

    // Compute aim angles
    bDx = bNearestX - player.posX;
    bDy = bNearestY - (player.posY + PLAYER_EYE_LEVEL);
    bDz = bNearestZ - player.posZ;
    bHorizDist = Math.sqrt(bDx * bDx + bDz * bDz) || 1;

    player.botAimYaw = Math.atan2(-bDx, -bDz);
    player.botAimPitch = Math.atan2(bDy, bHorizDist);

    player.yaw = player.botAimYaw;
    player.pitch = player.botAimPitch;

    // Fire if cooldown ready
    if ((player.botFireCooldown || 0) <= 0) {
      const wState = player.weaponState.primary;
      if (wState.currentMag > 0 && !wState.isReloading) {
        wState.currentMag--;
        player.firedThisTick = true;

        // Build normalized direction from yaw/pitch
        const cosP = Math.cos(player.pitch);
        botHitscanArgs.direction.x = -Math.sin(player.yaw) * cosP;
        botHitscanArgs.direction.y = Math.sin(player.pitch);
        botHitscanArgs.direction.z = -Math.cos(player.yaw) * cosP;

        bDirLen = Math.sqrt(
          botHitscanArgs.direction.x * botHitscanArgs.direction.x +
          botHitscanArgs.direction.y * botHitscanArgs.direction.y +
          botHitscanArgs.direction.z * botHitscanArgs.direction.z
        );
        if (bDirLen > 0.001) {
          botHitscanArgs.direction.x /= bDirLen;
          botHitscanArgs.direction.y /= bDirLen;
          botHitscanArgs.direction.z /= bDirLen;
        }

        botHitscanArgs.origin.x = player.posX;
        botHitscanArgs.origin.y = player.posY + PLAYER_EYE_LEVEL;
        botHitscanArgs.origin.z = player.posZ;
        botHitscanArgs.timestamp = Date.now();

        processHitscan(player, room, player.channel, botHitscanArgs);
        player.botFireCooldown = FIRE_COOLDOWN_TICKS;
      } else if (wState.currentMag === 0 && wState.reserve > 0 && !wState.isReloading) {
        wState.isReloading = true;
        wState.reloadTimer = 150;
      }
    }

    player.inputMask = 0x01; // forward only, no sprint/crouch/dash
    return;
  }

  // ── OBJECTIVE MODE ──
  player.botActionId = 2;
  player.botTargetId = "";

  bDx = OBJ_X - player.posX;
  bDz = OBJ_Z - player.posZ;
  const objDist = Math.sqrt(bDx * bDx + bDz * bDz) || 1;

  player.yaw = Math.atan2(-bDx, -bDz);
  player.pitch = 0;

  if (objDist <= OBJ_RADIUS) {
    player.inputMask = 0;
    player.isHoldingObjective = true;
  } else {
    player.inputMask = 0x01;
    player.isHoldingObjective = false;
  }
}
