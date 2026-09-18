import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayerSessionManager } from "../server/match/PlayerSessionManager";
import { MatchAbuseStore } from "../server/player-data/MatchAbuseStore";

function createSlot(weaponId: string): any {
  return {
    weaponId,
    currentMag: 1,
    reserve: 1,
    isReloading: true,
    reloadTimer: 4,
    fireMode: "auto",
    lastConfirmedShotT: 10,
    leakyBucket: 2,
  };
}

function createPlayer(): any {
  return {
    id: "player-1",
    channel: { emit: vi.fn() },
    weapon: "rifle",
    weaponState: {
      primary: createSlot("rifle"),
      secondary: createSlot("pistol"),
    },
    hp: 40,
    maxHp: 40,
    utilityState: undefined,
    weaponEquipSequence: 7,
    weaponEquipTimestamp: 100,
  };
}

describe("PlayerSessionManager loadout lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("advances equip metadata when replacing a player's class loadout", () => {
    vi.spyOn(Date, "now").mockReturnValue(200);
    const manager = new PlayerSessionManager({
      getRapierWorld: () => null,
      getColliderToEntityMap: () => new Map(),
      getMapId: () => "map_0_dev",
      getSpecJson: () => null,
      getOutOfBoundsEnforcer: () => null,
      isMatchActive: () => true,
      isShutdown: () => false,
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
      shutdown: vi.fn(),
    });
    const player = createPlayer();

    manager.applyPlayerClassLoadout(player, "RECON", "sniper");

    expect(player.weapon).toBe("sniper");
    expect(player.weaponEquipSequence).toBe(8);
    expect(player.weaponEquipTimestamp).toBe(200);
  });

  it("does not advance equip metadata when the active loadout is unchanged", () => {
    vi.spyOn(Date, "now").mockReturnValue(200);
    const manager = new PlayerSessionManager({
      getRapierWorld: () => null,
      getColliderToEntityMap: () => new Map(),
      getMapId: () => "map_0_dev",
      getSpecJson: () => null,
      getOutOfBoundsEnforcer: () => null,
      isMatchActive: () => true,
      isShutdown: () => false,
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
      shutdown: vi.fn(),
    });
    const player = createPlayer();

    manager.applyPlayerClassLoadout(player, "ASSAULT", "rifle", "pistol");

    expect(player.weaponEquipSequence).toBe(7);
    expect(player.weaponEquipTimestamp).toBe(100);
  });

  it("rejects an invalid weapon slot without mutating player state", () => {
    const manager = new PlayerSessionManager({
      getRapierWorld: () => null,
      getColliderToEntityMap: () => new Map(),
      getMapId: () => "map_0_dev",
      getSpecJson: () => null,
      getOutOfBoundsEnforcer: () => null,
      isMatchActive: () => true,
      isShutdown: () => false,
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
      shutdown: vi.fn(),
    });
    const player = createPlayer();

    expect(manager.selectPlayerWeapon(player, "invalid" as any)).toBe(false);
    expect(player.weapon).toBe("rifle");
    expect(player.weaponEquipSequence).toBe(7);
    expect(player.weaponEquipTimestamp).toBe(100);
  });

  it("ignores malformed movement input without mutating player state", () => {
    const manager = new PlayerSessionManager({
      getRapierWorld: () => null,
      getColliderToEntityMap: () => new Map(),
      getMapId: () => "map_0_dev",
      getSpecJson: () => null,
      getOutOfBoundsEnforcer: () => null,
      isMatchActive: () => true,
      isShutdown: () => false,
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
      shutdown: vi.fn(),
    });
    const player = {
      inputMask: 3,
      pitch: 0.1,
      yaw: 0.2,
      afkWarningIssued: false,
      lastInputChangeTime: 100,
      channel: { emit: vi.fn() },
    } as any;

    manager.updatePlayerInput(player, 256, Number.NaN, Number.POSITIVE_INFINITY);

    expect(player).toMatchObject({
      inputMask: 3,
      pitch: 0.1,
      yaw: 0.2,
      lastInputChangeTime: 100,
    });
  });

  it("does not start a disconnect grace timer for a live reconnected channel", () => {
    const manager = new PlayerSessionManager({
      getRapierWorld: () => null,
      getColliderToEntityMap: () => new Map(),
      getMapId: () => "map_0_dev",
      getSpecJson: () => null,
      getOutOfBoundsEnforcer: () => null,
      isMatchActive: () => true,
      isShutdown: () => false,
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
      shutdown: vi.fn(),
    });
    const player = createPlayer();
    player.channel.connected = true;
    manager.players.set(player.id, player);

    manager.handlePlayerReconnect(player.id, { emit: vi.fn(), connected: true } as any);
    manager.handlePlayerDisconnect(player.id);

    expect(player.disconnectTimer).toBeUndefined();
    if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
  });

  it("rebinds adapters whose connection state is getter-only", () => {
    const manager = new PlayerSessionManager({
      getRapierWorld: () => null,
      getColliderToEntityMap: () => new Map(),
      getMapId: () => "map_0_dev",
      getSpecJson: () => null,
      getOutOfBoundsEnforcer: () => null,
      isMatchActive: () => true,
      isShutdown: () => false,
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
      shutdown: vi.fn(),
    });
    const player = createPlayer();
    const newChannel = {
      emit: vi.fn(),
      get connected() {
        return true;
      },
    } as any;
    manager.players.set(player.id, player);

    expect(() => manager.handlePlayerReconnect(player.id, newChannel)).not.toThrow();
    expect(player.channel).toBe(newChannel);
  });

  it("does not remove a player that reconnects while offense persistence is pending", async () => {
    let resolveOffense!: () => void;
    const offensePersisted = new Promise<void>((resolve) => {
      resolveOffense = resolve;
    });
    vi.spyOn(MatchAbuseStore, "recordOffense").mockReturnValue(
      offensePersisted.then(() => ({
        offenseCount: 1,
        lastOffenseAt: 1,
        lockoutUntil: 0,
        banned: false,
      })),
    );
    const shutdown = vi.fn();
    const broadcastReliableEvent = vi.fn();
    const manager = new PlayerSessionManager({
      getRapierWorld: () => null,
      getColliderToEntityMap: () => new Map(),
      getMapId: () => "map_0_dev",
      getSpecJson: () => null,
      getOutOfBoundsEnforcer: () => null,
      isMatchActive: () => true,
      isShutdown: () => false,
      broadcastReliableEvent,
      triggerStartMatch: vi.fn(),
      shutdown,
    });
    const player = createPlayer();
    const disconnectedChannel = { connected: false, emit: vi.fn() } as any;
    player.channel = disconnectedChannel;
    player.sessionGeneration = 1;
    manager.players.set(player.id, player);

    const abandonment = manager.handlePlayerAbandonment(player.id, disconnectedChannel);
    const reconnectedChannel = { connected: true, emit: vi.fn() } as any;
    manager.handlePlayerReconnect(player.id, reconnectedChannel);
    resolveOffense();
    await abandonment;

    expect(manager.players.get(player.id)).toBe(player);
    expect(player.channel).toBe(reconnectedChannel);
    expect(player.abandonedMatch).toBeUndefined();
    expect(manager.abandonedPlayerIds.has(player.id)).toBe(false);
    expect(broadcastReliableEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "PLAYER_LEFT" }),
    );
    expect(shutdown).not.toHaveBeenCalled();
  });

  it("does not remove an explicitly abandoned player after its channel is rebound", async () => {
    let resolveOffense!: () => void;
    const offensePersisted = new Promise<void>((resolve) => {
      resolveOffense = resolve;
    });
    vi.spyOn(MatchAbuseStore, "recordOffense").mockReturnValue(
      offensePersisted.then(() => ({
        offenseCount: 1,
        lastOffenseAt: 1,
        lockoutUntil: 0,
        banned: false,
      })),
    );
    const manager = new PlayerSessionManager({
      getRapierWorld: () => null,
      getColliderToEntityMap: () => new Map(),
      getMapId: () => "map_0_dev",
      getSpecJson: () => null,
      getOutOfBoundsEnforcer: () => null,
      isMatchActive: () => true,
      isShutdown: () => false,
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
      shutdown: vi.fn(),
    });
    const player = createPlayer();
    const originalChannel = { connected: true, emit: vi.fn() } as any;
    player.channel = originalChannel;
    player.sessionGeneration = 1;
    manager.players.set(player.id, player);

    const abandonment = manager.handlePlayerAbandonment(player.id);
    const reboundChannel = { connected: true, emit: vi.fn() } as any;
    manager.handlePlayerReconnect(player.id, reboundChannel);
    resolveOffense();
    await abandonment;

    expect(manager.players.get(player.id)).toBe(player);
    expect(player.channel).toBe(reboundChannel);
    expect(player.abandonedMatch).toBeUndefined();
    expect(manager.abandonedPlayerIds.has(player.id)).toBe(false);
  });

  it("does not retain abandonment flags when a connected quit cannot be finalized", async () => {
    vi.spyOn(MatchAbuseStore, "recordOffense").mockResolvedValue({
      offenseCount: 1,
      lastOffenseAt: 1,
      lockoutUntil: 0,
      banned: false,
    });
    const manager = new PlayerSessionManager({
      getRapierWorld: () => null,
      getColliderToEntityMap: () => new Map(),
      getMapId: () => "map_0_dev",
      getSpecJson: () => null,
      getOutOfBoundsEnforcer: () => null,
      isMatchActive: () => true,
      isShutdown: () => false,
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
      shutdown: vi.fn(),
    });
    const player = createPlayer();
    const connectedChannel = { connected: true, emit: vi.fn() } as any;
    player.channel = connectedChannel;
    player.sessionGeneration = 1;
    manager.players.set(player.id, player);

    await manager.handlePlayerAbandonment(player.id, connectedChannel);

    expect(manager.players.get(player.id)).toBe(player);
    expect(player.abandonedMatch).toBeUndefined();
    expect(manager.abandonedPlayerIds.has(player.id)).toBe(false);
  });

  it("does not let a stale quit mark a future player generation as abandoned", () => {
    const manager = new PlayerSessionManager({
      getRapierWorld: () => null,
      getColliderToEntityMap: () => new Map(),
      getMapId: () => "map_0_dev",
      getSpecJson: () => null,
      getOutOfBoundsEnforcer: () => null,
      isMatchActive: () => true,
      isShutdown: () => false,
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
      shutdown: vi.fn(),
    });

    void manager.handlePlayerAbandonment("player-1");
    const channel = { connected: true, emit: vi.fn() } as any;
    manager.registerPlayer("player-1", channel);

    expect(manager.abandonedPlayerIds.has("player-1")).toBe(false);
  });
});
