import { describe, expect, it, vi } from "vitest";
import { CombatResolver } from "../server/match/CombatResolver";
import { NetworkBroadcaster } from "../server/match/NetworkBroadcaster";
import type { PlayerState } from "../server/match/types";
import { createInitialUtilityState } from "../shared/utilities";

function createAimingPlayer(): PlayerState {
  return {
    id: "aiming-player",
    channel: { emit: vi.fn(), rawEmit: vi.fn() } as any,
    kcc: { computedGrounded: () => true } as any,
    body: null,
    collider: null,
    inputMask: 0,
    fire: 0,
    timestamp: 0,
    posX: 0,
    posY: 0,
    posZ: 0,
    velX: 0,
    velY: 0,
    velZ: 0,
    pitch: 0,
    yaw: 0,
    hp: 100,
    score: 0,
    weapon: "rifle",
    weaponState: {
      primary: {
        weaponId: "rifle",
        currentMag: 30,
        reserve: 90,
        isReloading: false,
        reloadTimer: 0,
        fireMode: "auto",
        lastConfirmedShotT: 0,
        leakyBucket: 0,
      },
      secondary: {
        weaponId: "pistol",
        currentMag: 12,
        reserve: 36,
        isReloading: false,
        reloadTimer: 0,
        fireMode: "auto",
        lastConfirmedShotT: 0,
        leakyBucket: 0,
      },
    },
    ping: 0,
    lastSequence: 0,
    leakyRateLimit: 0,
    lastFireTime: 0,
    lastInputChangeTime: 0,
    afkWarningIssued: false,
    velEmaX: 0,
    velEmaY: 0,
    velEmaZ: 0,
    isAiming: true,
    firedThisTick: false,
    firedSinceBroadcast: false,
    weaponEquipSequence: 0,
    weaponEquipTimestamp: 0,
    maxHp: 100,
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
    lastFallStartY: 0,
  };
}

function createResolver(player: PlayerState): CombatResolver {
  return new CombatResolver({
    getPlayers: () => new Map([[player.id, player]]),
    getDrones: () => [],
    getCameras: () => [],
    getRapierWorld: () => null,
    getCollisionMap: () => null,
    getServerTick: () => 0,
    isShutdown: () => false,
    broadcastReliableEvent: vi.fn(),
    despawnDrone: vi.fn(),
    getCommanderMemory: () => null,
    getLLMCommander: () => null,
  });
}

describe("authoritative combat animation state", () => {
  it("replicates authoritative utility charges in a state_sync snapshot", () => {
    const player = createAimingPlayer();
    player.utilityState = createInitialUtilityState("ASSAULT");
    player.utilityState.utility1.charges = 1;
    const broadcaster = new NetworkBroadcaster();

    broadcaster.broadcastSync(
      new Map([[player.id, player]]),
      [],
      [],
      new Uint8Array(200),
      new Float32Array(200),
      new Float32Array(200),
      new Float32Array(200),
      new Uint8Array(200),
      1,
      {},
    );

    const syncEvent = (player.channel as any).emit.mock.calls.find(
      ([name]: [string]) => name === "state_sync",
    )?.[1];
    expect(syncEvent.players[0].utilityState).toEqual(player.utilityState);
  });

  it("clears aim before a lethal state_sync snapshot is broadcast", () => {
    const player = createAimingPlayer();
    const resolver = createResolver(player);

    resolver.applyDamage(player.id, 100, "bullet", "attacker", "player");

    expect(player.isAlive).toBe(false);
    expect(player.isAiming).toBe(false);

    const broadcaster = new NetworkBroadcaster();
    broadcaster.broadcastSync(
      new Map([[player.id, player]]),
      [],
      [],
      new Uint8Array(200),
      new Float32Array(200),
      new Float32Array(200),
      new Float32Array(200),
      new Uint8Array(200),
      1,
      {},
    );

    const syncEvent = (player.channel as any).emit.mock.calls.find(
      ([name]: [string]) => name === "state_sync",
    )?.[1];
    expect(syncEvent.players[0].isAiming).toBe(false);
  });

  it("clears aim on the direct grenade death path", () => {
    const player = createAimingPlayer();
    player.hp = 50;
    const resolver = createResolver(player);

    resolver.resolveGrenadeExplosion("attacker", { x: 0, y: 0, z: 0 });

    expect(player.isAlive).toBe(false);
    expect(player.isAiming).toBe(false);
  });
});
