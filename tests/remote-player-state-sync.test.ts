import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { NetworkBroadcaster } from "../server/match/NetworkBroadcaster";
import type { PlayerState } from "../server/match/types";
import { resolvePlayerAnimationState } from "../shared/state-animation-contract";
import { MatchController } from "../client/MatchController";
import {
  applyRemoteWeaponEquipIfNew,
  createRemoteWeaponMixer,
  disposeRemoteWeaponInstance,
  playRemoteWeaponEquip,
  RemotePlayerSystem,
  shouldApplyRemoteWeaponEquip,
} from "../client/src/systems/RemotePlayerSystem";
import { NetworkSyncSystem, shouldApplyRemoteWeaponSnapshot } from "../client/src/systems/NetworkSyncSystem";

function createPlayer(): PlayerState {
  const primary = {
    weaponId: "rifle",
    currentMag: 30,
    reserve: 90,
    isReloading: false,
    reloadTimer: 0,
    fireMode: "auto" as const,
    lastConfirmedShotT: 0,
    leakyBucket: 0,
  };
  const secondary = { ...primary, weaponId: "pistol" };
  return {
    id: "remote-player",
    channel: { emit: vi.fn(), rawEmit: vi.fn() } as any,
    kcc: { computedGrounded: () => true } as any,
    body: null,
    collider: null,
    inputMask: 0,
    fire: 0,
    timestamp: 0,
    posX: 1,
    posY: 2,
    posZ: 3,
    velX: 0,
    velY: 0,
    velZ: 0,
    pitch: 0,
    yaw: 0,
    hp: 100,
    score: 0,
    weapon: "rifle",
    weaponState: { primary, secondary },
    ping: 30,
    lastSequence: 0,
    leakyRateLimit: 0,
    lastFireTime: 0,
    lastInputChangeTime: 0,
    afkWarningIssued: false,
    velEmaX: 0,
    velEmaY: 0,
    velEmaZ: 0,
    firedThisTick: false,
    weaponEquipSequence: 7,
    weaponEquipTimestamp: 12345,
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

describe("authoritative remote player animation state", () => {
  it("keeps replicated utility charges in remote player target data", () => {
    const remotePlayersTargetData = new Map();
    const sync = new NetworkSyncSystem({
      localPlayerId: "local-player",
      remotePlayersTargetData,
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    } as any);

    try {
      (sync as any).handleStateSync({
        tick: 1,
        players: [{
          id: "remote-player",
          posX: 1,
          posY: 2,
          posZ: 3,
          currentWeapon: "rifle",
          utilityState: {
            utility1: {
              id: "Grenade",
              charges: 1,
              maxCharges: 2,
              cooldownRemaining: 12,
              baseCooldown: 30,
            },
            utility2: {
              id: "Flashbang",
              charges: 2,
              maxCharges: 2,
              cooldownRemaining: 0,
              baseCooldown: 25,
            },
          },
        }],
      });

      expect(remotePlayersTargetData.get("remote-player")?.utilityState).toEqual({
        utility1: expect.objectContaining({ id: "Grenade", charges: 1 }),
        utility2: expect.objectContaining({ id: "Flashbang", charges: 2 }),
      });
    } finally {
      sync.dispose();
    }
  });

  it("does not let stale weapon snapshots revert an accepted equip", () => {
    expect(shouldApplyRemoteWeaponSnapshot(2, 1, "pistol", "rifle", 200, 100)).toBe(false);
    expect(shouldApplyRemoteWeaponSnapshot(2, 2, "pistol", "rifle", 200, 200)).toBe(false);
    expect(shouldApplyRemoteWeaponSnapshot(2, 2, "pistol", "pistol", 200, 199)).toBe(false);
    expect(shouldApplyRemoteWeaponSnapshot(2, 2, "pistol", "pistol", 200, 200)).toBe(true);
    expect(shouldApplyRemoteWeaponSnapshot(0, undefined, "rifle", "pistol")).toBe(true);
    expect(shouldApplyRemoteWeaponSnapshot(2, undefined, "pistol", "rifle")).toBe(false);
  });

  it("keeps the merged remote weapon on the newest accepted snapshot", () => {
    const remotePlayersTargetData = new Map([
      ["remote-player", {
        pos: new THREE.Vector3(),
        yaw: 0,
        pitch: 0,
        hp: 100,
        isAlive: true,
        isFiring: false,
        isReloading: false,
        isAiming: false,
        isGrounded: true,
        isCrouching: false,
        isSprinting: false,
        weapon: "pistol",
        weaponEquipSequence: 2,
        weaponEquipTimestamp: 200,
      }],
    ]);
    const match = {
      localPlayerId: "local-player",
      remotePlayersTargetData,
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    };
    const sync = new NetworkSyncSystem(match as any);

    try {
      (sync as any).handleStateSync({
        players: [{
          id: "remote-player",
          posX: 1,
          posY: 2,
          posZ: 3,
          currentWeapon: "rifle",
          weaponEquipSequence: 1,
          weaponEquipTimestamp: 100,
        }],
      });
      expect(remotePlayersTargetData.get("remote-player")?.weapon).toBe("pistol");

      (sync as any).handleStateSync({
        players: [{
          id: "remote-player",
          currentWeapon: null,
          weaponEquipSequence: 3,
          weaponEquipTimestamp: 300,
        }],
      });
      expect(remotePlayersTargetData.get("remote-player")).toMatchObject({
        weapon: "pistol",
        weaponEquipSequence: 2,
        weaponEquipTimestamp: 200,
      });

      (sync as any).handleStateSync({
        players: [{
          id: "remote-player",
          posX: 4,
          posY: 5,
          posZ: 6,
          currentWeapon: "rifle",
          weaponEquipSequence: 3,
          weaponEquipTimestamp: 300,
        }],
      });
      expect(remotePlayersTargetData.get("remote-player")?.weapon).toBe("rifle");
    } finally {
      sync.dispose();
    }
  });

  it("removes remote players omitted from an authoritative snapshot", () => {
    const remotePlayersTargetData = new Map([
      ["left-player", {
        pos: new THREE.Vector3(),
        yaw: 0,
        pitch: 0,
        hp: 100,
        isAlive: true,
        isFiring: false,
        isReloading: false,
        isAiming: false,
        isGrounded: true,
        isCrouching: false,
        isSprinting: false,
        weapon: "rifle",
        weaponEquipSequence: 0,
        weaponEquipTimestamp: 0,
      }],
    ]);
    const match = {
      localPlayerId: "local-player",
      scene: new THREE.Scene(),
      remotePlayersTargetData,
      remotePlayersMeshes: new Map(),
      remotePlayerMixers: new Map(),
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    };
    match.remotePlayers = new RemotePlayerSystem(match as any);
    const sync = new NetworkSyncSystem(match as any);

    try {
      (sync as any).handleStateSync({
        players: [{
          id: "current-player",
          posX: 1,
          posY: 2,
          posZ: 3,
          currentWeapon: "rifle",
        }],
      });

      expect(remotePlayersTargetData.has("left-player")).toBe(false);
      expect(remotePlayersTargetData.has("current-player")).toBe(true);
    } finally {
      sync.dispose();
    }
  });

  it("ignores an older snapshot before removing players omitted from it", () => {
    const remotePlayersTargetData = new Map();
    const removePlayer = vi.fn((id: string) => remotePlayersTargetData.delete(id));
    const sync = new NetworkSyncSystem({
      localPlayerId: "local-player",
      remotePlayersTargetData,
      remotePlayers: { removePlayer },
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    } as any);

    try {
      (sync as any).handleStateSync({
        tick: 20,
        players: [{ id: "remote-player", currentWeapon: "rifle", playerGeneration: 2 }],
      });
      expect(remotePlayersTargetData.has("remote-player")).toBe(true);

      (sync as any).handleStateSync({ tick: 19, players: [] });

      expect(removePlayer).not.toHaveBeenCalled();
      expect(remotePlayersTargetData.has("remote-player")).toBe(true);
    } finally {
      sync.dispose();
    }
  });

  it("ignores late state snapshots after network disposal", () => {
    const remotePlayersTargetData = new Map();
    const sync = new NetworkSyncSystem({
      localPlayerId: "local-player",
      remotePlayersTargetData,
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    } as any);

    sync.dispose();
    (sync as any).handleStateSync({
      players: [{ id: "late-player", currentWeapon: "rifle" }],
    });

    expect(remotePlayersTargetData.size).toBe(0);
  });

  it("does not let an invalid initial weapon block a later valid equip", () => {
    const remotePlayersTargetData = new Map();
    const sync = new NetworkSyncSystem({
      localPlayerId: "local-player",
      remotePlayersTargetData,
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    } as any);

    try {
      (sync as any).handleStateSync({
        players: [{
          id: "remote-player",
          currentWeapon: "not-a-runtime-weapon",
          weaponEquipSequence: 9,
          weaponEquipTimestamp: 900,
        }],
      });
      expect(remotePlayersTargetData.get("remote-player")).toMatchObject({
        weapon: "rifle",
        weaponEquipSequence: 0,
        weaponEquipTimestamp: 0,
      });

      (sync as any).handleStateSync({
        players: [{
          id: "remote-player",
          currentWeapon: "pistol",
          weaponEquipSequence: 1,
          weaponEquipTimestamp: 1000,
        }],
      });
      expect(remotePlayersTargetData.get("remote-player")).toMatchObject({
        weapon: "pistol",
        weaponEquipSequence: 1,
        weaponEquipTimestamp: 1000,
      });
    } finally {
      sync.dispose();
    }
  });

  it("applies each newer remote equip sequence once", () => {
    expect(shouldApplyRemoteWeaponEquip(0, 1)).toBe(true);
    expect(shouldApplyRemoteWeaponEquip(1, 1)).toBe(false);
    expect(shouldApplyRemoteWeaponEquip(2, 1)).toBe(false);
  });

  it("consumes an equip sequence exactly once", () => {
    const group = new THREE.Group();
    const weapon = new THREE.Group();
    (weapon as any).animations = [
      new THREE.AnimationClip("idle", 1, []),
      new THREE.AnimationClip("equip", 0.1, []),
    ];
    const mixer = createRemoteWeaponMixer(weapon);

    expect(applyRemoteWeaponEquipIfNew(group, 1, mixer)).toBe(true);
    expect(applyRemoteWeaponEquipIfNew(group, 1, mixer)).toBe(false);
    expect((group as any)._lastWeaponEquipSequence).toBe(1);
  });

  it("does not consume an equip sequence before an authored weapon mixer exists", () => {
    const group = new THREE.Group();
    expect(applyRemoteWeaponEquipIfNew(group, 1)).toBe(false);
    expect((group as any)._lastWeaponEquipSequence).toBeUndefined();
  });

  it("keeps idle when a remote weapon has no authored equip clip", () => {
    const weapon = new THREE.Group();
    (weapon as any).animations = [new THREE.AnimationClip("idle", 1, [])];
    const mixer = createRemoteWeaponMixer(weapon)!;
    const idleAction = (mixer as any)._remoteWeaponIdleAction;

    expect(playRemoteWeaponEquip(mixer)).toBe(false);
    expect((mixer as any)._remoteWeaponCurrentAction).toBe(idleAction);
  });

  it("returns an authored weapon to idle after equip and stops its mixer on replacement", () => {
    const parent = new THREE.Group();
    const weapon = new THREE.Group();
    (weapon as any).animations = [
      new THREE.AnimationClip("idle", 1, []),
      new THREE.AnimationClip("equip", 0.1, []),
    ];
    parent.add(weapon);
    const mixer = createRemoteWeaponMixer(weapon)!;

    expect(playRemoteWeaponEquip(mixer)).toBe(true);
    mixer.update(0.2);
    expect((mixer as any)._remoteWeaponCurrentAction).toBe((mixer as any)._remoteWeaponIdleAction);

    const stopAllAction = vi.spyOn(mixer, "stopAllAction");
    const uncacheRoot = vi.spyOn(mixer, "uncacheRoot");
    disposeRemoteWeaponInstance(parent, weapon, mixer);
    expect(stopAllAction).toHaveBeenCalledOnce();
    expect(uncacheRoot).toHaveBeenCalledWith(weapon);
    expect(parent.children).not.toContain(weapon);
  });

  it("destroys remote groups and mixer ownership", () => {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    const weapon = new THREE.Group();
    group.add(weapon);
    scene.add(group);

    const playerMixer = new THREE.AnimationMixer(group);
    const weaponMixer = new THREE.AnimationMixer(weapon);
    (group as any)._remoteWeaponMesh = weapon;
    (group as any)._remoteWeaponMixer = weaponMixer;

    const remotePlayersMeshes = new Map([["remote-player", group]]);
    const remotePlayerMixers = new Map([["remote-player", playerMixer]]);
    const system = new RemotePlayerSystem({
      scene,
      remotePlayersMeshes,
      remotePlayersTargetData: new Map(),
      remotePlayerMixers,
    } as any);

    system.destroy();

    expect(scene.getObjectById(group.id)).toBeUndefined();
    expect(remotePlayersMeshes.size).toBe(0);
    expect(remotePlayerMixers.size).toBe(0);
  });

  it("uncaches orphaned remote player mixers during teardown", () => {
    const orphanRoot = new THREE.Group();
    const orphanMixer = new THREE.AnimationMixer(orphanRoot);
    const stopAllAction = vi.spyOn(orphanMixer, "stopAllAction");
    const uncacheRoot = vi.spyOn(orphanMixer, "uncacheRoot");
    const match = {
      scene: new THREE.Scene(),
      remotePlayersMeshes: new Map(),
      remotePlayersTargetData: new Map(),
      remotePlayerMixers: new Map([["orphan-player", orphanMixer]]),
    };

    new RemotePlayerSystem(match as any).destroy();

    expect(stopAllAction).toHaveBeenCalledOnce();
    expect(uncacheRoot).toHaveBeenCalledWith(orphanRoot);
    expect(match.remotePlayerMixers.size).toBe(0);
  });

  it("removes a remote player through an idempotent system seam", () => {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    const weapon = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.remoteOwned = true;
    weapon.add(mesh);
    group.add(weapon);
    scene.add(group);

    const playerMixer = new THREE.AnimationMixer(group);
    const weaponMixer = new THREE.AnimationMixer(weapon);
    const stopPlayerMixer = vi.spyOn(playerMixer, "stopAllAction");
    const stopWeaponMixer = vi.spyOn(weaponMixer, "stopAllAction");
    const uncachePlayerMixer = vi.spyOn(playerMixer, "uncacheRoot");
    const uncacheWeaponMixer = vi.spyOn(weaponMixer, "uncacheRoot");
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const match = {
      scene,
      remotePlayersMeshes: new Map([["remote-player", group]]),
      remotePlayersTargetData: new Map([["remote-player", { pos: new THREE.Vector3() }]]),
      remotePlayerMixers: new Map([["remote-player", playerMixer]]),
    };
    (group as any)._remoteWeaponMesh = weapon;
    (group as any)._remoteWeaponMixer = weaponMixer;
    const system = new RemotePlayerSystem(match as any);

    system.removePlayer("remote-player");
    system.removePlayer("remote-player");

    expect(scene.getObjectById(group.id)).toBeUndefined();
    expect(match.remotePlayersMeshes.size).toBe(0);
    expect(match.remotePlayersTargetData.size).toBe(0);
    expect(match.remotePlayerMixers.size).toBe(0);
    expect(stopPlayerMixer).toHaveBeenCalledOnce();
    expect(stopWeaponMixer).toHaveBeenCalledOnce();
    expect(uncachePlayerMixer).toHaveBeenCalledWith(group);
    expect(uncacheWeaponMixer).toHaveBeenCalledWith(weapon);
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
  });

  it("rebuilds remote visuals when the canonical player model changes", () => {
    const modelA = new THREE.Group();
    const modelB = new THREE.Group();
    const match: any = {
      scene: new THREE.Scene(),
      context: { playerModel: modelA },
      remotePlayersTargetData: new Map([[
        "remote-player",
        {
          pos: new THREE.Vector3(),
          yaw: 0,
          pitch: 0,
          hp: 100,
          isAlive: true,
          isFiring: false,
          isReloading: false,
          isAiming: false,
          isGrounded: true,
          isCrouching: false,
          isSprinting: false,
          weapon: "rifle",
          weaponEquipSequence: 0,
          weaponEquipTimestamp: 0,
        },
      ]]),
      remotePlayersMeshes: new Map(),
      remotePlayerMixers: new Map(),
    };
    const system = new RemotePlayerSystem(match);

    system.update(1 / 60);
    const firstGroup = match.remotePlayersMeshes.get("remote-player");
    match.context.playerModel = modelB;
    system.update(1 / 60);

    expect(match.remotePlayersMeshes.get("remote-player")).not.toBe(firstGroup);
    system.destroy();
  });

  it("routes PLAYER_LEFT cleanup through the remote player system", () => {
    const removePlayer = vi.fn();
    const networkSync = Object.create(NetworkSyncSystem.prototype) as NetworkSyncSystem;
    (networkSync as any).match = {
      scene: new THREE.Scene(),
      remotePlayers: { removePlayer },
      remotePlayersMeshes: new Map(),
      remotePlayerMixers: new Map(),
      remotePlayersTargetData: new Map(),
    };

    (networkSync as any).handleReliableEvent({ type: "PLAYER_LEFT", playerId: "remote-player" });

    expect(removePlayer).toHaveBeenCalledOnce();
    expect(removePlayer).toHaveBeenCalledWith("remote-player");
  });

  it("does not resurrect a player from a state snapshot after PLAYER_LEFT", () => {
    const remotePlayersTargetData = new Map();
    const removePlayer = vi.fn((id: string) => remotePlayersTargetData.delete(id));
    const sync = new NetworkSyncSystem({
      localPlayerId: "local-player",
      remotePlayersTargetData,
      remotePlayers: { removePlayer },
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    } as any);

    try {
      (sync as any).handleStateSync({
        players: [{ id: "remote-player", currentWeapon: "rifle" }],
      });
      expect(remotePlayersTargetData.has("remote-player")).toBe(true);

      (sync as any).handleReliableEvent({ type: "PLAYER_LEFT", playerId: "remote-player" });
      (sync as any).handleStateSync({
        players: [{ id: "remote-player", currentWeapon: "rifle" }],
      });

      expect(removePlayer).toHaveBeenCalledOnce();
      expect(remotePlayersTargetData.has("remote-player")).toBe(false);
    } finally {
      sync.dispose();
    }
  });

  it("only accepts a rejoined player when its generation is newer", () => {
    const remotePlayersTargetData = new Map();
    const removePlayer = vi.fn((id: string) => remotePlayersTargetData.delete(id));
    const sync = new NetworkSyncSystem({
      localPlayerId: "local-player",
      remotePlayersTargetData,
      remotePlayers: { removePlayer },
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    } as any);

    try {
      (sync as any).handleStateSync({
        players: [{ id: "remote-player", currentWeapon: "rifle", playerGeneration: 1 }],
      });
      (sync as any).handleReliableEvent({
        type: "PLAYER_LEFT",
        playerId: "remote-player",
        playerGeneration: 1,
      });

      (sync as any).handleStateSync({
        players: [{ id: "remote-player", currentWeapon: "rifle", playerGeneration: 1 }],
      });
      expect(remotePlayersTargetData.has("remote-player")).toBe(false);

      (sync as any).handleStateSync({
        players: [{ id: "remote-player", currentWeapon: "rifle", playerGeneration: 2 }],
      });
      expect(remotePlayersTargetData.has("remote-player")).toBe(true);
    } finally {
      sync.dispose();
    }
  });

  it("ignores a stale PLAYER_LEFT event for an active newer generation", () => {
    const remotePlayersTargetData = new Map([
      ["remote-player", {
        pos: new THREE.Vector3(),
        yaw: 0,
        pitch: 0,
        hp: 100,
        isAlive: true,
        isFiring: false,
        isReloading: false,
        isAiming: false,
        isGrounded: true,
        isCrouching: false,
        isSprinting: false,
        weapon: "rifle",
        playerGeneration: 2,
        weaponEquipSequence: 1,
        weaponEquipTimestamp: 100,
      }],
    ]);
    const removePlayer = vi.fn((id: string) => remotePlayersTargetData.delete(id));
    const sync = new NetworkSyncSystem({
      localPlayerId: "local-player",
      remotePlayersTargetData,
      remotePlayers: { removePlayer },
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    } as any);

    try {
      (sync as any).handleReliableEvent({
        type: "PLAYER_LEFT",
        playerId: "remote-player",
        playerGeneration: 1,
      });

      expect(removePlayer).not.toHaveBeenCalled();
      expect(remotePlayersTargetData.has("remote-player")).toBe(true);
    } finally {
      sync.dispose();
    }
  });

  it("tombstones players omitted from snapshots until a newer generation joins", () => {
    const remotePlayersTargetData = new Map([
      ["remote-player", {
        pos: new THREE.Vector3(),
        yaw: 0,
        pitch: 0,
        hp: 100,
        isAlive: true,
        isFiring: false,
        isReloading: false,
        isAiming: false,
        isGrounded: true,
        isCrouching: false,
        isSprinting: false,
        weapon: "rifle",
        playerGeneration: 4,
        weaponEquipSequence: 1,
        weaponEquipTimestamp: 100,
      }],
    ]);
    const removePlayer = vi.fn((id: string) => remotePlayersTargetData.delete(id));
    const sync = new NetworkSyncSystem({
      localPlayerId: "local-player",
      remotePlayersTargetData,
      remotePlayers: { removePlayer },
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    } as any);

    try {
      (sync as any).handleStateSync({ players: [] });
      (sync as any).handleStateSync({
        players: [{ id: "remote-player", currentWeapon: "rifle", playerGeneration: 4 }],
      });
      expect(remotePlayersTargetData.has("remote-player")).toBe(false);

      (sync as any).handleStateSync({
        players: [{ id: "remote-player", currentWeapon: "pistol", playerGeneration: 5 }],
      });
      expect(remotePlayersTargetData.get("remote-player")).toMatchObject({
        playerGeneration: 5,
        weapon: "pistol",
      });
    } finally {
      sync.dispose();
    }
  });

  it("resets remote state when a newer generation replaces an existing player", () => {
    const remotePlayersTargetData = new Map([
      ["remote-player", {
        pos: new THREE.Vector3(),
        yaw: 0,
        pitch: 0,
        hp: 100,
        isAlive: true,
        isFiring: false,
        isReloading: false,
        isAiming: false,
        isGrounded: true,
        isCrouching: false,
        isSprinting: false,
        weapon: "pistol",
        playerGeneration: 1,
        weaponEquipSequence: 8,
        weaponEquipTimestamp: 800,
      }],
    ]);
    const removePlayer = vi.fn((id: string) => remotePlayersTargetData.delete(id));
    const sync = new NetworkSyncSystem({
      localPlayerId: "local-player",
      remotePlayersTargetData,
      remotePlayers: { removePlayer },
      droneJitterMap: new Map(),
      hud: null,
      playerHP: 100,
      playerScore: 0,
    } as any);

    try {
      (sync as any).handleStateSync({
        players: [{
          id: "remote-player",
          currentWeapon: "rifle",
          playerGeneration: 2,
          weaponEquipSequence: 1,
          weaponEquipTimestamp: 10,
        }],
      });

      expect(removePlayer).toHaveBeenCalledWith("remote-player");
      expect(remotePlayersTargetData.get("remote-player")).toMatchObject({
        playerGeneration: 2,
        weapon: "rifle",
        weaponEquipSequence: 1,
        weaponEquipTimestamp: 10,
      });
    } finally {
      sync.dispose();
    }
  });

  it("delegates match teardown before clearing remote ownership", () => {
    const match = new MatchController({} as any);
    const system = new RemotePlayerSystem(match);
    const group = new THREE.Group();
    match.scene.add(group);
    match.remotePlayers = system;
    match.remotePlayersMeshes.set("remote-player", group);
    match.active = true;

    const destroy = vi.spyOn(system, "destroy").mockImplementation(() => {
      expect(match.remotePlayersMeshes.has("remote-player")).toBe(true);
      RemotePlayerSystem.prototype.destroy.call(system);
    });

    match.stop();

    expect(destroy).toHaveBeenCalledOnce();
    expect(match.remotePlayersMeshes.size).toBe(0);
    expect(match.scene.getObjectById(group.id)).toBeUndefined();
  });

  it("disposes network sync before remote visuals during match teardown", () => {
    const match = new MatchController({} as any);
    const order: string[] = [];
    match.networkSync = { dispose: () => order.push("network") } as any;
    match.remotePlayers = { destroy: () => order.push("remote") } as any;
    match.active = true;

    match.stop();

    expect(order).toEqual(["network", "remote"]);
  });

  it("stops an equip action when no authored idle clip exists", () => {
    const weapon = new THREE.Group();
    (weapon as any).animations = [new THREE.AnimationClip("equip", 0.1, [])];
    const mixer = createRemoteWeaponMixer(weapon)!;

    expect(playRemoteWeaponEquip(mixer)).toBe(true);
    mixer.update(0.2);
    expect((mixer as any)._remoteWeaponCurrentAction).toBeUndefined();
  });

  it.each([
    {
      name: "firing",
      prepare: (player: PlayerState) => { player.firedSinceBroadcast = true; },
      context: { isFiring: true, weapon: "rifle" },
      flags: { isFiring: true },
      clip: "rifle_fire",
    },
    {
      name: "reloading",
      prepare: (player: PlayerState) => { player.weaponState.primary.isReloading = true; },
      context: { isReloading: true, weapon: "rifle" },
      flags: { isReloading: true },
      clip: "rifle_idle",
    },
    {
      name: "aiming",
      prepare: (player: PlayerState) => { (player as any).isAiming = true; },
      context: { isAiming: true, weapon: "rifle" },
      flags: { isAiming: true },
      clip: "rifle_aim_idle",
    },
    {
      name: "crouching",
      prepare: (player: PlayerState) => { player.inputMask = 0x40; },
      context: { isCrouching: true, weapon: "rifle" },
      flags: { isCrouching: true },
      clip: "pistol_kneeling_idle",
    },
    {
      name: "airborne",
      prepare: (player: PlayerState) => { player.kcc = { computedGrounded: () => false } as any; },
      context: { isGrounded: false, weapon: "rifle" },
      flags: { isGrounded: false },
      clip: "pistol_jump",
    },
    {
      name: "sprinting",
      prepare: (player: PlayerState) => {
        player.inputMask = 0x20;
        player.velX = 6;
      },
      context: { isSprinting: true, speed: 6, weapon: "rifle" },
      flags: { isSprinting: true },
      clip: "rifle_run",
    },
    {
      name: "pistol weapon pose",
      prepare: (player: PlayerState) => { player.weapon = "pistol"; },
      context: { weapon: "pistol" },
      flags: {
        currentWeapon: "pistol",
        weaponEquipSequence: 7,
        weaponEquipTimestamp: 12345,
      },
      clip: "pistol_idle",
    },
  ])("preserves $name through state_sync", ({ prepare, context, flags, clip }) => {
    const player = createPlayer();
    prepare(player);
    const channel = player.channel as any;
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

    const syncEvent = channel.emit.mock.calls.find(([name]: [string]) => name === "state_sync")?.[1];
    const snapshot = syncEvent.players[0];
    for (const [field, expected] of Object.entries(flags)) {
      expect(snapshot[field]).toBe(expected);
    }
    const output = resolvePlayerAnimationState({
      isAlive: snapshot.isAlive,
      isFiring: snapshot.isFiring,
      isReloading: snapshot.isReloading,
      isGrounded: snapshot.isGrounded,
      isCrouching: snapshot.isCrouching,
      isSprinting: snapshot.isSprinting,
      isAiming: snapshot.isAiming,
      speed: context.speed,
      weapon: snapshot.currentWeapon,
    });

    expect(output.kind).toBe("clip");
    expect(output.kind === "clip" ? output.clipName : undefined).toBe(clip);
  });
});