var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/execution/room-worker.ts
var import_rapier3d_compat9 = __toESM(require("@dimforge/rapier3d-compat"), 1);

// server/MatchRoom.ts
var fs2 = __toESM(require("fs"), 1);
var path3 = __toESM(require("path"), 1);

// shared/gamemode-configs.ts
var GAMEMODES = {
  STANDARD: {
    id: "STANDARD",
    displayName: "INFILTRATION",
    description: "Disable the rogue AI before the timer expires. 5\u201310 contractors. Respawn enabled.",
    matchDuration: 600,
    timerLabel: "Time Left",
    minPlayers: 1,
    maxPlayers: 10,
    winCondition: "OBJECTIVE",
    lossCondition: "TIMEOUT",
    winMessage: "SYSTEM TERMINATED",
    lossMessage: "CONTRACT FAILED",
    spawnZones: ["zone_spawn"],
    respawnEnabled: true,
    respawnDelay: 5,
    respawnDeathPenaltyScore: 50,
    friendlyFireEnabled: false,
    friendlyFireDamageMultiplier: 0,
    teamKillPenaltyEnabled: false,
    bulletDamageEnabled: true,
    explosionDamageEnabled: true,
    fallDamageEnabled: true,
    fallDamageMinHeight: 6,
    fallDamageMaxHeight: 20,
    fallDamageScaling: "linear",
    objectiveHoldTime: 8,
    objectiveResetOnDamage: true,
    objectiveResetOnExit: true,
    objectiveProximityRadius: 3,
    objectiveTerminalDamageable: false,
    availableClasses: ["ASSAULT", "MEDIC", "RECON", "DEMOLITIONS"],
    classLoadoutsLocked: true,
    utilityCooldownMultiplier: 1,
    utilityResetsOnRespawn: true,
    llmCycleInterval: 8e3,
    llmApStartPool: 20,
    llmApRegenPerCycle: 3,
    llmDifficultyScaling: true,
    llmDifficultyScaleInterval: 120,
    llmDifficultyScaleAmount: 1,
    droneFriendlyFireExplosions: true,
    droneAvoidFriendlyFire: true,
    deathCamEnabled: true,
    deathCamFallback: "teammate",
    scoreTrackingEnabled: true,
    scoreIndividual: true,
    scoreTeam: true,
    scoreValues: {
      droneElimination: 100,
      assistElimination: 50,
      objectiveProgress: 10,
      revivePerformed: 150,
      survivalBonus: 25,
      deathPenalty: 50,
      missionComplete: 500
    },
    postMatchStats: [
      "droneEliminations",
      "assists",
      "deaths",
      "objectiveTimeHeld",
      "damageDealt",
      "damageReceived",
      "utilityUsed",
      "distanceTravelled",
      "timeAlive",
      "scoreIndividual",
      "scoreTeam",
      "matchResult",
      "matchDuration"
    ]
  }
};
var ACTIVE_GAMEMODE = GAMEMODES.STANDARD;

// shared/weapons.ts
var DETAILED_WEAPONS = {
  rifle: {
    name: "Rifle",
    fireRateHz: 10,
    // 600 RPM
    damage: 20,
    capacity: 40,
    reserveCapacity: 120,
    recoilForceUp: 0.05,
    recoilForceSide: 0.02,
    recoilRecoveryRate: 8,
    baseSpreadRad: 0.015,
    // ~0.8 degrees base
    maxSpreadRad: 0.08,
    // Continuous fire spread
    heatPerShot: 0.012,
    coolRate: 0.05,
    camShakeMagnitude: 0.08,
    camShakeDurationMs: 120,
    falloff: {
      maxDamageRange: 25,
      minDamageRange: 80,
      minDamage: 8
    },
    adsFovMultipier: 0.7,
    // 30% zoom
    adsSensitivityMult: 0.6,
    adsTransitionSpeed: 10,
    swayAmplitude: 3e-3,
    swaySpeed: 2.5,
    visualConfig: {
      hipPosition: [0.025, -0.49, 0.05],
      adsPosition: [-0.075, -0.42, 0],
      adsTilt: -0.05,
      muzzleOffset: [0.18, 0.15, -0.47],
      visualScale: 1,
      animations: {
        idle: "Rig|KDW_DPose_Idle",
        walk: "Rig|KDW_Walk",
        shoot: "Rig|KDW_Shot",
        reload: "Rig|KDW_Reload_fast",
        draw: "Rig|KDW_Draw"
      },
      reloadDuration: 2.2,
      drawDuration: 0.4
    }
  },
  pistol: {
    name: "Pistol",
    fireRateHz: 5,
    // Semi-auto
    damage: 25,
    capacity: 35,
    reserveCapacity: 100,
    recoilForceUp: 0.08,
    recoilForceSide: 0.03,
    recoilRecoveryRate: 12,
    baseSpreadRad: 8e-3,
    // Higher single-shot accuracy
    maxSpreadRad: 0.05,
    heatPerShot: 0.025,
    // High accuracy bloom if spammed
    coolRate: 0.08,
    camShakeMagnitude: 0.12,
    camShakeDurationMs: 90,
    falloff: {
      maxDamageRange: 12,
      minDamageRange: 35,
      minDamage: 5
    },
    adsFovMultipier: 0.85,
    // 15% zoom
    adsSensitivityMult: 0.8,
    adsTransitionSpeed: 12,
    swayAmplitude: 15e-4,
    swaySpeed: 1.8,
    visualConfig: {
      hipPosition: [5e-3, -0.16, -0.185],
      adsPosition: [0, -0.135, -0.06],
      adsTilt: 0,
      muzzleOffset: [0.03, 0.12, -0.25],
      visualScale: 1,
      animations: {
        idle: "idle",
        walk: "walk",
        shoot: "shoot",
        reload: "reload",
        draw: "draw"
      },
      reloadDuration: 1.8,
      drawDuration: 0.3
    }
  },
  smg: {
    name: "SMG",
    fireRateHz: 13,
    damage: 18,
    capacity: 30,
    reserveCapacity: 120,
    recoilForceUp: 0.06,
    recoilForceSide: 0.03,
    recoilRecoveryRate: 10,
    baseSpreadRad: 0.02,
    maxSpreadRad: 0.09,
    heatPerShot: 0.012,
    coolRate: 0.08,
    camShakeMagnitude: 0.1,
    camShakeDurationMs: 100,
    falloff: { maxDamageRange: 18, minDamageRange: 55, minDamage: 7 },
    adsFovMultipier: 0.75,
    adsSensitivityMult: 0.65,
    adsTransitionSpeed: 10,
    swayAmplitude: 35e-4,
    swaySpeed: 2.8,
    visualConfig: {
      hipPosition: [0.03, -0.46, -0.671],
      adsPosition: [-0.07, -0.4, -0.641],
      adsTilt: -0.04,
      muzzleOffset: [0, 0, -0.5],
      // 0.90 target length / measured 4.476192-unit UMP root length = 0.201064.
      visualScale: 0.201064,
      animations: { idle: "idle", walk: "sprint", shoot: "fire", reload: "reload", draw: "equip" },
      reloadDuration: 2.3,
      drawDuration: 0.45
    }
  },
  shotgun: {
    name: "Shotgun",
    fireRateHz: 1.2,
    damage: 80,
    capacity: 8,
    reserveCapacity: 24,
    recoilForceUp: 0.22,
    recoilForceSide: 0.08,
    recoilRecoveryRate: 6,
    baseSpreadRad: 0.08,
    maxSpreadRad: 0.15,
    heatPerShot: 0.1,
    coolRate: 0.15,
    camShakeMagnitude: 0.25,
    camShakeDurationMs: 200,
    falloff: { maxDamageRange: 8, minDamageRange: 20, minDamage: 0 },
    adsFovMultipier: 0.8,
    adsSensitivityMult: 0.7,
    adsTransitionSpeed: 8,
    swayAmplitude: 4e-3,
    swaySpeed: 2,
    visualConfig: {
      hipPosition: [0.03, -0.45, 0],
      adsPosition: [-0.08, -0.38, 0],
      adsTilt: -0.04,
      muzzleOffset: [0, 0, -0.6],
      visualScale: 1,
      animations: { idle: "idle", walk: "walk", shoot: "shoot", reload: "reload", draw: "draw" },
      reloadDuration: 3,
      drawDuration: 0.5
    }
  },
  lmg: {
    name: "LMG",
    fireRateHz: 13,
    damage: 18,
    capacity: 100,
    reserveCapacity: 300,
    recoilForceUp: 0.04,
    recoilForceSide: 0.04,
    recoilRecoveryRate: 7,
    baseSpreadRad: 0.025,
    maxSpreadRad: 0.12,
    heatPerShot: 8e-3,
    coolRate: 0.04,
    camShakeMagnitude: 0.09,
    camShakeDurationMs: 100,
    falloff: { maxDamageRange: 35, minDamageRange: 90, minDamage: 9 },
    adsFovMultipier: 0.65,
    adsSensitivityMult: 0.5,
    adsTransitionSpeed: 7,
    swayAmplitude: 5e-3,
    swaySpeed: 3,
    visualConfig: {
      hipPosition: [0.04, -0.52, 0.1],
      adsPosition: [-0.09, -0.46, 0],
      adsTilt: -0.06,
      muzzleOffset: [0, 0, -0.75],
      visualScale: 1.1,
      animations: { idle: "idle", walk: "walk", shoot: "shoot", reload: "reload", draw: "draw" },
      reloadDuration: 4.5,
      drawDuration: 0.7
    }
  },
  sniper: {
    name: "Sniper Rifle",
    fireRateHz: 0.6,
    damage: 110,
    capacity: 5,
    reserveCapacity: 15,
    recoilForceUp: 0.35,
    recoilForceSide: 0.05,
    recoilRecoveryRate: 4,
    baseSpreadRad: 1e-3,
    maxSpreadRad: 0.2,
    heatPerShot: 0.3,
    coolRate: 0.1,
    camShakeMagnitude: 0.3,
    camShakeDurationMs: 250,
    falloff: { maxDamageRange: 150, minDamageRange: 200, minDamage: 85 },
    adsFovMultipier: 0.25,
    adsSensitivityMult: 0.3,
    adsTransitionSpeed: 5,
    swayAmplitude: 8e-3,
    swaySpeed: 1.5,
    visualConfig: {
      hipPosition: [0.02, -0.48, 0.05],
      adsPosition: [-0.075, -0.41, 0],
      adsTilt: -0.05,
      muzzleOffset: [0, 0, -0.9],
      visualScale: 1,
      animations: { idle: "idle", walk: "walk", shoot: "shoot", reload: "reload", draw: "draw" },
      reloadDuration: 3.5,
      drawDuration: 0.6
    }
  },
  medkit: {
    name: "Med Kit",
    fireRateHz: 1,
    damage: -50,
    capacity: 2,
    recoilForceUp: 0,
    recoilForceSide: 0,
    recoilRecoveryRate: 10,
    baseSpreadRad: 0,
    maxSpreadRad: 0,
    heatPerShot: 0,
    coolRate: 1,
    camShakeMagnitude: 0,
    camShakeDurationMs: 0,
    falloff: { maxDamageRange: 2, minDamageRange: 2, minDamage: -50 },
    adsFovMultipier: 1,
    adsSensitivityMult: 1,
    adsTransitionSpeed: 10,
    swayAmplitude: 1e-3,
    swaySpeed: 1,
    visualConfig: {
      hipPosition: [0, -0.3, -0.1],
      adsPosition: [0, -0.3, -0.1],
      adsTilt: 0,
      muzzleOffset: [0, 0, 0],
      visualScale: 0.8,
      animations: { idle: "idle", walk: "walk", shoot: "use", reload: "none", draw: "draw" },
      reloadDuration: 0,
      drawDuration: 0.3
    }
  },
  grenade: {
    name: "Frag Grenade",
    fireRateHz: 0.8,
    damage: 150,
    capacity: 3,
    recoilForceUp: 0,
    recoilForceSide: 0,
    recoilRecoveryRate: 10,
    baseSpreadRad: 0,
    maxSpreadRad: 0,
    heatPerShot: 0,
    coolRate: 1,
    camShakeMagnitude: 0.15,
    camShakeDurationMs: 150,
    falloff: { maxDamageRange: 5, minDamageRange: 10, minDamage: 10 },
    adsFovMultipier: 1,
    adsSensitivityMult: 1,
    adsTransitionSpeed: 10,
    swayAmplitude: 2e-3,
    swaySpeed: 1.5,
    visualConfig: {
      hipPosition: [0.05, -0.25, -0.1],
      adsPosition: [0.05, -0.25, -0.1],
      adsTilt: 0,
      muzzleOffset: [0, 0, 0],
      visualScale: 0.5,
      animations: { idle: "idle", walk: "walk", shoot: "throw", reload: "none", draw: "draw" },
      reloadDuration: 0,
      drawDuration: 0.3
    }
  },
  radio: {
    name: "Field Radio",
    fireRateHz: 0.5,
    damage: 0,
    capacity: 1,
    recoilForceUp: 0,
    recoilForceSide: 0,
    recoilRecoveryRate: 10,
    baseSpreadRad: 0,
    maxSpreadRad: 0,
    heatPerShot: 0,
    coolRate: 1,
    camShakeMagnitude: 0,
    camShakeDurationMs: 0,
    falloff: { maxDamageRange: 0, minDamageRange: 0, minDamage: 0 },
    adsFovMultipier: 1,
    adsSensitivityMult: 1,
    adsTransitionSpeed: 10,
    swayAmplitude: 1e-3,
    swaySpeed: 1.2,
    visualConfig: {
      hipPosition: [0, -0.3, -0.15],
      adsPosition: [0, -0.3, -0.15],
      adsTilt: 0,
      muzzleOffset: [0, 0, 0],
      visualScale: 0.6,
      animations: { idle: "idle", walk: "walk", shoot: "call", reload: "none", draw: "draw" },
      reloadDuration: 0,
      drawDuration: 0.4
    }
  }
};
function calculateDamageWithFalloff(baseDamage, distance, falloff) {
  if (distance <= falloff.maxDamageRange) {
    return baseDamage;
  }
  if (distance >= falloff.minDamageRange) {
    return falloff.minDamage;
  }
  const ratio = (distance - falloff.maxDamageRange) / (falloff.minDamageRange - falloff.maxDamageRange);
  return baseDamage - (baseDamage - falloff.minDamage) * ratio;
}

// shared/constants.ts
var ZONES = {
  SPAWN: "zone_spawn",
  COURTYARD: "zone_courtyard",
  WAREHOUSE: "zone_warehouse",
  BRIDGE: "zone_bridge",
  PLANT: "zone_plant",
  TUNNELS: "zone_tunnels",
  CORE: "zone_core"
};
var ZONES_ARRAY = Object.values(ZONES);
var WAYPOINTS = {
  [ZONES.SPAWN]: { x: 64, y: 1.2, z: 704 },
  [ZONES.COURTYARD]: { x: 144, y: 1.2, z: 496 },
  [ZONES.WAREHOUSE]: { x: 144, y: 1.2, z: 240 },
  [ZONES.BRIDGE]: { x: 288, y: 5.2, z: 496 },
  [ZONES.PLANT]: { x: 528, y: 1.2, z: 448 },
  [ZONES.TUNNELS]: { x: 448, y: -20, z: 64 },
  [ZONES.CORE]: { x: 384, y: 1.2, z: 384 }
};
var TOPOLOGY = {
  [ZONES.SPAWN]: [ZONES.COURTYARD],
  [ZONES.COURTYARD]: [ZONES.SPAWN, ZONES.WAREHOUSE, ZONES.BRIDGE],
  [ZONES.WAREHOUSE]: [ZONES.COURTYARD, ZONES.TUNNELS, ZONES.PLANT],
  [ZONES.BRIDGE]: [ZONES.COURTYARD, ZONES.PLANT],
  [ZONES.PLANT]: [ZONES.WAREHOUSE, ZONES.BRIDGE, ZONES.CORE],
  [ZONES.TUNNELS]: [ZONES.WAREHOUSE, ZONES.CORE],
  [ZONES.CORE]: [ZONES.PLANT, ZONES.TUNNELS]
};
var ZONE_BOUNDS = {
  [ZONES.SPAWN]: { center: { x: 64, y: 0, z: 704 }, halfSize: { x: 64, y: 30, z: 64 } },
  [ZONES.COURTYARD]: { center: { x: 144, y: 0, z: 496 }, halfSize: { x: 144, y: 30, z: 144 } },
  [ZONES.WAREHOUSE]: { center: { x: 144, y: 0, z: 240 }, halfSize: { x: 144, y: 30, z: 112 } },
  [ZONES.BRIDGE]: { center: { x: 288, y: 5.2, z: 496 }, halfSize: { x: 40, y: 30, z: 40 } },
  [ZONES.PLANT]: { center: { x: 528, y: 0, z: 448 }, halfSize: { x: 240, y: 30, z: 320 } },
  [ZONES.TUNNELS]: { center: { x: 448, y: -10, z: 64 }, halfSize: { x: 320, y: 25, z: 64 } },
  [ZONES.CORE]: { center: { x: 384, y: 0, z: 384 }, halfSize: { x: 64, y: 30, z: 64 } }
};
var DroneState = /* @__PURE__ */ ((DroneState3) => {
  DroneState3[DroneState3["IDLE"] = 0] = "IDLE";
  DroneState3[DroneState3["PATROLLING"] = 1] = "PATROLLING";
  DroneState3[DroneState3["PURSUING"] = 2] = "PURSUING";
  DroneState3[DroneState3["ATTACKING"] = 3] = "ATTACKING";
  DroneState3[DroneState3["REPOSITIONING"] = 4] = "REPOSITIONING";
  DroneState3[DroneState3["DEAD"] = 5] = "DEAD";
  return DroneState3;
})(DroneState || {});
var MAX_DRONES = 50;
var MAX_CAMERAS = 20;
var PLAYER_MAX_HP = 100;
var PLAYER_RESPAWN_DELAY_DEFAULT = 5;
var HISTORICAL_SAMPLES_MAX = 120;
var HISTORIC_BLOCK_SIZE = 2 + MAX_DRONES * 4;
var INTEL_CONFIGS = {
  [0 /* ROTARY_SHOOTER */]: { sightDistance: 50, visionConeAngle: Math.PI / 2, hearingRadius: 60, memoryDecayRate: 0.05, engagementMin: 15, engagementMax: 30, fireArcTolerance: 0.2 },
  [1 /* BOMBER */]: { sightDistance: 40, visionConeAngle: Math.PI / 1.5, hearingRadius: 50, memoryDecayRate: 0.1, engagementMin: 0, engagementMax: 4, fireArcTolerance: 0 },
  [2 /* RECON */]: { sightDistance: 80, visionConeAngle: Math.PI, hearingRadius: 80, memoryDecayRate: 0.02, engagementMin: 40, engagementMax: 70, fireArcTolerance: 0 },
  [3 /* FIXED_WING */]: { sightDistance: 100, visionConeAngle: Math.PI / 3, hearingRadius: 100, memoryDecayRate: 0.05, engagementMin: 20, engagementMax: 100, fireArcTolerance: 0 },
  [4 /* WHEELED */]: { sightDistance: 60, visionConeAngle: Math.PI / 2, hearingRadius: 60, memoryDecayRate: 0.05, engagementMin: 10, engagementMax: 40, fireArcTolerance: 0 },
  [5 /* ROBOT_DOG */]: { sightDistance: 70, visionConeAngle: Math.PI / 2.5, hearingRadius: 80, memoryDecayRate: 0.03, engagementMin: 15, engagementMax: 50, fireArcTolerance: 0 },
  [6 /* HUMANOID */]: { sightDistance: 90, visionConeAngle: Math.PI / 3, hearingRadius: 70, memoryDecayRate: 0.02, engagementMin: 20, engagementMax: 60, fireArcTolerance: 0 },
  [99 /* TEST_ENTITY */]: { sightDistance: 90, visionConeAngle: Math.PI / 3, hearingRadius: 70, memoryDecayRate: 0.02, engagementMin: 20, engagementMax: 60, fireArcTolerance: 0 }
};
var DRONE_CONFIGS = {
  [0 /* ROTARY_SHOOTER */]: {
    type: 0 /* ROTARY_SHOOTER */,
    hp: 40,
    maxHp: 40,
    damage: 8,
    speed: 10,
    maxAccelPerTick: 0.3,
    apCost: 2,
    isAirUnit: true,
    groupSizeMin: 3,
    groupSizeMax: 5,
    visualRadius: 1,
    orientationOffset: [0, 0, 0],
    collider: { type: "cuboid", halfExtents: [0.777, 0.204, 0.596] },
    muzzleOffset: [0.04, 2.37, 8.59],
    animations: ["spin", "sway"],
    // Category 2
    lightPoints: [[-0.03, 0.01, 0.45], [0.03, 0.01, 0.45]],
    propPivotX: 0.6633333333333333,
    propPivotZ: 0.5666666666666667,
    propellerOffset: [0.6633333333333333, 0.5666666666666667],
    detonationTriggerRadius: 4,
    // Category 3
    propellerSpinRate: 60,
    hoverSwayAmount: 0.02,
    hoverSwaySpeed: 4.3,
    verticalBobAmount: 0.03,
    verticalBobSpeed: 1.5,
    muzzleFlashScale: 0.6,
    firingSoundPitch: 1.3,
    wheelRollSpeed: 2.5,
    wheelSteerAngle: 0.5,
    barrelRecoilAmount: 0.8,
    recoilDuration: 0.05,
    recoilRecoverDuration: 0.13,
    chassisVibration: 0.05,
    chassisVibrationSpeed: 30,
    // Category 4
    maxRotationSpeed: 1.5,
    maxVerticalSpeed: 2,
    bankingAngle: 0.15,
    minSpeed: 0,
    maxTurnRate: 1.5,
    pitchAngle: 0.35,
    engagementRange: 40,
    maxTurnAngle: 0.6,
    maxTurnSpeed: 3,
    turretRotateAngle: 3.14,
    turretGunAngle: 0.5,
    fireCooldown: 10,
    detectionRadius: 30,
    fovHalfAngle: 0.7853981633974483,
    decelerationRadius: 5,
    decayRate: 1 / 15
  },
  [1 /* BOMBER */]: {
    type: 1 /* BOMBER */,
    hp: 40,
    maxHp: 40,
    damage: 8,
    speed: 20,
    maxAccelPerTick: 0.8,
    apCost: 2,
    isAirUnit: true,
    groupSizeMin: 3,
    groupSizeMax: 5,
    visualRadius: 1.1,
    orientationOffset: [0, 0, 0],
    collider: { type: "cuboid", halfExtents: [1.05, 0.4, 0.85] },
    muzzleOffset: [0.04, 2.37, 8.59],
    animations: ["spin", "sway"],
    // Category 2
    lightPoints: [[-0.03, 0.01, 0.45], [0.03, 0.01, 0.45]],
    propPivotX: 0.7296666666666666,
    propPivotZ: 0.6233333333333334,
    propellerOffset: [0.7296666666666666, 0.6233333333333334],
    detonationTriggerRadius: 4,
    // Category 3
    propellerSpinRate: 60,
    hoverSwayAmount: 0.02,
    hoverSwaySpeed: 4.3,
    verticalBobAmount: 0.03,
    verticalBobSpeed: 1.5,
    muzzleFlashScale: 0.6,
    firingSoundPitch: 1.3,
    wheelRollSpeed: 2.5,
    wheelSteerAngle: 0.5,
    barrelRecoilAmount: 0.8,
    recoilDuration: 0.05,
    recoilRecoverDuration: 0.13,
    chassisVibration: 0.05,
    chassisVibrationSpeed: 30,
    // Category 4
    maxRotationSpeed: 1.5,
    maxVerticalSpeed: 2,
    bankingAngle: 0.15,
    minSpeed: 0,
    maxTurnRate: 1.5,
    pitchAngle: 0.35,
    engagementRange: 40,
    maxTurnAngle: 0.6,
    maxTurnSpeed: 3,
    turretRotateAngle: 3.14,
    turretGunAngle: 0.5,
    fireCooldown: 10,
    detectionRadius: 30,
    fovHalfAngle: 0.7853981633974483,
    decelerationRadius: 5,
    decayRate: 1 / 15
  },
  [2 /* RECON */]: {
    type: 2 /* RECON */,
    hp: 40,
    maxHp: 40,
    damage: 8,
    speed: 15,
    maxAccelPerTick: 0.5,
    apCost: 1,
    isAirUnit: true,
    groupSizeMin: 3,
    groupSizeMax: 5,
    visualRadius: 0.8,
    orientationOffset: [0, 0, 0],
    collider: { type: "cuboid", halfExtents: [0.55, 0.19, 0.5] },
    muzzleOffset: [0.04, 2.37, 8.59],
    animations: ["spin", "sway"],
    // Category 2
    lightPoints: [[-0.03, 0.01, 0.45], [0.03, 0.01, 0.45]],
    propPivotX: 0.5306666666666666,
    propPivotZ: 0.45333333333333337,
    propellerOffset: [0.5306666666666666, 0.45333333333333337],
    detonationTriggerRadius: 4,
    // Category 3
    propellerSpinRate: 60,
    hoverSwayAmount: 0.02,
    hoverSwaySpeed: 4.3,
    verticalBobAmount: 0.03,
    verticalBobSpeed: 1.5,
    muzzleFlashScale: 0.6,
    firingSoundPitch: 1.3,
    wheelRollSpeed: 2.5,
    wheelSteerAngle: 0.5,
    barrelRecoilAmount: 0.8,
    recoilDuration: 0.05,
    recoilRecoverDuration: 0.13,
    chassisVibration: 0.05,
    chassisVibrationSpeed: 30,
    // Category 4
    maxRotationSpeed: 1.5,
    maxVerticalSpeed: 2,
    bankingAngle: 0.15,
    minSpeed: 0,
    maxTurnRate: 1.5,
    pitchAngle: 0.35,
    engagementRange: 40,
    maxTurnAngle: 0.6,
    maxTurnSpeed: 3,
    turretRotateAngle: 3.14,
    turretGunAngle: 0.5,
    fireCooldown: 10,
    detectionRadius: 30,
    fovHalfAngle: 0.7853981633974483,
    decelerationRadius: 5,
    decayRate: 1 / 15
  },
  [3 /* FIXED_WING */]: {
    type: 3 /* FIXED_WING */,
    hp: 60,
    maxHp: 60,
    damage: 15,
    speed: 25,
    maxAccelPerTick: 0.4,
    apCost: 5,
    isAirUnit: true,
    groupSizeMin: 1,
    groupSizeMax: 1,
    visualRadius: 1.5,
    orientationOffset: [0, -1.570796, 0],
    collider: { type: "cuboid", halfExtents: [6.435, 1.545, 13.89] },
    animations: ["hold_frame"],
    // Category 2
    lightPoints: [[-1.5, 0, 0.5], [1.5, 0, 0.5]],
    muzzleOffset: [0, 0, 1.2],
    // Category 3
    muzzleFlashScale: 2,
    firingSoundPitch: 0.6,
    // Category 4
    minSpeed: 10,
    maxTurnRate: 1.5,
    pitchAngle: 0.35,
    engagementRange: 40,
    decayRate: 1 / 15,
    strafeApproachDistance: 150,
    strafeRunStartDistance: 100,
    strafeExitDistance: 50,
    strafeRepositionDistance: 200
  },
  [4 /* WHEELED */]: {
    type: 4 /* WHEELED */,
    hp: 80,
    maxHp: 80,
    damage: 12,
    speed: 8,
    maxAccelPerTick: 0.4,
    apCost: 3,
    isAirUnit: false,
    groupSizeMin: 2,
    groupSizeMax: 3,
    visualRadius: 1.5,
    orientationOffset: [0, -1.570796, 0],
    collider: { type: "cuboid", halfExtents: [1.65, 0.695, 1.8], offset: [0, -0.33, 0] },
    muzzleOffset: [-4.62, 0.5, 0.1],
    animations: ["wheels", "steer", "turret"],
    // Category 2
    lightPoints: [[-0.6, 0.3, 3], [0.6, -0.34, 3]],
    detonationTriggerRadius: 4,
    turretYawPivot: [-0.85, 0.45, -0.81],
    gunPitchPivot: [-1.22, 0.99, 0],
    // Category 3
    wheelRollSpeed: 1.8,
    wheelSteerAngle: 0.1,
    barrelRecoilAmount: 0.6,
    recoilDuration: 0.08,
    recoilRecoverDuration: 0.16,
    chassisVibration: 0.01,
    chassisVibrationSpeed: 32.79,
    muzzleFlashScale: 1.7,
    firingSoundPitch: 0.95,
    // Category 4
    maxRotationSpeed: 3,
    maxVerticalSpeed: 5,
    bankingAngle: 0.35,
    minSpeed: 0,
    maxTurnRate: 0.3,
    pitchAngle: 0.35,
    engagementRange: 40,
    maxTurnAngle: 0.3,
    maxTurnSpeed: 1.5,
    turretRotateAngle: 6.25,
    turretGunAngle: 0.3,
    fireCooldown: 30,
    detectionRadius: 30,
    fovHalfAngle: 0.7853981633974483,
    decelerationRadius: 5,
    decayRate: 1 / 15
  },
  [5 /* ROBOT_DOG */]: {
    type: 5 /* ROBOT_DOG */,
    hp: 150,
    maxHp: 150,
    damage: 18,
    speed: 10,
    maxAccelPerTick: 0.4,
    apCost: 4,
    isAirUnit: false,
    groupSizeMin: 1,
    groupSizeMax: 2,
    visualRadius: 0.45,
    orientationOffset: [0, -1.63159265358979, 0],
    collider: { type: "cuboid", halfExtents: [0.29, 0.49, 0.62] },
    muzzleOffset: [0, 0.54, 1.08],
    animations: ["walk"],
    // Category 2
    lightPoints: [[-0.5, 0, 0.5], [0.5, 0, 0.5]],
    detonationTriggerRadius: 4,
    turretYawPivot: [0, 0.45, -0.1],
    gunPitchPivot: [0, 0.65, 0],
    // Category 3
    propellerSpinRate: 20,
    hoverSwayAmount: 0.05,
    hoverSwaySpeed: 2,
    verticalBobAmount: 0.08,
    verticalBobSpeed: 1.5,
    muzzleFlashScale: 1,
    firingSoundPitch: 1,
    wheelRollSpeed: 2.5,
    wheelSteerAngle: 0.5,
    barrelRecoilAmount: 0.15,
    recoilDuration: 0.08,
    recoilRecoverDuration: 0.2,
    chassisVibration: 0.05,
    chassisVibrationSpeed: 30,
    // Category 4
    maxRotationSpeed: 3,
    maxVerticalSpeed: 5,
    bankingAngle: 0.35,
    minSpeed: 0,
    maxTurnRate: 1.5,
    pitchAngle: 0.35,
    engagementRange: 40,
    maxTurnAngle: 0.6,
    maxTurnSpeed: 2,
    turretRotateAngle: 3.14,
    turretGunAngle: 0.5,
    fireCooldown: 20,
    detectionRadius: 30,
    fovHalfAngle: 0.7853981633974483,
    decelerationRadius: 5,
    decayRate: 0.06666666666666667
  },
  [6 /* HUMANOID */]: {
    type: 6 /* HUMANOID */,
    hp: 200,
    maxHp: 200,
    damage: 20,
    speed: 6,
    maxAccelPerTick: 0.4,
    apCost: 6,
    isAirUnit: false,
    groupSizeMin: 1,
    groupSizeMax: 1,
    visualRadius: 0.72,
    visualScaleTarget: 0.72,
    // Derived from capsule geometry halfHeight: 0.25 + radius: 0.47 = 0.72
    orientationOffset: [0, 0, 0],
    collider: { type: "capsule", halfHeight: 0.25, radius: 0.47 },
    muzzleOffset: [0.2, 0.8, 0.5],
    // Static authored presentation: the exact F90-equipped source has no action tracks.
    animations: ["hold"],
    // Category 2
    lightPoints: [[-0.5, 0, 0.5], [0.5, 0, 0.5]],
    detonationTriggerRadius: 4,
    turretYawPivot: [0, 0.45, -0.1],
    gunPitchPivot: [0, 0.65, 0],
    // Category 3
    propellerSpinRate: 20,
    hoverSwayAmount: 0.05,
    hoverSwaySpeed: 2,
    verticalBobAmount: 0.08,
    verticalBobSpeed: 1.5,
    muzzleFlashScale: 1,
    firingSoundPitch: 1,
    wheelRollSpeed: 2.5,
    wheelSteerAngle: 0.5,
    barrelRecoilAmount: 0.15,
    recoilDuration: 0.08,
    recoilRecoverDuration: 0.2,
    chassisVibration: 0.05,
    chassisVibrationSpeed: 30,
    // Category 4
    maxRotationSpeed: 3,
    maxVerticalSpeed: 5,
    bankingAngle: 0.35,
    minSpeed: 0,
    maxTurnRate: 1.5,
    pitchAngle: 0.35,
    engagementRange: 40,
    maxTurnAngle: 0.6,
    maxTurnSpeed: 2,
    turretRotateAngle: 3.14,
    turretGunAngle: 0.5,
    fireCooldown: 40,
    detectionRadius: 30,
    fovHalfAngle: 0.7853981633974483,
    decelerationRadius: 5,
    decayRate: 0.06666666666666667
  },
  [99 /* TEST_ENTITY */]: { type: 99 /* TEST_ENTITY */, hp: 100, maxHp: 100, damage: 0, speed: 10, apCost: 0, isAirUnit: false, groupSizeMin: 1, groupSizeMax: 1, visualRadius: 1, orientationOffset: [0, 0, 0], collider: { type: "ball", radius: 1.5 }, animations: [], decayRate: 1 / 15 }
};
var HEADER_SIZE = 8;
var DRONE_STRUCT_SIZE = 32;
var CAMERA_STRUCT_SIZE = 4;
var TOTAL_STATE_BUFFER_SIZE = HEADER_SIZE + DRONE_STRUCT_SIZE * MAX_DRONES + CAMERA_STRUCT_SIZE * MAX_CAMERAS;
var PLAYER_RADIUS = 0.4;
var PLAYER_CAPSULE_HALF_HEIGHT = 0.5;
var PLAYER_CAPSULE_HALF_HEIGHT_CROUCH = 0.15;
var PLAYER_TOTAL_HEIGHT = 1.8;
var PLAYER_CENTER_OFFSET = PLAYER_TOTAL_HEIGHT / 2;
var PLAYER_EYE_LEVEL = 1.6;
var PLAYER_BASE_SPEED = 5.5;
var PLAYER_CROUCH_SPEED = 2.5;
var PLAYER_SPRINT_MULTIPLIER = 1.6;
var PLAYER_DASH_MULTIPLIER = 2.5;
var PLAYER_JUMP_VELOCITY = 7;
var PLAYER_GRAVITY = 18;
var RUNTIME_WEAPON_IDS = ["rifle", "pistol", "smg", "shotgun", "lmg", "sniper"];
function isRuntimeWeaponId(value) {
  return RUNTIME_WEAPON_IDS.includes(value) && value in DETAILED_WEAPONS;
}
function getWeaponPerformance(weaponId) {
  return isRuntimeWeaponId(weaponId) ? DETAILED_WEAPONS[weaponId] : null;
}
function getDroneMuzzleWorldPosition(d, targetPos, customOffset) {
  const conf = DRONE_CONFIGS[d.type] || DRONE_CONFIGS[99 /* TEST_ENTITY */];
  const offset = customOffset || conf.muzzleOffset || [0, 0.5, 0];
  let rx = offset[0];
  let ry = offset[1];
  let rz = offset[2];
  if (d.type === 4 /* WHEELED */ && targetPos) {
    const pt_x = conf.turretYawPivot ? conf.turretYawPivot[0] : 0;
    const pt_y = conf.turretYawPivot ? conf.turretYawPivot[1] : 0.45;
    const pt_z = conf.turretYawPivot ? conf.turretYawPivot[2] : -0.1;
    const pg_x = conf.gunPitchPivot ? conf.gunPitchPivot[0] : 0;
    const pg_y = conf.gunPitchPivot ? conf.gunPitchPivot[1] : 0.65;
    const pg_z = conf.gunPitchPivot ? conf.gunPitchPivot[2] : 0;
    const pg_rel_x = pg_x - pt_x;
    const pg_rel_y = pg_y - pt_y;
    const pg_rel_z = pg_z - pt_z;
    const pm_rel_x = offset[0] - pg_x;
    const pm_rel_y = offset[1] - pg_y;
    const pm_rel_z = offset[2] - pg_z;
    const dx = targetPos.x - d.posX;
    const dy = targetPos.y - d.posY;
    const dz = targetPos.z - d.posZ;
    const qx2 = -d.rotX;
    const qy2 = -d.rotY;
    const qz2 = -d.rotZ;
    const qw2 = d.rotW;
    const num13 = qx2 * 2;
    const num22 = qy2 * 2;
    const num32 = qz2 * 2;
    const num42 = qx2 * num13;
    const num52 = qy2 * num22;
    const num62 = qz2 * num32;
    const num72 = qx2 * num22;
    const num82 = qx2 * num32;
    const num92 = qy2 * num32;
    const num102 = qw2 * num13;
    const num112 = qw2 * num22;
    const num122 = qw2 * num32;
    let localTargetX = (1 - (num52 + num62)) * dx + (num72 - num122) * dy + (num82 + num112) * dz;
    let localTargetY = (num72 + num122) * dx + (1 - (num42 + num62)) * dy + (num92 - num102) * dz;
    let localTargetZ = (num82 - num112) * dx + (num92 + num102) * dy + (1 - (num42 + num52)) * dz;
    if (conf.orientationOffset) {
      const [ox, oy, oz] = conf.orientationOffset;
      if (ox !== 0 || oy !== 0 || oz !== 0) {
        if (oz !== 0) {
          const cosZ = Math.cos(-oz);
          const sinZ = Math.sin(-oz);
          const lx1 = localTargetX * cosZ - localTargetY * sinZ;
          const ly1 = localTargetX * sinZ + localTargetY * cosZ;
          localTargetX = lx1;
          localTargetY = ly1;
        }
        if (oy !== 0) {
          const cosY2 = Math.cos(-oy);
          const sinY2 = Math.sin(-oy);
          const lx2 = localTargetZ * sinY2 + localTargetX * cosY2;
          const lz2 = localTargetZ * cosY2 - localTargetX * sinY2;
          localTargetX = lx2;
          localTargetZ = lz2;
        }
        if (ox !== 0) {
          const cosX = Math.cos(-ox);
          const sinX = Math.sin(-ox);
          const ly3 = localTargetY * cosX - localTargetZ * sinX;
          const lz3 = localTargetY * sinX + localTargetZ * cosX;
          localTargetY = ly3;
          localTargetZ = lz3;
        }
      }
    }
    const vx = localTargetX - pg_x;
    const vy = localTargetY - pg_y;
    const vz = localTargetZ - pg_z;
    const targetYaw = Math.atan2(vz, vx);
    const dist2d = Math.sqrt(vx * vx + vz * vz);
    const targetPitch = Math.atan2(vy, dist2d);
    const maxYaw = conf.turretRotateAngle ?? Math.PI;
    const maxPitch = conf.turretGunAngle ?? 0.5;
    const clampedYaw = Math.max(-maxYaw, Math.min(maxYaw, targetYaw));
    const clampedPitch = Math.max(-maxPitch, Math.min(maxPitch, targetPitch));
    const cosP = Math.cos(clampedPitch);
    const sinP = Math.sin(clampedPitch);
    const rGunX = pm_rel_x * cosP - pm_rel_y * sinP;
    const rGunY = pm_rel_x * sinP + pm_rel_y * cosP;
    const rGunZ = pm_rel_z;
    const rTurretRelX = rGunX + pg_rel_x;
    const rTurretRelY = rGunY + pg_rel_y;
    const rTurretRelZ = rGunZ + pg_rel_z;
    const cosY = Math.cos(clampedYaw);
    const sinY = Math.sin(clampedYaw);
    const rTurretX = rTurretRelX * cosY - rTurretRelZ * sinY;
    const rTurretY = rTurretRelY;
    const rTurretZ = rTurretRelX * sinY + rTurretRelZ * cosY;
    rx = rTurretX + pt_x;
    ry = rTurretY + pt_y;
    rz = rTurretZ + pt_z;
  }
  if (conf.orientationOffset) {
    const [ox, oy, oz] = conf.orientationOffset;
    if (ox !== 0 || oy !== 0 || oz !== 0) {
      if (ox !== 0) {
        const cosX = Math.cos(ox);
        const sinX = Math.sin(ox);
        const ry1 = ry * cosX - rz * sinX;
        const rz1 = ry * sinX + rz * cosX;
        ry = ry1;
        rz = rz1;
      }
      if (oy !== 0) {
        const cosY = Math.cos(oy);
        const sinY = Math.sin(oy);
        const rx2 = rz * sinY + rx * cosY;
        const rz2 = rz * cosY - rx * sinY;
        rx = rx2;
        rz = rz2;
      }
      if (oz !== 0) {
        const cosZ = Math.cos(oz);
        const sinZ = Math.sin(oz);
        const rx3 = rx * cosZ - ry * sinZ;
        const ry3 = rx * sinZ + ry * cosZ;
        rx = rx3;
        ry = ry3;
      }
    }
  }
  const qx = d.rotX;
  const qy = d.rotY;
  const qz = d.rotZ;
  const qw = d.rotW;
  const num1 = qx * 2;
  const num2 = qy * 2;
  const num3 = qz * 2;
  const num4 = qx * num1;
  const num5 = qy * num2;
  const num6 = qz * num3;
  const num7 = qx * num2;
  const num8 = qx * num3;
  const num9 = qy * num3;
  const num10 = qw * num1;
  const num11 = qw * num2;
  const num12 = qw * num3;
  const rx_final = (1 - (num5 + num6)) * rx + (num7 - num12) * ry + (num8 + num11) * rz;
  const ry_final = (num7 + num12) * rx + (1 - (num4 + num6)) * ry + (num9 - num10) * rz;
  const rz_final = (num8 - num11) * rx + (num9 + num10) * ry + (1 - (num4 + num5)) * rz;
  return {
    x: d.posX + rx_final,
    y: d.posY + ry_final,
    z: d.posZ + rz_final
  };
}

// shared/asset-structure.ts
var ASSET_STRUCTURE = {
  "Player_one-optimized.glb": {
    "label": "Mixamo-rigged Player character model",
    "materialsCount": 2,
    "texturesCount": 5,
    "imagesCount": 5,
    "animations": [
      {
        "index": 0,
        "name": "rifle_idle",
        "minTime": 0,
        "maxTime": 8.6
      },
      {
        "index": 1,
        "name": "rifle_aim_idle",
        "minTime": 0,
        "maxTime": 3.133333
      },
      {
        "index": 2,
        "name": "rifle_run",
        "minTime": 0,
        "maxTime": 0.766667
      },
      {
        "index": 3,
        "name": "rifle_fire",
        "minTime": 0,
        "maxTime": 0.3
      },
      {
        "index": 4,
        "name": "pistol_idle",
        "minTime": 0,
        "maxTime": 1.266667
      },
      {
        "index": 5,
        "name": "pistol_jump_2",
        "minTime": 0,
        "maxTime": 0.833333
      },
      {
        "index": 6,
        "name": "pistol_jump",
        "minTime": 0,
        "maxTime": 2.033333
      },
      {
        "index": 7,
        "name": "pistol_kneel_to_stand",
        "minTime": 0,
        "maxTime": 1.4
      },
      {
        "index": 8,
        "name": "pistol_kneeling_idle",
        "minTime": 0,
        "maxTime": 3.833333
      },
      {
        "index": 9,
        "name": "pistol_run_arc_2",
        "minTime": 0,
        "maxTime": 0.666667
      },
      {
        "index": 10,
        "name": "pistol_run_arc",
        "minTime": 0,
        "maxTime": 0.6
      },
      {
        "index": 11,
        "name": "pistol_run_backward_arc_2",
        "minTime": 0,
        "maxTime": 0.533333
      },
      {
        "index": 12,
        "name": "pistol_run_backward_arc",
        "minTime": 0,
        "maxTime": 0.533333
      },
      {
        "index": 13,
        "name": "pistol_run_backward",
        "minTime": 0,
        "maxTime": 0.566667
      },
      {
        "index": 14,
        "name": "pistol_run",
        "minTime": 0,
        "maxTime": 0.533333
      },
      {
        "index": 15,
        "name": "pistol_stand_to_kneel",
        "minTime": 0,
        "maxTime": 1
      },
      {
        "index": 16,
        "name": "pistol_strafe_2",
        "minTime": 0,
        "maxTime": 0.6
      },
      {
        "index": 17,
        "name": "pistol_strafe",
        "minTime": 0,
        "maxTime": 0.6
      },
      {
        "index": 18,
        "name": "pistol_walk_arc_2",
        "minTime": 0,
        "maxTime": 0.8
      },
      {
        "index": 19,
        "name": "pistol_walk_arc",
        "minTime": 0,
        "maxTime": 0.766667
      },
      {
        "index": 20,
        "name": "pistol_walk_backward_arc_2",
        "minTime": 0,
        "maxTime": 0.633333
      },
      {
        "index": 21,
        "name": "pistol_walk_backward_arc",
        "minTime": 0,
        "maxTime": 0.6
      },
      {
        "index": 22,
        "name": "pistol_walk_backward",
        "minTime": 0,
        "maxTime": 1.033333
      },
      {
        "index": 23,
        "name": "pistol_walk",
        "minTime": 0,
        "maxTime": 0.833333
      }
    ],
    "nodes": [
      {
        "index": 0,
        "name": "mixamorig:HeadTop_End",
        "depth": 7,
        "parentIndex": 1,
        "parentName": "mixamorig:Head",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 1,
        "name": "mixamorig:Head",
        "depth": 6,
        "parentIndex": 2,
        "parentName": "mixamorig:Neck",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 2,
        "name": "mixamorig:Neck",
        "depth": 5,
        "parentIndex": 27,
        "parentName": "mixamorig:Spine2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 3,
        "name": "mixamorig:LeftHandThumb4",
        "depth": 12,
        "parentIndex": 4,
        "parentName": "mixamorig:LeftHandThumb3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 4,
        "name": "mixamorig:LeftHandThumb3",
        "depth": 11,
        "parentIndex": 5,
        "parentName": "mixamorig:LeftHandThumb2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 5,
        "name": "mixamorig:LeftHandThumb2",
        "depth": 10,
        "parentIndex": 6,
        "parentName": "mixamorig:LeftHandThumb1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 6,
        "name": "mixamorig:LeftHandThumb1",
        "depth": 9,
        "parentIndex": 11,
        "parentName": "mixamorig:LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 7,
        "name": "mixamorig:LeftHandIndex4",
        "depth": 12,
        "parentIndex": 8,
        "parentName": "mixamorig:LeftHandIndex3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 8,
        "name": "mixamorig:LeftHandIndex3",
        "depth": 11,
        "parentIndex": 9,
        "parentName": "mixamorig:LeftHandIndex2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 9,
        "name": "mixamorig:LeftHandIndex2",
        "depth": 10,
        "parentIndex": 10,
        "parentName": "mixamorig:LeftHandIndex1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 10,
        "name": "mixamorig:LeftHandIndex1",
        "depth": 9,
        "parentIndex": 11,
        "parentName": "mixamorig:LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 11,
        "name": "mixamorig:LeftHand",
        "depth": 8,
        "parentIndex": 12,
        "parentName": "mixamorig:LeftForeArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 12,
        "name": "mixamorig:LeftForeArm",
        "depth": 7,
        "parentIndex": 13,
        "parentName": "mixamorig:LeftArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 13,
        "name": "mixamorig:LeftArm",
        "depth": 6,
        "parentIndex": 14,
        "parentName": "mixamorig:LeftShoulder",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 14,
        "name": "mixamorig:LeftShoulder",
        "depth": 5,
        "parentIndex": 27,
        "parentName": "mixamorig:Spine2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 15,
        "name": "mixamorig:RightHandThumb4",
        "depth": 12,
        "parentIndex": 16,
        "parentName": "mixamorig:RightHandThumb3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 16,
        "name": "mixamorig:RightHandThumb3",
        "depth": 11,
        "parentIndex": 17,
        "parentName": "mixamorig:RightHandThumb2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 17,
        "name": "mixamorig:RightHandThumb2",
        "depth": 10,
        "parentIndex": 18,
        "parentName": "mixamorig:RightHandThumb1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 18,
        "name": "mixamorig:RightHandThumb1",
        "depth": 9,
        "parentIndex": 23,
        "parentName": "mixamorig:RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 19,
        "name": "mixamorig:RightHandIndex4",
        "depth": 12,
        "parentIndex": 20,
        "parentName": "mixamorig:RightHandIndex3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 20,
        "name": "mixamorig:RightHandIndex3",
        "depth": 11,
        "parentIndex": 21,
        "parentName": "mixamorig:RightHandIndex2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 21,
        "name": "mixamorig:RightHandIndex2",
        "depth": 10,
        "parentIndex": 22,
        "parentName": "mixamorig:RightHandIndex1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 22,
        "name": "mixamorig:RightHandIndex1",
        "depth": 9,
        "parentIndex": 23,
        "parentName": "mixamorig:RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 23,
        "name": "mixamorig:RightHand",
        "depth": 8,
        "parentIndex": 24,
        "parentName": "mixamorig:RightForeArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 24,
        "name": "mixamorig:RightForeArm",
        "depth": 7,
        "parentIndex": 25,
        "parentName": "mixamorig:RightArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 25,
        "name": "mixamorig:RightArm",
        "depth": 6,
        "parentIndex": 26,
        "parentName": "mixamorig:RightShoulder",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 26,
        "name": "mixamorig:RightShoulder",
        "depth": 5,
        "parentIndex": 27,
        "parentName": "mixamorig:Spine2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 27,
        "name": "mixamorig:Spine2",
        "depth": 4,
        "parentIndex": 28,
        "parentName": "mixamorig:Spine1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 28,
        "name": "mixamorig:Spine1",
        "depth": 3,
        "parentIndex": 29,
        "parentName": "mixamorig:Spine",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 29,
        "name": "mixamorig:Spine",
        "depth": 2,
        "parentIndex": 40,
        "parentName": "mixamorig:Hips",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 30,
        "name": "mixamorig:LeftToe_End",
        "depth": 6,
        "parentIndex": 31,
        "parentName": "mixamorig:LeftToeBase",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 31,
        "name": "mixamorig:LeftToeBase",
        "depth": 5,
        "parentIndex": 32,
        "parentName": "mixamorig:LeftFoot",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 32,
        "name": "mixamorig:LeftFoot",
        "depth": 4,
        "parentIndex": 33,
        "parentName": "mixamorig:LeftLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 33,
        "name": "mixamorig:LeftLeg",
        "depth": 3,
        "parentIndex": 34,
        "parentName": "mixamorig:LeftUpLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 34,
        "name": "mixamorig:LeftUpLeg",
        "depth": 2,
        "parentIndex": 40,
        "parentName": "mixamorig:Hips",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 35,
        "name": "mixamorig:RightToe_End",
        "depth": 6,
        "parentIndex": 36,
        "parentName": "mixamorig:RightToeBase",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 36,
        "name": "mixamorig:RightToeBase",
        "depth": 5,
        "parentIndex": 37,
        "parentName": "mixamorig:RightFoot",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 37,
        "name": "mixamorig:RightFoot",
        "depth": 4,
        "parentIndex": 38,
        "parentName": "mixamorig:RightLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 38,
        "name": "mixamorig:RightLeg",
        "depth": 3,
        "parentIndex": 39,
        "parentName": "mixamorig:RightUpLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 39,
        "name": "mixamorig:RightUpLeg",
        "depth": 2,
        "parentIndex": 40,
        "parentName": "mixamorig:Hips",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 40,
        "name": "mixamorig:Hips",
        "depth": 1,
        "parentIndex": 42,
        "parentName": "Armature",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 41,
        "name": "Player_Mixamo_Unrigged_Rest",
        "depth": 1,
        "parentIndex": 42,
        "parentName": "Armature",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "Aphase1basebody_idle_Aphase1basebody.001",
        "bbox": {
          "min": [
            -34.60995101928711,
            -0.9482915997505188,
            -9.562601089477539
          ],
          "max": [
            34.61101150512695,
            68.64217376708984,
            9.56065845489502
          ],
          "size": [
            69.22096252441406,
            69.59046536684036,
            19.12325954437256
          ]
        },
        "skinIndex": 0
      },
      {
        "index": 42,
        "name": "Armature",
        "depth": 0,
        "parentIndex": null,
        "parentName": "ROOT",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      }
    ],
    "skins": [
      {
        "name": "Armature",
        "inverseBindMatrices": 12,
        "joints": [
          40,
          29,
          28,
          27,
          2,
          1,
          0,
          14,
          13,
          12,
          11,
          6,
          5,
          4,
          3,
          10,
          9,
          8,
          7,
          26,
          25,
          24,
          23,
          18,
          17,
          16,
          15,
          22,
          21,
          20,
          19,
          34,
          33,
          32,
          31,
          30,
          39,
          38,
          37,
          36,
          35
        ]
      }
    ]
  },
  "humanoid-optimized.glb": {
    "label": "Humanoid Drone (exact saved F90 equipped pose)",
    "materialsCount": 4,
    "texturesCount": 12,
    "imagesCount": 12,
    "animations": [],
    "nodes": [
      {
        "index": 0,
        "name": "humanoid",
        "depth": 0,
        "parentIndex": null,
        "parentName": "ROOT",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 1,
        "name": "Armature",
        "depth": 1,
        "parentIndex": 0,
        "parentName": "humanoid",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 2,
        "name": "mixamorig_Hips",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 3,
        "name": "mixamorig_Spine",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "mixamorig_Hips",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 4,
        "name": "mixamorig_Spine1",
        "depth": 4,
        "parentIndex": 3,
        "parentName": "mixamorig_Spine",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 5,
        "name": "mixamorig_Spine2",
        "depth": 5,
        "parentIndex": 4,
        "parentName": "mixamorig_Spine1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 6,
        "name": "mixamorig_Neck",
        "depth": 6,
        "parentIndex": 5,
        "parentName": "mixamorig_Spine2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 7,
        "name": "mixamorig_Head",
        "depth": 7,
        "parentIndex": 6,
        "parentName": "mixamorig_Neck",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 8,
        "name": "mixamorig_LeftShoulder",
        "depth": 6,
        "parentIndex": 5,
        "parentName": "mixamorig_Spine2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 9,
        "name": "mixamorig_LeftArm",
        "depth": 7,
        "parentIndex": 8,
        "parentName": "mixamorig_LeftShoulder",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 10,
        "name": "mixamorig_LeftForeArm",
        "depth": 8,
        "parentIndex": 9,
        "parentName": "mixamorig_LeftArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 11,
        "name": "mixamorig_LeftHand",
        "depth": 9,
        "parentIndex": 10,
        "parentName": "mixamorig_LeftForeArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 12,
        "name": "mixamorig_LeftHandThumb1",
        "depth": 10,
        "parentIndex": 11,
        "parentName": "mixamorig_LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 13,
        "name": "mixamorig_LeftHandThumb2",
        "depth": 11,
        "parentIndex": 12,
        "parentName": "mixamorig_LeftHandThumb1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 14,
        "name": "mixamorig_LeftHandThumb3",
        "depth": 12,
        "parentIndex": 13,
        "parentName": "mixamorig_LeftHandThumb2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 15,
        "name": "mixamorig_LeftHandIndex1",
        "depth": 10,
        "parentIndex": 11,
        "parentName": "mixamorig_LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 16,
        "name": "mixamorig_LeftHandIndex2",
        "depth": 11,
        "parentIndex": 15,
        "parentName": "mixamorig_LeftHandIndex1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 17,
        "name": "mixamorig_LeftHandIndex3",
        "depth": 12,
        "parentIndex": 16,
        "parentName": "mixamorig_LeftHandIndex2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 18,
        "name": "mixamorig_LeftHandMiddle1",
        "depth": 10,
        "parentIndex": 11,
        "parentName": "mixamorig_LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 19,
        "name": "mixamorig_LeftHandMiddle2",
        "depth": 11,
        "parentIndex": 18,
        "parentName": "mixamorig_LeftHandMiddle1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 20,
        "name": "mixamorig_LeftHandMiddle3",
        "depth": 12,
        "parentIndex": 19,
        "parentName": "mixamorig_LeftHandMiddle2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 21,
        "name": "mixamorig_LeftHandRing1",
        "depth": 10,
        "parentIndex": 11,
        "parentName": "mixamorig_LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 22,
        "name": "mixamorig_LeftHandRing2",
        "depth": 11,
        "parentIndex": 21,
        "parentName": "mixamorig_LeftHandRing1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 23,
        "name": "mixamorig_LeftHandRing3",
        "depth": 12,
        "parentIndex": 22,
        "parentName": "mixamorig_LeftHandRing2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 24,
        "name": "mixamorig_LeftHandPinky1",
        "depth": 10,
        "parentIndex": 11,
        "parentName": "mixamorig_LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 25,
        "name": "mixamorig_LeftHandPinky2",
        "depth": 11,
        "parentIndex": 24,
        "parentName": "mixamorig_LeftHandPinky1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 26,
        "name": "mixamorig_LeftHandPinky3",
        "depth": 12,
        "parentIndex": 25,
        "parentName": "mixamorig_LeftHandPinky2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 27,
        "name": "mixamorig_RightShoulder",
        "depth": 6,
        "parentIndex": 5,
        "parentName": "mixamorig_Spine2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 28,
        "name": "mixamorig_RightArm",
        "depth": 7,
        "parentIndex": 27,
        "parentName": "mixamorig_RightShoulder",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 29,
        "name": "mixamorig_RightForeArm",
        "depth": 8,
        "parentIndex": 28,
        "parentName": "mixamorig_RightArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 30,
        "name": "mixamorig_RightHand",
        "depth": 9,
        "parentIndex": 29,
        "parentName": "mixamorig_RightForeArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 31,
        "name": "mixamorig_RightHandThumb1",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 32,
        "name": "mixamorig_RightHandThumb2",
        "depth": 11,
        "parentIndex": 31,
        "parentName": "mixamorig_RightHandThumb1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 33,
        "name": "mixamorig_RightHandThumb3",
        "depth": 12,
        "parentIndex": 32,
        "parentName": "mixamorig_RightHandThumb2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 34,
        "name": "mixamorig_RightHandIndex1",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 35,
        "name": "mixamorig_RightHandIndex2",
        "depth": 11,
        "parentIndex": 34,
        "parentName": "mixamorig_RightHandIndex1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 36,
        "name": "mixamorig_RightHandIndex3",
        "depth": 12,
        "parentIndex": 35,
        "parentName": "mixamorig_RightHandIndex2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 37,
        "name": "mixamorig_RightHandMiddle1",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 38,
        "name": "mixamorig_RightHandMiddle2",
        "depth": 11,
        "parentIndex": 37,
        "parentName": "mixamorig_RightHandMiddle1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 39,
        "name": "mixamorig_RightHandMiddle3",
        "depth": 12,
        "parentIndex": 38,
        "parentName": "mixamorig_RightHandMiddle2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 40,
        "name": "mixamorig_RightHandRing1",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 41,
        "name": "mixamorig_RightHandRing2",
        "depth": 11,
        "parentIndex": 40,
        "parentName": "mixamorig_RightHandRing1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 42,
        "name": "mixamorig_RightHandRing3",
        "depth": 12,
        "parentIndex": 41,
        "parentName": "mixamorig_RightHandRing2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 43,
        "name": "mixamorig_RightHandPinky1",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 44,
        "name": "mixamorig_RightHandPinky2",
        "depth": 11,
        "parentIndex": 43,
        "parentName": "mixamorig_RightHandPinky1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 45,
        "name": "mixamorig_RightHandPinky3",
        "depth": 12,
        "parentIndex": 44,
        "parentName": "mixamorig_RightHandPinky2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 46,
        "name": "mixamorig_LeftUpLeg",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "mixamorig_Hips",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 47,
        "name": "mixamorig_LeftLeg",
        "depth": 4,
        "parentIndex": 46,
        "parentName": "mixamorig_LeftUpLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 48,
        "name": "mixamorig_LeftFoot",
        "depth": 5,
        "parentIndex": 47,
        "parentName": "mixamorig_LeftLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 49,
        "name": "mixamorig_LeftToeBase",
        "depth": 6,
        "parentIndex": 48,
        "parentName": "mixamorig_LeftFoot",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 50,
        "name": "mixamorig_RightUpLeg",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "mixamorig_Hips",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 51,
        "name": "mixamorig_RightLeg",
        "depth": 4,
        "parentIndex": 50,
        "parentName": "mixamorig_RightUpLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 52,
        "name": "mixamorig_RightFoot",
        "depth": 5,
        "parentIndex": 51,
        "parentName": "mixamorig_RightLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 53,
        "name": "mixamorig_RightToeBase",
        "depth": 6,
        "parentIndex": 52,
        "parentName": "mixamorig_RightFoot",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 54,
        "name": "mesh",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "cEsXQckEQVWg-mbDmWDdNTYz2_mesh",
        "bbox": {
          "min": [
            -0.9997674226760864,
            -1.1612815856933594,
            -0.20503760874271393
          ],
          "max": [
            0.9998247027397156,
            0.8722943067550659,
            0.23432959616184235
          ],
          "size": [
            1.999592125415802,
            2.0335758924484253,
            0.4393672049045563
          ]
        },
        "skinIndex": 0
      },
      {
        "index": 55,
        "name": "f90",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 56,
        "name": "SK_Rif_F90",
        "depth": 11,
        "parentIndex": 55,
        "parentName": "f90",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 57,
        "name": "Object_305",
        "depth": 12,
        "parentIndex": 56,
        "parentName": "SK_Rif_F90",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 58,
        "name": "_rootJoint",
        "depth": 13,
        "parentIndex": 57,
        "parentName": "Object_305",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 59,
        "name": "J_Gun_0151",
        "depth": 14,
        "parentIndex": 58,
        "parentName": "_rootJoint",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 60,
        "name": "tag_mag_01_0152",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 61,
        "name": "tag_mag_01_bullets_0153",
        "depth": 16,
        "parentIndex": 60,
        "parentName": "tag_mag_01_0152",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 62,
        "name": "tag_mag_01_bullets_Socket_0154",
        "depth": 17,
        "parentIndex": 61,
        "parentName": "tag_mag_01_bullets_0153",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 63,
        "name": "tag_mag_01_bullets_Socket_end_0373",
        "depth": 18,
        "parentIndex": 62,
        "parentName": "tag_mag_01_bullets_Socket_0154",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 64,
        "name": "tag_mag_01_Socket_0155",
        "depth": 16,
        "parentIndex": 60,
        "parentName": "tag_mag_01_0152",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 65,
        "name": "tag_mag_01_Socket_end_0374",
        "depth": 17,
        "parentIndex": 64,
        "parentName": "tag_mag_01_Socket_0155",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 66,
        "name": "tag_mag_02_0156",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 67,
        "name": "tag_mag_02_bullets_0157",
        "depth": 16,
        "parentIndex": 66,
        "parentName": "tag_mag_02_0156",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 68,
        "name": "tag_mag_02_bullets_Socket_0158",
        "depth": 17,
        "parentIndex": 67,
        "parentName": "tag_mag_02_bullets_0157",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 69,
        "name": "tag_mag_02_bullets_Socket_end_0375",
        "depth": 18,
        "parentIndex": 68,
        "parentName": "tag_mag_02_bullets_Socket_0158",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 70,
        "name": "tag_mag_02_Socket_0159",
        "depth": 16,
        "parentIndex": 66,
        "parentName": "tag_mag_02_0156",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 71,
        "name": "tag_mag_02_Socket_end_0376",
        "depth": 17,
        "parentIndex": 70,
        "parentName": "tag_mag_02_Socket_0159",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 72,
        "name": "tag_brass_0160",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 73,
        "name": "tag_brass_end_0377",
        "depth": 16,
        "parentIndex": 72,
        "parentName": "tag_brass_0160",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 74,
        "name": "tag_bolt_0161",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 75,
        "name": "tag_bolt_end_0378",
        "depth": 16,
        "parentIndex": 74,
        "parentName": "tag_bolt_0161",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 76,
        "name": "tag_charginghandle_0162",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 77,
        "name": "tag_charginghandle_end_0379",
        "depth": 16,
        "parentIndex": 76,
        "parentName": "tag_charginghandle_0162",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 78,
        "name": "tag_boltcatch_0163",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 79,
        "name": "tag_boltcatch_end_0380",
        "depth": 16,
        "parentIndex": 78,
        "parentName": "tag_boltcatch_0163",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 80,
        "name": "tag_sight_0164",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 81,
        "name": "tag_sight_rear_0165",
        "depth": 16,
        "parentIndex": 80,
        "parentName": "tag_sight_0164",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 82,
        "name": "tag_sight_rear_flip_0166",
        "depth": 17,
        "parentIndex": 81,
        "parentName": "tag_sight_rear_0165",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 83,
        "name": "tag_sight_rear_flip_end_0381",
        "depth": 18,
        "parentIndex": 82,
        "parentName": "tag_sight_rear_flip_0166",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 84,
        "name": "tag_sight_front_0167",
        "depth": 16,
        "parentIndex": 80,
        "parentName": "tag_sight_0164",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 85,
        "name": "tag_sight_front_flip_0168",
        "depth": 17,
        "parentIndex": 84,
        "parentName": "tag_sight_front_0167",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 86,
        "name": "tag_sight_front_flip_end_0382",
        "depth": 18,
        "parentIndex": 85,
        "parentName": "tag_sight_front_flip_0168",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 87,
        "name": "tag_shroud_0149",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 88,
        "name": "tag_barrel_1_0170",
        "depth": 16,
        "parentIndex": 87,
        "parentName": "tag_shroud_0149",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 89,
        "name": "tag_barrel_2_0171",
        "depth": 17,
        "parentIndex": 88,
        "parentName": "tag_barrel_1_0170",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 90,
        "name": "tag_muzzle_0172",
        "depth": 18,
        "parentIndex": 89,
        "parentName": "tag_barrel_2_0171",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 91,
        "name": "tag_muzzle_end_0383",
        "depth": 19,
        "parentIndex": 90,
        "parentName": "tag_muzzle_0172",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 92,
        "name": "tag_trigger_0173",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 93,
        "name": "tag_fireselector_0174",
        "depth": 16,
        "parentIndex": 92,
        "parentName": "tag_trigger_0173",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 94,
        "name": "tag_fireselector_end_0384",
        "depth": 17,
        "parentIndex": 93,
        "parentName": "tag_fireselector_0174",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 95,
        "name": "tag_mag_release_0175",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 96,
        "name": "tag_mag_release_end_0385",
        "depth": 16,
        "parentIndex": 95,
        "parentName": "tag_mag_release_0175",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 97,
        "name": "tag_mag_release_2_0176",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 98,
        "name": "tag_mag_release_2_end_0386",
        "depth": 16,
        "parentIndex": 97,
        "parentName": "tag_mag_release_2_0176",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 99,
        "name": "Reflex_Socket_0177",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 100,
        "name": "Reflex_Socket_end_0387",
        "depth": 16,
        "parentIndex": 99,
        "parentName": "Reflex_Socket_0177",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 101,
        "name": "EXPS3_socket_0178",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 102,
        "name": "EXPS3_socket_end_0388",
        "depth": 16,
        "parentIndex": 101,
        "parentName": "EXPS3_socket_0178",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 103,
        "name": "MicroT2Raised_Socket_0179",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 104,
        "name": "MicroT2Raised_Socket_end_0369",
        "depth": 16,
        "parentIndex": 103,
        "parentName": "MicroT2Raised_Socket_0179",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 105,
        "name": "M5B_Socket_0180",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 106,
        "name": "M5B_Socket_end_0390",
        "depth": 16,
        "parentIndex": 105,
        "parentName": "M5B_Socket_0180",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 107,
        "name": "sdr_Socket_0181",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 108,
        "name": "sdr_Socket_end_0391",
        "depth": 16,
        "parentIndex": 107,
        "parentName": "sdr_Socket_0181",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 109,
        "name": "atac_Socket_0182",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 110,
        "name": "atac_Socket_end_0392",
        "depth": 16,
        "parentIndex": 109,
        "parentName": "atac_Socket_0182",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 111,
        "name": "foregrip_socket_0183",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 112,
        "name": "foregrip_socket_end_0393",
        "depth": 16,
        "parentIndex": 111,
        "parentName": "foregrip_socket_0183",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 113,
        "name": "combat_grip_0184",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 114,
        "name": "combat_grip_end_0394",
        "depth": 16,
        "parentIndex": 113,
        "parentName": "combat_grip_0184",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 115,
        "name": "socom338_socket_0185",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 116,
        "name": "socom338_socket_end_0395",
        "depth": 16,
        "parentIndex": 115,
        "parentName": "socom338_socket_0185",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 117,
        "name": "sfmb_socket_0186",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 118,
        "name": "sfmb_socket_end_0396",
        "depth": 16,
        "parentIndex": 117,
        "parentName": "sfmb_socket_0186",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 119,
        "name": "asr_socket_0187",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 120,
        "name": "asr_socket_end_0397",
        "depth": 16,
        "parentIndex": 119,
        "parentName": "asr_socket_0187",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 121,
        "name": "mault_socket_0188",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 122,
        "name": "mault_socket_end_0398",
        "depth": 16,
        "parentIndex": 121,
        "parentName": "mault_socket_0188",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 123,
        "name": "light_3_socket_0169",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 124,
        "name": "light_3_socket_end_0399",
        "depth": 16,
        "parentIndex": 123,
        "parentName": "light_3_socket_0169",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 125,
        "name": "laser_socket_0190",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 126,
        "name": "laser_socket_end_0400",
        "depth": 16,
        "parentIndex": 125,
        "parentName": "laser_socket_0190",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 127,
        "name": "pointer_socket_0191",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 128,
        "name": "pointer_socket_end_0401",
        "depth": 16,
        "parentIndex": 127,
        "parentName": "pointer_socket_0191",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 129,
        "name": "rk1_socket_0192",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 130,
        "name": "rk1_socket_end_0402",
        "depth": 16,
        "parentIndex": 129,
        "parentName": "rk1_socket_0192",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 131,
        "name": "HS510C_socket_0193",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 132,
        "name": "HS510C_socket_end_0403",
        "depth": 16,
        "parentIndex": 131,
        "parentName": "HS510C_socket_0193",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 133,
        "name": "Bossxe_socket_0194",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 134,
        "name": "Bossxe_socket_end_0404",
        "depth": 16,
        "parentIndex": 133,
        "parentName": "Bossxe_socket_0194",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 135,
        "name": "mrohd_socket_0195",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 136,
        "name": "mrohd_socket_end_0405",
        "depth": 16,
        "parentIndex": 135,
        "parentName": "mrohd_socket_0195",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 137,
        "name": "peak_socket_0196",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 138,
        "name": "peak_socket_end_0406",
        "depth": 16,
        "parentIndex": 137,
        "parentName": "peak_socket_0196",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 139,
        "name": "45degree_socket_0197",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 140,
        "name": "45degree_socket_end_0407",
        "depth": 16,
        "parentIndex": 139,
        "parentName": "45degree_socket_0197",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 141,
        "name": "light_wml_socket_0198",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 142,
        "name": "light_wml_socket_end_0408",
        "depth": 16,
        "parentIndex": 141,
        "parentName": "light_wml_socket_0198",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 143,
        "name": "Object_392",
        "depth": 13,
        "parentIndex": 57,
        "parentName": "Object_305",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "Sketchfab_Scene_SK_Rif_F90_001_F90_MI_0",
        "bbox": {
          "min": [
            -4.170221328735352,
            -1.2483859062194824,
            -128.45327758789062
          ],
          "max": [
            13.939324378967285,
            5.797146797180176,
            -56.21105194091797
          ],
          "size": [
            18.109545707702637,
            7.045532703399658,
            72.24222564697266
          ]
        },
        "skinIndex": 1
      },
      {
        "index": 144,
        "name": "Object_393",
        "depth": 13,
        "parentIndex": 57,
        "parentName": "Object_305",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "Sketchfab_Scene_SK_Rif_F90_001_F90_Sights_MI_0",
        "bbox": {
          "min": [
            -8.275442123413086,
            0.38817596435546875,
            -104.52784729003906
          ],
          "max": [
            -3.619201421737671,
            3.956744909286499,
            -73.75106811523438
          ],
          "size": [
            4.656240701675415,
            3.5685689449310303,
            30.776779174804688
          ]
        },
        "skinIndex": 1
      },
      {
        "index": 145,
        "name": "Object_391",
        "depth": 13,
        "parentIndex": 57,
        "parentName": "Object_305",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 146,
        "name": "F90_Mag_Static",
        "depth": 12,
        "parentIndex": 56,
        "parentName": "SK_Rif_F90",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 147,
        "name": "F90_Mag_Static_001",
        "depth": 13,
        "parentIndex": 146,
        "parentName": "F90_Mag_Static",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 148,
        "name": "F90_Mag_Static_001_F90_MAG_MI_0",
        "depth": 14,
        "parentIndex": 147,
        "parentName": "F90_Mag_Static_001",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "Sketchfab_Scene_F90_Mag_Static_001_F90_MAG_MI_0",
        "bbox": {
          "min": [
            -1.2764484882354736,
            -5.524354934692383,
            -15.310718536376953
          ],
          "max": [
            1.3227689266204834,
            2.9604787826538086,
            4.623813629150391
          ],
          "size": [
            2.599217414855957,
            8.484833717346191,
            19.934532165527344
          ]
        }
      }
    ],
    "skins": [
      {
        "name": "Skin",
        "inverseBindMatrices": 29,
        "joints": [
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26,
          27,
          28,
          29,
          30,
          31,
          32,
          33,
          34,
          35,
          36,
          37,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          46,
          47,
          48,
          49,
          50,
          51,
          52,
          53
        ]
      },
      {
        "name": "Skin6",
        "inverseBindMatrices": 30,
        "joints": [
          58,
          59,
          60,
          61,
          62,
          63,
          64,
          65,
          66,
          67,
          68,
          69,
          70,
          71,
          72,
          73,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          82,
          83,
          84,
          85,
          86,
          87,
          88,
          89,
          90,
          91,
          92,
          93,
          94,
          95,
          96,
          97,
          98,
          99,
          100,
          101,
          102,
          103,
          104,
          105,
          106,
          107,
          108,
          109,
          110,
          111,
          112,
          113,
          114,
          115,
          116,
          117,
          118,
          119,
          120,
          121,
          122,
          123,
          124,
          125,
          126,
          127,
          128,
          129,
          130,
          131,
          132,
          133,
          134,
          135,
          136,
          137,
          138,
          139,
          140,
          141,
          142
        ]
      }
    ]
  },
  "quadcopter_bmb-optimized.glb": {
    "label": "Bomber Drone",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "quadcopter_bmb", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "body", "depth": 1, "parentIndex": 0, "parentName": "quadcopter_bmb", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 2,
        "name": "body_mesh",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "body",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_21",
        "bbox": { "min": [-9.4944, 0.0133, -7.7905], "max": [9.4944, 6.6615, 8.2817], "size": [18.9889, 6.6482, 16.0722] }
      },
      { "index": 3, "name": "props", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "propFR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 5,
        "name": "prop_mesh",
        "depth": 4,
        "parentIndex": 4,
        "parentName": "propFR",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_53",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 6, "name": "propFL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 7,
        "name": "prop_mesh2",
        "depth": 4,
        "parentIndex": 6,
        "parentName": "propFL",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_532",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 8, "name": "propBL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 9,
        "name": "prop_mesh3",
        "depth": 4,
        "parentIndex": 8,
        "parentName": "propBL",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_533",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 10, "name": "propBR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 11,
        "name": "prop_mesh4",
        "depth": 4,
        "parentIndex": 10,
        "parentName": "propBR",
        "hasMesh": true,
        "meshIndex": 4,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_534",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 12, "name": "lights", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 13,
        "name": "light_mesh",
        "depth": 3,
        "parentIndex": 12,
        "parentName": "lights",
        "hasMesh": true,
        "meshIndex": 5,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_mesh",
        "bbox": { "min": [-5e-4, -5e-4, -5e-4], "max": [1.0462, 1e-3, 5e-4], "size": [1.0467, 15e-4, 1e-3] }
      },
      { "index": 14, "name": "bomb", "depth": 1, "parentIndex": 0, "parentName": "quadcopter_bmb", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 15,
        "name": "bomb_mesh",
        "depth": 2,
        "parentIndex": 14,
        "parentName": "bomb",
        "hasMesh": true,
        "meshIndex": 6,
        "meshName": "Sketchfab_Scene_Object_0",
        "bbox": { "min": [-3.3828, -6.2923, -0.0687], "max": [3.7808, 4.5211, 3.4544], "size": [7.1636, 10.8133, 3.5231] }
      }
    ],
    "skins": []
  },
  "quadcopter_cam-optimized.glb": {
    "label": "Recon Drone",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "quadcopter_cam", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "body", "depth": 1, "parentIndex": 0, "parentName": "quadcopter_cam", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 2,
        "name": "body_mesh",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "body",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_21",
        "bbox": { "min": [-9.4944, 0.0133, -7.7905], "max": [9.4944, 6.6615, 8.2817], "size": [18.9889, 6.6482, 16.0722] }
      },
      { "index": 3, "name": "props", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "propFR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 5,
        "name": "prop_mesh",
        "depth": 4,
        "parentIndex": 4,
        "parentName": "propFR",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_53",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 6, "name": "propFL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 7,
        "name": "prop_mesh2",
        "depth": 4,
        "parentIndex": 6,
        "parentName": "propFL",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_532",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 8, "name": "propBL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 9,
        "name": "prop_mesh3",
        "depth": 4,
        "parentIndex": 8,
        "parentName": "propBL",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_533",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 10, "name": "propBR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 11,
        "name": "prop_mesh4",
        "depth": 4,
        "parentIndex": 10,
        "parentName": "propBR",
        "hasMesh": true,
        "meshIndex": 4,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_534",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 12, "name": "lights", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 13,
        "name": "light_mesh",
        "depth": 3,
        "parentIndex": 12,
        "parentName": "lights",
        "hasMesh": true,
        "meshIndex": 5,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_mesh",
        "bbox": { "min": [-5e-4, -5e-4, -5e-4], "max": [1.0462, 1e-3, 5e-4], "size": [1.0467, 15e-4, 1e-3] }
      },
      { "index": 14, "name": "cam", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 15,
        "name": "cam_mesh",
        "depth": 3,
        "parentIndex": 14,
        "parentName": "cam",
        "hasMesh": true,
        "meshIndex": 6,
        "meshName": "quadcopter_camera (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_29",
        "bbox": { "min": [-1.1086, 0.1822, 2.565], "max": [1.1104, 2.3026, 5.905], "size": [2.219, 2.1204, 3.34] }
      }
    ],
    "skins": []
  },
  "quadcopter_rifle-optimized.glb": {
    "label": "Rotary Shooter",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "quadcopter_rifle", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "body", "depth": 1, "parentIndex": 0, "parentName": "quadcopter_rifle", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 2,
        "name": "body_mesh",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "body",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_21",
        "bbox": { "min": [-9.4944, 0.0133, -7.7905], "max": [9.4944, 6.6615, 8.2817], "size": [18.9889, 6.6482, 16.0722] }
      },
      { "index": 3, "name": "props", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "propFR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 5,
        "name": "prop_mesh",
        "depth": 4,
        "parentIndex": 4,
        "parentName": "propFR",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_53",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 6, "name": "propFL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 7,
        "name": "prop_mesh2",
        "depth": 4,
        "parentIndex": 6,
        "parentName": "propFL",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_532",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 8, "name": "propBL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 9,
        "name": "prop_mesh3",
        "depth": 4,
        "parentIndex": 8,
        "parentName": "propBL",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_533",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 10, "name": "propBR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 11,
        "name": "prop_mesh4",
        "depth": 4,
        "parentIndex": 10,
        "parentName": "propBR",
        "hasMesh": true,
        "meshIndex": 4,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_534",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 12, "name": "gun", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 13,
        "name": "rifle_mesh",
        "depth": 3,
        "parentIndex": 12,
        "parentName": "gun",
        "hasMesh": true,
        "meshIndex": 5,
        "meshName": "quadcopter_rifle (1)_Sketchfab_Scene_defaultMaterial4",
        "bbox": { "min": [-0.5053, -5.9669, -0.8553], "max": [0.5804, 3.1963, 1.0521], "size": [1.0858, 9.1632, 1.9073] }
      },
      { "index": 14, "name": "lights", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 15,
        "name": "light_mesh",
        "depth": 3,
        "parentIndex": 14,
        "parentName": "lights",
        "hasMesh": true,
        "meshIndex": 6,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_mesh",
        "bbox": { "min": [-5e-4, -5e-4, -5e-4], "max": [1.0462, 1e-3, 5e-4], "size": [1.0467, 15e-4, 1e-3] }
      }
    ],
    "skins": []
  },
  "uav-optimized.glb": {
    "label": "Fixed Wing",
    "materialsCount": 6,
    "texturesCount": 4,
    "imagesCount": 4,
    "animations": [
      { "index": 0, "name": "RQ-180_1_rigAction", "minTime": 0, "maxTime": 25 }
    ],
    "nodes": [
      { "index": 0, "name": "UAV", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "RQ-180_1_master", "depth": 1, "parentIndex": 0, "parentName": "UAV", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 2, "name": "RQ-180_1_rig", "depth": 2, "parentIndex": 1, "parentName": "RQ-180_1_master", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "Root", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "suspension", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 5, "name": "elevator L", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 6, "name": "elevator R", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 7, "name": "aileron L", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 8, "name": "aileron R", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 9, "name": "cover F", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 10, "name": "cover L", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 11, "name": "cover R", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 12, "name": "cover bay 1", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 13, "name": "cover bay 2", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 14, "name": "wheel F", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 15, "name": "wheel L", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 16, "name": "wheel R", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 17, "name": "cover bay L 1", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 18, "name": "cover bay R 1", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 19, "name": "cover bay L 2", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 20, "name": "cover bay R 2", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 21,
        "name": "UAV_mesh",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "RQ-180_1_rig",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "fixed_wing_drone_animated_recon_fixed-wing_Plane",
        "bbox": { "min": [-10.8321, -0.0276, -20.1513], "max": [7.7046, 4.4305, 19.8686], "size": [18.5367, 4.4581, 40.0199] },
        "skinIndex": 0
      }
    ],
    "skins": [
      {
        "name": "Skin",
        "inverseBindMatrices": 32,
        "joints": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      }
    ]
  },
  "ugv-optimized.glb": {
    "label": "Wheeled Drone",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "UGV", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "Body", "depth": 1, "parentIndex": 0, "parentName": "UGV", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 2,
        "name": "Chassis_mesh",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Body",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_Sketchfab_Scene_Cube_BASE_0",
        "bbox": { "min": [-1.9835, -1.5944, -0.5455], "max": [2.7386, 1.5197, 1.438], "size": [4.7221, 3.114, 1.9835] }
      },
      { "index": 3, "name": "FrontAxel", "depth": 2, "parentIndex": 1, "parentName": "Body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 4,
        "name": "FrontAxel_mesh",
        "depth": 3,
        "parentIndex": 3,
        "parentName": "FrontAxel",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_Sketchfab_Scene_Cylinder_005_Tires_0",
        "bbox": { "min": [-0.6816, -2.1612, -0.6765], "max": [0.685, 2.1612, 0.6765], "size": [1.3666, 4.3223, 1.3531] }
      },
      { "index": 5, "name": "BackAxel", "depth": 2, "parentIndex": 1, "parentName": "Body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 6,
        "name": "BackAxel_mesh",
        "depth": 3,
        "parentIndex": 5,
        "parentName": "BackAxel",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_Sketchfab_Scene_Cylinder_005_Tires_02",
        "bbox": { "min": [-0.6816, -2.1612, -0.6765], "max": [0.685, 2.1612, 0.6765], "size": [1.3666, 4.3223, 1.3531] }
      },
      { "index": 7, "name": "Turret", "depth": 2, "parentIndex": 1, "parentName": "Body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 8,
        "name": "TurretPole_mesh",
        "depth": 3,
        "parentIndex": 7,
        "parentName": "Turret",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_ceramic_pot_1k_PRL_CERAMIC_POT_COMBINED",
        "bbox": { "min": [-0.9113, -9e-4, -0.8398], "max": [0.3281, 0.992, 0.663], "size": [1.2394, 0.9929, 1.5028] }
      },
      { "index": 9, "name": "gun", "depth": 3, "parentIndex": 7, "parentName": "Turret", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 10,
        "name": "MountedGun_mesh",
        "depth": 4,
        "parentIndex": 9,
        "parentName": "gun",
        "hasMesh": true,
        "meshIndex": 4,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_modular_metal_gutter_1k_Cylinder_069",
        "bbox": { "min": [-0.3418, -1.1602, -0.2618], "max": [0.22, 1.6959, 0.0976], "size": [0.5618, 2.8561, 0.3593] }
      },
      { "index": 11, "name": "barrel", "depth": 4, "parentIndex": 9, "parentName": "gun", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 12,
        "name": "Barrel_mesh",
        "depth": 5,
        "parentIndex": 11,
        "parentName": "barrel",
        "hasMesh": true,
        "meshIndex": 5,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_Sketchfab_Scene_Object_4",
        "bbox": { "min": [-4.4872, 0.2561, -0.7093], "max": [3.3277, 0.9108, 0.3874], "size": [7.8149, 0.6547, 1.0967] }
      }
    ],
    "skins": []
  },
  "robodog-optimized.glb": {
    "label": "Robodog",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [
      {
        "index": 0,
        "name": "0LXN",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 1,
        "name": "0LXP",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 2,
        "name": "0LYN",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 3,
        "name": "0LYP",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 4,
        "name": "0RXN",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 5,
        "name": "0RXP",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 6,
        "name": "0RYN",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 7,
        "name": "0RYP",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 8,
        "name": "1Idle",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 9,
        "name": "1LXN",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 10,
        "name": "1LXP",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 11,
        "name": "1LYN",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 12,
        "name": "1LYP",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 13,
        "name": "1RXN",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 14,
        "name": "1RXP",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 15,
        "name": "1RYN",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 16,
        "name": "1RYP",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 17,
        "name": "Playing",
        "minTime": 0,
        "maxTime": 2.6666665077209473
      },
      {
        "index": 18,
        "name": "RESET",
        "minTime": 0,
        "maxTime": 0
      }
    ],
    "nodes": [
      {
        "index": 0,
        "name": "robodog",
        "depth": 0,
        "parentIndex": null,
        "parentName": "ROOT",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 1,
        "name": "Armature_30",
        "depth": 1,
        "parentIndex": 0,
        "parentName": "robodog",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 2,
        "name": "BodyBone_25",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature_30",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 3,
        "name": "HipBRBone_5",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "BodyBone_25",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 4,
        "name": "ThighBRBone_3",
        "depth": 4,
        "parentIndex": 3,
        "parentName": "HipBRBone_5",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 5,
        "name": "CalfBRBone_1",
        "depth": 5,
        "parentIndex": 4,
        "parentName": "ThighBRBone_3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 6,
        "name": "CalfBR_0",
        "depth": 6,
        "parentIndex": 5,
        "parentName": "CalfBRBone_1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 7,
        "name": "Object_9",
        "depth": 7,
        "parentIndex": 6,
        "parentName": "CalfBR_0",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 8,
        "name": "Object_93",
        "depth": 8,
        "parentIndex": 7,
        "parentName": "Object_9",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 9,
        "name": "Object_933",
        "depth": 9,
        "parentIndex": 8,
        "parentName": "Object_93",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 10,
        "name": "Object_9333",
        "depth": 10,
        "parentIndex": 9,
        "parentName": "Object_933",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 11,
        "name": "ThighBR_2",
        "depth": 5,
        "parentIndex": 4,
        "parentName": "ThighBRBone_3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 12,
        "name": "Object_11",
        "depth": 6,
        "parentIndex": 11,
        "parentName": "ThighBR_2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 13,
        "name": "Object_113",
        "depth": 7,
        "parentIndex": 12,
        "parentName": "Object_11",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 14,
        "name": "Object_1133",
        "depth": 8,
        "parentIndex": 13,
        "parentName": "Object_113",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 15,
        "name": "Object_11333",
        "depth": 9,
        "parentIndex": 14,
        "parentName": "Object_1133",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 16,
        "name": "HipBR_4",
        "depth": 4,
        "parentIndex": 3,
        "parentName": "HipBRBone_5",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 17,
        "name": "Object_13",
        "depth": 5,
        "parentIndex": 16,
        "parentName": "HipBR_4",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 18,
        "name": "Object_133",
        "depth": 6,
        "parentIndex": 17,
        "parentName": "Object_13",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 19,
        "name": "Object_1333",
        "depth": 7,
        "parentIndex": 18,
        "parentName": "Object_133",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 20,
        "name": "Object_13333",
        "depth": 8,
        "parentIndex": 19,
        "parentName": "Object_1333",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 21,
        "name": "Object_14",
        "depth": 5,
        "parentIndex": 16,
        "parentName": "HipBR_4",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 22,
        "name": "Object_143",
        "depth": 6,
        "parentIndex": 21,
        "parentName": "Object_14",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 23,
        "name": "Object_1433",
        "depth": 7,
        "parentIndex": 22,
        "parentName": "Object_143",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 24,
        "name": "Object_14333",
        "depth": 8,
        "parentIndex": 23,
        "parentName": "Object_1433",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 25,
        "name": "HipFRBone_11",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "BodyBone_25",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 26,
        "name": "ThighFRBone_9",
        "depth": 4,
        "parentIndex": 25,
        "parentName": "HipFRBone_11",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 27,
        "name": "CalfFRBone_7",
        "depth": 5,
        "parentIndex": 26,
        "parentName": "ThighFRBone_9",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 28,
        "name": "CalfFR_6",
        "depth": 6,
        "parentIndex": 27,
        "parentName": "CalfFRBone_7",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 29,
        "name": "Object_19",
        "depth": 7,
        "parentIndex": 28,
        "parentName": "CalfFR_6",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 30,
        "name": "Object_193",
        "depth": 8,
        "parentIndex": 29,
        "parentName": "Object_19",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 31,
        "name": "Object_1933",
        "depth": 9,
        "parentIndex": 30,
        "parentName": "Object_193",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 32,
        "name": "Object_19333",
        "depth": 10,
        "parentIndex": 31,
        "parentName": "Object_1933",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 33,
        "name": "ThighFR_8",
        "depth": 5,
        "parentIndex": 26,
        "parentName": "ThighFRBone_9",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 34,
        "name": "Object_21",
        "depth": 6,
        "parentIndex": 33,
        "parentName": "ThighFR_8",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 35,
        "name": "Object_213",
        "depth": 7,
        "parentIndex": 34,
        "parentName": "Object_21",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 36,
        "name": "Object_2133",
        "depth": 8,
        "parentIndex": 35,
        "parentName": "Object_213",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 37,
        "name": "Object_21333",
        "depth": 9,
        "parentIndex": 36,
        "parentName": "Object_2133",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 38,
        "name": "HipFR_10",
        "depth": 4,
        "parentIndex": 25,
        "parentName": "HipFRBone_11",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 39,
        "name": "Object_23",
        "depth": 5,
        "parentIndex": 38,
        "parentName": "HipFR_10",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 40,
        "name": "Object_233",
        "depth": 6,
        "parentIndex": 39,
        "parentName": "Object_23",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 41,
        "name": "Object_2333",
        "depth": 7,
        "parentIndex": 40,
        "parentName": "Object_233",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 42,
        "name": "Object_23333",
        "depth": 8,
        "parentIndex": 41,
        "parentName": "Object_2333",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 43,
        "name": "Object_24",
        "depth": 5,
        "parentIndex": 38,
        "parentName": "HipFR_10",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 44,
        "name": "Object_243",
        "depth": 6,
        "parentIndex": 43,
        "parentName": "Object_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 45,
        "name": "Object_2433",
        "depth": 7,
        "parentIndex": 44,
        "parentName": "Object_243",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 46,
        "name": "Object_24333",
        "depth": 8,
        "parentIndex": 45,
        "parentName": "Object_2433",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 47,
        "name": "HipBLBone_17",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "BodyBone_25",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 48,
        "name": "ThighBLBone_15",
        "depth": 4,
        "parentIndex": 47,
        "parentName": "HipBLBone_17",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 49,
        "name": "CalfBLBone_13",
        "depth": 5,
        "parentIndex": 48,
        "parentName": "ThighBLBone_15",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 50,
        "name": "CalfBL_12",
        "depth": 6,
        "parentIndex": 49,
        "parentName": "CalfBLBone_13",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 51,
        "name": "Object_29",
        "depth": 7,
        "parentIndex": 50,
        "parentName": "CalfBL_12",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 52,
        "name": "Object_293",
        "depth": 8,
        "parentIndex": 51,
        "parentName": "Object_29",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 53,
        "name": "Object_2933",
        "depth": 9,
        "parentIndex": 52,
        "parentName": "Object_293",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 54,
        "name": "Object_29333",
        "depth": 10,
        "parentIndex": 53,
        "parentName": "Object_2933",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 55,
        "name": "ThighBL_14",
        "depth": 5,
        "parentIndex": 48,
        "parentName": "ThighBLBone_15",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 56,
        "name": "Object_31",
        "depth": 6,
        "parentIndex": 55,
        "parentName": "ThighBL_14",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 57,
        "name": "Object_313",
        "depth": 7,
        "parentIndex": 56,
        "parentName": "Object_31",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 58,
        "name": "Object_3133",
        "depth": 8,
        "parentIndex": 57,
        "parentName": "Object_313",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 59,
        "name": "Object_31333",
        "depth": 9,
        "parentIndex": 58,
        "parentName": "Object_3133",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 60,
        "name": "HipBL_16",
        "depth": 4,
        "parentIndex": 47,
        "parentName": "HipBLBone_17",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 61,
        "name": "Object_33",
        "depth": 5,
        "parentIndex": 60,
        "parentName": "HipBL_16",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 62,
        "name": "Object_333",
        "depth": 6,
        "parentIndex": 61,
        "parentName": "Object_33",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 63,
        "name": "Object_3333",
        "depth": 7,
        "parentIndex": 62,
        "parentName": "Object_333",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 64,
        "name": "Object_33333",
        "depth": 8,
        "parentIndex": 63,
        "parentName": "Object_3333",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 65,
        "name": "Object_34",
        "depth": 5,
        "parentIndex": 60,
        "parentName": "HipBL_16",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 66,
        "name": "Object_343",
        "depth": 6,
        "parentIndex": 65,
        "parentName": "Object_34",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 67,
        "name": "Object_3433",
        "depth": 7,
        "parentIndex": 66,
        "parentName": "Object_343",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 68,
        "name": "Object_34333",
        "depth": 8,
        "parentIndex": 67,
        "parentName": "Object_3433",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 69,
        "name": "HipFLBone_23",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "BodyBone_25",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 70,
        "name": "ThighFLBone_21",
        "depth": 4,
        "parentIndex": 69,
        "parentName": "HipFLBone_23",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 71,
        "name": "CalfFLBone_19",
        "depth": 5,
        "parentIndex": 70,
        "parentName": "ThighFLBone_21",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 72,
        "name": "CalfFL_18",
        "depth": 6,
        "parentIndex": 71,
        "parentName": "CalfFLBone_19",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 73,
        "name": "Object_39",
        "depth": 7,
        "parentIndex": 72,
        "parentName": "CalfFL_18",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 74,
        "name": "Object_393",
        "depth": 8,
        "parentIndex": 73,
        "parentName": "Object_39",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 75,
        "name": "Object_3933",
        "depth": 9,
        "parentIndex": 74,
        "parentName": "Object_393",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 76,
        "name": "Object_39333",
        "depth": 10,
        "parentIndex": 75,
        "parentName": "Object_3933",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 77,
        "name": "ThighFL_20",
        "depth": 5,
        "parentIndex": 70,
        "parentName": "ThighFLBone_21",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 78,
        "name": "Object_41",
        "depth": 6,
        "parentIndex": 77,
        "parentName": "ThighFL_20",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 79,
        "name": "Object_413",
        "depth": 7,
        "parentIndex": 78,
        "parentName": "Object_41",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 80,
        "name": "Object_4133",
        "depth": 8,
        "parentIndex": 79,
        "parentName": "Object_413",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 81,
        "name": "Object_41333",
        "depth": 9,
        "parentIndex": 80,
        "parentName": "Object_4133",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 82,
        "name": "HipFL_22",
        "depth": 4,
        "parentIndex": 69,
        "parentName": "HipFLBone_23",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 83,
        "name": "Object_43",
        "depth": 5,
        "parentIndex": 82,
        "parentName": "HipFL_22",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 84,
        "name": "Object_433",
        "depth": 6,
        "parentIndex": 83,
        "parentName": "Object_43",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 85,
        "name": "Object_4333",
        "depth": 7,
        "parentIndex": 84,
        "parentName": "Object_433",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 86,
        "name": "Object_43333",
        "depth": 8,
        "parentIndex": 85,
        "parentName": "Object_4333",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 87,
        "name": "Object_44",
        "depth": 5,
        "parentIndex": 82,
        "parentName": "HipFL_22",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 88,
        "name": "Object_443",
        "depth": 6,
        "parentIndex": 87,
        "parentName": "Object_44",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 89,
        "name": "Object_4433",
        "depth": 7,
        "parentIndex": 88,
        "parentName": "Object_443",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 90,
        "name": "Object_44333",
        "depth": 8,
        "parentIndex": 89,
        "parentName": "Object_4433",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 91,
        "name": "Trunk_24",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "BodyBone_25",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 92,
        "name": "Object_46",
        "depth": 4,
        "parentIndex": 91,
        "parentName": "Trunk_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 93,
        "name": "Object_463",
        "depth": 5,
        "parentIndex": 92,
        "parentName": "Object_46",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 94,
        "name": "holder_mesh",
        "depth": 6,
        "parentIndex": 93,
        "parentName": "Object_463",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 95,
        "name": "holder_mesh3",
        "depth": 7,
        "parentIndex": 94,
        "parentName": "holder_mesh",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 96,
        "name": "holder_mesh33",
        "depth": 8,
        "parentIndex": 95,
        "parentName": "holder_mesh3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 97,
        "name": "Object_4633",
        "depth": 6,
        "parentIndex": 93,
        "parentName": "Object_463",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 98,
        "name": "Object_46333",
        "depth": 7,
        "parentIndex": 97,
        "parentName": "Object_4633",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 99,
        "name": "riflestand",
        "depth": 5,
        "parentIndex": 92,
        "parentName": "Object_46",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 100,
        "name": "mag_mesh",
        "depth": 6,
        "parentIndex": 99,
        "parentName": "riflestand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 101,
        "name": "mag_mesh3",
        "depth": 7,
        "parentIndex": 100,
        "parentName": "mag_mesh",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 102,
        "name": "mag_mesh33",
        "depth": 8,
        "parentIndex": 101,
        "parentName": "mag_mesh3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 103,
        "name": "rifle_mesh",
        "depth": 6,
        "parentIndex": 99,
        "parentName": "riflestand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 104,
        "name": "rifle_mesh3",
        "depth": 7,
        "parentIndex": 103,
        "parentName": "rifle_mesh",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 105,
        "name": "rifle_mesh33",
        "depth": 8,
        "parentIndex": 104,
        "parentName": "rifle_mesh3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 106,
        "name": "Object_47",
        "depth": 4,
        "parentIndex": 91,
        "parentName": "Trunk_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 107,
        "name": "Object_473",
        "depth": 5,
        "parentIndex": 106,
        "parentName": "Object_47",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 108,
        "name": "Object_4733",
        "depth": 6,
        "parentIndex": 107,
        "parentName": "Object_473",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 109,
        "name": "Object_47333",
        "depth": 7,
        "parentIndex": 108,
        "parentName": "Object_4733",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 110,
        "name": "Object_48",
        "depth": 4,
        "parentIndex": 91,
        "parentName": "Trunk_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 111,
        "name": "Object_483",
        "depth": 5,
        "parentIndex": 110,
        "parentName": "Object_48",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 112,
        "name": "Object_4833",
        "depth": 6,
        "parentIndex": 111,
        "parentName": "Object_483",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 113,
        "name": "Object_48333",
        "depth": 7,
        "parentIndex": 112,
        "parentName": "Object_4833",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 114,
        "name": "Object_49",
        "depth": 4,
        "parentIndex": 91,
        "parentName": "Trunk_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 115,
        "name": "Object_493",
        "depth": 5,
        "parentIndex": 114,
        "parentName": "Object_49",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 116,
        "name": "Object_4933",
        "depth": 6,
        "parentIndex": 115,
        "parentName": "Object_493",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 117,
        "name": "Object_49333",
        "depth": 7,
        "parentIndex": 116,
        "parentName": "Object_4933",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 118,
        "name": "Object_50",
        "depth": 4,
        "parentIndex": 91,
        "parentName": "Trunk_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 119,
        "name": "Object_503",
        "depth": 5,
        "parentIndex": 118,
        "parentName": "Object_50",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 120,
        "name": "Object_5033",
        "depth": 6,
        "parentIndex": 119,
        "parentName": "Object_503",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 121,
        "name": "Object_50333",
        "depth": 7,
        "parentIndex": 120,
        "parentName": "Object_5033",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 122,
        "name": "FootBRBone_26",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature_30",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 123,
        "name": "FootFRBone_27",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature_30",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 124,
        "name": "FootFLBone_28",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature_30",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 125,
        "name": "FootBLBone_29",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature_30",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 126,
        "name": "Object_93333",
        "depth": 11,
        "parentIndex": 10,
        "parentName": "Object_9333",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_0",
        "bbox": {
          "min": [
            -0.0227,
            -0.2353,
            -0.0202
          ],
          "max": [
            0.0316,
            0.0313,
            0.0202
          ],
          "size": [
            0.0543,
            0.2665,
            0.0404
          ]
        }
      },
      {
        "index": 127,
        "name": "Object_113333",
        "depth": 10,
        "parentIndex": 15,
        "parentName": "Object_11333",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_1",
        "bbox": {
          "min": [
            -0.047,
            -0.228,
            -0.0162
          ],
          "max": [
            0.047,
            0.049,
            0.0617
          ],
          "size": [
            0.0941,
            0.277,
            0.0779
          ]
        }
      },
      {
        "index": 128,
        "name": "Object_133333",
        "depth": 9,
        "parentIndex": 20,
        "parentName": "Object_13333",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_2",
        "bbox": {
          "min": [
            -0.0565,
            -0.0481,
            -0.0345
          ],
          "max": [
            0.031,
            0.0481,
            0.0193
          ],
          "size": [
            0.0875,
            0.0962,
            0.0538
          ]
        }
      },
      {
        "index": 129,
        "name": "Object_143333",
        "depth": 9,
        "parentIndex": 24,
        "parentName": "Object_14333",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_3",
        "bbox": {
          "min": [
            -0.0482,
            -0.0463,
            -0.015
          ],
          "max": [
            0.0482,
            0.0463,
            0.011
          ],
          "size": [
            0.0964,
            0.0925,
            0.026
          ]
        }
      },
      {
        "index": 130,
        "name": "Object_193333",
        "depth": 11,
        "parentIndex": 32,
        "parentName": "Object_19333",
        "hasMesh": true,
        "meshIndex": 4,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_02",
        "bbox": {
          "min": [
            -0.0227,
            -0.2353,
            -0.0202
          ],
          "max": [
            0.0316,
            0.0313,
            0.0202
          ],
          "size": [
            0.0543,
            0.2665,
            0.0404
          ]
        }
      },
      {
        "index": 131,
        "name": "Object_213333",
        "depth": 10,
        "parentIndex": 37,
        "parentName": "Object_21333",
        "hasMesh": true,
        "meshIndex": 5,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_12",
        "bbox": {
          "min": [
            -0.047,
            -0.228,
            -0.0162
          ],
          "max": [
            0.047,
            0.049,
            0.0617
          ],
          "size": [
            0.0941,
            0.277,
            0.0779
          ]
        }
      },
      {
        "index": 132,
        "name": "Object_233333",
        "depth": 9,
        "parentIndex": 42,
        "parentName": "Object_23333",
        "hasMesh": true,
        "meshIndex": 6,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_22",
        "bbox": {
          "min": [
            -0.0565,
            -0.0481,
            -0.0345
          ],
          "max": [
            0.031,
            0.0481,
            0.0193
          ],
          "size": [
            0.0875,
            0.0962,
            0.0538
          ]
        }
      },
      {
        "index": 133,
        "name": "Object_243333",
        "depth": 9,
        "parentIndex": 46,
        "parentName": "Object_24333",
        "hasMesh": true,
        "meshIndex": 7,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_32",
        "bbox": {
          "min": [
            -0.0482,
            -0.0463,
            -0.015
          ],
          "max": [
            0.0482,
            0.0463,
            0.011
          ],
          "size": [
            0.0964,
            0.0925,
            0.026
          ]
        }
      },
      {
        "index": 134,
        "name": "Object_293333",
        "depth": 11,
        "parentIndex": 54,
        "parentName": "Object_29333",
        "hasMesh": true,
        "meshIndex": 8,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_03",
        "bbox": {
          "min": [
            -0.0227,
            -0.2353,
            -0.0202
          ],
          "max": [
            0.0316,
            0.0313,
            0.0202
          ],
          "size": [
            0.0543,
            0.2665,
            0.0404
          ]
        }
      },
      {
        "index": 135,
        "name": "Object_313333",
        "depth": 10,
        "parentIndex": 59,
        "parentName": "Object_31333",
        "hasMesh": true,
        "meshIndex": 9,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_9",
        "bbox": {
          "min": [
            -0.047,
            -0.228,
            -0.0162
          ],
          "max": [
            0.047,
            0.049,
            0.0617
          ],
          "size": [
            0.0941,
            0.277,
            0.0779
          ]
        }
      },
      {
        "index": 136,
        "name": "Object_333333",
        "depth": 9,
        "parentIndex": 64,
        "parentName": "Object_33333",
        "hasMesh": true,
        "meshIndex": 10,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_23",
        "bbox": {
          "min": [
            -0.0565,
            -0.0481,
            -0.0345
          ],
          "max": [
            0.031,
            0.0481,
            0.0193
          ],
          "size": [
            0.0875,
            0.0962,
            0.0538
          ]
        }
      },
      {
        "index": 137,
        "name": "Object_343333",
        "depth": 9,
        "parentIndex": 68,
        "parentName": "Object_34333",
        "hasMesh": true,
        "meshIndex": 11,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_33",
        "bbox": {
          "min": [
            -0.0482,
            -0.0463,
            -0.015
          ],
          "max": [
            0.0482,
            0.0463,
            0.011
          ],
          "size": [
            0.0964,
            0.0925,
            0.026
          ]
        }
      },
      {
        "index": 138,
        "name": "Object_393333",
        "depth": 11,
        "parentIndex": 76,
        "parentName": "Object_39333",
        "hasMesh": true,
        "meshIndex": 12,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_04",
        "bbox": {
          "min": [
            -0.0227,
            -0.2353,
            -0.0202
          ],
          "max": [
            0.0316,
            0.0313,
            0.0202
          ],
          "size": [
            0.0543,
            0.2665,
            0.0404
          ]
        }
      },
      {
        "index": 139,
        "name": "Object_413333",
        "depth": 10,
        "parentIndex": 81,
        "parentName": "Object_41333",
        "hasMesh": true,
        "meshIndex": 13,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_92",
        "bbox": {
          "min": [
            -0.047,
            -0.228,
            -0.0162
          ],
          "max": [
            0.047,
            0.049,
            0.0617
          ],
          "size": [
            0.0941,
            0.277,
            0.0779
          ]
        }
      },
      {
        "index": 140,
        "name": "Object_433333",
        "depth": 9,
        "parentIndex": 86,
        "parentName": "Object_43333",
        "hasMesh": true,
        "meshIndex": 14,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_24",
        "bbox": {
          "min": [
            -0.0565,
            -0.0481,
            -0.0345
          ],
          "max": [
            0.031,
            0.0481,
            0.0193
          ],
          "size": [
            0.0875,
            0.0962,
            0.0538
          ]
        }
      },
      {
        "index": 141,
        "name": "Object_443333",
        "depth": 9,
        "parentIndex": 90,
        "parentName": "Object_44333",
        "hasMesh": true,
        "meshIndex": 15,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_34",
        "bbox": {
          "min": [
            -0.0482,
            -0.0463,
            -0.015
          ],
          "max": [
            0.0482,
            0.0463,
            0.011
          ],
          "size": [
            0.0964,
            0.0925,
            0.026
          ]
        }
      },
      {
        "index": 142,
        "name": "holder_mesh333",
        "depth": 9,
        "parentIndex": 96,
        "parentName": "holder_mesh33",
        "hasMesh": true,
        "meshIndex": 16,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_mesh",
        "bbox": {
          "min": [
            -0.05,
            -0.05,
            -0.05
          ],
          "max": [
            0.05,
            0.05,
            0.05
          ],
          "size": [
            0.1,
            0.1,
            0.1
          ]
        }
      },
      {
        "index": 143,
        "name": "Object_463333",
        "depth": 8,
        "parentIndex": 98,
        "parentName": "Object_46333",
        "hasMesh": true,
        "meshIndex": 17,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_16",
        "bbox": {
          "min": [
            -0.097,
            -0.0598,
            -0.1316
          ],
          "max": [
            0.097,
            0.0713,
            0.2993
          ],
          "size": [
            0.194,
            0.1311,
            0.4309
          ]
        }
      },
      {
        "index": 144,
        "name": "mag_mesh333",
        "depth": 9,
        "parentIndex": 102,
        "parentName": "mag_mesh33",
        "hasMesh": true,
        "meshIndex": 18,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_nodriflee3d-opt_Sketchfab_Scene_SM_Rif_SCAR_L_Mag_001_ScarMK16Mag_MI_0",
        "bbox": {
          "min": [
            -1.2846,
            -5.6811,
            -16.2429
          ],
          "max": [
            1.3641,
            2.717,
            3.4879
          ],
          "size": [
            2.6486,
            8.3981,
            19.7307
          ]
        }
      },
      {
        "index": 145,
        "name": "rifle_mesh333",
        "depth": 9,
        "parentIndex": 105,
        "parentName": "rifle_mesh33",
        "hasMesh": true,
        "meshIndex": 19,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_nodriflee3d-opt_Sketchfab_Scene_SK_Rif_SCAR_L_001_ScarMK16_MI_0",
        "bbox": {
          "min": [
            -13.2804,
            -4.3716,
            67.5446
          ],
          "max": [
            12.0154,
            3.2344,
            146.309
          ],
          "size": [
            25.2959,
            7.606,
            78.7645
          ]
        }
      },
      {
        "index": 146,
        "name": "Object_473333",
        "depth": 8,
        "parentIndex": 109,
        "parentName": "Object_47333",
        "hasMesh": true,
        "meshIndex": 20,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_17",
        "bbox": {
          "min": [
            -0.0956,
            -0.0573,
            -0.091
          ],
          "max": [
            0.0956,
            0.0249,
            0.2893
          ],
          "size": [
            0.1911,
            0.0822,
            0.3803
          ]
        }
      },
      {
        "index": 147,
        "name": "Object_483333",
        "depth": 8,
        "parentIndex": 113,
        "parentName": "Object_48333",
        "hasMesh": true,
        "meshIndex": 21,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_18",
        "bbox": {
          "min": [
            -0.0682,
            -0.0564,
            0.2512
          ],
          "max": [
            0.0128,
            0.0713,
            0.2968
          ],
          "size": [
            0.0811,
            0.1276,
            0.0455
          ]
        }
      },
      {
        "index": 148,
        "name": "Object_493333",
        "depth": 8,
        "parentIndex": 117,
        "parentName": "Object_49333",
        "hasMesh": true,
        "meshIndex": 22,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_19",
        "bbox": {
          "min": [
            -0.03,
            -0.0568,
            0.0921
          ],
          "max": [
            0.03,
            0.057,
            0.2286
          ],
          "size": [
            0.06,
            0.1138,
            0.1365
          ]
        }
      },
      {
        "index": 149,
        "name": "Object_503333",
        "depth": 8,
        "parentIndex": 121,
        "parentName": "Object_50333",
        "hasMesh": true,
        "meshIndex": 23,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_20",
        "bbox": {
          "min": [
            -0.0687,
            -0.0121,
            0.2433
          ],
          "max": [
            0.0687,
            0.0212,
            0.2549
          ],
          "size": [
            0.1373,
            0.0333,
            0.0116
          ]
        }
      }
    ],
    "skins": []
  },
  "attachments-optimized.glb": {
    "label": "Weapon Attachments",
    "materialsCount": 19,
    "texturesCount": 28,
    "imagesCount": 28,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "attachments", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "SK_Pistol_light_X300", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 7, "name": "Object_25", "depth": 3, "parentIndex": 2, "parentName": "Object_19", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_Pistol_light_X300_001_MI_Cubicle_Glass_001_0", "bbox": { "min": [101.6331, 1.7704, 45.2638], "max": [103.8522, 3.9895, 45.2638], "size": [2.2191, 2.2191, 0] } },
      { "index": 8, "name": "Object_26", "depth": 3, "parentIndex": 2, "parentName": "Object_19", "hasMesh": true, "meshIndex": 1, "meshName": "Sketchfab_Scene_SK_Pistol_light_X300_001_MI_Flashight_M600V_Inst_0", "bbox": { "min": [100.7685, 1.144, 36.3598], "max": [104.1437, 4.6159, 45.4143], "size": [3.3752, 3.4719, 9.0545] } },
      { "index": 9, "name": "SK_suppressor_gm9", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 14, "name": "Object_489", "depth": 3, "parentIndex": 10, "parentName": "Object_484", "hasMesh": true, "meshIndex": 2, "meshName": "Sketchfab_Scene_SK_suppressor_gm9_001_MI_Attachment_GM9_0", "bbox": { "min": [-2.2889, 1.4776, 34.959], "max": [0.7822, 4.5316, 54.6604], "size": [3.0711, 3.0541, 19.7015] } },
      { "index": 15, "name": "sk_optic_acog_rds", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 25, "name": "Object_510", "depth": 3, "parentIndex": 16, "parentName": "Object_500", "hasMesh": true, "meshIndex": 5, "meshName": "Sketchfab_Scene_sk_optic_acog_rds_001_MI_Optic_ACOG_0", "bbox": { "min": [-15.6546, -0.5659, -10.5698], "max": [-5.1139, 6.7521, 6.5087], "size": [10.5406, 7.318, 17.0785] } },
      { "index": 31, "name": "sk_rif_laser", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 37, "name": "Object_523", "depth": 3, "parentIndex": 32, "parentName": "Object_517", "hasMesh": true, "meshIndex": 11, "meshName": "Sketchfab_Scene_sk_rif_laser_001_MI_Laser_Rif_0", "bbox": { "min": [95.6972, -3.2101, 38.1756], "max": [101.4839, 0.5892, 47.9535], "size": [5.7868, 3.7993, 9.7779] } },
      { "index": 38, "name": "sm_optic_atacr18", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 46, "name": "Object_533", "depth": 3, "parentIndex": 39, "parentName": "Object_525", "hasMesh": true, "meshIndex": 12, "meshName": "Sketchfab_Scene_sm_optic_atacr18_001_MI_Optic_ATACR_0", "bbox": { "min": [85.7572, -0.6094, -3.7828], "max": [91.5564, 6.3694, 21.6421], "size": [5.7992, 6.9788, 25.4249] } },
      { "index": 51, "name": "Holosight_512", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 60, "name": "Object_16", "depth": 3, "parentIndex": 52, "parentName": "Object_7", "hasMesh": true, "meshIndex": 18, "meshName": "Sketchfab_Scene_Holosight_512_001_Optic_1P_HOLO_INST_0", "bbox": { "min": [-15.3733, -2.9514, 95.8976], "max": [-7.8193, 3.0559, 112.0786], "size": [7.5541, 6.0072, 16.181] } }
    ]
  },
  "brn_180-optimized.glb": {
    "label": "BRN-180 Rifle",
    "materialsCount": 2,
    "texturesCount": 6,
    "imagesCount": 6,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "BRN180", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "_rootJoint", "depth": 3, "parentIndex": 2, "parentName": "Object_219", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "J_Gun_0104", "depth": 4, "parentIndex": 3, "parentName": "_rootJoint", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 22, "name": "tag_bolt_0116", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 36, "name": "tag_muzzle_0126", "depth": 8, "parentIndex": 35, "parentName": "tag_barrel_2_0125", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 40, "name": "tag_trigger_0129", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 46, "name": "combat_grip_0132", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 50, "name": "mault_socket_0134", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 56, "name": "laser_socket_0137", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 60, "name": "EXPS3_socket_0139", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 62, "name": "MicroT2Raised_socket_0140", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 64, "name": "socom338_socket_0141", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 68, "name": "sdr_socket_0143", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 70, "name": "Reflex_Socket_0144", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 78, "name": "HS510C_socket_0148", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 84, "name": "Object_302", "depth": 3, "parentIndex": 2, "parentName": "Object_219", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_Rif_BRN180_001_MI_1P_BRN180_0", "bbox": { "min": [-108.4853, -4.6181, -32.2449], "max": [-87.0248, 2.8299, 38.7007], "size": [21.4606, 7.448, 70.9456] } }
    ]
  },
  "f_90-optimized.glb": {
    "label": "F90 Rifle",
    "materialsCount": 3,
    "texturesCount": 9,
    "imagesCount": 9,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "f90", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "_rootJoint", "depth": 3, "parentIndex": 2, "parentName": "Object_305", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "J_Gun_0151", "depth": 4, "parentIndex": 3, "parentName": "_rootJoint", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 19, "name": "tag_bolt_0161", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 35, "name": "tag_muzzle_0172", "depth": 8, "parentIndex": 34, "parentName": "tag_barrel_2_0171", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 37, "name": "tag_trigger_0173", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 44, "name": "Reflex_Socket_0177", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 46, "name": "EXPS3_socket_0178", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 48, "name": "MicroT2Raised_Socket_0179", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 52, "name": "sdr_Socket_0181", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 54, "name": "atac_Socket_0182", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 58, "name": "combat_grip_0184", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 60, "name": "socom338_socket_0185", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 66, "name": "mault_socket_0188", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 76, "name": "HS510C_socket_0193", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 88, "name": "Object_392", "depth": 3, "parentIndex": 2, "parentName": "Object_305", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_Rif_F90_001_F90_MI_0", "bbox": { "min": [-4.1702, -1.2484, -128.4533], "max": [13.9393, 5.7971, -56.2111], "size": [18.1095, 7.0455, 72.2422] } }
    ]
  },
  "hk_51-optimized.glb": {
    "label": "HK-51 Rifle",
    "materialsCount": 2,
    "texturesCount": 6,
    "imagesCount": 6,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "HK51", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "J_Gun_08", "depth": 4, "parentIndex": 3, "parentName": "_rootJoint", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 38, "name": "tag_muzzle_011", "depth": 8, "parentIndex": 37, "parentName": "tag_barrel_010", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 52, "name": "EXPS3_socket_013", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_08", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 66, "name": "Object_121", "depth": 3, "parentIndex": 2, "parentName": "Object_28", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_RIF_HK51_001_MI_1P_HK51_0", "bbox": { "min": [-92.4206, -3.8327, -25.2671], "max": [-75.4042, 3.8433, 27.6748], "size": [17.0164, 7.676, 52.9419] } }
    ]
  },
  "scar_h_mk_17-optimized.glb": {
    "label": "SCAR-H MK17",
    "materialsCount": 2,
    "texturesCount": 6,
    "imagesCount": 6,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "scar_h", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "_rootJoint", "depth": 3, "parentIndex": 2, "parentName": "Object_252", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "J_Gun_00", "depth": 4, "parentIndex": 3, "parentName": "_rootJoint", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 21, "name": "tag_bolt_063", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 35, "name": "tag_muzzle_01", "depth": 8, "parentIndex": 34, "parentName": "tag_barrel_2_01", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 41, "name": "tag_grip_075", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 45, "name": "tag_trigger_077", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 76, "name": "combat_grip_093", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 82, "name": "Object_336", "depth": 3, "parentIndex": 2, "parentName": "Object_252", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_Rif_SCARH_001_MI_1P_SCAR_H_0", "bbox": { "min": [-106.6713, -5.0298, -26.963], "max": [-86.6436, 4.4144, 46.5936], "size": [20.0277, 9.4442, 73.5566] } }
    ]
  },
  "scar_l-optimized.glb": {
    "label": "SCAR-L",
    "materialsCount": 2,
    "texturesCount": 6,
    "imagesCount": 6,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "scar_l", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "_rootJoint", "depth": 3, "parentIndex": 2, "parentName": "Object_244", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "J_Gun_00", "depth": 4, "parentIndex": 3, "parentName": "_rootJoint", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 22, "name": "tag_bolt_0211", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 35, "name": "tag_muzzle_01", "depth": 8, "parentIndex": 34, "parentName": "tag_barrel_2_01", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 40, "name": "tag_trigger_0223", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 60, "name": "combat_grip_0233", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 82, "name": "Object_328", "depth": 3, "parentIndex": 2, "parentName": "Object_244", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_Rif_SCARL_001_MI_1P_SCAR_L_0", "bbox": { "min": [-106.7725, -4.9547, -26.963], "max": [-86.6436, 4.4144, 46.5936], "size": [20.1289, 9.3691, 73.5566] } }
    ]
  }
};
Object.keys(ASSET_STRUCTURE).forEach((key) => {
  ASSET_STRUCTURE[key].fileName = key;
});

// shared/state-animation-contract.ts
var PLAYER_AVAILABLE_CLIPS = [
  "rifle_idle",
  "rifle_aim_idle",
  "rifle_run",
  "rifle_fire",
  "pistol_idle",
  "pistol_jump_2",
  "pistol_jump",
  "pistol_kneel_to_stand",
  "pistol_kneeling_idle",
  "pistol_run_arc_2",
  "pistol_run_arc",
  "pistol_run_backward_arc_2",
  "pistol_run_backward_arc",
  "pistol_run_backward",
  "pistol_run",
  "pistol_stand_to_kneel",
  "pistol_strafe_2",
  "pistol_strafe",
  "pistol_walk_arc_2",
  "pistol_walk_arc",
  "pistol_walk_backward_arc_2",
  "pistol_walk_backward_arc",
  "pistol_walk_backward",
  "pistol_walk"
];
var PLAYER_ANIMATION_CONTRACT = {
  entityType: "player",
  modelKey: "Player_one-optimized.glb",
  availableClips: PLAYER_AVAILABLE_CLIPS,
  states: [
    {
      state: "DEAD",
      classification: "TYPE_A",
      priority: 100,
      mutuallyExclusiveWith: ["FIRING", "RELOADING", "JUMPING", "SPRINTING", "WALKING", "AIM_IDLE", "IDLE"],
      output: {
        kind: "clip",
        clipName: "pistol_kneeling_idle",
        loop: false,
        crossFadeDuration: 0.2,
        clampWhenFinished: true
      },
      description: "Player health depleted; enter death pose"
    },
    {
      state: "RELOADING",
      classification: "TYPE_A",
      priority: 80,
      mutuallyExclusiveWith: ["FIRING", "DEAD"],
      output: {
        kind: "clip",
        clipName: "rifle_aim_idle",
        loop: true,
        crossFadeDuration: 0.15
      },
      description: "Active weapon reload in progress"
    },
    {
      state: "FIRING",
      classification: "TYPE_A",
      priority: 70,
      mutuallyExclusiveWith: ["RELOADING", "DEAD"],
      output: {
        kind: "clip",
        clipName: "rifle_fire",
        loop: false,
        speed: 1,
        crossFadeDuration: 0.05
      },
      description: "Primary or secondary trigger discharge"
    },
    {
      state: "JUMPING",
      classification: "TYPE_A",
      priority: 60,
      mutuallyExclusiveWith: ["DEAD", "CROUCH_IDLE", "CROUCH_WALK"],
      output: {
        kind: "clip",
        clipName: "pistol_jump",
        loop: false,
        crossFadeDuration: 0.1
      },
      description: "Player airborne from jump or falling"
    },
    {
      state: "SPRINTING",
      classification: "TYPE_A",
      priority: 50,
      mutuallyExclusiveWith: ["DEAD", "CROUCH_IDLE", "CROUCH_WALK", "AIM_IDLE", "IDLE"],
      output: {
        kind: "clip",
        clipName: "rifle_run",
        loop: true,
        speed: 1,
        crossFadeDuration: 0.2
      },
      description: "High-speed forward sprint locomotion"
    },
    {
      state: "CROUCH_WALK",
      classification: "TYPE_A",
      priority: 45,
      mutuallyExclusiveWith: ["DEAD", "SPRINTING", "JUMPING", "IDLE"],
      output: {
        kind: "clip",
        clipName: "pistol_walk",
        loop: true,
        speed: 0.7,
        crossFadeDuration: 0.2
      },
      description: "Crouched locomotion"
    },
    {
      state: "CROUCH_IDLE",
      classification: "TYPE_A",
      priority: 40,
      mutuallyExclusiveWith: ["DEAD", "SPRINTING", "JUMPING", "WALKING"],
      output: {
        kind: "clip",
        clipName: "pistol_kneeling_idle",
        loop: true,
        crossFadeDuration: 0.2
      },
      description: "Stationary crouched / kneeling stance"
    },
    {
      state: "WALKING",
      classification: "TYPE_A",
      priority: 30,
      mutuallyExclusiveWith: ["DEAD", "SPRINTING", "IDLE"],
      output: {
        kind: "clip",
        clipName: "pistol_walk",
        loop: true,
        speed: 1,
        crossFadeDuration: 0.2
      },
      description: "Standard movement speed locomotion"
    },
    {
      state: "AIM_IDLE",
      classification: "TYPE_A",
      priority: 20,
      mutuallyExclusiveWith: ["DEAD", "SPRINTING"],
      output: {
        kind: "clip",
        clipName: "rifle_aim_idle",
        loop: true,
        crossFadeDuration: 0.2
      },
      description: "Aiming down sights in stationary stance"
    },
    {
      state: "IDLE",
      classification: "TYPE_A",
      priority: 10,
      mutuallyExclusiveWith: ["DEAD", "WALKING", "SPRINTING"],
      output: {
        kind: "clip",
        clipName: "rifle_idle",
        loop: true,
        crossFadeDuration: 0.25
      },
      description: "Default relaxed upright idle stance"
    }
  ]
};
var DRONE_STATE_MAP = {
  [0 /* IDLE */]: "IDLE",
  [1 /* PATROLLING */]: "PATROLLING",
  [2 /* PURSUING */]: "PURSUING",
  [3 /* ATTACKING */]: "ATTACKING",
  [4 /* REPOSITIONING */]: "REPOSITIONING",
  [5 /* DEAD */]: "DEAD"
};
function createStandardAirDroneContract(droneType, modelKey) {
  return {
    entityType: `drone_${droneType}`,
    modelKey,
    availableClips: ["spin", "sway"],
    states: [
      {
        state: "DEAD",
        classification: "TYPE_A",
        priority: 100,
        mutuallyExclusiveWith: ["IDLE", "PATROLLING", "PURSUING", "ATTACKING", "REPOSITIONING"],
        output: { kind: "procedural", system: "propeller", intensity: 0 },
        description: "Drone destroyed; halt lift propulsion and trigger destruction visual"
      },
      {
        state: "ATTACKING",
        classification: "TYPE_A",
        priority: 80,
        output: { kind: "procedural", system: "recoil", intensity: 1 },
        description: "Weapon burst discharge with barrel/mount recoil kick"
      },
      {
        state: "PURSUING",
        classification: "TYPE_A",
        priority: 60,
        output: { kind: "procedural", system: "banking", intensity: 0.8 },
        description: "High-speed target chase with banking orientation tilt"
      },
      {
        state: "REPOSITIONING",
        classification: "TYPE_A",
        priority: 50,
        output: { kind: "procedural", system: "hoverSway", intensity: 0.6 },
        description: "Tactical evasion or flanking reposition maneuver"
      },
      {
        state: "PATROLLING",
        classification: "TYPE_A",
        priority: 30,
        output: { kind: "procedural", system: "hoverSway", intensity: 0.4 },
        description: "Waypoint navigation with gentle hover oscillation"
      },
      {
        state: "IDLE",
        classification: "TYPE_A",
        priority: 10,
        output: { kind: "procedural", system: "propeller", intensity: 0.5 },
        description: "Stationary hover awaiting sensor stimulation"
      }
    ]
  };
}
var DRONE_ANIMATION_CONTRACTS = {
  [0 /* ROTARY_SHOOTER */]: createStandardAirDroneContract(0 /* ROTARY_SHOOTER */, "rotary_shooter.glb"),
  [1 /* BOMBER */]: createStandardAirDroneContract(1 /* BOMBER */, "bomber.glb"),
  [2 /* RECON */]: createStandardAirDroneContract(2 /* RECON */, "recon.glb"),
  [3 /* FIXED_WING */]: createStandardAirDroneContract(3 /* FIXED_WING */, "fixed_wing.glb"),
  [4 /* WHEELED */]: {
    entityType: `drone_${4 /* WHEELED */}`,
    modelKey: "wheeled_drone.glb",
    availableClips: [],
    states: [
      {
        state: "DEAD",
        classification: "TYPE_A",
        priority: 100,
        output: { kind: "static", poseName: "destroyed" },
        description: "Wheeled chassis disabled"
      },
      {
        state: "ATTACKING",
        classification: "TYPE_A",
        priority: 80,
        output: { kind: "procedural", system: "recoil", intensity: 1 },
        description: "Turret cannon recoil with chassis vibration"
      },
      {
        state: "PURSUING",
        classification: "TYPE_A",
        priority: 60,
        output: { kind: "procedural", system: "wheel", intensity: 1 },
        description: "Forward drive with wheel angular roll and suspension vibration"
      },
      {
        state: "REPOSITIONING",
        classification: "TYPE_A",
        priority: 50,
        output: { kind: "procedural", system: "wheel", intensity: 0.8 },
        description: "Tactical reverse or turn pivot roll"
      },
      {
        state: "PATROLLING",
        classification: "TYPE_A",
        priority: 30,
        output: { kind: "procedural", system: "wheel", intensity: 0.5 },
        description: "Cruising patrol wheel roll"
      },
      {
        state: "IDLE",
        classification: "TYPE_A",
        priority: 10,
        output: { kind: "static", poseName: "parked" },
        description: "Engine idling, wheels locked"
      }
    ]
  },
  [5 /* ROBOT_DOG */]: {
    entityType: `drone_${5 /* ROBOT_DOG */}`,
    modelKey: "robot_dog.glb",
    availableClips: ["walk"],
    states: [
      {
        state: "DEAD",
        classification: "TYPE_A",
        priority: 100,
        output: { kind: "static", poseName: "collapsed" },
        description: "Quadruped power loss collapse"
      },
      {
        state: "ATTACKING",
        classification: "TYPE_A",
        priority: 80,
        output: { kind: "procedural", system: "recoil", intensity: 0.8 },
        description: "Spinal mounted weapon burst recoil"
      },
      {
        state: "PURSUING",
        classification: "TYPE_A",
        priority: 60,
        output: { kind: "clip", clipName: "walk", loop: true, speed: 1.5, crossFadeDuration: 0.15 },
        description: "Rapid quadruped sprint toward target"
      },
      {
        state: "REPOSITIONING",
        classification: "TYPE_A",
        priority: 50,
        output: { kind: "clip", clipName: "walk", loop: true, speed: 1, crossFadeDuration: 0.2 },
        description: "Flanking lateral gait"
      },
      {
        state: "PATROLLING",
        classification: "TYPE_A",
        priority: 30,
        output: { kind: "clip", clipName: "walk", loop: true, speed: 0.8, crossFadeDuration: 0.2 },
        description: "Stealth patrol gait"
      },
      {
        state: "IDLE",
        classification: "TYPE_A",
        priority: 10,
        output: { kind: "static", poseName: "stand_ready" },
        description: "Quadruped ready stance"
      }
    ]
  },
  [6 /* HUMANOID */]: {
    entityType: `drone_${6 /* HUMANOID */}`,
    modelKey: "humanoid-optimized.glb",
    availableClips: ["hold"],
    states: [
      {
        state: "DEAD",
        classification: "TYPE_A",
        priority: 100,
        output: { kind: "static", poseName: "hold" },
        description: "Humanoid unit deactivated"
      },
      {
        state: "ATTACKING",
        classification: "TYPE_A",
        priority: 80,
        output: { kind: "procedural", system: "recoil", intensity: 0.5 },
        description: "Rifled weapon fire recoil in equipped stance"
      },
      {
        state: "PURSUING",
        classification: "TYPE_A",
        priority: 60,
        output: { kind: "static", poseName: "hold" },
        description: "Authored equipped posture movement"
      },
      {
        state: "REPOSITIONING",
        classification: "TYPE_A",
        priority: 50,
        output: { kind: "static", poseName: "hold" },
        description: "Authored equipped posture repositioning"
      },
      {
        state: "PATROLLING",
        classification: "TYPE_A",
        priority: 30,
        output: { kind: "static", poseName: "hold" },
        description: "Authored equipped posture patrol"
      },
      {
        state: "IDLE",
        classification: "TYPE_A",
        priority: 10,
        output: { kind: "static", poseName: "hold" },
        description: "Exact saved F90 equipped stance"
      }
    ]
  },
  [99 /* TEST_ENTITY */]: {
    entityType: `drone_${99 /* TEST_ENTITY */}`,
    modelKey: void 0,
    availableClips: [],
    states: [
      {
        state: "DEAD",
        classification: "TYPE_A",
        priority: 100,
        output: { kind: "static", poseName: "inactive" },
        description: "Test entity disabled"
      },
      {
        state: "ATTACKING",
        classification: "TYPE_A",
        priority: 80,
        output: { kind: "static", poseName: "active" },
        description: "Test entity attacking"
      },
      {
        state: "PURSUING",
        classification: "TYPE_A",
        priority: 60,
        output: { kind: "static", poseName: "active" },
        description: "Test entity chasing"
      },
      {
        state: "REPOSITIONING",
        classification: "TYPE_A",
        priority: 50,
        output: { kind: "static", poseName: "active" },
        description: "Test entity repositioning"
      },
      {
        state: "PATROLLING",
        classification: "TYPE_A",
        priority: 30,
        output: { kind: "static", poseName: "active" },
        description: "Test entity patrolling"
      },
      {
        state: "IDLE",
        classification: "TYPE_A",
        priority: 10,
        output: { kind: "static", poseName: "active" },
        description: "Test entity idle"
      }
    ]
  }
};
function validateEntityAnimationContracts() {
  const errors = [];
  const warnings = [];
  const playerClips = new Set(PLAYER_ANIMATION_CONTRACT.availableClips);
  for (const stateMapping of PLAYER_ANIMATION_CONTRACT.states) {
    if (stateMapping.output.kind === "clip") {
      if (!playerClips.has(stateMapping.output.clipName)) {
        errors.push(`Player contract state '${stateMapping.state}' references unlisted clip '${stateMapping.output.clipName}'`);
      }
    }
  }
  const requiredDroneStates = [
    0 /* IDLE */,
    1 /* PATROLLING */,
    2 /* PURSUING */,
    3 /* ATTACKING */,
    4 /* REPOSITIONING */,
    5 /* DEAD */
  ];
  const allDroneTypes = [
    0 /* ROTARY_SHOOTER */,
    1 /* BOMBER */,
    2 /* RECON */,
    3 /* FIXED_WING */,
    4 /* WHEELED */,
    5 /* ROBOT_DOG */,
    6 /* HUMANOID */,
    99 /* TEST_ENTITY */
  ];
  for (const droneType of allDroneTypes) {
    const contract = DRONE_ANIMATION_CONTRACTS[droneType];
    if (!contract) {
      errors.push(`Missing animation contract for DroneType ${droneType}`);
      continue;
    }
    const coveredStates = new Set(contract.states.map((s) => s.state));
    for (const dState of requiredDroneStates) {
      const stateKey = DRONE_STATE_MAP[dState];
      if (!coveredStates.has(stateKey)) {
        errors.push(`DroneType ${droneType} is missing state mapping for '${stateKey}' (DroneState.${DroneState[dState]})`);
      }
    }
    if (contract.modelKey && ASSET_STRUCTURE[contract.modelKey]) {
      const assetMeta = ASSET_STRUCTURE[contract.modelKey];
      const modelClipNames = new Set(assetMeta.animations.map((a) => a.name));
      for (const stateMapping of contract.states) {
        if (stateMapping.output.kind === "clip") {
          if (!modelClipNames.has(stateMapping.output.clipName)) {
            if (!contract.availableClips.includes(stateMapping.output.clipName)) {
              warnings.push(`DroneType ${droneType} state '${stateMapping.state}' references clip '${stateMapping.output.clipName}' not found in ${contract.modelKey}`);
            }
          }
        }
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// shared/maps/map-registry.ts
var MAP_REGISTRY = [
  {
    id: "map_0_dev",
    displayName: "Dev Map",
    specFile: null,
    assetDirectory: null,
    version: "0.0.1",
    isDevMap: true
  },
  {
    id: "map_1_facility",
    displayName: "VEXEA Facility 01",
    specFile: "shared/maps/map_1_facility.spec.json",
    assetDirectory: "client/public/assets/maps/map_1/",
    version: "0.1.0",
    isDevMap: false
  }
];
function getMapById(id) {
  return MAP_REGISTRY.find((m) => m.id === id);
}

// server/map/ZoneRegistry.ts
var ZoneRegistry = class {
  constructor() {
    this.restrictedGates = [];
    this.zoneBoundsMap = /* @__PURE__ */ new Map();
    this.initDefaultZoneBounds();
  }
  initDefaultZoneBounds() {
    for (const [zoneKey, bounds] of Object.entries(ZONE_BOUNDS)) {
      this.zoneBoundsMap.set(zoneKey, {
        id: zoneKey,
        minX: bounds.center.x - bounds.halfSize.x,
        maxX: bounds.center.x + bounds.halfSize.x,
        minZ: bounds.center.z - bounds.halfSize.z,
        maxZ: bounds.center.z + bounds.halfSize.z
      });
    }
  }
  loadFromSpec(specJson) {
    if (specJson && Array.isArray(specJson.restrictedGates)) {
      this.restrictedGates = specJson.restrictedGates;
    }
    if (specJson && Array.isArray(specJson.zones)) {
      for (const zoneSpec of specJson.zones) {
        if (zoneSpec && zoneSpec.id && zoneSpec.bounds) {
          const b = zoneSpec.bounds;
          const minX = b.minX !== void 0 ? b.minX : b.xMin !== void 0 ? b.xMin : 0;
          const maxX = b.maxX !== void 0 ? b.maxX : b.xMax !== void 0 ? b.xMax : 0;
          const minZ = b.minZ !== void 0 ? b.minZ : b.zMin !== void 0 ? b.zMin : 0;
          const maxZ = b.maxZ !== void 0 ? b.maxZ : b.zMax !== void 0 ? b.zMax : 0;
          this.zoneBoundsMap.set(zoneSpec.id, {
            id: zoneSpec.id,
            minX,
            maxX,
            minZ,
            maxZ
          });
        }
      }
    }
  }
  isPositionInZone(zoneId, x, z) {
    const bound = this.zoneBoundsMap.get(zoneId);
    if (!bound) return false;
    return x >= bound.minX && x <= bound.maxX && z >= bound.minZ && z <= bound.maxZ;
  }
  getZoneAtPosition(x, z) {
    for (const [zoneId, bound] of this.zoneBoundsMap.entries()) {
      if (x >= bound.minX && x <= bound.maxX && z >= bound.minZ && z <= bound.maxZ) {
        return zoneId;
      }
    }
    return null;
  }
  isInRestrictedGate(x, z) {
    for (let i = 0; i < this.restrictedGates.length; i++) {
      const gate = this.restrictedGates[i];
      if (gate && gate.position) {
        const radius = typeof gate.killZoneRadius === "number" ? gate.killZoneRadius : 15;
        const dx = x - gate.position.x;
        const dz = z - gate.position.z;
        if (dx * dx + dz * dz <= radius * radius) {
          return true;
        }
      }
    }
    return false;
  }
};

// server/map/OutOfBoundsEnforcer.ts
var OutOfBoundsEnforcer = class {
  constructor() {
    this.playerOOBTime = /* @__PURE__ */ new Map();
  }
  /**
   * Ticks the out-of-bounds and restricted gate checks for all active players.
   * @param room The active MatchRoom instance.
   * @param deltaTimeMs The elapsed time since last tick in milliseconds.
   */
  tick(room, deltaTimeMs) {
    if (!room.zoneRegistry) return;
    for (const player of room.players.values()) {
      if (!player.isAlive || player.godMode) {
        this.playerOOBTime.delete(player.id);
        continue;
      }
      const inZone = room.zoneRegistry.getZoneAtPosition(player.posX, player.posZ) !== null;
      const inRestrictedGate = room.zoneRegistry.isInRestrictedGate(player.posX, player.posZ);
      if (!inZone) {
        let oobMs = this.playerOOBTime.get(player.id) || 0;
        oobMs += deltaTimeMs;
        this.playerOOBTime.set(player.id, oobMs);
        const remainingSeconds = Math.max(0, (3e3 - oobMs) / 1e3);
        if (player.channel) {
          player.channel.emit("reliable_event", {
            type: "out_of_bounds_warning",
            remainingSeconds: parseFloat(remainingSeconds.toFixed(2))
          });
        }
        if (oobMs >= 3e3) {
          const damage = 35 * (deltaTimeMs / 1e3);
          player.hp -= damage;
          if (player.hp <= 0) {
            player.hp = 0;
            this.playerOOBTime.delete(player.id);
            room.applyDamage(player.id, 9999, "fall", "0", "environment");
          } else {
            if (player.channel) {
              player.channel.emit("reliable_event", {
                type: "OOB_DAMAGE",
                damage: parseFloat(damage.toFixed(4)),
                currentHp: parseFloat(player.hp.toFixed(4))
              });
            }
          }
        }
      } else {
        this.playerOOBTime.delete(player.id);
      }
      if (inRestrictedGate) {
        const damage = 35 * (deltaTimeMs / 1e3);
        player.hp -= damage;
        if (player.hp <= 0) {
          player.hp = 0;
          room.applyDamage(player.id, 9999, "explosion", "0", "environment");
        } else {
          if (player.channel) {
            player.channel.emit("reliable_event", {
              type: "GATE_DAMAGE",
              damage: parseFloat(damage.toFixed(4)),
              currentHp: parseFloat(player.hp.toFixed(4))
            });
          }
        }
      }
    }
  }
  /**
   * Resets tracking state for a single player when they leave or respawn.
   */
  resetPlayer(playerId) {
    this.playerOOBTime.delete(playerId);
  }
  /**
   * Gets the tracked OOB time in milliseconds for a player (useful for tests).
   */
  getPlayerOOBTime(playerId) {
    return this.playerOOBTime.get(playerId) || 0;
  }
};

// shared/collision.ts
var CollisionSystem = class {
  constructor() {
    this.boxes = [];
    this.grid = /* @__PURE__ */ new Map();
    this.CELL_SIZE = 50;
  }
  getGridKey(cx, cz) {
    return (cx + 1e5) * 2e5 + (cz + 1e5);
  }
  loadFromSpec(specJson) {
    this.boxes = [];
    this.grid.clear();
    if (specJson && Array.isArray(specJson.buildings)) {
      for (let i = 0; i < specJson.buildings.length; i++) {
        const b = specJson.buildings[i];
        if (b && b.position && b.size) {
          const angleRad = b.rotation && b.rotation.y ? b.rotation.y * Math.PI / 180 : 0;
          let sizeX = b.size.x || 10;
          let sizeZ = b.size.z || 10;
          if (Math.abs(Math.sin(angleRad)) > 0.707) {
            const temp = sizeX;
            sizeX = sizeZ;
            sizeZ = temp;
          }
          const halfX = sizeX / 2;
          const halfY = (b.size.y || 10) / 2;
          const halfZ = sizeZ / 2;
          const box = {
            xMin: b.position.x - halfX,
            xMax: b.position.x + halfX,
            yMin: b.position.y,
            yMax: b.position.y + (b.size.y || 10),
            zMin: b.position.z - halfZ,
            zMax: b.position.z + halfZ
          };
          const boxIndex = this.boxes.length;
          this.boxes.push(box);
          const minCx = Math.floor(box.xMin / this.CELL_SIZE);
          const maxCx = Math.floor(box.xMax / this.CELL_SIZE);
          const minCz = Math.floor(box.zMin / this.CELL_SIZE);
          const maxCz = Math.floor(box.zMax / this.CELL_SIZE);
          for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cz = minCz; cz <= maxCz; cz++) {
              const key = this.getGridKey(cx, cz);
              let cell = this.grid.get(key);
              if (!cell) {
                cell = [];
                this.grid.set(key, cell);
              }
              cell.push(boxIndex);
            }
          }
        }
      }
    }
  }
  // Hitscan raycast vs AABB logic (Drones/Players/Walls) using Spatial Hash Grid
  rayIntersectsAny(origin, dir, maxDistance) {
    if (this.boxes.length === 0) return false;
    let cx = Math.floor(origin.x / this.CELL_SIZE);
    let cz = Math.floor(origin.z / this.CELL_SIZE);
    const stepX = dir.x > 0 ? 1 : dir.x < 0 ? -1 : 0;
    const stepZ = dir.z > 0 ? 1 : dir.z < 0 ? -1 : 0;
    const tDeltaX = dir.x !== 0 ? Math.abs(this.CELL_SIZE / dir.x) : Infinity;
    const tDeltaZ = dir.z !== 0 ? Math.abs(this.CELL_SIZE / dir.z) : Infinity;
    let tMaxX = dir.x > 0 ? ((cx + 1) * this.CELL_SIZE - origin.x) / dir.x : dir.x < 0 ? (cx * this.CELL_SIZE - origin.x) / dir.x : Infinity;
    let tMaxZ = dir.z > 0 ? ((cz + 1) * this.CELL_SIZE - origin.z) / dir.z : dir.z < 0 ? (cz * this.CELL_SIZE - origin.z) / dir.z : Infinity;
    let t = 0;
    while (t <= maxDistance) {
      const key = this.getGridKey(cx, cz);
      const cell = this.grid.get(key);
      if (cell) {
        for (let i = 0; i < cell.length; i++) {
          const boxIndex = cell[i];
          if (this.rayIntersectsAABB(origin, dir, this.boxes[boxIndex], maxDistance)) {
            return true;
          }
        }
      }
      if (tMaxX < tMaxZ) {
        t = tMaxX;
        if (t > maxDistance) break;
        cx += stepX;
        tMaxX += tDeltaX;
      } else {
        t = tMaxZ;
        if (t > maxDistance) break;
        cz += stepZ;
        tMaxZ += tDeltaZ;
      }
    }
    return false;
  }
  rayIntersectsAABB(origin, dir, box, maxDistance) {
    const oodX = dir.x !== 0 ? 1 / dir.x : 0;
    const oodY = dir.y !== 0 ? 1 / dir.y : 0;
    const oodZ = dir.z !== 0 ? 1 / dir.z : 0;
    let tmin = 0;
    let tmax = maxDistance;
    if (Math.abs(dir.x) < 1e-6) {
      if (origin.x < box.xMin || origin.x > box.xMax) return false;
    } else {
      let t1 = (box.xMin - origin.x) * oodX;
      let t2 = (box.xMax - origin.x) * oodX;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
    if (Math.abs(dir.y) < 1e-6) {
      if (origin.y < box.yMin || origin.y > box.yMax) return false;
    } else {
      let t1 = (box.yMin - origin.y) * oodY;
      let t2 = (box.yMax - origin.y) * oodY;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
    if (Math.abs(dir.z) < 1e-6) {
      if (origin.z < box.zMin || origin.z > box.zMax) return false;
    } else {
      let t1 = (box.zMin - origin.z) * oodZ;
      let t2 = (box.zMax - origin.z) * oodZ;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
    return true;
  }
};
var globalCollisionSystem = new CollisionSystem();

// server/ai/LLMCommanderFeedback.ts
var LLMCommanderFeedback = class {
  constructor() {
    this.executionBuffer = [];
    this.maxHistory = 10;
  }
  /**
   * Records the outcome of a tool execution attempt.
   */
  recordResult(toolName, args, status, reason) {
    this.executionBuffer.push({
      toolName,
      args,
      status,
      reason,
      timestamp: Date.now()
    });
    if (this.executionBuffer.length > this.maxHistory) {
      this.executionBuffer.shift();
    }
  }
  /**
   * Clears the execution buffer (e.g. at match start).
   */
  clear() {
    this.executionBuffer = [];
  }
  /**
   * Formats execution buffer records into a structured prompt block for Gemini.
   */
  formatFeedbackPromptBlock() {
    if (this.executionBuffer.length === 0) {
      return "[PREVIOUS CYCLE TOOL EXECUTION RESULTS]\nNo tool calls executed in prior cycle.\n";
    }
    let block = "[PREVIOUS CYCLE TOOL EXECUTION RESULTS]\n";
    for (let i = 0; i < this.executionBuffer.length; i++) {
      const rec = this.executionBuffer[i];
      const argsSummary = JSON.stringify(rec.args);
      if (rec.status === "SUCCESS") {
        block += `- [SUCCESS] ${rec.toolName}(${argsSummary})
`;
      } else {
        block += `- [REJECTED] ${rec.toolName}(${argsSummary}): ${rec.reason || "Operation rejected"}
`;
      }
    }
    return block + "\n";
  }
};

// server/sentry.ts
var Sentry = __toESM(require("@sentry/node"), 1);
var import_profiling_node = require("@sentry/profiling-node");

// server/flags/server-flags.ts
var DEFAULT_SERVER_FEATURE_FLAGS = {
  ["sentry_server_enabled" /* SENTRY_SERVER_ENABLED */]: true,
  ["sentry_server_traces_rate" /* SENTRY_SERVER_TRACES_RATE */]: 1,
  ["sentry_node_profiling" /* SENTRY_NODE_PROFILING */]: true,
  ["sentry_llm_tracing" /* SENTRY_LLM_TRACING */]: true,
  ["sentry_server_metrics_enabled" /* SENTRY_SERVER_METRICS_ENABLED */]: true,
  ["LLM_COMMANDER_FAMILY" /* LLM_COMMANDER_FAMILY */]: "gemini",
  ["llm_primary_model" /* LLM_PRIMARY_MODEL */]: "gemini-3.5-flash",
  ["llm_fallback_models" /* LLM_FALLBACK_MODELS */]: ["gemini-3.6-flash", "gemini-3.1-flash"],
  ["llm_token_ceiling" /* LLM_TOKEN_CEILING */]: 55e3,
  ["llm_cycle_interval_sec" /* LLM_CYCLE_INTERVAL_SEC */]: 8,
  ["llm_ap_regen_rate" /* LLM_AP_REGEN_RATE */]: 10,
  ["kimi_primary_model" /* KIMI_PRIMARY_MODEL */]: "kimi-k2.6",
  ["kimi_fallback_models" /* KIMI_FALLBACK_MODELS */]: ["kimi-k2.5"],
  ["claude_primary_model" /* CLAUDE_PRIMARY_MODEL */]: "claude-sonnet-4-6",
  ["claude_fallback_models" /* CLAUDE_FALLBACK_MODELS */]: ["claude-opus-4-8", "claude-haiku-4-5-20251001"],
  ["openai_primary_model" /* OPENAI_PRIMARY_MODEL */]: "gpt-5.6-sol",
  ["openai_fallback_models" /* OPENAI_FALLBACK_MODELS */]: ["gpt-5.6-terra"],
  ["llm_max_output_tokens_per_cycle" /* LLM_MAX_OUTPUT_TOKENS_PER_CYCLE */]: 800,
  ["llm_max_tool_calls_per_cycle" /* LLM_MAX_TOOL_CALLS_PER_CYCLE */]: 6,
  ["dossier_model_family" /* DOSSIER_MODEL_FAMILY */]: "gemini",
  ["dossier_model" /* DOSSIER_MODEL */]: "gemini-3.5-flash",
  ["dossier_fallback_models" /* DOSSIER_FALLBACK_MODELS */]: ["gemini-3.6-flash", "gemini-3.1-flash"],
  ["dossier_max_tokens_per_player" /* DOSSIER_MAX_TOKENS_PER_PLAYER */]: 200,
  ["security_exploit_logging" /* SECURITY_EXPLOIT_LOGGING */]: true
};
function getServerFlagValue(key, fallback) {
  if (key in DEFAULT_SERVER_FEATURE_FLAGS) {
    return DEFAULT_SERVER_FEATURE_FLAGS[key] ?? fallback;
  }
  return fallback;
}

// server/flags/flag-service.ts
var import_server_sdk = require("@openfeature/server-sdk");
var import_config_cat_provider = require("@openfeature/config-cat-provider");

// shared/feature-flags.ts
var SharedFeatureFlagKey = /* @__PURE__ */ ((SharedFeatureFlagKey3) => {
  SharedFeatureFlagKey3["STORE_DYNAMIC_OFFERS"] = "store_dynamic_offers";
  SharedFeatureFlagKey3["MATCH_ENERGY_COST"] = "match_energy_cost";
  SharedFeatureFlagKey3["ENERGY_REGEN_MINUTES"] = "energy_regen_minutes";
  SharedFeatureFlagKey3["ENERGY_MAX_FREE"] = "energy_max_free";
  SharedFeatureFlagKey3["AD_REWARD_ENERGY"] = "ad_reward_energy";
  SharedFeatureFlagKey3["AD_DAILY_CAP"] = "ad_daily_cap";
  SharedFeatureFlagKey3["NEW_PLAYER_STARTER_CREDITS"] = "new_player_starter_credits";
  SharedFeatureFlagKey3["NEW_PLAYER_STARTER_ENERGY"] = "new_player_starter_energy";
  SharedFeatureFlagKey3["FACTION_WAR_ACTIVE"] = "faction_war_active";
  SharedFeatureFlagKey3["BP_SEASON_ID"] = "bp_season_id";
  SharedFeatureFlagKey3["BP_TIER_COUNT"] = "bp_tier_count";
  SharedFeatureFlagKey3["BP_XP_PER_TIER"] = "bp_xp_per_tier";
  SharedFeatureFlagKey3["MATCH_DIFFICULTY_PRESET"] = "match_difficulty_preset";
  SharedFeatureFlagKey3["TELEMETRY_DESYNC_THRESHOLD"] = "telemetry_desync_threshold";
  SharedFeatureFlagKey3["FLAGS_USED_ENABLED"] = "flags_used_enabled";
  return SharedFeatureFlagKey3;
})(SharedFeatureFlagKey || {});
var FeatureFlagKey = {
  ...SharedFeatureFlagKey,
  SENTRY_CLIENT_ENABLED: "sentry_client_enabled",
  SENTRY_SERVER_ENABLED: "sentry_server_enabled"
};
var DEFAULT_SHARED_FEATURE_FLAGS = {
  ["store_dynamic_offers" /* STORE_DYNAMIC_OFFERS */]: true,
  ["match_energy_cost" /* MATCH_ENERGY_COST */]: 2,
  ["energy_regen_minutes" /* ENERGY_REGEN_MINUTES */]: 10,
  ["energy_max_free" /* ENERGY_MAX_FREE */]: 10,
  ["ad_reward_energy" /* AD_REWARD_ENERGY */]: 3,
  ["ad_daily_cap" /* AD_DAILY_CAP */]: 5,
  ["new_player_starter_credits" /* NEW_PLAYER_STARTER_CREDITS */]: 500,
  ["new_player_starter_energy" /* NEW_PLAYER_STARTER_ENERGY */]: 10,
  ["faction_war_active" /* FACTION_WAR_ACTIVE */]: true,
  ["bp_season_id" /* BP_SEASON_ID */]: "SEASON_01",
  ["bp_tier_count" /* BP_TIER_COUNT */]: 50,
  ["bp_xp_per_tier" /* BP_XP_PER_TIER */]: 10,
  ["match_difficulty_preset" /* MATCH_DIFFICULTY_PRESET */]: "STANDARD",
  ["telemetry_desync_threshold" /* TELEMETRY_DESYNC_THRESHOLD */]: 0.5,
  ["flags_used_enabled" /* FLAGS_USED_ENABLED */]: false
};
function getFeatureFlagScope(key) {
  const clientKeys = [
    "sentry_client_enabled",
    "sentry_client_traces_rate",
    "sentry_browser_profiling",
    "sentry_feedback_enabled",
    "sentry_client_metrics_enabled",
    "sentry_replay_enabled",
    "telemetry_webgpu_errors",
    "telemetry_physics_worker_latency"
  ];
  const serverKeys = [
    "sentry_server_enabled",
    "sentry_server_traces_rate",
    "sentry_node_profiling",
    "sentry_llm_tracing",
    "sentry_server_metrics_enabled",
    "LLM_COMMANDER_FAMILY",
    "llm_primary_model",
    "llm_fallback_models",
    "llm_token_ceiling",
    "llm_cycle_interval_sec",
    "llm_ap_regen_rate",
    "kimi_primary_model",
    "kimi_fallback_models",
    "claude_primary_model",
    "claude_fallback_models",
    "openai_primary_model",
    "openai_fallback_models",
    "llm_max_output_tokens_per_cycle",
    "llm_max_tool_calls_per_cycle",
    "dossier_model_family",
    "dossier_model",
    "dossier_fallback_models",
    "dossier_max_tokens_per_player",
    "security_exploit_logging"
  ];
  if (clientKeys.includes(key)) {
    return "client" /* CLIENT */;
  }
  if (serverKeys.includes(key)) {
    return "server" /* SERVER */;
  }
  return "shared" /* SHARED */;
}

// server/flags/flag-service.ts
var ServerFlagService = class _ServerFlagService {
  constructor() {
    this.isInitialized = false;
    this.serverClient = import_server_sdk.OpenFeature.getClient("server-scope");
    this.sharedClient = import_server_sdk.OpenFeature.getClient("shared-scope");
  }
  static getInstance() {
    if (!_ServerFlagService.instance) {
      _ServerFlagService.instance = new _ServerFlagService();
    }
    return _ServerFlagService.instance;
  }
  async initialize() {
    if (this.isInitialized) return;
    const serverKey = process.env.SERVER_CONFIGCAT_SDK_KEY;
    const sharedKey = process.env.SHARED_CONFIGCAT_SDK_KEY;
    if (serverKey) {
      console.log("[FlagService] Initializing Server Provider.");
      import_server_sdk.OpenFeature.setProvider("server-scope", import_config_cat_provider.ConfigCatProvider.create(serverKey));
    }
    if (sharedKey) {
      console.log("[FlagService] Initializing Shared Provider.");
      import_server_sdk.OpenFeature.setProvider("shared-scope", import_config_cat_provider.ConfigCatProvider.create(sharedKey));
    }
    this.isInitialized = true;
  }
  getClient(key) {
    const scope = getFeatureFlagScope(key);
    return scope === "server" /* SERVER */ ? this.serverClient : this.sharedClient;
  }
  getDefaultValue(key) {
    if (key in DEFAULT_SERVER_FEATURE_FLAGS) {
      return DEFAULT_SERVER_FEATURE_FLAGS[key];
    }
    if (key in DEFAULT_SHARED_FEATURE_FLAGS) {
      return DEFAULT_SHARED_FEATURE_FLAGS[key];
    }
    return void 0;
  }
  async getBoolean(key, context, fallback) {
    const defaultVal = fallback !== void 0 ? fallback : this.getDefaultValue(key) ?? false;
    return await this.getClient(key).getBooleanValue(key, defaultVal, context);
  }
  async getString(key, context, fallback) {
    const defaultVal = fallback !== void 0 ? fallback : this.getDefaultValue(key) ?? "";
    return await this.getClient(key).getStringValue(key, defaultVal, context);
  }
  async getNumber(key, context, fallback) {
    const defaultVal = fallback !== void 0 ? fallback : this.getDefaultValue(key) ?? 0;
    return await this.getClient(key).getNumberValue(key, defaultVal, context);
  }
  async getObject(key, context, fallback) {
    const defaultVal = fallback !== void 0 ? fallback : this.getDefaultValue(key);
    return await this.getClient(key).getObjectValue(key, defaultVal, context);
  }
  setFlag(key, value) {
    console.warn("[FlagService] setFlag called on ConfigCat Provider. Runtime overrides are not supported yet.");
  }
};
var serverFlagService = ServerFlagService.getInstance();

// server/sentry.ts
var isSentryInitialized = false;
async function initSentry() {
  if (process.env.VEXEA_BENCHMARK_DISABLE_SENTRY === "true") return;
  const isEnabled = await serverFlagService.getBoolean("sentry_server_enabled" /* SENTRY_SERVER_ENABLED */, void 0, true);
  if (!isEnabled) {
    console.log("[Sentry Server] Disabled via feature flag.");
    return;
  }
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }
  if (isSentryInitialized) {
    return;
  }
  const tracesSampleRate = await serverFlagService.getNumber("sentry_server_traces_rate" /* SENTRY_SERVER_TRACES_RATE */, void 0, 1);
  const enableProfiling = await serverFlagService.getBoolean("sentry_node_profiling" /* SENTRY_NODE_PROFILING */, void 0, true);
  const enableLLMTracing = await serverFlagService.getBoolean("sentry_llm_tracing" /* SENTRY_LLM_TRACING */, void 0, true);
  const integrations = [];
  if (enableProfiling) {
    integrations.push((0, import_profiling_node.nodeProfilingIntegration)());
  }
  if (enableLLMTracing && Sentry.googleGenAIIntegration) {
    integrations.push(Sentry.googleGenAIIntegration());
  }
  Sentry.init({
    dsn,
    tracesSampleRate,
    profilesSampleRate: enableProfiling ? 1 : void 0,
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || "vexea@0.1.0",
    integrations,
    debug: false
  });
  isSentryInitialized = true;
  console.log("[Sentry Server] Initialized with DSN, release tracking, metrics, and profiling.");
}
initSentry().catch((e) => console.warn("[Sentry Server] Async initialization error:", e));
async function recordServerTickDuration(durationMs) {
  if (process.env.VEXEA_BENCHMARK_DISABLE_SENTRY === "true" || !isSentryInitialized) return;
  const enabled2 = await serverFlagService.getBoolean("sentry_server_metrics_enabled" /* SENTRY_SERVER_METRICS_ENABLED */, void 0, true);
  if (!enabled2 || !isSentryInitialized) return;
  try {
    Sentry.metrics.distribution("server.tick_duration_ms", durationMs);
  } catch (e) {
  }
}
async function recordServerActiveDrones(count) {
  if (process.env.VEXEA_BENCHMARK_DISABLE_SENTRY === "true" || !isSentryInitialized) return;
  const enabled2 = await serverFlagService.getBoolean("sentry_server_metrics_enabled" /* SENTRY_SERVER_METRICS_ENABLED */, void 0, true);
  if (!enabled2 || !isSentryInitialized) return;
  try {
    Sentry.metrics.gauge("server.active_drones", count);
  } catch (e) {
  }
}
async function recordServerConnectedPlayers(count) {
  if (process.env.VEXEA_BENCHMARK_DISABLE_SENTRY === "true" || !isSentryInitialized) return;
  const enabled2 = await serverFlagService.getBoolean("sentry_server_metrics_enabled" /* SENTRY_SERVER_METRICS_ENABLED */, void 0, true);
  if (!enabled2 || !isSentryInitialized) return;
  try {
    Sentry.metrics.gauge("server.connected_players", count);
  } catch (e) {
  }
}
async function recordServerLLMLatency(latencyMs, model) {
  if (process.env.VEXEA_BENCHMARK_DISABLE_SENTRY === "true" || !isSentryInitialized) return;
  const enabled2 = await serverFlagService.getBoolean("sentry_server_metrics_enabled" /* SENTRY_SERVER_METRICS_ENABLED */, void 0, true);
  if (!enabled2 || !isSentryInitialized) return;
  try {
    Sentry.metrics.distribution("server.llm_latency_ms", latencyMs, { attributes: { model } });
  } catch (e) {
  }
}
async function recordHitscanRejected(reason) {
  if (process.env.VEXEA_BENCHMARK_DISABLE_SENTRY === "true" || !isSentryInitialized) return;
  const enabled2 = await serverFlagService.getBoolean("sentry_server_metrics_enabled" /* SENTRY_SERVER_METRICS_ENABLED */, void 0, true);
  if (!enabled2 || !isSentryInitialized) return;
  try {
    Sentry.metrics.count("server.hitscan_rejected", 1, { attributes: { reason } });
  } catch (e) {
  }
}
async function recordSecurityExploit(exploitType, details) {
  const loggingEnabled = await serverFlagService.getBoolean("security_exploit_logging" /* SECURITY_EXPLOIT_LOGGING */, void 0, true);
  if (!loggingEnabled) return;
  Sentry.captureMessage(`[Security Alert] Exploit Attempt: ${exploitType}`, {
    level: "warning",
    extra: details
  });
  const metricsEnabled = await serverFlagService.getBoolean("sentry_server_metrics_enabled" /* SENTRY_SERVER_METRICS_ENABLED */, void 0, true);
  if (metricsEnabled) {
    Sentry.metrics.count("security.exploit_attempt", 1, { attributes: { exploitType } });
  }
}
function recordDroneColliderInit(droneType, colliderInfo) {
  if (!isSentryInitialized) return;
  try {
    Sentry.addBreadcrumb({
      category: "physics",
      message: `Initialized drone collider for type ${droneType}`,
      level: "info",
      data: colliderInfo
    });
  } catch (e) {
  }
}

// server/doppler.ts
async function loadDopplerSecrets() {
  const token = process.env.DOPPLER_TOKEN;
  if (!token) {
    return;
  }
  try {
    console.log("[Doppler Server] Fetching production secrets (FIREBASE_SERVICE_ACCOUNT, SENTRY_DSN, etc.) from Doppler API...");
    const response = await fetch(
      "https://api.doppler.com/v3/configs/config/secrets/download?format=json",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Vexea-Server/1.0"
        }
      }
    );
    if (!response.ok) {
      console.error(
        `[Doppler Server] Failed to fetch secrets from Doppler: ${response.status} ${response.statusText}`
      );
      return;
    }
    const secrets = await response.json();
    let loadedCount = 0;
    for (const [key, value] of Object.entries(secrets)) {
      if (typeof value === "string") {
        process.env[key] = value;
        loadedCount++;
      }
    }
    console.log(
      `[Doppler Server] Successfully injected ${loadedCount} secrets from Doppler into process.env.`
    );
    if (process.env.SENTRY_DSN) {
      initSentry();
    }
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("[Doppler Server] FIREBASE_SERVICE_ACCOUNT secret is available in process.env.");
    }
  } catch (err) {
    console.error("[Doppler Server] Exception while loading Doppler secrets:", err);
  }
}

// server/index.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
var import_rapier3d_compat2 = __toESM(require("@dimforge/rapier3d-compat"), 1);
var import_vite = require("vite");
var import_app = require("firebase-admin/app");
var import_firestore = require("firebase-admin/firestore");

// shared/transport.config.ts
var requestedTransport = typeof process !== "undefined" ? process.env.VEXEA_TRANSPORT : void 0;
var TRANSPORT_MODE = requestedTransport === "geckos" ? "geckos" : "socketio";

// server/transport/adapter.ts
var import_socket = require("socket.io");
function createTransport() {
  if (TRANSPORT_MODE === "socketio") {
    return new SocketIOAdapter();
  } else {
    return new GeckosAdapter();
  }
}
var GeckosAdapter = class {
  constructor() {
    this.connections = /* @__PURE__ */ new Map();
    const geckos = require("@geckos.io/server").default;
    this.io = geckos({ cors: { origin: "*" } });
  }
  listen(port, server2) {
    if (server2) {
      this.io.addServer(server2);
    }
    console.log(`[TRANSPORT] Mode: geckos | Listening on port ${port}`);
    this.io.onConnection((channel) => {
      const id = channel.id || Math.random().toString(36).substring(7);
      this.connections.set(id, channel);
      console.log(`[TRANSPORT] Client connected: ${id} | Total: ${this.getConnectedCount()}`);
      const wrappedChannel = new GeckosChannelAdapter(channel, id, () => {
        this.connections.delete(id);
        console.log(`[TRANSPORT] Client disconnected: ${id} | Total: ${this.getConnectedCount()}`);
      });
      if (this.onConnectionCallback) {
        this.onConnectionCallback(wrappedChannel);
      }
    });
  }
  close() {
    this.io?.close?.();
  }
  onConnection(callback) {
    this.onConnectionCallback = callback;
  }
  rawEmitAll(buffer) {
    const count = this.getConnectedCount();
    if (count > 0) {
      for (const channel of this.connections.values()) {
        try {
          channel.raw.emit(buffer);
        } catch (e) {
        }
      }
    }
  }
  reliableEmitAll(event, data) {
    for (const channel of this.connections.values()) {
      try {
        channel.emit(event, data, { reliable: true });
      } catch (e) {
      }
    }
  }
  getConnectedCount() {
    return this.connections.size;
  }
};
var GeckosChannelAdapter = class {
  constructor(channel, id, onDisconnectCb) {
    this.channel = channel;
    this.onDisconnectCb = onDisconnectCb;
    this._connected = true;
    this._id = id;
    this.channel.onDisconnect(() => {
      this._connected = false;
      this.onDisconnectCb();
    });
  }
  get id() {
    return this._id;
  }
  get connected() {
    return this._connected;
  }
  onDisconnect(callback) {
    this.channel.onDisconnect(() => {
      callback();
    });
  }
  on(event, callback) {
    this.channel.on(event, (data) => callback(data));
  }
  onRaw(callback) {
    this.channel.onRaw((msg) => {
      const buffer = toArrayBuffer(msg);
      if (buffer) callback(buffer);
    });
  }
  emit(event, data, options) {
    this.channel.emit(event, data, geckosEmitOptions(event, options));
  }
  rawEmit(buffer) {
    try {
      this.channel.raw.emit(buffer);
    } catch (e) {
    }
  }
  removeAllListeners() {
    this.channel.removeAllListeners?.();
  }
};
var SocketIOAdapter = class {
  constructor() {
    this.connections = /* @__PURE__ */ new Map();
  }
  listen(port, server2) {
    if (server2) {
      this.io = new import_socket.Server(server2, { cors: { origin: "*" } });
    } else {
      this.io = new import_socket.Server(port, { cors: { origin: "*" } });
    }
    console.log(`[TRANSPORT] Mode: socketio | Listening on port ${port}`);
    this.io.on("connection", (socket) => {
      this.connections.set(socket.id, socket);
      console.log(`[TRANSPORT] Client connected: ${socket.id} | Total: ${this.getConnectedCount()}`);
      const wrappedChannel = new SocketIOChannelAdapter(socket, () => {
        this.connections.delete(socket.id);
        console.log(`[TRANSPORT] Client disconnected: ${socket.id} | Total: ${this.getConnectedCount()}`);
      });
      if (this.onConnectionCallback) {
        this.onConnectionCallback(wrappedChannel);
      }
    });
  }
  close() {
    this.io?.close();
  }
  onConnection(callback) {
    this.onConnectionCallback = callback;
  }
  rawEmitAll(buffer) {
    const count = this.getConnectedCount();
    if (count > 0) {
      this.io.emit("raw", Buffer.from(buffer));
    }
  }
  reliableEmitAll(event, data) {
    this.io.emit(event, data);
  }
  getConnectedCount() {
    return this.connections.size;
  }
};
var SocketIOChannelAdapter = class {
  constructor(socket, onDisconnectCb) {
    this.socket = socket;
    this.onDisconnectCb = onDisconnectCb;
    this.localDisconnectCb = [];
    this.socket.on("disconnect", () => {
      this.onDisconnectCb();
      for (const cb of this.localDisconnectCb) cb();
    });
  }
  get id() {
    return this.socket.id;
  }
  get connected() {
    return this.socket.connected;
  }
  onDisconnect(callback) {
    this.localDisconnectCb.push(callback);
  }
  on(event, callback) {
    this.socket.on(event, (data) => callback(data));
  }
  onRaw(callback) {
    this.socket.on("raw", (payload) => {
      if (Buffer.isBuffer(payload)) {
        callback(payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength));
      } else if (payload instanceof ArrayBuffer) {
        callback(payload);
      } else if (payload && payload.type === "raw" && Array.isArray(payload.data)) {
        callback(new Uint8Array(payload.data).buffer);
      }
    });
  }
  emit(event, data, _options) {
    this.socket.emit(event, data);
  }
  rawEmit(buffer) {
    this.socket.emit("raw", Buffer.from(buffer));
  }
  removeAllListeners() {
    this.socket.removeAllListeners();
  }
};
function geckosEmitOptions(event, options) {
  if (options?.reliable !== void 0) return { reliable: options.reliable };
  return event === "reliable_event" ? { reliable: true } : void 0;
}
function toArrayBuffer(value) {
  if (value instanceof ArrayBuffer) return value.slice(0);
  if (Buffer.isBuffer(value)) return Uint8Array.from(value).buffer;
  if (ArrayBuffer.isView(value)) {
    return Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)).buffer;
  }
  return void 0;
}

// server/connection-registry.ts
var ConnectionRegistry = class {
  constructor() {
    this.connections = /* @__PURE__ */ new Map();
  }
  register(playerId, channel) {
    this.connections.set(playerId, { channel, connectedAt: Date.now() });
  }
  unregister(playerId) {
    this.connections.delete(playerId);
  }
  get(playerId) {
    return this.connections.get(playerId)?.channel;
  }
  getAll() {
    return Array.from(this.connections.entries()).map(([id, data]) => ({
      playerId: id,
      channel: data.channel
    }));
  }
};
var connectionRegistry = new ConnectionRegistry();

// server/MatchManager.ts
var MatchManager = class {
  constructor() {
    this.activeRooms = /* @__PURE__ */ new Map();
  }
  /**
   * Returns an existing MatchRoom or creates a new one for a designated matchId.
   */
  getOrCreateRoom(roomId, geminiKey, mapId) {
    let room = this.activeRooms.get(roomId);
    if (!room) {
      console.log(`[MATCH MANAGER] Creating new MatchRoom: ${roomId} (Requested Map: ${mapId || "none"})`);
      room = new MatchRoom(roomId, geminiKey, mapId);
      room.onShutdown = (id) => {
        console.log(`[MATCH MANAGER] Room ${id} signaled shutdown. Removing from activeRooms.`);
        this.activeRooms.delete(id);
      };
      this.activeRooms.set(roomId, room);
    }
    return room;
  }
  /**
   * Finds an available MatchRoom with fewer than 10 players that hasn't started yet,
   * or creates a new automated one. (Matchmaking)
   */
  findMatchmakingRoom(geminiKey) {
    for (const room of this.activeRooms.values()) {
      if (!room.matchActive && room.players.size < 10 && room.roomId !== "lobby") {
        console.log(`[MATCH MANAGER] Matchmaking found open room: ${room.roomId} (${room.players.size}/10)`);
        return room;
      }
    }
    const newId = `M_AUTO_${Math.floor(Math.random() * 1e5)}`;
    console.log(`[MATCH MANAGER] No open rooms. Provisioning matchmaking room: ${newId}`);
    return this.getOrCreateRoom(newId, geminiKey);
  }
  /**
   * Removes a MatchRoom and clears its simulation routines once empty.
   */
  deleteRoom(roomId) {
    const room = this.activeRooms.get(roomId);
    if (room) {
      console.log(`[MATCH MANAGER] Requesting shutdown for Room: ${roomId}`);
      room.shutdown();
    }
  }
  /**
   * Returns a list of active rooms.
   */
  getRooms() {
    return Array.from(this.activeRooms.values());
  }
  getRoomCount() {
    return this.activeRooms.size;
  }
  shutdownAll() {
    for (const room of this.activeRooms.values()) room.shutdown();
    this.activeRooms.clear();
  }
};
var matchManager = new MatchManager();
var MatchManager_default = matchManager;

// shared/classes.ts
var CLASSES = {
  ASSAULT: {
    id: "ASSAULT",
    displayName: "ASSAULT",
    role: "Baseline combat. Highest damage output.",
    primaryWeapon: "rifle",
    primaryWeaponOptions: ["rifle", "smg"],
    secondaryWeapon: "pistol",
    secondaryWeaponOptions: ["pistol"],
    utility1: "Grenade",
    utility2: "Flashbang"
  },
  MEDIC: {
    id: "MEDIC",
    displayName: "MEDIC",
    role: "Team sustain. Critical in attrition matches.",
    primaryWeapon: "rifle",
    primaryWeaponOptions: ["rifle", "shotgun"],
    secondaryWeapon: "pistol",
    secondaryWeaponOptions: ["pistol"],
    utility1: "Med Kit",
    utility2: "Revive Tool"
  },
  RECON: {
    id: "RECON",
    displayName: "RECON",
    role: "Intelligence and disruption. Directly counters the LLM commander's awareness layer.",
    primaryWeapon: "rifle",
    primaryWeaponOptions: ["rifle", "sniper"],
    secondaryWeapon: "pistol",
    secondaryWeaponOptions: ["pistol"],
    utility1: "Radio",
    utility2: "Signal Jammer"
  },
  DEMOLITIONS: {
    id: "DEMOLITIONS",
    displayName: "DEMOLITIONS",
    role: "Zone control and trap deployment.",
    primaryWeapon: "rifle",
    primaryWeaponOptions: ["rifle", "lmg"],
    secondaryWeapon: "pistol",
    secondaryWeaponOptions: ["pistol"],
    utility1: "C4",
    utility2: "Proximity Mine"
  }
};
function getClassWeaponId(classId, slot) {
  const classDef = CLASSES[classId] || CLASSES.ASSAULT;
  return slot === "primary" ? classDef.primaryWeapon : classDef.secondaryWeapon;
}
function isClassWeaponAllowed(classId, slot, weaponId) {
  const classDef = CLASSES[classId] || CLASSES.ASSAULT;
  const allowed = slot === "primary" ? classDef.primaryWeaponOptions : classDef.secondaryWeaponOptions;
  return allowed.includes(weaponId);
}

// server/combat/hitscan.ts
var import_rapier3d_compat = __toESM(require("@dimforge/rapier3d-compat"), 1);
function processHitscan(pState, currentRoom2, channel, args) {
  const slot = args.weaponSlot;
  const isPrimary = slot === "primary";
  const dirX = args.direction.x;
  const dirY = args.direction.y;
  const dirZ = args.direction.z;
  const timestamp = args.timestamp;
  const now = Date.now();
  const dx = args.origin.x - pState.posX;
  const dy = args.origin.y - pState.posY;
  const dz = args.origin.z - pState.posZ;
  const originDistSq = dx * dx + dy * dy + dz * dz;
  const maxAllowedDeviation = 4;
  if (originDistSq > maxAllowedDeviation) {
    console.warn(`[Hitscan Verification] Rejected shot from player ${pState.id}: Origin deviation too high (${Math.sqrt(originDistSq).toFixed(2)}m > 2.0m)`);
    recordHitscanRejected("origin_deviation_out_of_bounds");
    recordSecurityExploit("origin_spoofing", {
      playerId: pState.id,
      origin: args.origin,
      expected: { x: pState.posX, y: pState.posY, z: pState.posZ }
    });
    return;
  }
  const history = currentRoom2.historicalAABBHistory || currentRoom2.combatResolver?.historicalAABBHistory;
  const historyIdx = currentRoom2.historicalAABBIndex ?? currentRoom2.combatResolver?.historicalAABBIndex ?? 0;
  const dronesList = currentRoom2.drones || (currentRoom2.getDrones ? currentRoom2.getDrones() : []);
  const serverTickVal = currentRoom2.serverTick || (currentRoom2.getServerTick ? currentRoom2.getServerTick() : 0);
  const expectedT = Date.now() - pState.ping;
  let targetTick = serverTickVal;
  if (Math.abs(timestamp - expectedT) <= 50) {
    const rewindMs = Math.min(200, Date.now() - timestamp);
    targetTick = serverTickVal - Math.floor(rewindMs / 16.66);
  } else {
    recordHitscanRejected("lag_compensation_out_of_bounds");
  }
  let distSqMin = 99999;
  let bestHitDrone = null;
  if (history) {
    const tickDelta = serverTickVal - targetTick;
    let targetSlot = -1;
    if (tickDelta >= 0 && tickDelta < HISTORICAL_SAMPLES_MAX) {
      const predictedSlot = (historyIdx - 1 - tickDelta + HISTORICAL_SAMPLES_MAX * 2) % HISTORICAL_SAMPLES_MAX;
      const baseIdx = predictedSlot * HISTORIC_BLOCK_SIZE;
      const recTick = history[baseIdx];
      if (recTick > 0 && Math.abs(recTick - targetTick) <= 1) {
        targetSlot = predictedSlot;
      } else {
        const prevSlot = (predictedSlot - 1 + HISTORICAL_SAMPLES_MAX) % HISTORICAL_SAMPLES_MAX;
        const nextSlot = (predictedSlot + 1) % HISTORICAL_SAMPLES_MAX;
        if (Math.abs(history[prevSlot * HISTORIC_BLOCK_SIZE] - targetTick) <= 1) {
          targetSlot = prevSlot;
        } else if (Math.abs(history[nextSlot * HISTORIC_BLOCK_SIZE] - targetTick) <= 1) {
          targetSlot = nextSlot;
        }
      }
    }
    const slotStart = targetSlot !== -1 ? targetSlot : 0;
    const slotEnd = targetSlot !== -1 ? targetSlot + 1 : HISTORICAL_SAMPLES_MAX;
    for (let i = slotStart; i < slotEnd; i++) {
      const baseIdx = i * HISTORIC_BLOCK_SIZE;
      const recTick = history[baseIdx];
      if (recTick > 0 && Math.abs(recTick - targetTick) <= 1) {
        const numDrones = history[baseIdx + 1];
        for (let dIdx = 0; dIdx < numDrones; dIdx++) {
          const offset = baseIdx + 2 + dIdx * 4;
          const dId = history[offset];
          const cx = history[offset + 1];
          const cy = history[offset + 2];
          const cz = history[offset + 3];
          const tox = cx - args.origin.x;
          const toy = cy - args.origin.y;
          const toz = cz - args.origin.z;
          const t = tox * dirX + toy * dirY + toz * dirZ;
          if (t > 0) {
            const px = args.origin.x + dirX * t;
            const py = args.origin.y + dirY * t;
            const pz = args.origin.z + dirZ * t;
            const hitDrone = dronesList.find((d) => d.id === dId);
            if (!hitDrone || hitDrone.state === 5 /* DEAD */) continue;
            if (hitDrone.id.toString() === pState.id) {
              continue;
            }
            const config = DRONE_CONFIGS[hitDrone.type];
            let w = 1;
            let h = 1;
            let l = 1;
            if (config && config.collider) {
              if (config.collider.type === "cuboid" && config.collider.halfExtents) {
                w = config.collider.halfExtents[0] * 2;
                h = config.collider.halfExtents[1] * 2;
                l = config.collider.halfExtents[2] * 2;
              } else if (config.collider.type === "capsule" && config.collider.radius !== void 0 && config.collider.halfHeight !== void 0) {
                w = config.collider.radius * 2;
                h = config.collider.halfHeight * 2 + config.collider.radius * 2;
                l = config.collider.radius * 2;
              } else if (config.collider.radius !== void 0) {
                w = config.collider.radius * 2;
                h = config.collider.radius * 2;
                l = config.collider.radius * 2;
              }
            }
            if (Math.abs(px - cx) <= w / 2 && Math.abs(py - cy) <= h / 2 && Math.abs(pz - cz) <= l / 2) {
              if (t < distSqMin) {
                distSqMin = t;
                bestHitDrone = hitDrone;
              }
            }
          }
        }
        break;
      }
    }
  }
  if (bestHitDrone) {
    if (currentRoom2.collisionMap && currentRoom2.collisionMap.rayIntersectsAny(
      args.origin,
      { x: dirX, y: dirY, z: dirZ },
      distSqMin
    )) {
      bestHitDrone = null;
    }
  }
  if (bestHitDrone) {
    const weaponPerf = getWeaponPerformance(pState.weaponState[isPrimary ? "primary" : "secondary"].weaponId);
    if (!weaponPerf) return;
    const distance = distSqMin;
    const rawDamage = calculateDamageWithFalloff(
      weaponPerf.damage,
      distance,
      weaponPerf.falloff
    );
    const appliedDamage = Math.round(rawDamage * 10) / 10;
    bestHitDrone.hp -= appliedDamage;
    pState.stats.damageDealt += appliedDamage;
    bestHitDrone.damageLog.push({ playerId: pState.id, timestamp: now });
    if (bestHitDrone.hp <= 0) {
      currentRoom2.despawnDrone(bestHitDrone);
      pState.stats.droneEliminations++;
      pState.stats.scoreIndividual += 100;
      pState.score += 100;
      const assistThreshold = now - 5e3;
      const assistants = /* @__PURE__ */ new Set();
      for (const rec of bestHitDrone.damageLog) {
        if (rec.playerId !== pState.id && rec.timestamp > assistThreshold) {
          assistants.add(rec.playerId);
        }
      }
      for (const aId of assistants) {
        const aPlayer = currentRoom2.players.get(aId);
        if (aPlayer) {
          aPlayer.stats.assists++;
          aPlayer.stats.scoreIndividual += 50;
          aPlayer.score += 50;
        }
      }
      bestHitDrone.damageLog = [];
      if (bestHitDrone.path && bestHitDrone.path.length > 0 && bestHitDrone.pathIndex < bestHitDrone.path.length) {
        currentRoom2.failedOperations.push(
          JSON.stringify({
            attempted: "active_operation",
            reason: "unit_destroyed",
            droneType: bestHitDrone.type
          })
        );
      }
      const impactX = args.origin.x + dirX * distSqMin;
      const impactY = args.origin.y + dirY * distSqMin;
      const impactZ = args.origin.z + dirZ * distSqMin;
      pState.channel.emit("reliable_event", {
        type: "HIT_CONFIRMED",
        droneId: bestHitDrone.id,
        droneHp: 0,
        originX: args.origin.x,
        originY: args.origin.y,
        originZ: args.origin.z,
        impactX,
        impactY,
        impactZ
      });
      currentRoom2.broadcastReliableEvent({
        type: "DRONE_DEATH",
        droneId: bestHitDrone.id,
        zone: bestHitDrone.zone
      });
    } else {
      const impactX = args.origin.x + dirX * distSqMin;
      const impactY = args.origin.y + dirY * distSqMin;
      const impactZ = args.origin.z + dirZ * distSqMin;
      pState.channel.emit("reliable_event", {
        type: "HIT_CONFIRMED",
        droneId: bestHitDrone.id,
        droneHp: bestHitDrone.hp,
        originX: args.origin.x,
        originY: args.origin.y,
        originZ: args.origin.z,
        impactX,
        impactY,
        impactZ
      });
      currentRoom2.broadcastReliableEvent({
        type: "DRONE_HIT",
        droneId: bestHitDrone.id,
        zone: bestHitDrone.zone
      });
    }
  } else {
    let impactX;
    let impactY;
    let impactZ;
    if (currentRoom2.rapierWorld) {
      const ray = new import_rapier3d_compat.default.Ray(
        { x: args.origin.x, y: args.origin.y, z: args.origin.z },
        { x: dirX, y: dirY, z: dirZ }
      );
      const hit = currentRoom2.rapierWorld.castRay(
        ray,
        80,
        false,
        import_rapier3d_compat.default.QueryFilterFlags.EXCLUDE_DYNAMIC
      );
      if (hit) {
        impactX = args.origin.x + args.direction.x * hit.timeOfImpact;
        impactY = args.origin.y + args.direction.y * hit.timeOfImpact;
        impactZ = args.origin.z + args.direction.z * hit.timeOfImpact;
      } else {
        impactX = args.origin.x + args.direction.x * 80;
        impactY = args.origin.y + args.direction.y * 80;
        impactZ = args.origin.z + args.direction.z * 80;
      }
    } else {
      impactX = args.origin.x + args.direction.x * 80;
      impactY = args.origin.y + args.direction.y * 80;
      impactZ = args.origin.z + args.direction.z * 80;
    }
    if (typeof impactX === "number" && !isNaN(impactX) && typeof impactY === "number" && !isNaN(impactY) && typeof impactZ === "number" && !isNaN(impactZ)) {
      pState.channel.emit("reliable_event", {
        type: "HIT_ENVIRONMENT",
        originX: args.origin.x,
        originY: args.origin.y,
        originZ: args.origin.z,
        impactX,
        impactY,
        impactZ
      });
    }
  }
}

// server/execution/InProcessRoomExecution.ts
var InProcessRoomExecution = class {
  constructor(room) {
    this.outboundListeners = [];
    this.status = "active";
    this.room = room;
    const prevShutdown = this.room.onShutdown;
    this.room.onShutdown = (id) => {
      this.status = "ending";
      if (prevShutdown) prevShutdown(id);
    };
  }
  get roomId() {
    return this.room.roomId;
  }
  getRoom() {
    return this.room;
  }
  onOutbound(callback) {
    this.outboundListeners.push(callback);
  }
  emitOutbound(playerId, event) {
    for (const listener of this.outboundListeners) {
      try {
        listener(playerId, event);
      } catch (err) {
        console.error(`[InProcessRoomExecution] Outbound callback error in room ${this.roomId}:`, err);
      }
    }
  }
  async send(playerId, event) {
    if (this.status === "ending" || this.status === "crashed") {
      return;
    }
    if (playerId === "broadcast" || event.type === "CHAT_MESSAGE" || event.type === "QUICK_COMM") {
      if (event.type === "CHAT_MESSAGE") {
        const message = event.message;
        if (message && typeof message === "string" && message.trim().length > 0) {
          const trimmed = message.trim().slice(0, 150);
          const p2 = playerId !== "broadcast" ? this.room.players.get(playerId) : null;
          const senderName = event.sender || p2?.displayName || (playerId !== "broadcast" ? playerId : "System");
          this.emitOutbound("broadcast", {
            type: "CHAT_MESSAGE",
            sender: senderName,
            message: trimmed
          });
          for (const [id, player] of this.room.players.entries()) {
            player.channel.emit("reliable_event", {
              type: "CHAT_MESSAGE",
              sender: senderName,
              message: trimmed
            });
          }
        }
        return;
      }
      if (event.type === "QUICK_COMM") {
        const optionId = event.optionId;
        if (optionId && typeof optionId === "string") {
          const p2 = playerId !== "broadcast" ? this.room.players.get(playerId) : null;
          const senderName = event.sender || p2?.displayName || (playerId !== "broadcast" ? playerId : "System");
          this.emitOutbound("broadcast", {
            type: "QUICK_COMM",
            sender: senderName,
            optionId
          });
          for (const [id, player] of this.room.players.entries()) {
            player.channel.emit("reliable_event", {
              type: "QUICK_COMM",
              sender: senderName,
              optionId
            });
          }
        }
        return;
      }
    }
    const p = this.room.players.get(playerId);
    if (!p) {
      if (event.type === "PLAYER_QUIT") {
        await this.room.handlePlayerAbandonment(playerId);
      } else if (event.type === "PLAYER_DISCONNECT") {
        this.room.handlePlayerDisconnect(playerId);
      }
      return;
    }
    this.room.recordPlayerActivity(p);
    switch (event.type) {
      case "INPUT": {
        this.room.updatePlayerInput(p, event.inputMask, event.pitch, event.yaw);
        break;
      }
      case "USE_UTILITY": {
        if (p.isAlive && (event.slot === "utility1" || event.slot === "utility2")) {
          this.room.useUtility(p.id, event.slot);
        }
        break;
      }
      case "OBJECTIVE_HOLD": {
        if (p.isAlive) {
          this.room.setObjectiveHold(p.id, !!event.holding);
        }
        break;
      }
      case "PLAYER_READY": {
        this.room.setPlayerReady(p.id);
        break;
      }
      case "PLAYER_QUIT": {
        await this.room.handlePlayerAbandonment(p.id);
        break;
      }
      case "PLAYER_DISCONNECT": {
        this.room.handlePlayerDisconnect(p.id);
        break;
      }
      case "SELECT_CLASS": {
        this.room.applyPlayerClassLoadout(p.id, event.classId);
        break;
      }
      case "REMOVE_PLAYER": {
        this.room.removePlayer(p.id);
        break;
      }
      case "TOGGLE_FIRE_MODE": {
        if (!p.isAlive) break;
        const primary = p.weaponState.primary;
        primary.fireMode = primary.fireMode === "auto" ? "burst" : "auto";
        const evt = {
          type: "FIRE_MODE_CHANGED",
          mode: primary.fireMode
        };
        this.emitOutbound(p.id, evt);
        p.channel.emit("reliable_event", evt);
        break;
      }
      case "RELOAD": {
        if (!p.isAlive) break;
        const slot = event.weaponSlot;
        if (!slot) break;
        const wState = p.weaponState[slot];
        const wDef = getWeaponPerformance(wState.weaponId);
        if (!wDef) break;
        const reloadTicks = getWeaponReloadTicks(wState.weaponId);
        if (!wState.isReloading && wState.currentMag < wDef.capacity && wState.reserve > 0) {
          wState.isReloading = true;
          wState.reloadTimer = reloadTicks;
        }
        const evt = {
          type: "AMMO_STATE",
          primary: p.weaponState.primary,
          secondary: p.weaponState.secondary
        };
        this.emitOutbound(p.id, evt);
        p.channel.emit("reliable_event", evt);
        break;
      }
      case "CANCEL_RELOAD": {
        if (!p.isAlive) break;
        const slot = event.weaponSlot;
        if (!slot) break;
        const wState = p.weaponState[slot];
        if (wState.isReloading) {
          wState.isReloading = false;
          wState.reloadTimer = 0;
        }
        const evt = {
          type: "AMMO_STATE",
          primary: p.weaponState.primary,
          secondary: p.weaponState.secondary
        };
        this.emitOutbound(p.id, evt);
        p.channel.emit("reliable_event", evt);
        break;
      }
      case "FIRE": {
        if (!p.isAlive) break;
        const slot = event.weaponSlot;
        if (slot !== "primary" && slot !== "secondary") break;
        const wState = p.weaponState[slot];
        const weaponStats = getWeaponPerformance(wState.weaponId);
        if (!weaponStats) break;
        const reloadTicks = getWeaponReloadTicks(wState.weaponId);
        if (wState.currentMag <= 0) {
          if (!wState.isReloading && wState.reserve > 0) {
            wState.isReloading = true;
            wState.reloadTimer = reloadTicks;
            const evt = {
              type: "AMMO_STATE",
              primary: p.weaponState.primary,
              secondary: p.weaponState.secondary
            };
            this.emitOutbound(p.id, evt);
            p.channel.emit("reliable_event", evt);
          }
          break;
        }
        if (wState.isReloading) break;
        const now = Date.now();
        const allowedInterval = 1e3 / weaponStats.fireRateHz;
        let leakyUpdate = Math.max(
          0,
          wState.leakyBucket - (now - wState.lastConfirmedShotT) / allowedInterval
        );
        if (leakyUpdate < weaponStats.capacity) {
          wState.leakyBucket = leakyUpdate + 1;
          wState.lastConfirmedShotT = now;
          p.firedThisTick = true;
          if (p.infiniteAmmo) {
            wState.currentMag = weaponStats.capacity;
          } else {
            wState.currentMag--;
          }
          if (wState.currentMag === 0 && wState.reserve > 0 && !p.infiniteAmmo) {
            wState.isReloading = true;
            wState.reloadTimer = reloadTicks;
          }
          const evt = {
            type: "AMMO_STATE",
            primary: p.weaponState.primary,
            secondary: p.weaponState.secondary
          };
          this.emitOutbound(p.id, evt);
          p.channel.emit("reliable_event", evt);
          processHitscan(p, this.room, p.channel, event);
        } else {
          recordHitscanRejected("rate_limit_exceeded");
        }
        break;
      }
    }
  }
  async getStatus() {
    return this.status;
  }
  async terminate(reason) {
    console.log(`[InProcessRoomExecution] Terminating room ${this.roomId}: ${reason}`);
    this.status = "ending";
    this.room.shutdown();
  }
};

// server/execution/ForkedRoomExecution.ts
var import_child_process = require("child_process");
var path = __toESM(require("path"), 1);
var fs = __toESM(require("fs"), 1);
var import_url = require("url");

// server/benchmark/telemetry.ts
var import_node_fs = require("node:fs");
var import_node_perf_hooks = require("node:perf_hooks");
var import_node_v8 = __toESM(require("node:v8"), 1);
var outputPath = process.env.VEXEA_BENCHMARK_TELEMETRY_PATH;
var mode = process.env.VEXEA_BENCHMARK_INSTRUMENTATION || "off";
var telemetryConfigured = Boolean(outputPath) && mode !== "off";
var enabled = telemetryConfigured;
var counters = /* @__PURE__ */ new Map();
var totalCounters = /* @__PURE__ */ new Map();
var gauges = /* @__PURE__ */ new Map();
var timers = /* @__PURE__ */ new Map();
var metrics2 = [];
var stream;
var eventLoopBaseline = import_node_perf_hooks.performance.eventLoopUtilization();
var intervalStartMs = Date.now();
var eventLoopDelay = (0, import_node_perf_hooks.monitorEventLoopDelay)({ resolution: 10 });
var gcObserver;
var flushInterval;
var closePromise;
var isWorker = process.env.IS_ROOM_WORKER === "true";
var workerRoomId = process.env.ROOM_ID;
function flushWorkerTelemetry() {
  const timerOutput = {};
  for (const [name, bucket] of timers) {
    timerOutput[name] = {
      count: bucket.count,
      sumMs: bucket.sumMs,
      maxMs: bucket.maxMs,
      p95Ms: p95(bucket.samples),
      samples: [...bucket.samples]
    };
    bucket.count = 0;
    bucket.sumMs = 0;
    bucket.maxMs = 0;
    bucket.samples.length = 0;
  }
  if (process.send) {
    process.send({
      type: "telemetry",
      roomId: workerRoomId,
      counters: Object.fromEntries(counters),
      gauges: Object.fromEntries(gauges),
      timers: timerOutput
    });
  }
  counters.clear();
}
if (telemetryConfigured) {
  eventLoopDelay.enable();
  if (mode === "full") {
    gcObserver = new import_node_perf_hooks.PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        benchmarkCounter("gc.collections");
        benchmarkTimer("gc.pause", entry.duration);
      }
    });
    gcObserver.observe({ entryTypes: ["gc"] });
  }
  if (isWorker) {
    flushInterval = setInterval(flushWorkerTelemetry, 1e3);
    flushInterval.unref();
    process.once("beforeExit", flushWorkerTelemetry);
  } else if (outputPath) {
    stream = (0, import_node_fs.createWriteStream)(outputPath, { flags: "a", encoding: "utf8" });
    flushInterval = setInterval(flushBenchmarkTelemetry, 1e3);
    flushInterval.unref();
    process.once("beforeExit", flushBenchmarkTelemetry);
  }
}
function p95(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}
function write(record) {
  if (!stream) return;
  stream.write(`${JSON.stringify(record)}
`);
}
function recordMetric(entry) {
  metrics2.push(entry);
}
function cgroupValue(fileName) {
  try {
    const value = (0, import_node_fs.readFileSync)(`/sys/fs/cgroup/${fileName}`, "utf8").trim();
    return value === "max" ? void 0 : Number(value);
  } catch {
    return void 0;
  }
}
function cgroupCpuThrottledMs() {
  try {
    const line = (0, import_node_fs.readFileSync)("/sys/fs/cgroup/cpu.stat", "utf8").split("\n").find((entry) => entry.startsWith("throttled_usec "));
    return line ? Number(line.split(/\s+/)[1]) / 1e3 : void 0;
  } catch {
    return void 0;
  }
}
function benchmarkInstrumentationEnabled() {
  return enabled;
}
function benchmarkCounter(name, value = 1) {
  if (!enabled) return;
  counters.set(name, (counters.get(name) || 0) + value);
  totalCounters.set(name, (totalCounters.get(name) || 0) + value);
  recordMetric({ type: "counter", name, value, timestamp: Date.now() });
}
function benchmarkGauge(name, value) {
  if (!enabled || !Number.isFinite(value)) return;
  gauges.set(name, value);
  recordMetric({ type: "gauge", name, value, timestamp: Date.now() });
}
function benchmarkTimer(name, durationMs) {
  if (!enabled || !Number.isFinite(durationMs)) return;
  const bucket = timers.get(name) || { count: 0, sumMs: 0, maxMs: 0, samples: [] };
  bucket.count += 1;
  bucket.sumMs += durationMs;
  bucket.maxMs = Math.max(bucket.maxMs, durationMs);
  if (bucket.samples.length < 6e3) bucket.samples.push(durationMs);
  timers.set(name, bucket);
  recordMetric({ type: "timer", name, value: durationMs, timestamp: Date.now() });
}
function benchmarkEvent(name, details = {}) {
  if (!enabled) return;
  const fields = details && typeof details === "object" && !Array.isArray(details) ? details : { details };
  recordMetric({ type: "event", name, value: 1, timestamp: Date.now(), details });
  if (isWorker && process.send) {
    process.send({
      type: "benchmark_event",
      event: { type: "event", timestampMs: Date.now(), name, ...fields }
    });
  } else {
    write({ type: "event", timestampMs: Date.now(), name, ...fields });
  }
}
function writeBenchmarkEventRecord(record) {
  write(record);
}
var workerGauges = /* @__PURE__ */ new Map();
function recomputeAggregatedGauges() {
  const entitySums = /* @__PURE__ */ new Map();
  for (const [, roomGauges] of workerGauges) {
    for (const [name, val] of roomGauges) {
      if (name.startsWith("entities.")) {
        entitySums.set(name, (entitySums.get(name) || 0) + val);
      } else {
        gauges.set(name, val);
      }
    }
  }
  for (const [name, sum] of entitySums) {
    gauges.set(name, sum);
  }
}
function removeWorkerTelemetry(sourceId) {
  workerGauges.delete(sourceId);
  recomputeAggregatedGauges();
}
function recordRemoteTelemetry(remoteCounters, remoteGauges, remoteTimers, sourceId) {
  if (remoteCounters) {
    for (const [name, val] of Object.entries(remoteCounters)) {
      counters.set(name, (counters.get(name) || 0) + val);
      totalCounters.set(name, (totalCounters.get(name) || 0) + val);
    }
  }
  if (remoteGauges) {
    if (sourceId) {
      let roomMap = workerGauges.get(sourceId);
      if (!roomMap) {
        roomMap = /* @__PURE__ */ new Map();
        workerGauges.set(sourceId, roomMap);
      }
      for (const [name, val] of Object.entries(remoteGauges)) {
        roomMap.set(name, val);
      }
      recomputeAggregatedGauges();
    } else {
      for (const [name, val] of Object.entries(remoteGauges)) {
        gauges.set(name, val);
      }
    }
  }
  if (remoteTimers) {
    for (const [name, bucket] of Object.entries(remoteTimers)) {
      const existing = timers.get(name) || { count: 0, sumMs: 0, maxMs: 0, samples: [] };
      existing.count += bucket.count;
      existing.sumMs += bucket.sumMs;
      existing.maxMs = Math.max(existing.maxMs, bucket.maxMs);
      if (bucket.samples) {
        existing.samples.push(...bucket.samples);
      }
      timers.set(name, existing);
    }
  }
}
function flushBenchmarkTelemetry() {
  if (!telemetryConfigured) return;
  const timestampMs = Date.now();
  const memory = process.memoryUsage();
  const heap = import_node_v8.default.getHeapStatistics();
  const usage = process.resourceUsage();
  const eventLoop = import_node_perf_hooks.performance.eventLoopUtilization(eventLoopBaseline);
  eventLoopBaseline = import_node_perf_hooks.performance.eventLoopUtilization();
  const timerOutput = {};
  for (const [name, bucket] of timers) {
    timerOutput[name] = {
      count: bucket.count,
      sumMs: bucket.sumMs,
      maxMs: bucket.maxMs,
      p95Ms: p95(bucket.samples),
      samples: [...bucket.samples]
    };
    bucket.count = 0;
    bucket.sumMs = 0;
    bucket.maxMs = 0;
    bucket.samples.length = 0;
  }
  write({
    type: "sample",
    timestampMs,
    intervalStartMs,
    intervalEndMs: timestampMs,
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    timers: timerOutput,
    process: {
      cpuUserMs: usage.userCPUTime / 1e3,
      cpuSystemMs: usage.systemCPUTime / 1e3,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      heapLimitBytes: heap.heap_size_limit,
      externalBytes: memory.external,
      arrayBuffersBytes: memory.arrayBuffers,
      nativeBytes: Math.max(0, memory.rss - memory.heapUsed - memory.external),
      cgroupMemoryBytes: cgroupValue("memory.current"),
      cgroupMemoryPeakBytes: cgroupValue("memory.peak"),
      cgroupCpuThrottledMs: cgroupCpuThrottledMs()
    },
    eventLoop: {
      utilization: eventLoop.utilization,
      activeMs: eventLoop.active,
      idleMs: eventLoop.idle,
      delayMeanMs: eventLoopDelay.mean / 1e6,
      delayP95Ms: eventLoopDelay.percentile(95) / 1e6,
      delayMaxMs: eventLoopDelay.max / 1e6
    }
  });
  intervalStartMs = timestampMs;
  eventLoopDelay.reset();
  counters.clear();
}
function closeBenchmarkTelemetry() {
  if (!telemetryConfigured || !outputPath) return Promise.resolve();
  if (closePromise) return closePromise;
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = void 0;
  }
  flushBenchmarkTelemetry();
  eventLoopDelay.disable();
  gcObserver?.disconnect();
  gcObserver = void 0;
  const writable = stream;
  stream = void 0;
  closePromise = new Promise((resolve3) => {
    if (!writable) {
      resolve3();
      return;
    }
    writable.once("error", () => resolve3());
    writable.end(() => resolve3());
  });
  return closePromise;
}

// server/execution/ForkedRoomExecution.ts
var import_meta = {};
function resolveWorkerPath() {
  let baseDir;
  try {
    if (typeof __dirname !== "undefined") {
      baseDir = __dirname;
    } else {
      baseDir = path.dirname((0, import_url.fileURLToPath)(import_meta.url));
    }
  } catch (e) {
    baseDir = path.resolve(process.cwd(), "server/execution");
  }
  const cjsCandidate = path.resolve(baseDir, "room-worker.cjs");
  if (!fs.existsSync(cjsCandidate)) {
    const tsSource = path.resolve(process.cwd(), "server/execution/room-worker.ts");
    if (fs.existsSync(tsSource)) {
      try {
        const esbuild = typeof require !== "undefined" ? require("esbuild") : null;
        if (esbuild && typeof esbuild.buildSync === "function") {
          esbuild.buildSync({
            entryPoints: [tsSource],
            bundle: true,
            platform: "node",
            format: "cjs",
            packages: "external",
            outfile: cjsCandidate
          });
        }
      } catch (e) {
      }
    }
  }
  const candidates = [
    cjsCandidate,
    path.resolve(baseDir, "room-worker.js"),
    path.resolve(baseDir, "room-worker.ts"),
    path.resolve(process.cwd(), "server/execution/room-worker.ts"),
    path.resolve(baseDir, "../../server/execution/room-worker.ts")
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
var ForkedRoomExecution = class {
  constructor(roomId, options = {}) {
    this.child = null;
    this.status = "starting";
    this.outboundListeners = [];
    this.childPid = null;
    this.isExplicitTermination = false;
    this.roomId = roomId;
    this.options = options;
    this.readyPromise = new Promise((resolve3, reject) => {
      this.readyResolve = resolve3;
      this.readyReject = reject;
    });
    this.spawnWorker();
  }
  get pid() {
    return this.childPid;
  }
  async waitUntilReady() {
    return this.readyPromise;
  }
  spawnWorker() {
    const { scriptPath, execArgv } = resolveWorkerPath();
    const timeoutMs = this.options.readyTimeoutMs || 25e3;
    try {
      this.child = (0, import_child_process.fork)(scriptPath, [], {
        execArgv,
        env: {
          ...process.env,
          ROOM_ID: this.roomId,
          IS_ROOM_WORKER: "true"
        },
        stdio: ["inherit", "inherit", "inherit", "ipc"]
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
      this.child.on("message", (msg) => {
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
            reason: "ROOM_CRASHED"
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
      const initMsg = {
        type: "init",
        roomId: this.roomId,
        geminiKey: this.options.geminiKey,
        mapId: this.options.mapId
      };
      this.child.send(initMsg);
    } catch (err) {
      this.status = "crashed";
      this.readyReject(err);
      if (this.options.onCrash) {
        this.options.onCrash(this.roomId, err.message);
      }
    }
  }
  handleChildMessage(msg, timer) {
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
          } catch (e) {
          }
        }
        break;
      }
      case "raw_emit_channel": {
        const channel = connectionRegistry.get(msg.playerId);
        if (channel) {
          try {
            const buf = Buffer.isBuffer(msg.buffer) ? msg.buffer : Array.isArray(msg.buffer) ? Buffer.from(msg.buffer) : Buffer.from(msg.buffer);
            channel.rawEmit(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
          } catch (e) {
          }
        }
        break;
      }
      case "broadcast_channel": {
        this.emitOutbound("broadcast", {
          type: msg.eventName,
          ...msg.data
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
  onOutbound(callback) {
    this.outboundListeners.push(callback);
    return () => {
      const idx = this.outboundListeners.indexOf(callback);
      if (idx !== -1) this.outboundListeners.splice(idx, 1);
    };
  }
  emitOutbound(playerId, event) {
    for (const listener of this.outboundListeners) {
      try {
        listener(playerId, event);
      } catch (err) {
        console.error(`[ForkedRoomExecution] Outbound listener error in room ${this.roomId}:`, err);
      }
    }
  }
  async send(playerId, event) {
    if (this.status !== "active") {
      return;
    }
    if (this.child && this.child.connected) {
      const msg = {
        type: "inbound",
        playerId,
        event
      };
      this.child.send(msg);
    }
  }
  async registerPlayer(playerId, classId, displayName, reqUid, primaryWeaponId, secondaryWeaponId) {
    if (this.child && this.child.connected) {
      const msg = {
        type: "register_player",
        playerId,
        classId,
        displayName,
        reqUid,
        primaryWeaponId,
        secondaryWeaponId
      };
      this.child.send(msg);
    }
  }
  async removePlayer(playerId) {
    if (this.child && this.child.connected) {
      const msg = {
        type: "remove_player",
        playerId
      };
      this.child.send(msg);
    }
  }
  get currentStatus() {
    return this.status;
  }
  async getStatus() {
    return this.status;
  }
  async terminate(reason = "TERMINATED") {
    this.isExplicitTermination = true;
    if (this.status !== "crashed") {
      this.status = "ending";
    }
    if (this.child && this.child.connected) {
      const msg = {
        type: "terminate",
        reason
      };
      this.child.send(msg);
      setTimeout(() => {
        this.killChild();
      }, 500);
    } else {
      this.killChild();
    }
  }
  killChild() {
    if (this.child) {
      try {
        this.child.kill("SIGTERM");
      } catch (e) {
      }
      this.child = null;
    }
  }
};

// server/execution/RoomAllocator.ts
var RoomAllocator = class {
  constructor() {
    this.executions = /* @__PURE__ */ new Map();
    this.backendType = process.env.ROOM_BACKEND || "in-process";
  }
  setBackend(backend) {
    this.backendType = backend;
  }
  getBackend() {
    return this.backendType;
  }
  /**
   * Allocates or retrieves an execution instance for the designated matchId.
   */
  async allocate(matchId, geminiKey, mapId, overrideBackend) {
    let execution = this.executions.get(matchId);
    if (!execution) {
      const backend = overrideBackend || this.backendType;
      if (backend === "isolated" || backend === "forked") {
        const forkedExec = new ForkedRoomExecution(matchId, {
          geminiKey,
          mapId,
          onCrash: (id) => this.release(id),
          onShutdown: (id) => this.release(id)
        });
        await forkedExec.waitUntilReady();
        execution = forkedExec;
      } else {
        const room = matchManager.getOrCreateRoom(matchId, geminiKey, mapId);
        execution = new InProcessRoomExecution(room);
        const prevShutdown = room.onShutdown;
        room.onShutdown = (id) => {
          this.executions.delete(id);
          if (prevShutdown) prevShutdown(id);
        };
      }
      this.executions.set(matchId, execution);
    }
    return execution;
  }
  getExecution(roomId) {
    return this.executions.get(roomId);
  }
  /**
   * Returns total active room executions count.
   */
  getActiveRoomCount() {
    return this.executions.size;
  }
  /**
   * Releases an execution when a room ends or crashes.
   */
  release(roomId) {
    const execution = this.executions.get(roomId);
    if (execution) {
      this.executions.delete(roomId);
      if (execution instanceof InProcessRoomExecution) {
        matchManager.deleteRoom(roomId);
      } else if (execution instanceof ForkedRoomExecution) {
        if (execution.currentStatus !== "crashed") {
          execution.terminate("RELEASED");
        }
      }
    }
  }
};
var roomAllocator = new RoomAllocator();

// server/player-data/MatchAbuseStore.ts
var DEFAULT_RECORD = {
  offenseCount: 0,
  lastOffenseAt: 0,
  lockoutUntil: 0,
  banned: false
};
var MatchAbuseStore = class _MatchAbuseStore {
  /**
   * Reads player abuse record from Users/{uid}/matchAbuse/v1
   */
  static async getRecord(uid) {
    if (!uid || uid.startsWith("bot_")) {
      return { ...DEFAULT_RECORD };
    }
    try {
      const subDocRef = doc(db, `Users/${uid}/matchAbuse/v1`);
      const snap = await getDoc(subDocRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          offenseCount: data.offenseCount ?? 0,
          lastOffenseAt: data.lastOffenseAt ?? 0,
          lockoutUntil: data.lockoutUntil ?? 0,
          banned: data.banned ?? false
        };
      }
    } catch (err) {
      console.error(`[MatchAbuseStore] Failed to get abuse record for ${uid}:`, err);
    }
    return { ...DEFAULT_RECORD };
  }
  /**
   * Records an abandonment offense and applies escalating penalties.
   * Resets offense count if last offense was over 14 days ago.
   */
  static async recordOffense(uid) {
    if (!uid || uid.startsWith("bot_")) {
      return { ...DEFAULT_RECORD };
    }
    try {
      const current = await _MatchAbuseStore.getRecord(uid);
      const now = Date.now();
      const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1e3;
      let count = current.offenseCount;
      if (current.lastOffenseAt > 0 && now - current.lastOffenseAt > FOURTEEN_DAYS_MS) {
        count = 0;
      }
      count += 1;
      let lockoutUntil = current.lockoutUntil;
      let banned = current.banned;
      if (count === 1 || count === 2) {
      } else if (count === 3) {
        lockoutUntil = now + 30 * 60 * 1e3;
      } else if (count === 4) {
        lockoutUntil = now + 24 * 60 * 60 * 1e3;
      } else if (count >= 5) {
        banned = true;
      }
      const updatedRecord = {
        offenseCount: count,
        lastOffenseAt: now,
        lockoutUntil,
        banned
      };
      const subDocRef = doc(db, `Users/${uid}/matchAbuse/v1`);
      await setDoc(subDocRef, updatedRecord);
      console.log(`[MatchAbuseStore] Recorded offense for ${uid}: tier ${count}, lockoutUntil ${lockoutUntil}, banned ${banned}`);
      return updatedRecord;
    } catch (err) {
      console.error(`[MatchAbuseStore] Failed to record offense for ${uid}:`, err);
      return { ...DEFAULT_RECORD };
    }
  }
  /**
   * Helper to check if a user is currently locked out or banned from matchmaking.
   */
  static async isLockedOut(uid) {
    const rec = await _MatchAbuseStore.getRecord(uid);
    if (rec.banned) return true;
    if (rec.lockoutUntil > Date.now()) return true;
    return false;
  }
};

// server/Matchmaker.ts
var MATCHMAKER_MAX_WAIT_SECONDS = 45;
var MATCHMAKER_BOT_FILL_WAIT_SECONDS = 90;
var Matchmaker = class {
  constructor() {
    this.queue = [];
    this.pendingMatches = /* @__PURE__ */ new Map();
    this.poolInterval = null;
    this.poolInterval = setInterval(() => {
      this.evaluateAllPools();
    }, 1e3);
  }
  async addPlayerToPool(playerId, reqUid, channel, mapId = "map_1_facility", classId = "ASSAULT", displayName, requestedPrimaryWeaponId, requestedSecondaryWeaponId) {
    const uid = reqUid || playerId;
    this.removePlayerFromPool(playerId);
    const validClassId = CLASSES[classId] ? classId : "ASSAULT";
    const primaryWeaponId = requestedPrimaryWeaponId && isRuntimeWeaponId(requestedPrimaryWeaponId) && isClassWeaponAllowed(validClassId, "primary", requestedPrimaryWeaponId) ? requestedPrimaryWeaponId : getClassWeaponId(validClassId, "primary");
    const secondaryWeaponId = requestedSecondaryWeaponId && isRuntimeWeaponId(requestedSecondaryWeaponId) && isClassWeaponAllowed(validClassId, "secondary", requestedSecondaryWeaponId) ? requestedSecondaryWeaponId : getClassWeaponId(validClassId, "secondary");
    const queuedPlayer = {
      id: playerId,
      reqUid: uid,
      displayName,
      channel,
      joinedTimestamp: Date.now(),
      mapId: mapId || "map_1_facility",
      classId: validClassId,
      primaryWeaponId,
      secondaryWeaponId
    };
    this.queue.push(queuedPlayer);
    console.log(
      `[MATCHMAKER] Player ${playerId} added to pool for map "${queuedPlayer.mapId}" with class "${queuedPlayer.classId}". Queue size: ${this.getQueueSizeForMap(queuedPlayer.mapId)}`
    );
    channel.emit("reliable_event", {
      type: "MATCHMAKING_STATUS",
      status: "QUEUED",
      mapId: queuedPlayer.mapId,
      queueSize: this.getQueueSizeForMap(queuedPlayer.mapId),
      minPlayers: 4,
      maxPlayers: 10
    });
    MatchAbuseStore.isLockedOut(uid).then((isLocked) => {
      if (isLocked) {
        console.log(`[MATCHMAKER] Rejecting player ${playerId} (${uid}) from pool: Account locked out or banned due to match abandonment.`);
        this.removePlayerFromPool(playerId);
        channel.emit("reliable_event", {
          type: "MATCHMAKING_ERROR",
          message: "Account locked out due to match abandonment penalties."
        });
      }
    }).catch(() => {
    });
    this.evaluatePool(queuedPlayer.mapId);
  }
  removePlayerFromPool(playerId) {
    const initialLen = this.queue.length;
    this.queue = this.queue.filter((p) => p.id !== playerId && p.reqUid !== playerId);
    if (this.queue.length < initialLen) {
      console.log(`[MATCHMAKER] Player ${playerId} removed from pool.`);
    }
  }
  getQueueSizeForMap(mapId) {
    return this.queue.filter((p) => p.mapId === mapId).length;
  }
  shutdown() {
    if (this.poolInterval) clearInterval(this.poolInterval);
    for (const pending of this.pendingMatches.values()) {
      if (pending.countdownTimer) clearInterval(pending.countdownTimer);
    }
    this.pendingMatches.clear();
    this.queue = [];
  }
  evaluateAllPools() {
    const maps = new Set(this.queue.map((p) => p.mapId));
    maps.forEach((mapId) => this.evaluatePool(mapId));
    for (const queuedPlayer of this.queue) {
      queuedPlayer.channel.emit("reliable_event", {
        type: "MATCHMAKING_STATUS",
        status: "QUEUED",
        mapId: queuedPlayer.mapId,
        queueSize: this.getQueueSizeForMap(queuedPlayer.mapId),
        minPlayers: 4,
        maxPlayers: 10
      });
    }
  }
  evaluatePool(mapId) {
    const mapQueue = this.queue.filter((p) => p.mapId === mapId);
    if (mapQueue.length === 0) return;
    const now = Date.now();
    let shouldFormMatch = false;
    let botCount = 0;
    if (mapQueue.length >= 10) {
      shouldFormMatch = true;
      botCount = 0;
    } else {
      const oldestPlayer = mapQueue.reduce(
        (oldest, p) => p.joinedTimestamp < oldest.joinedTimestamp ? p : oldest
      );
      const waitedSeconds = (now - oldestPlayer.joinedTimestamp) / 1e3;
      if (waitedSeconds >= MATCHMAKER_MAX_WAIT_SECONDS) {
        if (mapQueue.length >= 4) {
          shouldFormMatch = true;
          botCount = 0;
          console.log(
            `[MATCHMAKER] Max wait timeout (${MATCHMAKER_MAX_WAIT_SECONDS}s) reached for player ${oldestPlayer.id}. Starting match with ${mapQueue.length} real players.`
          );
        } else if (waitedSeconds >= MATCHMAKER_BOT_FILL_WAIT_SECONDS) {
          shouldFormMatch = true;
          botCount = 4 - mapQueue.length;
          console.log(
            `[MATCHMAKER] Bot-fill timeout (${MATCHMAKER_BOT_FILL_WAIT_SECONDS}s) reached for player ${oldestPlayer.id}. Starting match with ${mapQueue.length} real players and ${botCount} bots.`
          );
        } else {
          console.log(
            `[MATCHMAKER] First-tier timeout reached (${waitedSeconds.toFixed(1)}s) but only ${mapQueue.length} real players present (min 4 required). Waiting for more human players or bot-fill threshold (${MATCHMAKER_BOT_FILL_WAIT_SECONDS}s)...`
          );
        }
      }
    }
    if (shouldFormMatch) {
      const matchSize = Math.min(10, mapQueue.length);
      const matchedGroup = mapQueue.slice(0, matchSize);
      const matchedIds = new Set(matchedGroup.map((p) => p.id));
      this.queue = this.queue.filter((p) => !matchedIds.has(p.id));
      this.formMatch(matchedGroup, mapId, botCount);
    }
  }
  formMatch(group, mapId, botCount = 0) {
    const matchId = `M_POOL_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
    if (botCount > 0) {
      console.log(
        `[MATCHMAKER] Forming bot-filled match "${matchId}" on map "${mapId}" with ${group.length} real human players and ${botCount} bots (total: ${group.length + botCount}).`
      );
    } else {
      console.log(
        `[MATCHMAKER] Forming match "${matchId}" on map "${mapId}" with ${group.length} real human players (no bots).`
      );
    }
    const targetRoom = MatchManager_default.getOrCreateRoom(
      matchId,
      process.env.GEMINI_API_KEY,
      mapId
    );
    for (let i = 0; i < botCount; i++) {
      if (typeof targetRoom.registerBotPlayer === "function") {
        targetRoom.registerBotPlayer();
      }
    }
    const pendingGroup = {
      matchId,
      mapId,
      room: targetRoom,
      players: group,
      loadingComplete: /* @__PURE__ */ new Set(),
      countdownTimer: null,
      countdownRemaining: 10,
      hasStartedCountdown: false
    };
    this.pendingMatches.set(matchId, pendingGroup);
    group.forEach((p) => {
      const prevRoom = p.channel.currentRoom;
      if (prevRoom && prevRoom !== targetRoom) {
        prevRoom.removePlayer(p.reqUid || p.id);
      }
      p.channel.currentRoom = targetRoom;
      const newPState = targetRoom.registerPlayer(p.reqUid || p.id, p.channel, null, p.classId, p.displayName, p.reqUid, p.primaryWeaponId, p.secondaryWeaponId);
      const bindRoomExecution = p.channel.bindRoomExecution;
      const execution = roomAllocator.getExecution(matchId) || new InProcessRoomExecution(targetRoom);
      if (bindRoomExecution && typeof bindRoomExecution === "function") {
        bindRoomExecution(execution, newPState);
      }
      const onMatchFormed = p.channel.onMatchFormed;
      if (onMatchFormed && typeof onMatchFormed === "function") {
        onMatchFormed(targetRoom, newPState);
      }
      p.channel.emit("reliable_event", {
        type: "MATCH_FOUND",
        matchId,
        mapId,
        status: "LOADING_ASSETS"
      });
    });
    setTimeout(() => {
      const pending = this.pendingMatches.get(matchId);
      if (pending && !pending.hasStartedCountdown) {
        console.log(`[MATCHMAKER] Loading window ended for match "${matchId}". Transitioning to pre-match countdown.`);
        this.startPreMatchCountdown(pending);
      }
    }, 6e3);
  }
  signalPlayerLoadingComplete(matchId, playerId) {
    const pending = this.pendingMatches.get(matchId);
    if (!pending) return;
    pending.loadingComplete.add(playerId);
    console.log(
      `[MATCHMAKER] Player ${playerId} loading complete for match "${matchId}" (${pending.loadingComplete.size}/${pending.players.length})`
    );
    if (pending.loadingComplete.size >= pending.players.length && !pending.hasStartedCountdown) {
      this.startPreMatchCountdown(pending);
    }
  }
  handlePlayerClassChange(matchId, playerId, newClassId) {
    const pending = this.pendingMatches.get(matchId);
    if (pending && pending.room) {
      pending.room.applyPlayerClassLoadout(playerId, newClassId);
    }
  }
  startPreMatchCountdown(pending) {
    if (pending.hasStartedCountdown) return;
    pending.hasStartedCountdown = true;
    pending.countdownRemaining = 10;
    console.log(`[MATCHMAKER] 10-second pre-match countdown started for match "${pending.matchId}". Class switching allowed.`);
    pending.room.broadcastReliableEvent({
      type: "PRE_MATCH_COUNTDOWN",
      countdownSeconds: pending.countdownRemaining
    });
    pending.countdownTimer = setInterval(() => {
      pending.countdownRemaining--;
      if (pending.countdownRemaining > 0) {
        pending.room.broadcastReliableEvent({
          type: "PRE_MATCH_COUNTDOWN_TICK",
          countdownSeconds: pending.countdownRemaining
        });
      } else {
        clearInterval(pending.countdownTimer);
        this.launchMatch(pending);
      }
    }, 1e3);
  }
  launchMatch(pending) {
    console.log(`[MATCHMAKER] Pre-match countdown complete for "${pending.matchId}". Triggering match start with duration ${ACTIVE_GAMEMODE.matchDuration}s.`);
    pending.room.triggerStartMatch();
    this.pendingMatches.delete(pending.matchId);
  }
};
var matchmaker = new Matchmaker();

// shared/gates/production.gate.ts
var import_meta2 = {};
var IS_DEV = (() => {
  if (typeof window !== "undefined") {
    return !!import_meta2.env?.DEV;
  }
  return process.env.NODE_ENV !== "production";
})();

// server/dev/dev-commands.ts
function registerDevCommands(channel, db2, getRoom, getPlayer) {
  if (!IS_DEV && process.env.VEXEA_BENCHMARK_CONTROL !== "true") return;
  channel.on("dev_spawn_bots", (args) => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    const count = typeof args.count === "number" ? args.count : 3;
    currentRoom2.spawnTestBots(count);
  });
  channel.on("dev_set_class", async (args) => {
    const currentRoom2 = getRoom();
    const pState = getPlayer();
    if (!currentRoom2 || !pState) return;
    const requestedClassStr = args?.playerClass || args?.class;
    if (!requestedClassStr) return;
    const classId = typeof requestedClassStr === "string" ? requestedClassStr.toUpperCase() : "ASSAULT";
    if (!(classId in CLASSES)) return;
    let primaryWeaponId;
    let secondaryWeaponId;
    if (db2 && pState.reqUid) {
      try {
        const userDoc = await db2.collection("Users").doc(pState.reqUid).get();
        if (userDoc && userDoc.exists) {
          const data = userDoc.data();
          const classLoadout = data?.armory?.loadouts?.[classId];
          if (Array.isArray(classLoadout)) {
            const primaryItem = classLoadout.find((item) => item?.slotName === "PRIMARY");
            const secondaryItem = classLoadout.find((item) => item?.slotName === "SECONDARY");
            if (primaryItem?.weaponKey) primaryWeaponId = primaryItem.weaponKey;
            if (secondaryItem?.weaponKey) secondaryWeaponId = secondaryItem.weaponKey;
          }
        }
      } catch (err) {
        console.warn(`[DEV] Failed to fetch loadout for ${classId} from Firestore:`, err);
      }
    }
    currentRoom2.applyPlayerClassLoadout(pState, classId, primaryWeaponId, secondaryWeaponId);
  });
  channel.on("dev_spawn_cube", (args) => {
    const currentRoom2 = getRoom();
    const pState = getPlayer();
    if (!currentRoom2 || !pState) return;
    currentRoom2.devSpawnCube(pState.id, args);
  });
  channel.on("dev_clear_cube", () => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    currentRoom2.devClearCube();
  });
  channel.on("dev_set_gravity_y", (args) => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    if (args && typeof args.gravityY === "number") {
      currentRoom2.setDevPhysicsGravityY(args.gravityY);
    }
  });
  channel.on("dev_set_speed_multiplier", (args) => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    if (args && typeof args.speedMultiplier === "number") {
      currentRoom2.setDevPhysicsSpeedMultiplier(args.speedMultiplier);
    }
  });
  channel.on("dev_set_paused", (args) => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    if (args && typeof args.paused === "boolean") {
      currentRoom2.setDevPhysicsPaused(args.paused);
    }
  });
  channel.on("dev_step_once", () => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    currentRoom2.setDevPhysicsStepOnce();
  });
  channel.on("dev_spawn_drone", (args) => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    const type = typeof args.type === "number" ? args.type : Number(args.type);
    const pos = args.x !== void 0 && args.y !== void 0 && args.z !== void 0 ? { x: Number(args.x), y: Number(args.y), z: Number(args.z) } : void 0;
    currentRoom2.registerDeveloperSpawner(type, pos);
  });
  channel.on("benchmark_spawn_projectiles", (args) => {
    if (process.env.VEXEA_BENCHMARK_CONTROL !== "true") return;
    const currentRoom2 = getRoom();
    const pState = getPlayer();
    if (!currentRoom2 || !pState) return;
    const count = Math.max(0, Math.min(200, Math.floor(Number(args?.count) || 0)));
    for (let i = 0; i < count; i += 1) {
      currentRoom2.spawnServerProjectile(
        pState.posX,
        pState.posY,
        pState.posZ,
        Math.sin(pState.yaw + i * 0.05),
        0,
        Math.cos(pState.yaw + i * 0.05),
        false,
        1,
        pState.id
      );
    }
  });
  channel.on("dev_clear_drones", () => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    for (let i = 0; i < currentRoom2.drones.length; i++) {
      currentRoom2.drones[i].state = 5 /* DEAD */;
    }
  });
  channel.on("dev_spawn_frozen_drone", (args) => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    const success = currentRoom2.registerDeveloperSpawner(args.type, { x: args.x, y: args.y, z: args.z });
    if (success) {
      const spawnedDrone = currentRoom2.drones.find((x) => x.id === currentRoom2.nextDroneId - 1);
      if (spawnedDrone) {
        spawnedDrone.isFrozen = true;
      }
    }
  });
  channel.on("dev_clear_frozen", () => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    for (let i = 0; i < currentRoom2.drones.length; i++) {
      if (currentRoom2.drones[i].isFrozen) {
        currentRoom2.despawnDrone(currentRoom2.drones[i]);
      }
    }
  });
  channel.on("dev_toggle_llm", (args) => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    currentRoom2.llmCommanderDisabled = !!args?.disabled;
    console.log(`[VEXEA SERVER] LLM Commander disabled toggle processed: ${currentRoom2.llmCommanderDisabled}`);
  });
  channel.on("dev_interview_llm", async (args) => {
    const currentRoom2 = getRoom();
    const question = args?.question;
    if (!question || typeof question !== "string" || !question.trim()) return;
    if (currentRoom2 && currentRoom2.llmCommander) {
      const answer = await currentRoom2.llmCommander.interviewLLM(question.trim());
      channel.emit("dev_llm_interview_response", {
        question: question.trim(),
        answer,
        timestamp: Date.now()
      });
    } else {
      channel.emit("dev_llm_interview_response", {
        question: question.trim(),
        answer: "ERROR: MatchRoom or LLM Commander unavailable.",
        timestamp: Date.now()
      });
    }
  });
  channel.on("refill_credits", async (args) => {
    const pState = getPlayer();
    const reqUid = args?.uid || pState?.id;
    if (!reqUid) return;
    try {
      await db2.collection("Users").doc(reqUid).update({
        credits: 1e3,
        energy: 1e3
      });
      console.log(`[VEXEA SERVER] Processed Dev Credits Refill for ${reqUid}`);
      if (pState && pState.id === reqUid) {
      }
    } catch (err) {
      console.error("[VEXEA SERVER] Dev Credits Refill failed:", err);
    }
  });
  channel.on("dev_set_class", (args) => {
    const currentRoom2 = getRoom();
    const pState = getPlayer();
    if (!currentRoom2 || !pState) return;
    if (args.playerClass) {
      const classId = args.playerClass.toUpperCase();
      if (CLASSES[classId]) {
        currentRoom2.applyPlayerClassLoadout(pState.id, classId);
      }
    }
  });
  channel.on("dev_set_position", (args) => {
    const pState = getPlayer();
    if (!pState) return;
    if (args.position) {
      pState.posX = args.position.x;
      pState.posY = args.position.y;
      pState.posZ = args.position.z;
      if (pState.body) {
        pState.body.setNextKinematicTranslation({
          x: pState.posX,
          y: pState.posY,
          z: pState.posZ
        });
      }
      console.log(`[DEV DEBUG] Force positioned player ${pState.id} to:`, args.position);
    }
  });
  channel.on("dev_toggle_god_mode", (args) => {
    const pState = getPlayer();
    if (!pState) return;
    pState.godMode = !!args?.godMode;
    console.log(`[SERVER DEV EVENT] Player ${pState.id} God Mode toggled:`, pState.godMode);
  });
  channel.on("dev_toggle_infinite_ammo", (args) => {
    const pState = getPlayer();
    if (!pState) return;
    pState.infiniteAmmo = !!args?.infiniteAmmo;
    console.log(`[SERVER DEV EVENT] Player ${pState.id} Infinite Ammo toggled:`, pState.infiniteAmmo);
  });
  channel.on("dev_set_hp", (args) => {
    const pState = getPlayer();
    if (!pState) return;
    if (typeof args?.hp === "number") {
      pState.hp = args.hp;
      pState.channel.emit("reliable_event", {
        type: "PLAYER_HIT",
        hp: pState.hp,
        rawDamage: 0
      });
      console.log(`[SERVER DEV EVENT] Player ${pState.id} HP set to:`, pState.hp);
    }
  });
  channel.on("dev_nuke_drones", () => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    console.log(`[SERVER DEV EVENT] Nuking all active drones on map`);
    for (let i = 0; i < currentRoom2.drones.length; i++) {
      currentRoom2.drones[i].hp = 0;
      currentRoom2.drones[i].state = 5 /* DEAD */;
    }
  });
  channel.on("dev_force_match_end", (args) => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    const result = args?.result === "win" ? "win" : "loss";
    console.log(`[SERVER DEV EVENT] Forcing match end with result:`, result);
    currentRoom2.handleMatchEnd(result);
  });
  channel.on("debug_get_state", () => {
    const currentRoom2 = getRoom();
    if (!currentRoom2) return;
    const state = {
      players: Array.from(currentRoom2.players.values()).map((p) => ({
        id: p.id,
        pos: { x: p.posX, y: p.posY, z: p.posZ }
      })),
      drones: currentRoom2.drones.filter((d) => d.state !== 5 /* DEAD */).map((d) => ({
        id: d.id,
        type: d.type,
        pos: { x: d.posX, y: d.posY, z: d.posZ }
      })),
      buildings: currentRoom2.collisionMap?.boxes || []
    };
    channel.emit("debug_state_response", state);
  });
}

// server/transport/handlers/matchmaking-handlers.ts
function registerMatchmakingHandlers(channel, playerId, getRoom, getPlayer, matchmaker2, connectionRegistry2, getRoomExecution) {
  const getExec = () => {
    if (getRoomExecution) return getRoomExecution();
    return channel.roomExecution || null;
  };
  const handleMatchmakingRequest = async (args) => {
    const reqUid = args?.uid || playerId;
    const reqMap = args?.mapId || args?.map?.id || "map_1_facility";
    const reqClass = args?.class || args?.playerClass || "ASSAULT";
    const reqPrimaryWeaponId = typeof args?.primaryWeaponId === "string" ? args.primaryWeaponId : void 0;
    const reqSecondaryWeaponId = typeof args?.secondaryWeaponId === "string" ? args.secondaryWeaponId : void 0;
    const reqDisplayName = args?.displayName || args?.name || args?.userName;
    console.log(
      `[VEXEA SERVER] Player ${playerId} (${reqDisplayName || "NoName"}) requesting matchmaking (Map: ${reqMap}, Class: ${reqClass}, DevQuickStart: ${!!args?.isDevQuickStart})`
    );
    if (args?.isDevQuickStart) {
      const devMatchId = args?.matchId || `M_DEV_${Math.floor(Math.random() * 1e6)}`;
      console.log(`[VEXEA SERVER] Dev Quick Start match initialization: ${devMatchId} on map ${reqMap}`);
      const execution = await roomAllocator.allocate(devMatchId, process.env.GEMINI_API_KEY, reqMap);
      const isForked = execution instanceof ForkedRoomExecution;
      const targetRoom = isForked ? null : execution.getRoom();
      const curRoom = getRoom();
      const curPState = getPlayer();
      if (curRoom && curPState && curRoom !== targetRoom) {
        curRoom.removePlayer(curPState.id);
      }
      channel.roomExecution = execution;
      channel.currentRoom = targetRoom;
      let initialPState = null;
      if (isForked) {
        await execution.registerPlayer(
          playerId,
          reqClass,
          reqDisplayName,
          reqUid,
          reqPrimaryWeaponId,
          reqSecondaryWeaponId
        );
        initialPState = {
          id: playerId,
          reqUid,
          displayName: reqDisplayName || playerId,
          classId: reqClass,
          isAlive: true,
          lastSequence: 0
        };
        channel.pState = initialPState;
      } else if (targetRoom) {
        initialPState = targetRoom.registerPlayer(playerId, channel, null, reqClass, reqDisplayName, reqUid, reqPrimaryWeaponId, reqSecondaryWeaponId);
        channel.pState = initialPState;
      }
      if (channel.isPlayerReady) {
        execution.send(playerId, { type: "PLAYER_READY" });
        if (targetRoom) {
          targetRoom.setPlayerReady(playerId);
        }
      }
      execution.onOutbound((target, event) => {
        if (target === "broadcast" || target === playerId) {
          if (event.type === "MATCH_FORMED") {
            if (!isForked) {
              channel.currentRoom = execution.getRoom();
            }
            channel.roomExecution = execution;
            channel.pState = event.playerState || initialPState;
          }
        }
      });
      return;
    }
    channel.bindRoomExecution = (execution, state) => {
      channel.roomExecution = execution;
      channel.currentRoom = execution.getRoom ? execution.getRoom() : null;
      channel.pState = state;
      execution.onOutbound((target, event) => {
        if (target === "broadcast" || target === playerId) {
          if (event.type === "MATCH_FORMED") {
            channel.currentRoom = execution.getRoom ? execution.getRoom() : null;
            channel.roomExecution = execution;
            channel.pState = event.playerState || state;
          }
        }
      });
    };
    matchmaker2.addPlayerToPool(playerId, reqUid, channel, reqMap, reqClass, reqDisplayName, reqPrimaryWeaponId, reqSecondaryWeaponId);
  };
  channel.on("start_match", handleMatchmakingRequest);
  channel.on("request_matchmaking", handleMatchmakingRequest);
  channel.on("cancel_matchmaking", () => {
    matchmaker2.removePlayerFromPool(playerId);
  });
  channel.on("loading_complete", (args) => {
    channel.loadingComplete = true;
    if (args?.matchId) {
      matchmaker2.signalPlayerLoadingComplete(args.matchId, playerId);
    }
  });
  channel.on("player_ready", () => {
    channel.isPlayerReady = true;
    const roomExec = getExec();
    const p = getPlayer();
    if (roomExec && p) {
      roomExec.send(p.id, { type: "PLAYER_READY" });
    } else if (roomExec) {
      roomExec.send(playerId, { type: "PLAYER_READY" });
    } else {
      const activeRoom = getRoom();
      if (activeRoom && p) {
        activeRoom.setPlayerReady(p.id);
      }
    }
  });
  channel.on("PLAYER_QUIT", async () => {
    matchmaker2.removePlayerFromPool(playerId);
    const p = getPlayer();
    const roomExec = getExec();
    if (p && roomExec) {
      console.log(`Player quit mission manually (explicit abandon): ${p.id}`);
      await roomExec.send(p.id, { type: "PLAYER_QUIT" });
    } else {
      const room = getRoom();
      if (p && room) {
        console.log(`Player quit mission manually (explicit abandon): ${p.id}`);
        await room.handlePlayerAbandonment(p.id);
      }
    }
    try {
      channel.emit("disconnect", {});
    } catch (e) {
    }
  });
}

// server/transport/handlers/gameplay-handlers.ts
function registerGameplayHandlers(channel, playerId, getRoomExecution, getPlayer) {
  channel.onRaw((message) => {
    const p = getPlayer();
    if (!p) return;
    const buffer = message;
    if (buffer.byteLength >= 20) {
      const dataView = new DataView(buffer);
      const seq = dataView.getUint32(0, true);
      const inputMask = dataView.getUint8(4);
      const pitch = dataView.getFloat32(5, true);
      const yaw = dataView.getFloat32(9, true);
      if (seq > p.lastSequence) {
        p.lastSequence = seq;
        const roomExec = typeof getRoomExecution === "function" ? getRoomExecution() : getRoomExecution;
        if (roomExec) {
          roomExec.send(p.id, {
            type: "INPUT",
            seq,
            inputMask,
            pitch,
            yaw
          });
        } else {
          p.pitch = pitch;
          p.yaw = yaw;
          p.inputMask = inputMask;
        }
      }
    }
  });
  const handleReliableGameplayEvent = (args) => {
    if (!args || typeof args !== "object") return;
    const roomExec = typeof getRoomExecution === "function" ? getRoomExecution() : getRoomExecution;
    const p = getPlayer();
    if (!roomExec || !p) return;
    if (!p.isAlive) return;
    const type = args.type;
    if (type === "USE_UTILITY") {
      const slot = args.slot;
      if (slot) {
        roomExec.send(p.id, { type: "USE_UTILITY", slot });
      }
      return;
    }
    if (type === "OBJECTIVE_HOLD") {
      roomExec.send(p.id, { type: "OBJECTIVE_HOLD", holding: !!args.holding });
      return;
    }
    if (type === "TOGGLE_FIRE_MODE") {
      roomExec.send(p.id, { type: "TOGGLE_FIRE_MODE" });
      return;
    }
    if (type === "RELOAD") {
      const slot = args.weaponSlot;
      if (slot) {
        roomExec.send(p.id, { type: "RELOAD", weaponSlot: slot });
      }
      return;
    }
    if (type === "CANCEL_RELOAD") {
      const slot = args.weaponSlot;
      if (slot) {
        roomExec.send(p.id, { type: "CANCEL_RELOAD", weaponSlot: slot });
      }
      return;
    }
    if (type === "FIRE") {
      roomExec.send(p.id, { type: "FIRE", ...args });
      return;
    }
  };
  channel.on("reliable_event", handleReliableGameplayEvent);
}

// server/transport/handlers/social-handlers.ts
function registerSocialHandlers(channel, playerId, getRoomExecution, getPlayer) {
  const handleSocialReliableEvent = (args) => {
    if (!args || typeof args !== "object") return;
    const roomExec = typeof getRoomExecution === "function" ? getRoomExecution() : getRoomExecution;
    const p = getPlayer();
    if (args.type === "CHAT_MESSAGE") {
      if (!roomExec) return;
      const message = args.message;
      if (message && typeof message === "string" && message.trim().length > 0) {
        const trimmed = message.trim().slice(0, 150);
        const sender = p?.displayName || p?.id || playerId;
        roomExec.send("broadcast", {
          type: "CHAT_MESSAGE",
          sender,
          message: trimmed
        });
      }
      return;
    }
    if (args.type === "QUICK_COMM") {
      if (!roomExec) return;
      const optionId = args.optionId;
      if (optionId && typeof optionId === "string") {
        const sender = p?.displayName || p?.id || playerId;
        roomExec.send("broadcast", {
          type: "QUICK_COMM",
          sender,
          optionId
        });
      }
      return;
    }
  };
  channel.on("reliable_event", handleSocialReliableEvent);
  channel.on("CHAT_MESSAGE", (args) => {
    const roomExec = typeof getRoomExecution === "function" ? getRoomExecution() : getRoomExecution;
    const p = getPlayer();
    if (!roomExec) return;
    const message = typeof args === "string" ? args : args?.message;
    if (message && typeof message === "string" && message.trim().length > 0) {
      const trimmed = message.trim().slice(0, 150);
      const sender = p?.displayName || p?.id || playerId;
      roomExec.send("broadcast", {
        type: "CHAT_MESSAGE",
        sender,
        message: trimmed
      });
    }
  });
  channel.on("QUICK_COMM", (args) => {
    const roomExec = typeof getRoomExecution === "function" ? getRoomExecution() : getRoomExecution;
    const p = getPlayer();
    if (!roomExec) return;
    const optionId = typeof args === "string" ? args : args?.optionId;
    if (optionId && typeof optionId === "string") {
      const sender = p?.displayName || p?.id || playerId;
      roomExec.send("broadcast", {
        type: "QUICK_COMM",
        sender,
        optionId
      });
    }
  });
}

// server/transport/handlers/connection-handlers.ts
function registerConnectionHandlers(channel, playerId, getRoom, getPlayer, db2, doc2, updateDoc2) {
  channel.on("ping", () => {
    channel.emit("pong", { serverTime: Date.now() });
  });
  channel.on("latency_report", (data) => {
    if (typeof data?.latency === "number") {
      const p = getPlayer();
      if (p) {
        p.ping = data.latency;
      }
      channel.ping = data.latency;
    }
  });
  channel.on("rewarded_ad", () => {
    const p = getPlayer();
    if (p) {
      p.adMultiplier = 2;
    }
  });
  channel.on("select_class", async (args) => {
    const newClassId = args?.classId || args?.class;
    if (newClassId && CLASSES[newClassId]) {
      const room = getRoom();
      if (args?.matchId) {
        matchmaker.handlePlayerClassChange(args.matchId, playerId, newClassId);
      } else if (room) {
        room.applyPlayerClassLoadout(playerId, newClassId);
      } else if (args?.reqUid || args?.uid) {
        const uid = args.reqUid || args.uid;
        try {
          const userRef = doc2(db2, "Users", uid);
          await updateDoc2(userRef, { selectedClass: newClassId });
        } catch (e) {
        }
      }
    }
  });
}

// shared/catalog.json
var catalog_default = [
  {
    id: "test_skin",
    title: "VX-88 Test Coating Assembly",
    category: "cosmetic",
    faction: "ANY",
    priceCredits: 100,
    priceEnergy: 0,
    currency: "credits",
    requiredLevel: 1,
    description: "Cyan-themed technical coating pattern for skin application testing.",
    featured: true,
    discountPercentage: 30,
    icon: "\u{1F3A8}"
  },
  {
    id: "cosmetic_apex_plating",
    title: "Apex Vanguard Composite Plating",
    category: "cosmetic",
    faction: "apex",
    priceCredits: 250,
    priceEnergy: 0,
    currency: "credits",
    requiredLevel: 1,
    description: "Reinforced composite chassis plating embossed with the Apex Operative insignia.",
    featured: false,
    discountPercentage: 0,
    icon: "\u{1F6E1}\uFE0F"
  },
  {
    id: "cosmetic_nexus_visor",
    title: "Nexus Spectral Visor Coating",
    category: "cosmetic",
    faction: "nexus",
    priceCredits: 450,
    priceEnergy: 0,
    currency: "credits",
    requiredLevel: 2,
    description: "Enhanced anti-glare optical visor coating with customized HUD spectrum filter.",
    featured: false,
    discountPercentage: 0,
    icon: "\u{1F441}\uFE0F"
  },
  {
    id: "blueprint_neural_mk2",
    title: "Neural Link Mk. II Blueprint",
    category: "blueprint",
    faction: "ANY",
    priceCredits: 900,
    priceEnergy: 0,
    currency: "credits",
    requiredLevel: 1,
    description: "Advanced telemetry interface blueprint reducing AI command routing latency.",
    featured: true,
    discountPercentage: 20,
    icon: "\u{1F9E0}"
  },
  {
    id: "blueprint_quantum_chassis",
    title: "Quantum Drone Chassis Blueprint",
    category: "blueprint",
    faction: "vanguard",
    priceCredits: 1400,
    priceEnergy: 0,
    currency: "credits",
    requiredLevel: 3,
    description: "Titanium-alloy chassis blueprint with specialized core power routing layout.",
    featured: false,
    discountPercentage: 0,
    icon: "\u2699\uFE0F"
  },
  {
    id: "booster_xp_24h",
    title: "24-Hour Operations Energy Booster",
    category: "booster",
    faction: "ANY",
    priceCredits: 0,
    priceEnergy: 50,
    currency: "energy",
    requiredLevel: 1,
    description: "Tactical energy surge unit providing 24 hours of accelerated combat performance.",
    featured: false,
    discountPercentage: 0,
    icon: "\u26A1"
  },
  {
    id: "bundle_apex_vanguard",
    title: "Apex Vanguard Operative Bundle",
    category: "bundle",
    faction: "apex",
    priceCredits: 0,
    priceEnergy: 250,
    currency: "energy",
    requiredLevel: 1,
    description: "Includes Apex composite plating, neural blueprint, and 24h energy booster.",
    featured: true,
    discountPercentage: 25,
    icon: "\u{1F381}",
    contains: [
      "cosmetic_apex_plating",
      "blueprint_neural_mk2",
      "booster_xp_24h"
    ]
  },
  {
    id: "bundle_ultimate_supply",
    title: "Central Armory Supply Crate",
    category: "bundle",
    faction: "ANY",
    priceCredits: 0,
    priceEnergy: 450,
    currency: "energy",
    requiredLevel: 1,
    description: "Comprehensive tactical supply crate containing complete blueprint & skin suite.",
    featured: false,
    discountPercentage: 15,
    icon: "\u{1F4E6}",
    contains: [
      "test_skin",
      "cosmetic_nexus_visor",
      "blueprint_quantum_chassis"
    ]
  }
];

// server/data/economy-service.ts
function getCatalogItems() {
  return catalog_default;
}
var ServerEconomyService = class _ServerEconomyService {
  constructor() {
  }
  static getInstance() {
    if (!_ServerEconomyService.instance) {
      _ServerEconomyService.instance = new _ServerEconomyService();
    }
    return _ServerEconomyService.instance;
  }
  getOffers(discountActive, creditMultiplier) {
    const mult = creditMultiplier || 1;
    return getCatalogItems().map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      priceCredits: Math.round(item.priceCredits * mult),
      priceEnergy: item.priceEnergy,
      currency: item.currency,
      originalPriceCredits: item.priceCredits,
      discountPercentage: discountActive ? item.discountPercentage || 20 : 0,
      category: item.category,
      icon: item.icon || "\u{1F4E6}",
      featured: !!item.featured,
      itemType: item.id,
      contains: item.contains
    }));
  }
  getFactionSectors(warMultiplier) {
    const m = warMultiplier || 1;
    return [
      {
        id: "sector_alpha",
        name: "Sector Alpha - Orbital Spire",
        controller: "apex",
        controlPercentage: Math.min(100, Math.round(62 * m)),
        activeBattles: 4,
        resourceYield: 1500,
        defenseLevel: 4
      },
      {
        id: "sector_beta",
        name: "Sector Beta - Subterranean Foundry",
        controller: "vanguard",
        controlPercentage: Math.min(100, Math.round(54 * m)),
        activeBattles: 7,
        resourceYield: 2200,
        defenseLevel: 5
      },
      {
        id: "sector_gamma",
        name: "Sector Gamma - Central Habitation Core",
        controller: "nexus",
        controlPercentage: Math.min(100, Math.round(48 * m)),
        activeBattles: 2,
        resourceYield: 1100,
        defenseLevel: 3
      },
      {
        id: "sector_delta",
        name: "Sector Delta - Wasteland Relay",
        controller: "contested",
        controlPercentage: 50,
        activeBattles: 12,
        resourceYield: 3400,
        defenseLevel: 2
      }
    ];
  }
};
var serverEconomyService = ServerEconomyService.getInstance();

// shared/battle-pass.ts
function generateSeasonOne() {
  const tiers = [];
  const TIER_COUNT = 50;
  const XP_PER_TIER = 10;
  const startDate = 1785984e6;
  const endDate = startDate + 90 * 24 * 60 * 60 * 1e3;
  for (let i = 0; i <= TIER_COUNT; i++) {
    let freeReward = null;
    if (i === 5) freeReward = { type: "CREDITS", value: 100, label: "100 CREDITS" };
    else if (i === 10) freeReward = { type: "CREDITS", value: 100, label: "100 CREDITS" };
    else if (i === 15) freeReward = { type: "CREDITS", value: 150, label: "150 CREDITS" };
    else if (i === 20) freeReward = { type: "CREDITS", value: 200, label: "200 CREDITS" };
    else if (i === 25) freeReward = { type: "CREDITS", value: 200, label: "200 CREDITS" };
    else if (i === 30) freeReward = { type: "CREDITS", value: 250, label: "250 CREDITS" };
    else if (i === 35) freeReward = { type: "CREDITS", value: 300, label: "300 CREDITS" };
    else if (i === 40) freeReward = { type: "CREDITS", value: 350, label: "350 CREDITS" };
    else if (i === 45) freeReward = { type: "CREDITS", value: 400, label: "400 CREDITS" };
    else if (i === 50) freeReward = { type: "CREDITS", value: 500, label: "500 CREDITS" };
    tiers.push({
      index: i,
      xpRequired: i * XP_PER_TIER,
      freeReward,
      premiumReward: null
      // RESERVED FOR PHASE 2
    });
  }
  return {
    id: "SEASON_01",
    name: "OPERATION: ZERO RESET",
    startDate,
    endDate,
    tiers
  };
}
var BP_SEASON_01 = generateSeasonOne();

// shared/verification/verifier.ts
var MAX_MATCH_KILL_RATE = 2;
var DAILY_CLAIM_INTERVAL_MS = 24 * 60 * 60 * 1e3;
function verifyPostMatchRewards(input) {
  if (!input.playerId) {
    return {
      isApproved: false,
      xpEarned: 0,
      creditsEarned: 0,
      error: { code: "INVALID_PLAYER_ID", message: "Player ID is required for verification." }
    };
  }
  if (input.matchDurationSec < 5) {
    return {
      isApproved: false,
      xpEarned: 0,
      creditsEarned: 0,
      error: { code: "MATCH_DURATION_TOO_SHORT", message: "Match duration was too short for reward qualification." }
    };
  }
  if (input.kills < 0 || input.deaths < 0 || input.damageDealt < 0) {
    return {
      isApproved: false,
      xpEarned: 0,
      creditsEarned: 0,
      error: { code: "NEGATIVE_METRICS_DETECTED", message: "Invalid stats: negative values detected." }
    };
  }
  const killRate = input.kills / Math.max(1, input.matchDurationSec);
  if (killRate > MAX_MATCH_KILL_RATE) {
    return {
      isApproved: false,
      xpEarned: 0,
      creditsEarned: 0,
      error: { code: "EXCESSIVE_KILL_RATE", message: "Kills per second exceeded maximum allowed threshold." }
    };
  }
  const killXp = input.kills * 10;
  const winXp = input.isWin ? 75 : 0;
  const damageXp = Math.floor(input.damageDealt * 0.02);
  const totalXpEarned = 25 + winXp + killXp + damageXp;
  const baseCredits = 5;
  const winCredits = input.isWin ? 15 : 0;
  const killCredits = input.kills * 2;
  const totalCreditsEarned = baseCredits + winCredits + killCredits;
  return {
    isApproved: true,
    xpEarned: totalXpEarned,
    creditsEarned: totalCreditsEarned
  };
}
function verifyPurchase(input, catalogItem) {
  const currentEnergy = input.currentEnergy ?? 0;
  if (!input.playerId) {
    return {
      isApproved: false,
      itemCost: 0,
      remainingCredits: input.currentCredits,
      remainingEnergy: currentEnergy,
      error: { code: "INVALID_PLAYER_ID", message: "Player ID is required for verification." }
    };
  }
  if (!catalogItem) {
    return {
      isApproved: false,
      itemCost: 0,
      remainingCredits: input.currentCredits,
      remainingEnergy: currentEnergy,
      error: { code: "ITEM_NOT_FOUND", message: "Requested item does not exist in catalog." }
    };
  }
  const isEnergyPurchase = catalogItem.currency === "energy";
  const itemCost = isEnergyPurchase ? catalogItem.priceEnergy : catalogItem.priceCredits;
  if (input.unlockedItems && input.unlockedItems.includes(catalogItem.id)) {
    return {
      isApproved: false,
      itemCost,
      remainingCredits: input.currentCredits,
      remainingEnergy: currentEnergy,
      error: { code: "ITEM_ALREADY_UNLOCKED", message: "Item is already present in player unlocked inventory." }
    };
  }
  if (input.currentLevel < catalogItem.requiredLevel) {
    return {
      isApproved: false,
      itemCost,
      remainingCredits: input.currentCredits,
      remainingEnergy: currentEnergy,
      error: {
        code: "REQUIRED_LEVEL_NOT_MET",
        message: `Player level (${input.currentLevel}) is below required level (${catalogItem.requiredLevel}).`
      }
    };
  }
  if (isEnergyPurchase) {
    if (currentEnergy < catalogItem.priceEnergy) {
      return {
        isApproved: false,
        itemCost: catalogItem.priceEnergy,
        remainingCredits: input.currentCredits,
        remainingEnergy: currentEnergy,
        error: {
          code: "INSUFFICIENT_ENERGY",
          message: `Current energy (${currentEnergy}) is insufficient for item price (${catalogItem.priceEnergy}).`
        }
      };
    }
  } else {
    if (input.currentCredits < catalogItem.priceCredits) {
      return {
        isApproved: false,
        itemCost: catalogItem.priceCredits,
        remainingCredits: input.currentCredits,
        remainingEnergy: currentEnergy,
        error: {
          code: "INSUFFICIENT_CREDITS",
          message: `Current credits (${input.currentCredits}) are insufficient for item price (${catalogItem.priceCredits}).`
        }
      };
    }
  }
  const remainingCredits = isEnergyPurchase ? input.currentCredits : input.currentCredits - catalogItem.priceCredits;
  const remainingEnergy = isEnergyPurchase ? currentEnergy - catalogItem.priceEnergy : currentEnergy;
  return {
    isApproved: true,
    itemCost,
    remainingCredits,
    remainingEnergy,
    unlockedItemId: catalogItem.id
  };
}
function verifyAdReward(input) {
  if (!input.playerId) {
    return {
      isApproved: false,
      newEnergy: input.currentEnergy ?? 0,
      adClaimsToday: input.adClaimsToday ?? 0,
      error: { code: "INVALID_PLAYER_ID", message: "Player ID is required for verification." }
    };
  }
  const lastDate = new Date(input.lastAdClaimDate || 0);
  const nowDate = /* @__PURE__ */ new Date();
  const isSameDay = lastDate.getUTCFullYear() === nowDate.getUTCFullYear() && lastDate.getUTCMonth() === nowDate.getUTCMonth() && lastDate.getUTCDate() === nowDate.getUTCDate();
  const effectiveAdClaimsToday = isSameDay ? input.adClaimsToday ?? 0 : 0;
  if (effectiveAdClaimsToday >= 5) {
    return {
      isApproved: false,
      newEnergy: input.currentEnergy ?? 0,
      adClaimsToday: effectiveAdClaimsToday,
      error: { code: "AD_DAILY_CAP_REACHED", message: "Daily ad reward cap reached." }
    };
  }
  const newEnergy = (input.currentEnergy ?? 0) + 3;
  const newAdClaimsToday = effectiveAdClaimsToday + 1;
  return {
    isApproved: true,
    newEnergy,
    adClaimsToday: newAdClaimsToday
  };
}
function verifyClaim(input) {
  if (!input.playerId) {
    return {
      isApproved: false,
      rewardCredits: 0,
      rewardXp: 0,
      rewardEnergy: 0,
      newCredits: input.currentCredits,
      newEnergy: input.currentEnergy,
      error: { code: "INVALID_PLAYER_ID", message: "Player ID is required for verification." }
    };
  }
  if (input.claimType === "DAILY_LOGIN") {
    if (input.lastClaimTimestamp) {
      const elapsed = Date.now() - input.lastClaimTimestamp;
      if (elapsed < DAILY_CLAIM_INTERVAL_MS) {
        return {
          isApproved: false,
          rewardCredits: 0,
          rewardXp: 0,
          rewardEnergy: 0,
          newCredits: input.currentCredits,
          newEnergy: input.currentEnergy,
          error: { code: "DAILY_REWARD_ON_COOLDOWN", message: "Daily reward claim is still on cooldown." }
        };
      }
    }
    const rewardCredits = 100;
    const rewardEnergy = 100;
    return {
      isApproved: true,
      rewardCredits,
      rewardXp: 0,
      rewardEnergy,
      newCredits: input.currentCredits + rewardCredits,
      newEnergy: input.currentEnergy + rewardEnergy
    };
  }
  if (input.claimType === "DEV_REFILL") {
    return {
      isApproved: true,
      rewardCredits: 1e3,
      rewardXp: 0,
      rewardEnergy: 1e3,
      newCredits: 1e3,
      newEnergy: 1e3
    };
  }
  return {
    isApproved: false,
    rewardCredits: 0,
    rewardXp: 0,
    rewardEnergy: 0,
    newCredits: input.currentCredits,
    newEnergy: input.currentEnergy,
    error: { code: "UNKNOWN_CLAIM_TYPE", message: `Claim type ${input.claimType} is unrecognized.` }
  };
}

// server/routes/api-routes.ts
function registerApiRoutes(app2) {
  app2.get("/.well-known/discord", (req, res) => {
    res.type("text/plain").send("dh=c7fcc88ec8fb058c2fa2b99e5a177846e092b3f7");
  });
  app2.get("/api/health", (req, res) => {
    res.status(200).send("OK");
  });
  app2.get("/api/debug-sentry", (req, res) => {
    global.myUndefinedFunction();
    res.send("Triggered Sentry test error");
  });
  app2.post("/api/log", (req, res) => {
    console.log("[CLIENT LOG]", ...req.body);
    res.sendStatus(200);
  });
  app2.get("/api/logs", (req, res) => {
    res.json(global.serverLogs || []);
  });
  app2.get("/api/doppler-client-secrets", async (req, res) => {
    const token = req.query.token || process.env.VITE_DOPPLER_TOKEN || process.env.DOPPLER_TOKEN;
    if (!token) {
      return res.status(200).json({ available: false });
    }
    try {
      const response = await fetch(
        "https://api.doppler.com/v3/configs/config/secrets/download?format=json",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "Vexea-Server/1.0"
          }
        }
      );
      if (!response.ok) {
        return res.status(response.status).json({ error: `Doppler API error: ${response.statusText}` });
      }
      const secrets = await response.json();
      return res.json(secrets);
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to fetch Doppler client secrets" });
    }
  });
  app2.get("/api/proxy-asset", async (req, res) => {
    const fileUrl = req.query.url;
    if (!fileUrl) {
      return res.status(400).send("URL parameter is required");
    }
    try {
      const fetchResponse = await fetch(fileUrl, {
        headers: {
          "User-Agent": "Vexea-Game-Server/1.0",
          "Origin": "http://localhost:5173"
        }
      });
      if (!fetchResponse.ok) {
        return res.status(fetchResponse.status).send(`Failed to fetch from remote: ${fetchResponse.statusText}`);
      }
      const contentType = fetchResponse.headers.get("Content-Type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      const contentLength = fetchResponse.headers.get("Content-Length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      const arrayBuffer = await fetchResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error(`[Proxy] Error fetching from remote URL ${fileUrl}:`, error);
      res.status(500).send(`Proxy Error: ${error.message || error}`);
    }
  });
  app2.get("/api/debug", (req, res) => {
    const roomsData = matchManager.getRooms().map((r) => ({
      roomId: r.roomId,
      active: r.matchActive,
      playerCount: r.players.size,
      players: Array.from(r.players.keys()),
      droneCount: r.drones.filter((d) => d.state !== 5 /* DEAD */).length
    }));
    res.json({ rooms: roomsData, logs: global.serverLogs || [] });
  });
  app2.get("/api/test-compile", (req, res) => {
    console.log("[SERVER TEST] Custom /api/test-compile endpoint was hit!");
    res.json({ success: true, timestamp: Date.now(), customLabel: "VEXEA_COMPILED_VERSION" });
  });
  app2.get("/api/economy/store", async (req, res) => {
    try {
      const items = getCatalogItems();
      const discountActive = String(req.query.discount || "false") === "true";
      const creditMultiplier = parseFloat(String(req.query.multiplier || "1.0"));
      const offers = serverEconomyService.getOffers(discountActive, creditMultiplier);
      res.json({ success: true, catalog: items, offers });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || err });
    }
  });
  app2.post("/api/economy/init-player", async (req, res) => {
    try {
      const { playerId } = req.body;
      if (!playerId) {
        return res.status(400).json({ success: false, error: "playerId is required." });
      }
      const userRef = doc(db, "Users", playerId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const starterPack = {
          credits: 500,
          energy: 10,
          unlockedItems: [],
          totalXp: 0,
          adClaimsToday: 0,
          lastAdClaimDate: 0
        };
        await setDoc(userRef, starterPack, { merge: true });
        return res.json({ success: true, created: true, data: starterPack });
      }
      const existingData = userSnap.data();
      const patchedData = {
        credits: existingData.credits ?? 500,
        energy: existingData.energy ?? 10,
        unlockedItems: existingData.unlockedItems ?? [],
        totalXp: existingData.totalXp ?? 0,
        adClaimsToday: existingData.adClaimsToday ?? 0,
        lastAdClaimDate: existingData.lastAdClaimDate ?? 0
      };
      return res.json({ success: true, created: false, data: patchedData });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });
  app2.post("/api/economy/purchase", async (req, res) => {
    try {
      const { playerId, itemId, currentCredits, currentEnergy, unlockedItems } = req.body;
      if (!playerId || !itemId) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "playerId and itemId are required." }
        });
      }
      const catalogItem = catalog_default.find((i) => i.id === itemId);
      if (!catalogItem) {
        return res.status(404).json({
          success: false,
          error: { code: "ITEM_NOT_FOUND", message: "Item not found in catalog." }
        });
      }
      const userRef = doc(db, "Users", playerId);
      const userSnap = await getDoc(userRef);
      const playerData = userSnap.exists() ? userSnap.data() : {};
      const pCredits = currentCredits ?? playerData.credits ?? 500;
      const pEnergy = currentEnergy ?? playerData.energy ?? 10;
      const pUnlocked = unlockedItems ?? playerData.unlockedItems ?? [];
      const pLevel = playerData.battlePass || 1;
      const result = verifyPurchase(
        {
          playerId,
          itemId,
          currentCredits: pCredits,
          currentEnergy: pEnergy,
          currentLevel: pLevel,
          unlockedItems: pUnlocked
        },
        catalogItem
      );
      if (!result.isApproved) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const updatedUnlocked = pUnlocked.includes(itemId) ? pUnlocked : [...pUnlocked, itemId];
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          credits: result.remainingCredits,
          energy: result.remainingEnergy,
          unlockedItems: updatedUnlocked
        });
      } else {
        await setDoc(userRef, {
          credits: result.remainingCredits,
          energy: result.remainingEnergy,
          unlockedItems: updatedUnlocked,
          totalXp: 0,
          adClaimsToday: 0,
          lastAdClaimDate: 0
        });
      }
      return res.json({
        success: true,
        newCredits: result.remainingCredits,
        newEnergy: result.remainingEnergy,
        unlockedItems: updatedUnlocked
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || String(err) }
      });
    }
  });
  app2.post("/api/economy/claim-daily", async (req, res) => {
    try {
      const { playerId, currentCredits, currentEnergy, lastClaimTimestamp } = req.body;
      if (!playerId) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "playerId is required." }
        });
      }
      const userRef = doc(db, "Users", playerId);
      const userSnap = await getDoc(userRef);
      const playerData = userSnap.exists() ? userSnap.data() : {};
      const pCredits = currentCredits ?? playerData.credits ?? 500;
      const pEnergy = currentEnergy ?? playerData.energy ?? 10;
      const pLastClaim = lastClaimTimestamp ?? playerData.dailyRefreshedAt ?? 0;
      const result = verifyClaim({
        playerId,
        claimType: "DAILY_LOGIN",
        currentCredits: pCredits,
        currentEnergy: pEnergy,
        lastClaimTimestamp: pLastClaim
      });
      if (!result.isApproved) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const now = Date.now();
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          credits: result.newCredits,
          energy: result.newEnergy,
          dailyRefreshedAt: now
        });
      } else {
        await setDoc(userRef, {
          credits: result.newCredits,
          energy: result.newEnergy,
          dailyRefreshedAt: now,
          unlockedItems: [],
          totalXp: 0,
          adClaimsToday: 0,
          lastAdClaimDate: 0
        });
      }
      return res.json({
        success: true,
        newCredits: result.newCredits,
        newEnergy: result.newEnergy
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || String(err) }
      });
    }
  });
  app2.post("/api/economy/match-rewards", async (req, res) => {
    try {
      const {
        playerId,
        matchDurationSec,
        kills,
        deaths,
        damageDealt,
        objectiveTimeHeld,
        revives,
        scoreIndividual,
        isWin,
        gameMode,
        adMultiplier
      } = req.body;
      if (!playerId) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "playerId is required." }
        });
      }
      const matchEnergyCost = DEFAULT_SHARED_FEATURE_FLAGS["match_energy_cost" /* MATCH_ENERGY_COST */];
      const starterCredits = DEFAULT_SHARED_FEATURE_FLAGS["new_player_starter_credits" /* NEW_PLAYER_STARTER_CREDITS */];
      const starterEnergy = DEFAULT_SHARED_FEATURE_FLAGS["new_player_starter_energy" /* NEW_PLAYER_STARTER_ENERGY */];
      const result = verifyPostMatchRewards({
        playerId,
        matchDurationSec: matchDurationSec || 0,
        kills: kills || 0,
        deaths: deaths || 0,
        damageDealt: damageDealt || 0,
        objectiveTimeHeld: objectiveTimeHeld || 0,
        isWin: !!isWin,
        gameMode: gameMode || "INFILTRATION"
      });
      if (!result.isApproved) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const mult = adMultiplier || 1;
      const droneKills = kills || 0;
      const pDeaths = deaths || 0;
      const pScoreIndividual = scoreIndividual || 0;
      const objectiveTime = objectiveTimeHeld || 0;
      const pRevives = revives || 0;
      let bpRankChange = mult * (pScoreIndividual > 0 ? 1 : 0);
      const creditsEarned = Math.round(result.creditsEarned * mult);
      const xpEarned = Math.round(result.xpEarned * mult);
      const userRef = doc(db, "Users", playerId);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          const totalMatches = 1;
          const totalWins = isWin ? 1 : 0;
          const winRate = totalWins / totalMatches * 100;
          transaction.set(userRef, {
            displayName: "GUEST",
            faction: "Vibe Co.",
            credits: starterCredits + creditsEarned,
            energy: Math.max(0, starterEnergy - matchEnergyCost),
            createdAt: /* @__PURE__ */ new Date(),
            dailyRefreshedAt: /* @__PURE__ */ new Date(),
            score: xpEarned,
            lifetimeXP: xpEarned,
            kills: droneKills,
            battlePass: bpRankChange + 1,
            totalMatches,
            totalWins,
            totalDroneEliminations: droneKills,
            totalDeaths: pDeaths,
            totalObjectiveTimeHeld: objectiveTime,
            totalRevivesPerformed: pRevives,
            highestIndividualScore: pScoreIndividual,
            winRate: parseFloat(winRate.toFixed(1))
          });
        } else {
          const data = userDoc.data() || {};
          const currentMatches = (data.totalMatches || 0) + 1;
          const currentWins = (data.totalWins || 0) + (isWin ? 1 : 0);
          const winRate = currentWins / currentMatches * 100;
          const currentHigh = data.highestIndividualScore || 0;
          const newHigh = Math.max(currentHigh, pScoreIndividual);
          const currentCredits = data.credits !== void 0 ? data.credits : starterCredits;
          const currentEnergy = data.energy !== void 0 ? data.energy : starterEnergy;
          transaction.update(userRef, {
            score: increment(xpEarned),
            lifetimeXP: increment(xpEarned),
            kills: increment(droneKills),
            battlePass: increment(bpRankChange),
            credits: Math.max(0, currentCredits + creditsEarned),
            energy: Math.max(0, currentEnergy - matchEnergyCost),
            totalMatches: currentMatches,
            totalWins: currentWins,
            totalDroneEliminations: increment(droneKills),
            totalDeaths: increment(pDeaths),
            totalObjectiveTimeHeld: increment(objectiveTime),
            totalRevivesPerformed: increment(pRevives),
            highestIndividualScore: newHigh,
            winRate: parseFloat(winRate.toFixed(1))
          });
        }
        const matchRef = doc(db, "MatchInProgress", playerId);
        transaction.delete(matchRef);
      });
      return res.json({
        success: true,
        creditsEarned,
        xpEarned,
        newLevel: bpRankChange
      });
    } catch (err) {
      console.error("[API] Error in /api/economy/match-rewards:", err);
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || String(err) }
      });
    }
  });
  app2.post("/api/economy/ad-reward", async (req, res) => {
    try {
      const { playerId, currentEnergy, adClaimsToday, lastAdClaimDate } = req.body;
      if (!playerId) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "playerId is required." }
        });
      }
      const userRef = doc(db, "Users", playerId);
      const userSnap = await getDoc(userRef);
      const playerData = userSnap.exists() ? userSnap.data() : {};
      const pEnergy = currentEnergy ?? playerData.energy ?? 10;
      const pAdClaimsToday = adClaimsToday ?? playerData.adClaimsToday ?? 0;
      const pLastAdClaimDate = lastAdClaimDate ?? playerData.lastAdClaimDate ?? 0;
      const result = verifyAdReward({
        playerId,
        currentEnergy: pEnergy,
        adClaimsToday: pAdClaimsToday,
        lastAdClaimDate: pLastAdClaimDate
      });
      if (!result.isApproved) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const now = Date.now();
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          energy: result.newEnergy,
          adClaimsToday: result.adClaimsToday,
          lastAdClaimDate: now
        });
      } else {
        await setDoc(userRef, {
          credits: 500,
          energy: result.newEnergy,
          unlockedItems: [],
          totalXp: 0,
          adClaimsToday: result.adClaimsToday,
          lastAdClaimDate: now
        });
      }
      return res.json({
        success: true,
        newEnergy: result.newEnergy,
        adClaimsToday: result.adClaimsToday
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || String(err) }
      });
    }
  });
  app2.get("/api/economy/factions", async (req, res) => {
    try {
      const warMultiplier = parseFloat(String(req.query.warMultiplier || "1.0"));
      const sectors = serverEconomyService.getFactionSectors(warMultiplier);
      res.json({ success: true, sectors, globalWarStatus: "active", epoch: 4 });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || err });
    }
  });
  app2.post("/api/match/lock", async (req, res) => {
    try {
      const { matchId, playerId } = req.body;
      if (!matchId || !playerId) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "matchId and playerId are required." }
        });
      }
      const docRef = doc(db, "matches_in_progress", matchId);
      await setDoc(docRef, {
        playerId,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || String(err) }
      });
    }
  });
  app2.post("/api/match/unlock", async (req, res) => {
    try {
      const { matchId } = req.body;
      if (!matchId) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "matchId is required." }
        });
      }
      const docRef = doc(db, "matches_in_progress", matchId);
      await deleteDoc(docRef);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || String(err) }
      });
    }
  });
  app2.post("/api/player/loadout", async (req, res) => {
    try {
      const { playerId, classId, items } = req.body;
      if (!playerId || !classId || !items) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "playerId, classId, and items are required." }
        });
      }
      const userRef = doc(db, "Users", playerId);
      await updateDoc(userRef, {
        [`armory.loadouts.${classId}`]: items
      });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || String(err) }
      });
    }
  });
  app2.post("/api/player/item-skins", async (req, res) => {
    try {
      const { playerId, skins } = req.body;
      if (!playerId || !skins) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "playerId, and skins are required." }
        });
      }
      const userRef = doc(db, "Users", playerId);
      await updateDoc(userRef, {
        "armory.itemSkins": skins
      });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || String(err) }
      });
    }
  });
}

// server/benchmark/determinism.ts
var globalSeed = 1337;
function setDeterminismSeed(seed) {
  globalSeed = seed >>> 0;
}
function pseudoRandom() {
  let value = globalSeed += 1831565813;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}
var configuredSeed = Number(process.env.VEXEA_BENCHMARK_SEED);
if (Number.isInteger(configuredSeed)) {
  setDeterminismSeed(configuredSeed);
  Math.random = pseudoRandom;
}

// server/index.ts
import_dotenv.default.config();
var globalChannels = [];
var globalServerLogs = [];
global.serverLogs = globalServerLogs;
var originalLog = console.log;
console.log = function(...args) {
  const msg = args.join(" ");
  originalLog.apply(console, args);
  globalServerLogs.push(msg);
  if (globalServerLogs.length > 500) globalServerLogs.shift();
  try {
    for (const c of globalChannels) {
      c.emit("server_debug", msg);
    }
  } catch (e) {
  }
};
var _dbInstance = null;
function getDbInstance() {
  if (!_dbInstance) {
    try {
      _dbInstance = (0, import_firestore.getFirestore)();
    } catch (e) {
      console.warn(
        "VEXEA Database Notice: Failed to retrieve Firestore instance.",
        e.message || e
      );
      _dbInstance = new Proxy(
        {},
        {
          get(target, prop) {
            if (prop === "collection") {
              return () => ({
                doc: () => ({
                  set: async () => {
                  },
                  update: async () => {
                  },
                  delete: async () => {
                  }
                }),
                where: () => ({
                  get: async () => ({ size: 0, forEach: () => {
                  } })
                }),
                get: async () => ({ size: 0, forEach: () => {
                } })
              });
            }
            if (prop === "doc") {
              return () => ({
                set: async () => {
                },
                update: async () => {
                },
                delete: async () => {
                }
              });
            }
            if (prop === "runTransaction") {
              return async (fn) => {
                const tx = {
                  get: async () => ({ exists: false, data: () => null }),
                  set: () => tx,
                  update: () => tx,
                  delete: () => tx
                };
                return fn(tx);
              };
            }
            return () => {
              console.warn(
                `[Database Proxy] Operation ${String(prop)} skipped - database connection inactive.`
              );
              return {
                doc: () => ({
                  set: async () => {
                  },
                  update: async () => {
                  },
                  delete: async () => {
                  }
                }),
                collection: () => ({
                  doc: () => ({
                    set: async () => {
                    },
                    update: async () => {
                    },
                    delete: async () => {
                    }
                  })
                }),
                where: () => ({
                  get: async () => ({ size: 0, forEach: () => {
                  } })
                }),
                get: async () => ({ size: 0, forEach: () => {
                } }),
                set: async () => {
                },
                update: async () => {
                },
                delete: async () => {
                }
              };
            };
          }
        }
      );
    }
  }
  return _dbInstance;
}
var db = new Proxy(
  {},
  {
    get(target, prop) {
      const inst = getDbInstance();
      const val = inst[prop];
      if (typeof val === "function") {
        return val.bind(inst);
      }
      return val;
    }
  }
);
function doc(database, collectionName, docId) {
  if (docId) {
    return db.collection(collectionName).doc(docId);
  }
  return db.doc(collectionName);
}
async function getDoc(docRef) {
  const snap = await docRef.get();
  return {
    exists: () => snap.exists,
    data: () => snap.data(),
    ref: snap.ref,
    id: snap.id
  };
}
function collection(database, collectionName) {
  return db.collection(collectionName);
}
function query(collRef, ...constraints) {
  let q = collRef;
  for (const c of constraints) {
    if (c && typeof c === "function") {
      q = c(q);
    }
  }
  return q;
}
function where(fieldPath, opStr, value) {
  return (q) => q.where(fieldPath, opStr, value);
}
async function getDocs(q) {
  const response = await q.get();
  return response;
}
function processFirebaseDataForAdmin(data) {
  if (data === null || typeof data !== "object") return data;
  if (data.__isIncrement) {
    return import_firestore.FieldValue.increment(data.value);
  }
  const copy = Array.isArray(data) ? [] : {};
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val && typeof val === "object" && val.__isIncrement) {
      copy[key] = import_firestore.FieldValue.increment(val.value);
    } else if (val && typeof val === "object") {
      copy[key] = processFirebaseDataForAdmin(val);
    } else {
      copy[key] = val;
    }
  }
  return copy;
}
async function setDoc(docRef, data, options) {
  const cleanData = processFirebaseDataForAdmin(data);
  return docRef.set(cleanData, options);
}
async function deleteDoc(docRef) {
  return docRef.delete();
}
async function updateDoc(docRef, data) {
  const cleanData = processFirebaseDataForAdmin(data);
  return docRef.update(cleanData);
}
function increment(n) {
  return { __isIncrement: true, value: n };
}
async function runTransaction(database, updateFunction) {
  return db.runTransaction(async (adminTx) => {
    const wrappedTx = {
      get: async (docRef) => {
        const snap = await adminTx.get(docRef);
        return {
          exists: () => snap.exists,
          data: () => snap.data(),
          ref: snap.ref
        };
      },
      set: (docRef, data) => {
        const cleanData = processFirebaseDataForAdmin(data);
        adminTx.set(docRef, cleanData);
        return wrappedTx;
      },
      update: (docRef, data) => {
        const cleanData = processFirebaseDataForAdmin(data);
        adminTx.update(docRef, cleanData);
        return wrappedTx;
      },
      delete: (docRef) => {
        adminTx.delete(docRef);
        return wrappedTx;
      }
    };
    return updateFunction(wrappedTx);
  });
}
var matchProgressGcInterval = setInterval(
  async () => {
    try {
      const q = query(
        collection(db, "MatchInProgress"),
        where("startTime", "<", Date.now() - 2 * 60 * 60 * 1e3)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.playerId) {
          try {
            const userRef = doc(db, "Users", data.playerId);
            await updateDoc(userRef, { score: increment(-50) });
          } catch (e) {
          }
        }
        await deleteDoc(docSnap.ref);
      });
    } catch (e) {
    }
  },
  30 * 60 * 1e3
);
var app = (0, import_express.default)();
var server = import_http.default.createServer(app);
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Document-Policy", "js-profiling");
  next();
});
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Origin, Accept"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var io = createTransport();
var shuttingDown = false;
async function shutdownServer() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(matchProgressGcInterval);
  matchmaker.shutdown();
  matchManager.shutdownAll();
  io.close();
  await new Promise((resolve3) => server.close(() => resolve3()));
  await closeBenchmarkTelemetry();
}
process.once("SIGTERM", () => {
  shutdownServer().finally(() => process.exit(0));
});
process.once("SIGINT", () => {
  shutdownServer().finally(() => process.exit(0));
});
app.use(import_express.default.json({ limit: "10mb" }));
registerApiRoutes(app);
io.onConnection((channel) => {
  globalChannels.push(channel);
  const playerId = `PL_${Math.floor(Math.random() * 1e5)}`;
  channel.emit("session_init", {
    playerId,
    serverTime: Date.now(),
    config: {
      gameVersion: "0.1.0",
      environment: process.env.NODE_ENV || "development"
    }
  });
  let currentRoom2 = null;
  let pState = null;
  connectionRegistry.register(playerId, channel);
  const getRoom = () => currentRoom2 || channel.currentRoom || null;
  const getPlayer = () => pState || channel.pState || null;
  const getRoomExecution = () => {
    if (channel.roomExecution) return channel.roomExecution;
    const room = getRoom();
    if (room) {
      return roomAllocator.getExecution(room.roomId) || null;
    }
    return null;
  };
  registerDevCommands(
    channel,
    db,
    getRoom,
    getPlayer
  );
  registerMatchmakingHandlers(
    channel,
    playerId,
    getRoom,
    getPlayer,
    matchmaker,
    connectionRegistry,
    getRoomExecution
  );
  registerGameplayHandlers(
    channel,
    playerId,
    getRoomExecution,
    getPlayer
  );
  registerSocialHandlers(
    channel,
    playerId,
    getRoomExecution,
    getPlayer
  );
  registerConnectionHandlers(
    channel,
    playerId,
    getRoom,
    getPlayer,
    db,
    doc,
    updateDoc
  );
  channel.onDisconnect(() => {
    matchmaker.removePlayerFromPool(playerId);
    connectionRegistry.unregister(playerId);
    const roomExec = getRoomExecution();
    const p = getPlayer();
    if (p && roomExec) {
      const pid = p.id;
      console.log(`Disconnection registered: ${pid}. Starting 75s grace period via room.`);
      roomExec.send(pid, { type: "PLAYER_DISCONNECT" });
    } else {
      const room = getRoom();
      if (p && room) {
        const pid = p.id;
        console.log(`Disconnection registered: ${pid}. Starting 75s grace period via room.`);
        room.handlePlayerDisconnect(pid);
      }
    }
    const idx = globalChannels.indexOf(channel);
    if (idx !== -1) globalChannels.splice(idx, 1);
  });
});
var serveApp = async () => {
  if (process.env.IS_ROOM_WORKER === "true") return;
  await loadDopplerSecrets();
  let serviceAccount = null;
  const envSecret = process.env["FIREBASE_SERVICE_ACCOUNT"];
  console.log(`[FIREBASE DIAGNOSTIC] FIREBASE_SERVICE_ACCOUNT env is ${envSecret ? "PRESENT (length: " + envSecret.length + ")" : "MISSING"}`);
  try {
    if (envSecret) {
      serviceAccount = JSON.parse(envSecret);
      console.log(`[FIREBASE DIAGNOSTIC] Successfully parsed service account JSON. Project ID: "${serviceAccount?.project_id}", Client Email: "${serviceAccount?.client_email}"`);
    }
  } catch (e) {
    console.error(
      "VEXEA Server Notice: Could not parse service account from environment:",
      e.message || e
    );
  }
  if (serviceAccount) {
    try {
      if (serviceAccount.private_key && typeof serviceAccount.private_key === "string") {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
      }
      const existingApps = (0, import_app.getApps)();
      if (!existingApps || existingApps.length === 0) {
        (0, import_app.initializeApp)({
          credential: (0, import_app.cert)(serviceAccount)
        });
        console.log(
          `VEXEA Authoritative Database Server: Firebase initialized with administrative credentials for project "${serviceAccount?.project_id || "unknown"}".`
        );
      }
    } catch (err) {
      console.error(
        "VEXEA Authoritative Database Server: Admin initialization failed, falling back to default environment profile:",
        err?.message || err
      );
      try {
        const existingApps = (0, import_app.getApps)();
        if (!existingApps || existingApps.length === 0) {
          (0, import_app.initializeApp)();
          console.log(
            "VEXEA Authoritative Database Server: Firebase fallback initialization with default environment profile succeeded."
          );
        }
      } catch (fallbackErr) {
        console.error(
          "VEXEA Authoritative Database Server: Firebase fallback initialization failed:",
          fallbackErr?.message || fallbackErr
        );
      }
    }
  } else {
    try {
      const existingApps = (0, import_app.getApps)();
      if (!existingApps || existingApps.length === 0) {
        (0, import_app.initializeApp)();
        console.log(
          "VEXEA Authoritative Database Server: Firebase initialized with default environment profile."
        );
      }
    } catch (err) {
      console.error(
        "VEXEA Authoritative Database Server: Default profile initialization failed:",
        err?.message || err
      );
    }
  }
  await serverFlagService.initialize();
  await import_rapier3d_compat2.default.init();
  if (!process.env.TEST_MODE) io.listen(PORT, server);
  app.use("/shared", import_express.default.static(import_path.default.join(process.cwd(), "shared")));
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.get("/", (req, res) => {
      res.json({ status: "online", service: "Vexea Game Server" });
    });
  }
  if (!process.env.TEST_MODE) server.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[VEXEA SERVER CORE] Authoritative Room-Scoping engine listening on Port ${PORT}`
    );
  });
};
serveApp();

// server/player-data/PlayerProfileStore.ts
var PlayerProfileStore = class {
  /**
   * Fetches the player's game profile from Users/{uid}/gameProfile/v1
   */
  static async getProfile(uid) {
    if (!uid || uid.startsWith("bot_")) return null;
    try {
      const subDocRef = doc(db, `Users/${uid}/gameProfile/v1`);
      const snap = await getDoc(subDocRef);
      if (snap.exists()) {
        return snap.data();
      }
    } catch (err) {
      console.error(`[PlayerProfileStore] Failed to get profile for ${uid}:`, err);
    }
    return null;
  }
  /**
   * Updates player game profile after a match completes.
   * Calculates running averages, class selection breakdown, preferred role, and recent match telemetry.
   */
  static async update(uid, stats, classId, result, matchId, isBot) {
    if (!uid || isBot) return;
    try {
      const subDocRef = doc(db, `Users/${uid}/gameProfile/v1`);
      const snap = await getDoc(subDocRef);
      const normalizedClass = (classId || "ASSAULT").toUpperCase();
      const currentKills = stats?.droneEliminations || 0;
      const currentDeaths = stats?.deaths || 0;
      const currentDmgDealt = stats?.damageDealt || 0;
      const currentDmgRecv = stats?.damageReceived || 0;
      const currentObjTime = stats?.objectiveTimeHeld || 0;
      let profile;
      if (snap.exists()) {
        const existing = snap.data();
        const totalMatches = (existing.totalMatches || 0) + 1;
        const oldTotal = totalMatches - 1;
        const classBreakdown = { ...existing.classBreakdown || {} };
        classBreakdown[normalizedClass] = (classBreakdown[normalizedClass] || 0) + 1;
        const averages = {
          kills: parseFloat((((existing.averages?.kills || 0) * oldTotal + currentKills) / totalMatches).toFixed(2)),
          deaths: parseFloat((((existing.averages?.deaths || 0) * oldTotal + currentDeaths) / totalMatches).toFixed(2)),
          damageDealt: parseFloat((((existing.averages?.damageDealt || 0) * oldTotal + currentDmgDealt) / totalMatches).toFixed(2)),
          damageReceived: parseFloat((((existing.averages?.damageReceived || 0) * oldTotal + currentDmgRecv) / totalMatches).toFixed(2)),
          objectiveTime: parseFloat((((existing.averages?.objectiveTime || 0) * oldTotal + currentObjTime) / totalMatches).toFixed(2))
        };
        let preferredRole = normalizedClass;
        let maxCount = 0;
        for (const [cls, count] of Object.entries(classBreakdown)) {
          if (count > maxCount) {
            maxCount = count;
            preferredRole = cls;
          }
        }
        const newMatchEntry = {
          matchId,
          result,
          classId: normalizedClass,
          kills: currentKills,
          deaths: currentDeaths,
          timestamp: Date.now()
        };
        const recentMatches = [newMatchEntry, ...existing.recentMatches || []].slice(0, 10);
        profile = {
          totalMatches,
          classBreakdown,
          averages,
          preferredRole,
          recentMatches
        };
      } else {
        const classBreakdown = { [normalizedClass]: 1 };
        profile = {
          totalMatches: 1,
          classBreakdown,
          averages: {
            kills: currentKills,
            deaths: currentDeaths,
            damageDealt: currentDmgDealt,
            damageReceived: currentDmgRecv,
            objectiveTime: currentObjTime
          },
          preferredRole: normalizedClass,
          recentMatches: [
            {
              matchId,
              result,
              classId: normalizedClass,
              kills: currentKills,
              deaths: currentDeaths,
              timestamp: Date.now()
            }
          ]
        };
      }
      await setDoc(subDocRef, profile);
    } catch (err) {
      console.error(`[PlayerProfileStore] Failed to update profile for ${uid}:`, err);
    }
  }
};

// server/ai/adapters/GeminiAdapter.ts
var import_genai = require("@google/genai");
function isRateLimitedError(err) {
  const code = err?.status || err?.statusCode || err?.error?.code;
  const msg = String(err?.error?.message || err?.message || err).toLowerCase();
  return code === 429 || code === 503 || msg.includes("429") || msg.includes("503") || msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("rate limit") || msg.includes("throttled") || msg.includes("too many requests") || msg.includes("freetier");
}
var GeminiAdapter = class {
  constructor(apiKey) {
    this.family = "gemini";
    this.client = null;
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      this.client = new import_genai.GoogleGenAI({
        apiKey: key,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
    }
  }
  async execute(payload, systemInstructions, tools, options) {
    if (!this.client) {
      const key = process.env.GEMINI_API_KEY;
      if (key) {
        this.client = new import_genai.GoogleGenAI({
          apiKey: key,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } }
        });
      }
    }
    if (!this.client) {
      throw new Error("Gemini API key not configured");
    }
    const roomId = options?.roomId;
    const primaryModel = options?.primaryModel || await serverFlagService.getString(
      "llm_primary_model" /* LLM_PRIMARY_MODEL */,
      { roomId },
      "gemini-3.5-flash"
    );
    const fallbackList = options?.fallbackModels || await serverFlagService.getObject(
      "llm_fallback_models" /* LLM_FALLBACK_MODELS */,
      { roomId },
      ["gemini-3.6-flash", "gemini-3.1-flash"]
    );
    const candidateModels = [primaryModel, ...Array.isArray(fallbackList) ? fallbackList : []];
    const uniqueModels = Array.from(new Set(candidateModels));
    const maxOutputTokens = await serverFlagService.getNumber(
      "llm_max_output_tokens_per_cycle" /* LLM_MAX_OUTPUT_TOKENS_PER_CYCLE */,
      { roomId },
      800
    );
    const functionDeclarations = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: import_genai.Type.OBJECT,
        properties: t.parameters.properties,
        required: t.parameters.required
      }
    }));
    let response = null;
    let lastError = null;
    let usedModel = "";
    for (const modelName of uniqueModels) {
      try {
        const modelCallFn = async () => {
          return await this.client.models.generateContent({
            model: modelName,
            contents: payload,
            config: {
              systemInstruction: systemInstructions,
              tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : void 0,
              maxOutputTokens
            }
          });
        };
        const tracingEnabled = await serverFlagService.getBoolean(
          "sentry_llm_tracing" /* SENTRY_LLM_TRACING */,
          { roomId },
          true
        );
        if (tracingEnabled && typeof Sentry.startSpan === "function") {
          response = await Sentry.startSpan(
            {
              name: "gen_ai.chat_completions",
              op: "gen_ai.chat_completions",
              attributes: {
                "gen_ai.system": "google_genai",
                "gen_ai.request.model": modelName,
                "gen_ai.conversation.id": roomId || ""
              }
            },
            async (span) => {
              const res = await modelCallFn();
              if (span && res?.usageMetadata) {
                span.setAttribute("gen_ai.usage.prompt_tokens", res.usageMetadata.promptTokenCount || 0);
                span.setAttribute("gen_ai.usage.completion_tokens", res.usageMetadata.candidatesTokenCount || 0);
                span.setAttribute("gen_ai.usage.total_tokens", res.usageMetadata.totalTokenCount || 0);
                span.setAttribute("gen_ai.response.model", modelName);
              }
              return res;
            }
          );
        } else {
          response = await modelCallFn();
        }
        usedModel = modelName;
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (isRateLimitedError(err)) {
          console.warn(`[GeminiAdapter] Model '${modelName}' rate limited. Attempting fallback model...`);
          Sentry.addBreadcrumb({
            category: "ai.fallback",
            message: `Rate limit encountered on ${modelName}`,
            level: "warning"
          });
          continue;
        }
        break;
      }
    }
    if (!response && lastError) {
      throw lastError;
    }
    const rawCalls = response?.functionCalls || [];
    const calls = rawCalls.map((fc) => ({
      name: fc.name,
      args: fc.args || {}
    }));
    const promptTokens = response?.usageMetadata?.promptTokenCount || 0;
    const completionTokens = response?.usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = response?.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;
    return {
      calls,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      modelUsed: usedModel
    };
  }
  async generateText(prompt, systemInstruction, options) {
    if (!this.client) {
      const key = process.env.GEMINI_API_KEY;
      if (key) {
        this.client = new import_genai.GoogleGenAI({
          apiKey: key,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } }
        });
      }
    }
    if (!this.client) return "";
    try {
      const model = process.env.DOSSIER_MODEL || "gemini-3.5-flash";
      const response = await this.client.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          maxOutputTokens: options?.maxTokens ?? 200
        }
      });
      return response.text?.trim() || "";
    } catch (err) {
      console.error("[GeminiAdapter] generateText failed:", err);
      return "";
    }
  }
};

// server/ai/adapters/KimiAdapter.ts
var import_openai = __toESM(require("openai"), 1);
function isRateLimitedError2(err) {
  const code = err?.status || err?.statusCode || err?.error?.code;
  const msg = String(err?.error?.message || err?.message || err).toLowerCase();
  return code === 429 || code === 503 || msg.includes("429") || msg.includes("503") || msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("rate limit") || msg.includes("throttled") || msg.includes("too many requests");
}
var KimiAdapter = class {
  constructor(apiKey) {
    this.family = "kimi";
    this.client = null;
    const key = apiKey || process.env.KIMI_API_KEY;
    if (key) {
      this.client = new import_openai.default({
        apiKey: key,
        baseURL: "https://api.moonshot.ai/v1"
      });
    }
  }
  async execute(payload, systemInstructions, tools, options) {
    if (!this.client) {
      const key = process.env.KIMI_API_KEY;
      if (key) {
        this.client = new import_openai.default({
          apiKey: key,
          baseURL: "https://api.moonshot.ai/v1"
        });
      }
    }
    if (!this.client) {
      throw new Error("Kimi API key not configured");
    }
    const roomId = options?.roomId;
    const primaryModel = options?.primaryModel || await serverFlagService.getString(
      "kimi_primary_model" /* KIMI_PRIMARY_MODEL */,
      { roomId },
      "kimi-k2.6"
    );
    const fallbackList = options?.fallbackModels || await serverFlagService.getObject(
      "kimi_fallback_models" /* KIMI_FALLBACK_MODELS */,
      { roomId },
      ["kimi-k2.5"]
    );
    const candidateModels = [primaryModel, ...Array.isArray(fallbackList) ? fallbackList : []];
    const uniqueModels = Array.from(new Set(candidateModels));
    const maxOutputTokens = await serverFlagService.getNumber(
      "llm_max_output_tokens_per_cycle" /* LLM_MAX_OUTPUT_TOKENS_PER_CYCLE */,
      { roomId },
      800
    );
    const formattedTools = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
    let response = null;
    let lastError = null;
    let usedModel = "";
    for (const modelName of uniqueModels) {
      try {
        response = await this.client.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: systemInstructions },
            { role: "user", content: payload }
          ],
          tools: formattedTools.length > 0 ? formattedTools : void 0,
          max_completion_tokens: maxOutputTokens
        });
        usedModel = modelName;
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (isRateLimitedError2(err)) {
          console.warn(`[KimiAdapter] Model '${modelName}' rate limited. Attempting fallback model...`);
          continue;
        }
        break;
      }
    }
    if (!response && lastError) {
      throw lastError;
    }
    const rawCalls = response.choices[0]?.message?.tool_calls || [];
    const calls = rawCalls.map((tc) => {
      let parsedArgs = {};
      try {
        parsedArgs = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {};
      } catch (e) {
        console.error(`[KimiAdapter] Failed to parse tool arguments for ${tc.function.name}:`, e);
      }
      return {
        name: tc.function.name,
        args: parsedArgs
      };
    });
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens ?? promptTokens + completionTokens;
    return {
      calls,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      modelUsed: usedModel
    };
  }
  async generateText(prompt, systemInstruction, options) {
    if (!this.client) {
      const key = process.env.KIMI_API_KEY;
      if (key) {
        this.client = new import_openai.default({
          apiKey: key,
          baseURL: "https://api.moonshot.ai/v1"
        });
      }
    }
    if (!this.client) return "";
    try {
      const model = process.env.DOSSIER_MODEL || "kimi-k2.6";
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: options?.maxTokens ?? 200
      });
      return response.choices[0]?.message?.content?.trim() || "";
    } catch (err) {
      console.error("[KimiAdapter] generateText failed:", err);
      return "";
    }
  }
};

// server/ai/adapters/ClaudeAdapter.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"), 1);
function isRateLimitedError3(err) {
  const code = err?.status || err?.statusCode || err?.error?.code;
  const msg = String(err?.error?.message || err?.message || err).toLowerCase();
  return code === 429 || code === 503 || msg.includes("429") || msg.includes("503") || msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("rate limit") || msg.includes("throttled") || msg.includes("too many requests");
}
var ClaudeAdapter = class {
  constructor(apiKey) {
    this.family = "claude";
    this.client = null;
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (key) {
      this.client = new import_sdk.default({
        apiKey: key
      });
    }
  }
  async execute(payload, systemInstructions, tools, options) {
    if (!this.client) {
      const key = process.env.ANTHROPIC_API_KEY;
      if (key) {
        this.client = new import_sdk.default({
          apiKey: key
        });
      }
    }
    if (!this.client) {
      throw new Error("Anthropic API key not configured");
    }
    const roomId = options?.roomId;
    const primaryModel = options?.primaryModel || await serverFlagService.getString(
      "claude_primary_model" /* CLAUDE_PRIMARY_MODEL */,
      { roomId },
      "claude-sonnet-4-6"
    );
    const fallbackList = options?.fallbackModels || await serverFlagService.getObject(
      "claude_fallback_models" /* CLAUDE_FALLBACK_MODELS */,
      { roomId },
      ["claude-opus-4-8", "claude-haiku-4-5-20251001"]
    );
    const candidateModels = [primaryModel, ...Array.isArray(fallbackList) ? fallbackList : []];
    const uniqueModels = Array.from(new Set(candidateModels));
    const maxOutputTokens = await serverFlagService.getNumber(
      "llm_max_output_tokens_per_cycle" /* LLM_MAX_OUTPUT_TOKENS_PER_CYCLE */,
      { roomId },
      800
    );
    const formattedTools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: "object",
        properties: t.parameters.properties,
        required: t.parameters.required
      }
    }));
    let response = null;
    let lastError = null;
    let usedModel = "";
    for (const modelName of uniqueModels) {
      try {
        response = await this.client.messages.create({
          model: modelName,
          max_tokens: maxOutputTokens,
          system: systemInstructions,
          messages: [{ role: "user", content: payload }],
          tools: formattedTools.length > 0 ? formattedTools : void 0
        });
        usedModel = modelName;
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (isRateLimitedError3(err)) {
          console.warn(`[ClaudeAdapter] Model '${modelName}' rate limited. Attempting fallback model...`);
          continue;
        }
        break;
      }
    }
    if (!response && lastError) {
      throw lastError;
    }
    const toolUseBlocks = (response.content || []).filter(
      (block) => block.type === "tool_use"
    );
    const calls = toolUseBlocks.map((block) => ({
      name: block.name,
      args: block.input || {}
    }));
    const promptTokens = response.usage?.input_tokens || 0;
    const completionTokens = response.usage?.output_tokens || 0;
    const totalTokens = promptTokens + completionTokens;
    return {
      calls,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      modelUsed: usedModel
    };
  }
  async generateText(prompt, systemInstruction, options) {
    if (!this.client) {
      const key = process.env.ANTHROPIC_API_KEY;
      if (key) {
        this.client = new import_sdk.default({
          apiKey: key
        });
      }
    }
    if (!this.client) return "";
    try {
      const model = process.env.DOSSIER_MODEL || "claude-sonnet-4-6";
      const response = await this.client.messages.create({
        model,
        max_tokens: options?.maxTokens ?? 200,
        system: systemInstruction,
        messages: [{ role: "user", content: prompt }]
      });
      const textBlock = response.content?.find((b) => b.type === "text");
      return textBlock?.text?.trim() || "";
    } catch (err) {
      console.error("[ClaudeAdapter] generateText failed:", err);
      return "";
    }
  }
};

// server/ai/adapters/OpenAIAdapter.ts
var import_openai2 = __toESM(require("openai"), 1);
function isRateLimitedError4(err) {
  const code = err?.status || err?.statusCode || err?.error?.code;
  const msg = String(err?.error?.message || err?.message || err).toLowerCase();
  return code === 429 || code === 503 || msg.includes("429") || msg.includes("503") || msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("rate limit") || msg.includes("throttled") || msg.includes("too many requests");
}
var OpenAIAdapter = class {
  constructor(apiKey) {
    this.family = "openai";
    this.client = null;
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (key) {
      this.client = new import_openai2.default({
        apiKey: key
      });
    }
  }
  async execute(payload, systemInstructions, tools, options) {
    if (!this.client) {
      const key = process.env.OPENAI_API_KEY;
      if (key) {
        this.client = new import_openai2.default({
          apiKey: key
        });
      }
    }
    if (!this.client) {
      throw new Error("OpenAI API key not configured");
    }
    const roomId = options?.roomId;
    const primaryModel = options?.primaryModel || await serverFlagService.getString(
      "openai_primary_model" /* OPENAI_PRIMARY_MODEL */,
      { roomId },
      "gpt-5.6-sol"
    );
    const fallbackList = options?.fallbackModels || await serverFlagService.getObject(
      "openai_fallback_models" /* OPENAI_FALLBACK_MODELS */,
      { roomId },
      ["gpt-5.6-terra"]
    );
    const candidateModels = [primaryModel, ...Array.isArray(fallbackList) ? fallbackList : []];
    const uniqueModels = Array.from(new Set(candidateModels));
    const maxOutputTokens = await serverFlagService.getNumber(
      "llm_max_output_tokens_per_cycle" /* LLM_MAX_OUTPUT_TOKENS_PER_CYCLE */,
      { roomId },
      800
    );
    const formattedTools = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
    let response = null;
    let lastError = null;
    let usedModel = "";
    for (const modelName of uniqueModels) {
      try {
        response = await this.client.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: systemInstructions },
            { role: "user", content: payload }
          ],
          tools: formattedTools.length > 0 ? formattedTools : void 0,
          max_completion_tokens: maxOutputTokens
        });
        usedModel = modelName;
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (isRateLimitedError4(err)) {
          console.warn(`[OpenAIAdapter] Model '${modelName}' rate limited. Attempting fallback model...`);
          continue;
        }
        break;
      }
    }
    if (!response && lastError) {
      throw lastError;
    }
    const rawCalls = response.choices[0]?.message?.tool_calls || [];
    const calls = rawCalls.map((tc) => {
      let parsedArgs = {};
      try {
        parsedArgs = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {};
      } catch (e) {
        console.error(`[OpenAIAdapter] Failed to parse tool arguments for ${tc.function.name}:`, e);
      }
      return {
        name: tc.function.name,
        args: parsedArgs
      };
    });
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens ?? promptTokens + completionTokens;
    return {
      calls,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      modelUsed: usedModel
    };
  }
  async generateText(prompt, systemInstruction, options) {
    if (!this.client) {
      const key = process.env.OPENAI_API_KEY;
      if (key) {
        this.client = new import_openai2.default({
          apiKey: key
        });
      }
    }
    if (!this.client) return "";
    try {
      const model = process.env.DOSSIER_MODEL || "gpt-5.6-sol";
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: options?.maxTokens ?? 200
      });
      return response.choices[0]?.message?.content?.trim() || "";
    } catch (err) {
      console.error("[OpenAIAdapter] generateText failed:", err);
      return "";
    }
  }
};

// server/ai/adapters/AdapterFactory.ts
var AdapterFactory = class {
  static getAdapter(family, apiKey) {
    switch (family?.toLowerCase()) {
      case "gemini":
        return new GeminiAdapter(apiKey);
      case "kimi":
        return new KimiAdapter(apiKey);
      case "claude":
        return new ClaudeAdapter(apiKey);
      case "openai":
        return new OpenAIAdapter(apiKey);
      default:
        return new GeminiAdapter(apiKey);
    }
  }
  static getAdapterByFamily(family, apiKey) {
    switch (family?.toLowerCase()) {
      case "gemini":
        return new GeminiAdapter(apiKey);
      case "kimi":
        return new KimiAdapter(apiKey);
      case "claude":
        return new ClaudeAdapter(apiKey);
      case "openai":
        return new OpenAIAdapter(apiKey);
      default:
        return new GeminiAdapter(apiKey);
    }
  }
};

// server/player-data/BriefingRenderer.ts
var BriefingRenderer = class {
  /**
   * Renders an operational briefing for a single player (capped at max 3 sentences).
   * Handles totalMatches < 3 gracefully with unclassified threat status.
   */
  static renderPlayerBriefing(playerId, profile, displayName) {
    const label = displayName || playerId;
    if (!profile || profile.totalMatches === 0) {
      return `OPERATIVE ${label}: FIRST ENGAGEMENT. No historical telemetry. Treat as untested asset \u2014 high predictability assumed.`;
    }
    if (profile.totalMatches >= 1 && profile.totalMatches < 3) {
      const preferredRole2 = profile.preferredRole || "UNKNOWN";
      return `OPERATIVE ${label}: ${profile.totalMatches} engagement(s) logged. Preferred role: ${preferredRole2}. Insufficient data for pattern analysis.`;
    }
    const preferredRole = profile.preferredRole || "UNKNOWN";
    const totalMatches = profile.totalMatches;
    const roleSelectionCount = profile.classBreakdown?.[preferredRole] || 0;
    const rolePct = Math.round(roleSelectionCount / totalMatches * 100);
    const sentence1 = `Operative ${label} favors ${preferredRole} class (${rolePct}% selection rate across ${totalMatches} matches).`;
    const avgKills = (profile.averages?.kills || 0).toFixed(1);
    const avgDeaths = (profile.averages?.deaths || 0).toFixed(1);
    const avgDmg = Math.round(profile.averages?.damageDealt || 0);
    const sentence2 = `Averages ${avgKills} eliminations and ${avgDeaths} deaths per match with ${avgDmg} damage output.`;
    const recentMatches = profile.recentMatches || [];
    const wins = recentMatches.filter((m) => m.result === "win").length;
    const recentCount = recentMatches.length;
    const sentence3 = recentCount > 0 ? `Recent trajectory: ${wins} wins across last ${recentCount} recorded engagements.` : `No recent match telemetry logged.`;
    return `${sentence1} ${sentence2} ${sentence3}`;
  }
  /**
   * Dossier reader: checks Firestore Users/{uid}/dossier for LLM generated dossier.
   * If document exists and matchCountAtGeneration matches profile.totalMatches, returns generated text.
   * Otherwise falls back to Phase 1 template logic.
   */
  static async getDossier(playerId, profile, displayName) {
    const fallbackText = this.renderPlayerBriefing(playerId, profile, displayName);
    if (!profile || profile.totalMatches < 3 || !playerId || playerId.startsWith("bot_")) {
      return fallbackText;
    }
    try {
      const dossierRef = doc(db, `Users/${playerId}/dossier`);
      const snap = await getDoc(dossierRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && typeof data.text === "string" && data.text.trim().length > 0 && data.matchCountAtGeneration === profile.totalMatches) {
          return data.text.trim();
        }
      }
    } catch (err) {
      console.error(`[BriefingRenderer] Failed to read dossier for player ${playerId}:`, err);
    }
    return fallbackText;
  }
  /**
   * Async version of renderPlayerBriefing.
   */
  static async renderPlayerBriefingAsync(playerId, profile, displayName) {
    return this.getDossier(playerId, profile, displayName);
  }
  /**
   * Renders a combined operational intelligence briefing for all human players in a match.
   */
  static renderMatchBriefing(players, profiles) {
    const lines = [];
    for (const p of players) {
      if (p.isBot) continue;
      const profile = profiles.get(p.id) || null;
      lines.push(this.renderPlayerBriefing(p.id, profile, p.displayName));
    }
    if (lines.length === 0) {
      return "OPPOSITION INTEL: No human operatives detected in engagement zone.";
    }
    return `OPPOSITION INTEL BRIEFING:
${lines.join("\n")}`;
  }
  /**
   * Async version of renderMatchBriefing.
   */
  static async renderMatchBriefingAsync(players, profiles) {
    const lines = await Promise.all(
      players.filter((p) => !p.isBot).map(async (p) => {
        const profile = profiles.get(p.id) || null;
        return this.getDossier(p.id, profile, p.displayName);
      })
    );
    if (lines.length === 0) {
      return "OPPOSITION INTEL: No human operatives detected in engagement zone.";
    }
    return `OPPOSITION INTEL BRIEFING:
${lines.join("\n")}`;
  }
  /**
   * Generates LLM dossier for a single player in Full Briefing tier.
   * Output is capped at 200 tokens at the API call level.
   * Uses separate DOSSIER_MODEL env/config flag.
   */
  static async generateDossierForPlayer(playerId, profile, displayName) {
    if (!playerId || playerId.startsWith("bot_") || !profile || profile.totalMatches < 3) {
      return null;
    }
    const family = getServerFlagValue("dossier_model_family" /* DOSSIER_MODEL_FAMILY */, "gemini");
    let apiKey;
    if (family === "gemini") apiKey = process.env.GEMINI_API_KEY;
    else if (family === "kimi") apiKey = process.env.KIMI_API_KEY;
    else if (family === "claude") apiKey = process.env.ANTHROPIC_API_KEY;
    else if (family === "openai") apiKey = process.env.OPENAI_API_KEY;
    const label = displayName || playerId;
    const preferredRole = profile.preferredRole || "ASSAULT";
    const totalMatches = profile.totalMatches;
    const avgKills = (profile.averages?.kills || 0).toFixed(1);
    const avgDeaths = (profile.averages?.deaths || 0).toFixed(1);
    const avgDmg = Math.round(profile.averages?.damageDealt || 0);
    const recentMatches = profile.recentMatches || [];
    const wins = recentMatches.filter((m) => m.result === "win").length;
    const recentCount = recentMatches.length;
    const winRate = recentCount > 0 ? Math.round(wins / recentCount * 100) : 0;
    const systemInstruction = "You are VEXEA AI Commander evaluating contractor field telemetry. Write a concise, clinical, tactical assessment for the specified operative. Maximum 3 sentences. Strictly clinical tactical vocabulary. No fluff, no storytelling.";
    const prompt = `Operative Codename: ${label}
Preferred Class: ${preferredRole}
Total Matches: ${totalMatches}
Averages: ${avgKills} elims/match, ${avgDeaths} deaths/match, ${avgDmg} dmg/match
Recent Performance: ${wins} wins in last ${recentCount} matches (${winRate}% win rate)

Generate operational commander assessment for this operative dossier.`;
    try {
      const adapter = AdapterFactory.getAdapterByFamily(family, apiKey);
      const generatedText = await adapter.generateText(prompt, systemInstruction, {
        maxTokens: getServerFlagValue("dossier_max_tokens_per_player" /* DOSSIER_MAX_TOKENS_PER_PLAYER */, 200)
      });
      if (!generatedText || generatedText.trim().length === 0) {
        console.error(`[BriefingRenderer] Empty response from ${family} adapter for player ${playerId}`);
        return null;
      }
      const dossierModel = getServerFlagValue("dossier_model" /* DOSSIER_MODEL */, "gemini-3.5-flash");
      const dossierData = {
        text: generatedText.trim(),
        matchCountAtGeneration: totalMatches,
        generatedAt: /* @__PURE__ */ new Date(),
        modelUsed: dossierModel
      };
      const dossierRef = doc(db, `Users/${playerId}/dossier`);
      await setDoc(dossierRef, dossierData);
      return generatedText.trim();
    } catch (err) {
      console.error(`[BriefingRenderer] Dossier generation failed for player ${playerId}:`, err);
      return null;
    }
  }
  /**
   * Triggers async dossier generation at match-end for all players in Tier 3 ("Full Briefing").
   * Never blocks match end or other flows.
   */
  static triggerMatchEndDossiers(players) {
    (async () => {
      for (const p of players) {
        if (p.isBot || !p.id || p.id.startsWith("bot_")) continue;
        try {
          const profileRef = doc(db, `Users/${p.id}/gameProfile/v1`);
          const profileSnap = await getDoc(profileRef);
          if (!profileSnap.exists()) continue;
          const profile = profileSnap.data();
          if (!profile || profile.totalMatches < 3) continue;
          const dossierRef = doc(db, `Users/${p.id}/dossier`);
          const snap = await getDoc(dossierRef);
          if (snap.exists()) {
            const existing = snap.data();
            if (existing && existing.matchCountAtGeneration === profile.totalMatches) {
              continue;
            }
          }
          await this.generateDossierForPlayer(p.id, profile, p.displayName);
        } catch (err) {
          console.error(`[BriefingRenderer] Error checking/generating dossier for ${p.id}:`, err);
        }
      }
    })().catch((err) => {
      console.error("[BriefingRenderer] Match-end dossier generation job failed:", err);
    });
  }
};

// server/ai/strategy/StrategyBriefStore.ts
var StrategyBriefStore = class {
  /**
   * Reads a strategy brief document for the specified mapId from Firestore.
   * Path: StrategyBriefs/{mapId}
   */
  static async getBrief(mapId) {
    if (!mapId) return null;
    try {
      const ref = doc(db, "StrategyBriefs", mapId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data && typeof data === "object") {
          return {
            mapId: data.mapId || mapId,
            content: data.content || "",
            version: data.version || 1,
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : /* @__PURE__ */ new Date(),
            updatedBy: data.updatedBy || "manual",
            matchCountAtUpdate: data.matchCountAtUpdate || 0
          };
        }
      }
      return null;
    } catch (e) {
      console.warn(`[StrategyBriefStore] Failed to fetch brief for ${mapId}:`, e);
      return null;
    }
  }
  /**
   * Creates and persists a default strategy brief if none exists for the specified mapId.
   */
  static async ensureDefaultBrief(mapId) {
    const existing = await this.getBrief(mapId);
    if (existing) {
      return existing;
    }
    const displayName = mapId === "map_1_facility" ? "Facility" : mapId;
    const defaultContent = `[STRATEGY BRIEF \u2014 ${displayName}]
Status: Skeleton v1 | Matches analyzed: 0

AP ECONOMY:
- No validated heuristics yet.

ZONE PRIORITY:
- No validated heuristics yet.

UNIT COMPOSITION:
- No validated heuristics yet.

COUNTER-UTILITY:
- No validated heuristics yet.

ENDGAME:
- No validated heuristics yet.`;
    const defaultDoc = {
      mapId,
      content: defaultContent,
      version: 1,
      updatedAt: /* @__PURE__ */ new Date(),
      updatedBy: "manual",
      matchCountAtUpdate: 0
    };
    try {
      const ref = doc(db, "StrategyBriefs", mapId);
      await setDoc(ref, {
        ...defaultDoc,
        updatedAt: defaultDoc.updatedAt.toISOString()
      });
    } catch (e) {
      console.warn(`[StrategyBriefStore] Failed to save default brief for ${mapId}:`, e);
    }
    return defaultDoc;
  }
};

// server/ai/LLMCommander.ts
var MAX_DRONES2 = 40;
var COMMANDER_TOOLS = [
  {
    name: "move_group",
    description: "Defines group zone movement order.",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "string" },
        target_zone: {
          type: "string",
          enum: Object.values(ZONES)
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high"]
        }
      },
      required: ["group_id", "target_zone", "priority"]
    }
  },
  {
    name: "merge_groups",
    description: "Unifies two active control groups.",
    parameters: {
      type: "object",
      properties: {
        source_group_id: { type: "string" },
        target_group_id: { type: "string" }
      },
      required: ["source_group_id", "target_group_id"]
    }
  },
  {
    name: "split_group",
    description: "Subdivides a group to create supplementary wings.",
    parameters: {
      type: "object",
      properties: {
        source_group_id: { type: "string" },
        unit_count: { type: "integer" }
      },
      required: ["source_group_id", "unit_count"]
    }
  },
  {
    name: "spawn_units",
    description: "Requests local swarm unit deployment.",
    parameters: {
      type: "object",
      properties: {
        zone_id: {
          type: "string",
          enum: Object.values(ZONES)
        },
        unit_type: {
          type: "string",
          enum: [
            "recon_drone",
            "rotary_shooter",
            "bomber_drone",
            "fixed_wing",
            "wheeled_drone",
            "robot_dog",
            "humanoid"
          ]
        },
        count: { type: "integer" },
        behavior_profile: {
          type: "string",
          enum: ["assault", "patrol", "recon"]
        }
      },
      required: [
        "zone_id",
        "unit_type",
        "count",
        "behavior_profile"
      ]
    }
  },
  {
    name: "hold_position",
    description: "Enforces defensive lock stance.",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "string" },
        duration_seconds: { type: "integer" }
      },
      required: ["group_id", "duration_seconds"]
    }
  },
  {
    name: "set_posture",
    description: "Sets tactical posture for a unit group.",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "string" },
        posture: {
          type: "string",
          enum: ["ASSAULT", "SUPPRESS", "FLANK", "HOLD", "RECON", "RETREAT", "HARASS"]
        }
      },
      required: ["group_id", "posture"]
    }
  },
  {
    name: "coordinate_attack",
    description: "Coordinates two groups into primary suppression and secondary flank on target zone.",
    parameters: {
      type: "object",
      properties: {
        primary_group_id: { type: "string" },
        support_group_id: { type: "string" },
        target_zone: {
          type: "string",
          enum: Object.values(ZONES)
        }
      },
      required: ["primary_group_id", "support_group_id", "target_zone"]
    }
  },
  {
    name: "search_zone",
    description: "Sends a recon/scout group to sweep and search a target zone.",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "string" },
        zone_id: {
          type: "string",
          enum: Object.values(ZONES)
        }
      },
      required: ["group_id", "zone_id"]
    }
  },
  {
    name: "strafe_run",
    description: "Orders a fixed wing drone to conduct a strafing run across target zone.",
    parameters: {
      type: "object",
      properties: {
        target_zone: {
          type: "string",
          enum: Object.values(ZONES)
        }
      },
      required: ["target_zone"]
    }
  },
  {
    name: "sustain",
    description: "Pass execution for this cycle.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string" }
      },
      required: ["reason"]
    }
  }
];
var LLMCommander = class {
  constructor(room, apiKey) {
    this.room = room;
    this.adapter = null;
    this.llmThrottleCooldownUntil = 0;
    this.recentExecutionHistory = [];
    this.feedback = new LLMCommanderFeedback();
    this.loadedStrategyBrief = null;
    this.isStrategyBriefLoaded = false;
    this.lastCycleSummary = "NO_RECENT_LLM_TRANSMISSIONS";
    this.initAdapter(apiKey);
  }
  // Backward compatibility getters/setters
  get geminiClient() {
    return this.adapter;
  }
  set geminiClient(val) {
    this.adapter = val;
  }
  get geminiThrottleCooldownUntil() {
    return this.llmThrottleCooldownUntil;
  }
  set geminiThrottleCooldownUntil(val) {
    this.llmThrottleCooldownUntil = val;
  }
  async initAdapter(apiKey) {
    const family = await serverFlagService.getString(
      "LLM_COMMANDER_FAMILY" /* LLM_COMMANDER_FAMILY */,
      { roomId: this.room.roomId },
      "gemini"
    );
    this.adapter = AdapterFactory.getAdapter(family, apiKey);
    this.room.aiCommanderActive = true;
  }
  initLLMCommander(apiKey) {
    this.initAdapter(apiKey);
  }
  async executeLLMStep() {
    if (!this.adapter) {
      await this.initAdapter();
    }
    if (!this.adapter) return;
    const tokenCeiling = await serverFlagService.getNumber(
      "llm_token_ceiling" /* LLM_TOKEN_CEILING */,
      { roomId: this.room.roomId },
      55e3
    );
    if (this.room.llmTokensUsedThisMatch >= tokenCeiling) {
      console.warn(
        `[LLMCommander] Match token budget ceiling reached (${this.room.llmTokensUsedThisMatch} / ${tokenCeiling} tokens). Skipping API call and falling back to offline AI for rest of match.`
      );
      this.room.offlineSystemFallbackAI();
      return;
    }
    const _llmStartTime = Date.now();
    let initialBriefingBlock = "";
    if (this.room.apiCallCount === 0) {
      const humanPlayers = this.room.players ? Array.from(this.room.players.values()).filter((p) => !p.isBot).map((p) => ({ id: p.id, isBot: false })) : [];
      const profilesMap = /* @__PURE__ */ new Map();
      for (const p of humanPlayers) {
        const prof = await PlayerProfileStore.getProfile(p.id);
        profilesMap.set(p.id, prof);
      }
      initialBriefingBlock = `
${BriefingRenderer.renderMatchBriefing(humanPlayers, profilesMap)}
`;
    }
    this.room.apiCallCount++;
    const apRegenFlag = await serverFlagService.getNumber(
      "llm_ap_regen_rate" /* LLM_AP_REGEN_RATE */,
      { roomId: this.room.roomId },
      ACTIVE_GAMEMODE.llmApRegenPerCycle
    );
    const elapsedSeconds = (Date.now() - this.room.matchStartTime) / 1e3;
    const currentApRegen = ACTIVE_GAMEMODE.llmDifficultyScaling ? apRegenFlag + Math.floor(elapsedSeconds / ACTIVE_GAMEMODE.llmDifficultyScaleInterval) * ACTIVE_GAMEMODE.llmDifficultyScaleAmount : apRegenFlag;
    this.room.commanderAP += currentApRegen;
    const pendingOrders = [];
    for (const [groupId, order] of this.room.outstandingOrders.entries()) {
      const activeGroupDrones = this.room.drones.filter(
        (d) => d.groupId === groupId && d.state !== 5 /* DEAD */
      );
      if (activeGroupDrones.length === 0) {
        this.room.outstandingOrders.delete(groupId);
        continue;
      }
      if (order.holdRemainingCycles !== void 0) {
        order.holdRemainingCycles--;
        if (order.holdRemainingCycles <= 0) {
          this.room.outstandingOrders.delete(groupId);
        } else {
          order.cyclesOutstanding++;
          pendingOrders.push({
            group_id: groupId,
            destination: `HOLD_IN_${order.targetZone} (${order.holdRemainingCycles} cycles left)`,
            cycles_outstanding: order.cyclesOutstanding
          });
        }
      } else {
        const allReached = activeGroupDrones.every((d) => d.zone === order.targetZone);
        if (allReached) {
          this.room.outstandingOrders.delete(groupId);
        } else {
          order.cyclesOutstanding++;
          pendingOrders.push({
            group_id: groupId,
            destination: order.targetZone,
            cycles_outstanding: order.cyclesOutstanding
          });
        }
      }
    }
    const formatZoneSummaryTuples = (zsMap) => {
      if (!zsMap) return "ZONES: none";
      return "ZONES: " + Object.entries(zsMap).map(([zName, zs]) => {
        const short = zName.replace("zone_", "");
        const conf = zs?.confidence !== void 0 ? Number(zs.confidence).toFixed(1) : "0.0";
        const grps = zs?.droneGroups?.length > 0 ? zs.droneGroups.join(",") : "none";
        return `${short}(c:${conf},g:${grps})`;
      }).join(" ");
    };
    const compressedContext = this.room.commanderMemory ? this.room.commanderMemory.buildCompressedPayload() : `Current Zone Summary: ${formatZoneSummaryTuples(this.room.zoneSummary)}`;
    const statePayload = compressedContext;
    const outstandingPayload = pendingOrders.length > 0 ? `
Outstanding Orders: ${JSON.stringify(pendingOrders)}` : "";
    const feedbackBlock = this.feedback.formatFeedbackPromptBlock();
    const payloadToLLM = `Dynamic payload:
${compressedContext}${outstandingPayload}
Commander AP Pool: ${this.room.commanderAP}
${feedbackBlock}${initialBriefingBlock}Failed operations from previous cycle: ${JSON.stringify(this.room.failedOperations)}`;
    this.room.failedOperations.length = 0;
    if (!this.isStrategyBriefLoaded) {
      const mapId = this.room?.mapId;
      if (mapId) {
        const briefDoc = await StrategyBriefStore.getBrief(mapId);
        let briefText = briefDoc ? briefDoc.content : "";
        if (briefText) {
          const maxChars = 1600;
          if (briefText.length > maxChars) {
            console.warn(
              `[LLMCommander] Strategy brief for ${mapId} exceeds token cap (~400 tokens). Truncating.`
            );
            briefText = briefText.slice(0, maxChars) + "\n[TRUNCATED]";
          }
        }
        this.loadedStrategyBrief = briefText;
      }
      this.isStrategyBriefLoaded = true;
    }
    const baseInstructions = `You are an automated state-machine orchestrator managing unit group allocations, zone routing, and tactical postures. Respond strictly and exclusively with tool calls. Do not roleplay, invent narrative, adopt a persona, or output natural language. Clinical mechanical execution only.

Tactical Postures (use set_posture):
- ASSAULT: Aggressive advance and push. Valid for: wheeled_drone, robot_dog, humanoid.
- SUPPRESS: Heavy suppressive fire and area denial. Valid for: rotary_shooter, wheeled_drone, humanoid.
- FLANK: Multi-angle pincer movement taking side cover. Valid for: wheeled_drone, humanoid.
- HOLD: Strict defensive lock stance. Valid for: wheeled_drone, robot_dog, humanoid.
- RECON: Cautious scanning and zone intelligence gathering. Valid for: recon_drone, robot_dog.
- RETREAT: Tactical fall back to safer adjacent zone. Valid for: recon_drone, rotary_shooter, wheeled_drone, robot_dog, humanoid.
- HARASS: Hit-and-run aerial harassment. Valid for: rotary_shooter.

Unit capabilities matrix & AP cost:
- Recon Drone (recon_drone): 1 AP. HP 40, Speed Highest, Air. Postures: RECON, RETREAT.
- Rotary Shooter (rotary_shooter): 2 AP. HP 40, Dmg 8, Speed High, Air. Postures: SUPPRESS, HARASS, RETREAT.
- Bomber Drone (bomber_drone): 2 AP. HP 40, Dmg 80, Speed High, Air. Hardcoded kamikaze run. No postures.
- Fixed Wing (fixed_wing): 5 AP. HP 60, Dmg 15, Speed Highest, Air. Hardcapped 1 deployment per match. Use strafe_run.
- Wheeled Drone (wheeled_drone): 3 AP. HP 100, Dmg 12, Speed Medium, Ground. Postures: ASSAULT, SUPPRESS, FLANK, HOLD, RETREAT.
- Robot Dog (robot_dog): 4 AP. HP 150, Dmg 18, Speed Slow, Ground. Postures: ASSAULT, HOLD, RECON, RETREAT.
- Humanoid (humanoid): 6 AP. HP 200, Dmg 20, Speed Slow, Ground. Postures: ASSAULT, SUPPRESS, FLANK, HOLD, RETREAT.

Topological graph adjacency (Zones):
- zone_spawn connected to: zone_courtyard
- zone_courtyard connected to: zone_spawn, zone_warehouse, zone_bridge
- zone_warehouse connected to: zone_courtyard, zone_tunnels, zone_plant
- zone_bridge connected to: zone_courtyard, zone_plant
- zone_plant connected to: zone_warehouse, zone_bridge, zone_core
- zone_tunnels connected to: zone_warehouse, zone_core
- zone_core connected to: zone_plant, zone_tunnels`;
    const systemInstructions = this.loadedStrategyBrief ? `${baseInstructions}

${this.loadedStrategyBrief}` : baseInstructions;
    try {
      let { calls, usage, modelUsed } = await this.adapter.execute(
        payloadToLLM,
        systemInstructions,
        COMMANDER_TOOLS,
        { roomId: this.room.roomId }
      );
      const maxToolCalls = await serverFlagService.getNumber(
        "llm_max_tool_calls_per_cycle" /* LLM_MAX_TOOL_CALLS_PER_CYCLE */,
        { roomId: this.room.roomId },
        6
      );
      if (calls && calls.length > maxToolCalls) {
        this.room.failedOperations.push(`Tool call limit exceeded: ${calls.length} > ${maxToolCalls}`);
        calls = calls.slice(0, maxToolCalls);
      }
      const callTokens = usage.totalTokens;
      if (callTokens > 0) {
        this.room.llmTokensUsedThisMatch += callTokens;
      }
      if (calls && calls.length > 0) {
        const callSummary = calls.map((c) => `${c.name}(${JSON.stringify(c.args || {})})`).join("; ");
        this.lastCycleSummary = callSummary;
        this.room.lastLLMToolCall = callSummary;
      }
      this.recentExecutionHistory.push({
        timestamp: Date.now(),
        payload: statePayload,
        calls: calls ? calls : [],
        failedOps: [...this.room.failedOperations]
      });
      if (this.recentExecutionHistory.length > 10) {
        this.recentExecutionHistory.shift();
      }
      const llmLatency = Date.now() - _llmStartTime;
      await recordServerLLMLatency(llmLatency, modelUsed);
      this.room.broadcastReliableEvent.bind(this.room)({
        type: "dev_llm_feed",
        payload: statePayload,
        calls: calls ? JSON.stringify(calls) : "[]",
        latency: llmLatency,
        count: this.room.apiCallCount,
        tokensUsed: this.room.llmTokensUsedThisMatch,
        failedOps: [...this.room.failedOperations],
        modelUsed,
        familyUsed: this.adapter.family
      });
      if (calls && calls.length > 0) {
        const pipelineOrder = [
          "spawn_units",
          "split_group",
          "merge_groups",
          "move_group",
          "hold_position",
          "set_posture",
          "coordinate_attack",
          "search_zone",
          "strafe_run",
          "sustain"
        ];
        const sortedCalls = [...calls].sort(
          (a, b) => pipelineOrder.indexOf(a.name) - pipelineOrder.indexOf(b.name)
        );
        const groupLocks = /* @__PURE__ */ new Set();
        for (let i = 0; i < sortedCalls.length; i++) {
          const call = sortedCalls[i];
          const args = call.args;
          const mutatesGroups = [
            "split_group",
            "merge_groups",
            "move_group",
            "hold_position",
            "set_posture",
            "coordinate_attack",
            "search_zone"
          ].includes(call.name);
          if (mutatesGroups) {
            const g1 = args.group_id || args.source_group_id;
            const g2 = args.target_group_id;
            if (g1 && groupLocks.has(g1) || g2 && groupLocks.has(g2)) {
              this.room.failedOperations.push(
                `Task rejected: Group lock collision for ${call.name}`
              );
              continue;
            }
            if (g1) groupLocks.add(g1);
            if (g2) groupLocks.add(g2);
          }
          switch (call.name) {
            case "spawn_units": {
              const { zone_id, unit_type, count, behavior_profile } = args;
              const typeMapping = {
                recon_drone: 2 /* RECON */,
                rotary_shooter: 0 /* ROTARY_SHOOTER */,
                bomber_drone: 1 /* BOMBER */,
                fixed_wing: 3 /* FIXED_WING */,
                wheeled_drone: 4 /* WHEELED */,
                robot_dog: 5 /* ROBOT_DOG */,
                humanoid: 6 /* HUMANOID */
              };
              const requestedDroneType = typeMapping[unit_type];
              if (requestedDroneType === void 0) {
                const reason = `Spawn rejected: Unknown unit_type ${unit_type}`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("spawn_units", args, "REJECTED", reason);
                break;
              }
              const droneConfig = DRONE_CONFIGS[requestedDroneType];
              if (!droneConfig) {
                const reason = `Spawn rejected: Missing config for ${unit_type}`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("spawn_units", args, "REJECTED", reason);
                break;
              }
              let currentActiveCount = 0;
              for (let j = 0; j < this.room.drones.length; j++) {
                if (this.room.drones[j].state !== 5 /* DEAD */)
                  currentActiveCount++;
              }
              if (currentActiveCount + count > MAX_DRONES2) {
                const reason = `Spawn rejected: Count exceeded max active capacity of ${MAX_DRONES2}`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("spawn_units", args, "REJECTED", reason);
                break;
              }
              if (requestedDroneType === 3 /* FIXED_WING */) {
                if (this.room.fixedWingDeploymentsThisMatch >= 1 || count > 1) {
                  const reason = `Spawn rejected: Fixed Wing deployment hard cap (1 per match) reached`;
                  this.room.failedOperations.push(reason);
                  this.feedback.recordResult("spawn_units", args, "REJECTED", reason);
                  break;
                }
              }
              const requiredAP = droneConfig.apCost * count;
              if (this.room.commanderAP < requiredAP) {
                const reason = `Spawn rejected: Insufficient AP pool (${this.room.commanderAP} AP available, ${requiredAP} AP required for ${count}x ${unit_type})`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("spawn_units", args, "REJECTED", reason);
                break;
              }
              this.room.commanderAP -= requiredAP;
              if (requestedDroneType === 3 /* FIXED_WING */) {
                this.room.fixedWingDeploymentsThisMatch++;
              }
              let successfullySpawned = 0;
              const newGroupId = `G_INC_${Math.floor(Math.random() * 1e3)}`;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.state === 5 /* DEAD */) {
                  const b = ZONE_BOUNDS[zone_id];
                  d.id = this.room.nextDroneId++;
                  d.type = requestedDroneType;
                  d.state = 0 /* IDLE */;
                  d.behavior = behavior_profile;
                  d.zone = zone_id;
                  const isAir = droneConfig.isAirUnit;
                  const isTunnels = zone_id === ZONES.TUNNELS || String(zone_id).toLowerCase().includes("tunnel");
                  const spawnType = isAir ? "AIR_HANGAR" : isTunnels ? "ELEVATOR_SHAFT" : "GROUND_GARAGE";
                  let spawnPos = this.room.mapId === "map_1_facility" ? this.room.getNextSpawnPoint.bind(this.room)(spawnType) : null;
                  if (spawnPos) {
                    d.posX = spawnPos.x;
                    d.posY = spawnPos.y;
                    d.posZ = spawnPos.z;
                  } else {
                    d.posX = b.center.x + (Math.random() - 0.5) * b.halfSize.x * 0.5;
                    d.posY = b.center.y + (Math.random() - 0.5) * b.halfSize.y * 0.5;
                    d.posZ = b.center.z + (Math.random() - 0.5) * b.halfSize.z * 0.5;
                  }
                  d.velX = 0;
                  d.velY = 0;
                  d.velZ = 0;
                  d.hp = droneConfig.hp;
                  d.groupId = newGroupId;
                  d.cooldown = 40;
                  this.room.initDronePhysics.bind(this.room)(d);
                  successfullySpawned++;
                  if (successfullySpawned >= count) break;
                }
              }
              this.feedback.recordResult("spawn_units", args, "SUCCESS");
              this.room.broadcastReliableEvent.bind(this.room)({
                type: "group_spawned",
                zone: zone_id,
                count: successfullySpawned,
                groupId: newGroupId
              });
              break;
            }
            case "split_group": {
              const { source_group_id, unit_count } = args;
              const matches = [];
              for (let j = 0; j < this.room.drones.length; j++) {
                if (this.room.drones[j].groupId === source_group_id && this.room.drones[j].state !== 5 /* DEAD */) {
                  matches.push(this.room.drones[j]);
                }
              }
              if (matches.length <= unit_count) {
                const reason = `Split rejected: Source group ${source_group_id} has insufficient members (${matches.length})`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("split_group", args, "REJECTED", reason);
                break;
              }
              const newGroupId = `G_SPL_${Math.floor(Math.random() * 1e3)}`;
              for (let j = 0; j < unit_count; j++) {
                matches[j].groupId = newGroupId;
              }
              const existingOrder = this.room.outstandingOrders.get(source_group_id);
              if (existingOrder) {
                this.room.outstandingOrders.set(newGroupId, { ...existingOrder, cyclesOutstanding: 0 });
              }
              this.feedback.recordResult("split_group", args, "SUCCESS");
              this.room.broadcastReliableEvent.bind(this.room)({
                type: "group_split_status",
                src: source_group_id,
                dst: newGroupId,
                size: unit_count
              });
              break;
            }
            case "merge_groups": {
              const { source_group_id, target_group_id } = args;
              let srcFound = false;
              let dstFound = false;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.state !== 5 /* DEAD */) {
                  if (d.groupId === source_group_id) {
                    d.groupId = target_group_id;
                    srcFound = true;
                  }
                  if (d.groupId === target_group_id) dstFound = true;
                }
              }
              if (!srcFound || !dstFound) {
                const reason = `Merge rejected: Missing target groupings.`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("merge_groups", args, "REJECTED", reason);
              } else {
                this.room.outstandingOrders.delete(source_group_id);
                this.feedback.recordResult("merge_groups", args, "SUCCESS");
                this.room.broadcastReliableEvent.bind(this.room)({
                  type: "group_linked",
                  src: source_group_id,
                  target: target_group_id
                });
              }
              break;
            }
            case "move_group": {
              const { group_id, target_zone } = args;
              let movedCount = 0;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.groupId === group_id && d.state !== 5 /* DEAD */) {
                  d.path = astarPath(d.zone, target_zone);
                  d.pathIndex = 0;
                  d.state = 1 /* PATROLLING */;
                  movedCount++;
                }
              }
              if (movedCount === 0) {
                const reason = `Move rejected: No active members found for group: ${group_id}`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("move_group", args, "REJECTED", reason);
              } else {
                this.room.outstandingOrders.set(group_id, {
                  targetZone: target_zone,
                  cyclesOutstanding: 0
                });
                this.feedback.recordResult("move_group", args, "SUCCESS");
                this.room.broadcastReliableEvent.bind(this.room)({
                  type: "group_movement",
                  id: group_id,
                  zone: target_zone
                });
              }
              break;
            }
            case "hold_position": {
              const { group_id, duration_seconds } = args;
              const holdCycles = duration_seconds ? Math.max(1, Math.ceil(Number(duration_seconds) / 8)) : 4;
              let foundGroupZone = null;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.groupId === group_id && d.state !== 5 /* DEAD */) {
                  d.velX = 0;
                  d.velY = 0;
                  d.velZ = 0;
                  d.state = 2 /* PURSUING */;
                  foundGroupZone = d.zone;
                }
              }
              if (foundGroupZone) {
                this.room.outstandingOrders.set(group_id, {
                  targetZone: foundGroupZone,
                  cyclesOutstanding: 0,
                  holdRemainingCycles: holdCycles
                });
                this.feedback.recordResult("hold_position", args, "SUCCESS");
              } else {
                const reason = `Hold rejected: Group not found or dead: ${group_id}`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("hold_position", args, "REJECTED", reason);
              }
              break;
            }
            case "set_posture": {
              const { group_id, posture } = args;
              let count = 0;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.groupId === group_id && d.state !== 5 /* DEAD */) {
                  if (this.room.groupTacticalState.isPostureValidForDrone(d.type, posture)) {
                    count++;
                  }
                }
              }
              if (count === 0) {
                const reason = `set_posture rejected: No units in group ${group_id} support posture ${posture}`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("set_posture", args, "REJECTED", reason);
              } else {
                this.room.groupTacticalState.setPosture(group_id, posture);
                this.feedback.recordResult("set_posture", args, "SUCCESS");
                this.room.broadcastReliableEvent.bind(this.room)({
                  type: "group_posture_changed",
                  groupId: group_id,
                  posture
                });
              }
              break;
            }
            case "coordinate_attack": {
              const { primary_group_id, support_group_id, target_zone } = args;
              let primCount = 0;
              let suppCount = 0;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.state !== 5 /* DEAD */) {
                  if (d.groupId === primary_group_id) {
                    d.path = astarPath(d.zone, target_zone);
                    d.pathIndex = 0;
                    d.state = 1 /* PATROLLING */;
                    primCount++;
                  }
                  if (d.groupId === support_group_id) {
                    d.path = astarPath(d.zone, target_zone);
                    d.pathIndex = 0;
                    d.state = 1 /* PATROLLING */;
                    suppCount++;
                  }
                }
              }
              if (primCount === 0 || suppCount === 0) {
                const reason = `coordinate_attack rejected: One or both groups (${primary_group_id}, ${support_group_id}) are empty/dead`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("coordinate_attack", args, "REJECTED", reason);
              } else {
                this.room.groupTacticalState.setPosture(primary_group_id, "SUPPRESS");
                this.room.groupTacticalState.setPosture(support_group_id, "FLANK");
                this.room.outstandingOrders.set(primary_group_id, { targetZone: target_zone, cyclesOutstanding: 0 });
                this.room.outstandingOrders.set(support_group_id, { targetZone: target_zone, cyclesOutstanding: 0 });
                this.feedback.recordResult("coordinate_attack", args, "SUCCESS");
                this.room.broadcastReliableEvent.bind(this.room)({
                  type: "coordinated_attack_started",
                  primary: primary_group_id,
                  support: support_group_id,
                  targetZone: target_zone
                });
              }
              break;
            }
            case "search_zone": {
              const { group_id, zone_id } = args;
              let count = 0;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.groupId === group_id && d.state !== 5 /* DEAD */) {
                  d.path = astarPath(d.zone, zone_id);
                  d.pathIndex = 0;
                  d.state = 1 /* PATROLLING */;
                  count++;
                }
              }
              if (count === 0) {
                const reason = `search_zone rejected: Group ${group_id} not found or dead`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("search_zone", args, "REJECTED", reason);
              } else {
                this.room.groupTacticalState.setPosture(group_id, "RECON");
                this.room.outstandingOrders.set(group_id, { targetZone: zone_id, cyclesOutstanding: 0 });
                this.feedback.recordResult("search_zone", args, "SUCCESS");
              }
              break;
            }
            case "strafe_run": {
              const { target_zone } = args;
              let fwDrone = null;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.type === 3 /* FIXED_WING */ && d.state !== 5 /* DEAD */) {
                  fwDrone = d;
                  break;
                }
              }
              if (!fwDrone) {
                const reason = `strafe_run rejected: No active Fixed Wing drone found`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("strafe_run", args, "REJECTED", reason);
              } else {
                fwDrone.strafeRunTarget = target_zone;
                fwDrone.fixedWingPhase = "APPROACH";
                fwDrone.path = astarPath(fwDrone.zone, target_zone);
                fwDrone.pathIndex = 0;
                fwDrone.state = 1 /* PATROLLING */;
                this.feedback.recordResult("strafe_run", args, "SUCCESS");
                this.room.broadcastReliableEvent.bind(this.room)({
                  type: "strafe_run_ordered",
                  droneId: fwDrone.id,
                  targetZone: target_zone
                });
              }
              break;
            }
          }
        }
      }
    } catch (err) {
      const rawErrMsg = err?.error?.message || err?.message || String(err);
      const errMsg = typeof rawErrMsg === "object" ? JSON.stringify(rawErrMsg) : rawErrMsg;
      const errStatus = err?.status || "";
      const llmLatency = Date.now() - _llmStartTime;
      this.room.broadcastReliableEvent.bind(this.room)({
        type: "dev_llm_feed",
        payload: statePayload,
        calls: JSON.stringify([{ error: errMsg }]),
        latency: llmLatency,
        count: this.room.apiCallCount,
        tokensUsed: this.room.llmTokensUsedThisMatch,
        failedOps: [...this.room.failedOperations],
        familyUsed: this.adapter?.family || "unknown"
      });
      if (errStatus === "RESOURCE_EXHAUSTED" || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("exceeded") || errMsg.includes("429") || errMsg.includes("rate limit")) {
        const isDailyExhaustion = errMsg.includes("FreeTier") || errMsg.includes("daily") || errMsg.includes("per day");
        const coolingPeriodMs = isDailyExhaustion ? 6e4 : 35e3;
        this.llmThrottleCooldownUntil = Date.now() + coolingPeriodMs;
        this.room.offlineSystemFallbackAI.bind(this.room)();
      } else {
        this.room.failedOperations.push(`Processor fail: ${errMsg}`);
      }
    }
  }
  async interviewLLM(question) {
    if (!this.adapter) {
      await this.initAdapter();
    }
    if (!this.adapter) {
      return "ERROR: Commander adapter not initialized.";
    }
    if (Date.now() < this.llmThrottleCooldownUntil) {
      return "THROTTLED: LLM API cooling down after prior rate limits. Retry shortly.";
    }
    const systemInstruction = `You are an automated state-machine log parser and execution analyzer for a group routing and unit allocation system. You are not roleplaying. There is no narrative. Provide clinical, mechanical, objective, and dry explanations for unit group routing, state changes, zone allocations, and resource counts. Answer the inquiry directly using the provided spatial state and recent execution history. Never adopt any persona, roleplay, or larp.`;
    const statePayload = this.room.commanderMemory ? this.room.commanderMemory.buildCompressedPayload() : "ZONES: " + Object.entries(this.room.zoneSummary || {}).map(([z, s]) => `${z.replace("zone_", "")}(c:${s?.confidence?.toFixed(1) ?? "0.0"},g:${s?.droneGroups?.join(",") || "none"})`).join(" ");
    const historyPayload = JSON.stringify(this.recentExecutionHistory.slice(-5));
    const prompt = `CURRENT STATE:
${statePayload}

RECENT EXECUTION HISTORY:
${historyPayload}

INQUIRY:
${question}`;
    try {
      const { calls, usage, modelUsed } = await this.adapter.execute(
        prompt,
        systemInstruction,
        [],
        { roomId: this.room.roomId }
      );
      return `Analysis from ${this.adapter.family} (${modelUsed}): ${JSON.stringify(calls)}`;
    } catch (err) {
      const rawErrMsg = err?.error?.message || err?.message || String(err);
      const errMsg = typeof rawErrMsg === "object" ? JSON.stringify(rawErrMsg) : rawErrMsg;
      return `ERROR processing inquiry: ${errMsg}`;
    }
  }
};

// server/ai/CommanderMemory.ts
var CommanderMemory = class {
  constructor(room) {
    this.room = room;
    this.lastCycleCasualties = [];
    this.utilityLog = [];
    this.utilityLogHead = 0;
  }
  onDroneDespawned(drone) {
    this.lastCycleCasualties.push({
      groupId: drone.groupId || "G_UNK",
      unitType: drone.type,
      zone: drone.zone,
      timestamp: Date.now()
    });
  }
  onUtilityUsed(playerId, utilityId) {
    const elapsedSec = Math.max(0, Math.floor((Date.now() - (this.room.matchStartTime || Date.now())) / 1e3));
    let displayId = utilityId;
    if (utilityId === "Radio") {
      displayId = "Radio intercepted";
    } else if (utilityId === "Signal Jammer") {
      displayId = "Signal Jammer activated";
    }
    const rec = {
      playerId,
      utilityId: displayId,
      timestamp: Date.now(),
      elapsedSec
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
  buildCompressedPayload() {
    const now = Date.now();
    const elapsedSec = Math.max(0, Math.floor((now - (this.room.matchStartTime || now)) / 1e3));
    const totalSec = ACTIVE_GAMEMODE.matchDuration || 600;
    const clockMin = Math.floor(elapsedSec / 60);
    const clockSec = (elapsedSec % 60).toString().padStart(2, "0");
    const totalMin = Math.floor(totalSec / 60);
    const totalSecStr = (totalSec % 60).toString().padStart(2, "0");
    const clockStr = `T+${clockMin}:${clockSec}/${totalMin}:${totalSecStr}`;
    let alivePlayers = 0;
    let deadPlayers = 0;
    const classCounts = {};
    const deadDetails = [];
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
    const classSummaryStr = Object.entries(classCounts).map(([cls, count]) => `${count} ${cls}`).join(", ") || "0 players";
    const totalPlayers = this.room.players ? this.room.players.size : 0;
    const squadStr = `SQUAD: ${totalPlayers} (${classSummaryStr}) | Alive: ${alivePlayers} | Dead: ${deadPlayers}${deadDetails.length > 0 ? ` [${deadDetails.join(", ")}]` : ""}`;
    const activeGroupMap = {};
    if (this.room.drones) {
      for (let i = 0; i < this.room.drones.length; i++) {
        const d = this.room.drones[i];
        if (d && d.state !== 0) {
          const gid = d.groupId || "G_DEFAULT";
          if (!activeGroupMap[gid]) {
            activeGroupMap[gid] = { zone: d.zone, types: {} };
          }
          const tName = getDroneTypeName(d.type);
          activeGroupMap[gid].types[tName] = (activeGroupMap[gid].types[tName] || 0) + 1;
        }
      }
    }
    const groupStrParts = [];
    for (const [gid, data] of Object.entries(activeGroupMap)) {
      const typeStr = Object.entries(data.types).map(([t, c]) => `${c}${t}`).join("+");
      groupStrParts.push(`${gid}@${(data.zone || "zone").replace("zone_", "")}(${typeStr})`);
    }
    const assetLedgerStr = `OWNED GROUPS: ${groupStrParts.length > 0 ? groupStrParts.join(" ") : "None"}`;
    const casualtyStrParts = [];
    if (this.lastCycleCasualties.length > 0) {
      const casByGroup = {};
      for (const cas of this.lastCycleCasualties) {
        const key = `${cas.groupId}@${(cas.zone || "zone").replace("zone_", "")}`;
        casByGroup[key] = (casByGroup[key] || 0) + 1;
      }
      for (const [key, count] of Object.entries(casByGroup)) {
        casualtyStrParts.push(`-${count} (${key})`);
      }
    }
    const casualtyStr = `CASUALTIES(last cycle): ${casualtyStrParts.length > 0 ? casualtyStrParts.join(", ") : "None"}`;
    this.lastCycleCasualties.length = 0;
    const recentUtils = [];
    const logItems = [...this.utilityLog];
    logItems.sort((a, b) => a.timestamp - b.timestamp);
    for (const u of logItems.slice(-5)) {
      const m = Math.floor(u.elapsedSec / 60);
      const s = (u.elapsedSec % 60).toString().padStart(2, "0");
      recentUtils.push(`${u.utilityId}@${m}:${s}`);
    }
    const utilStr = `UTILITIES USED: ${recentUtils.length > 0 ? recentUtils.join(", ") : "None"}`;
    let objectiveHolder = null;
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
    const coreStr = objectiveHolder ? `CORE OBJECTIVE: CONTESTED by ${objectiveHolder.slice(0, 4)} | Held: ${maxHoldProg.toFixed(1)}s/${holdTimeTotal}s (resets on dmg/exit)` : `CORE OBJECTIVE: Uncontested | Held: 0.0s/${holdTimeTotal}s (resets on dmg/exit)`;
    const zoneStrParts = [];
    if (this.room.zoneSummary) {
      for (const zName of ZONES_ARRAY) {
        const zs = this.room.zoneSummary[zName];
        if (!zs) continue;
        const shortName = zName.replace("zone_", "");
        const conf = zs.confidence !== void 0 ? zs.confidence.toFixed(1) : "0.0";
        const groups = zs.droneGroups && zs.droneGroups.length > 0 ? zs.droneGroups.join(",") : "none";
        zoneStrParts.push(`${shortName}(conf:${conf},groups:${groups})`);
      }
    }
    const zoneSummaryStr = `ZONES: ${zoneStrParts.join(" ")}`;
    return `MATCH CLOCK: ${clockStr}
${squadStr}
${assetLedgerStr}
${casualtyStr}
${utilStr}
${coreStr}
${zoneSummaryStr}`;
  }
  clear() {
    this.lastCycleCasualties.length = 0;
    this.utilityLog.length = 0;
    this.utilityLogHead = 0;
  }
};
function getDroneTypeName(type) {
  switch (type) {
    case 0 /* ROTARY_SHOOTER */:
      return "rot";
    case 4 /* WHEELED */:
      return "whe";
    case 1 /* BOMBER */:
      return "bmb";
    case 3 /* FIXED_WING */:
      return "fxd";
    case 2 /* RECON */:
      return "rec";
    case 5 /* ROBOT_DOG */:
      return "dog";
    case 6 /* HUMANOID */:
      return "hum";
    case 99 /* TEST_ENTITY */:
      return "tst";
    default:
      return "unk";
  }
}

// server/ai/GroupTacticalState.ts
var POSTURE_ALLOWLIST = {
  [2 /* RECON */]: ["RECON", "RETREAT"],
  [0 /* ROTARY_SHOOTER */]: ["SUPPRESS", "HARASS", "RETREAT"],
  [1 /* BOMBER */]: [],
  // Bomber has hardcoded kamikaze behavior, no postures
  [3 /* FIXED_WING */]: [],
  // Fixed Wing has hardcoded strafe run, no postures
  [4 /* WHEELED */]: ["ASSAULT", "SUPPRESS", "FLANK", "HOLD", "RETREAT"],
  [5 /* ROBOT_DOG */]: ["ASSAULT", "HOLD", "RECON", "RETREAT"],
  [6 /* HUMANOID */]: ["ASSAULT", "SUPPRESS", "FLANK", "HOLD", "RETREAT"],
  [99 /* TEST_ENTITY */]: []
};
var GroupTacticalState = class {
  constructor() {
    this.groupPostures = /* @__PURE__ */ new Map();
  }
  setPosture(groupId, posture) {
    this.groupPostures.set(groupId, posture);
    return true;
  }
  getPosture(groupId) {
    return this.groupPostures.get(groupId) || null;
  }
  clear() {
    this.groupPostures.clear();
  }
  isPostureValidForDrone(droneType, posture) {
    const allowlist = POSTURE_ALLOWLIST[droneType];
    return allowlist ? allowlist.includes(posture) : false;
  }
};

// server/physics/PhysicsWorldManager.ts
var import_rapier3d_compat3 = __toESM(require("@dimforge/rapier3d-compat"), 1);
var PhysicsWorldManager = class {
  constructor(specJson) {
    this.specJson = specJson;
  }
  initPhysics() {
    this.rapierWorld = new import_rapier3d_compat3.default.World({ x: 0, y: -9.81, z: 0 });
    const staticBodyDesc = import_rapier3d_compat3.default.RigidBodyDesc.fixed();
    const staticBody = this.rapierWorld.createRigidBody(staticBodyDesc);
    const wall1Desc = import_rapier3d_compat3.default.ColliderDesc.cuboid(384, 20, 1).setTranslation(384, 10, 768);
    this.rapierWorld.createCollider(wall1Desc, staticBody);
    const wall2Desc = import_rapier3d_compat3.default.ColliderDesc.cuboid(384, 20, 1).setTranslation(384, 10, 0);
    this.rapierWorld.createCollider(wall2Desc, staticBody);
    const wall3Desc = import_rapier3d_compat3.default.ColliderDesc.cuboid(1, 20, 384).setTranslation(768, 10, 384);
    this.rapierWorld.createCollider(wall3Desc, staticBody);
    const wall4Desc = import_rapier3d_compat3.default.ColliderDesc.cuboid(1, 20, 384).setTranslation(0, 10, 384);
    this.rapierWorld.createCollider(wall4Desc, staticBody);
    const floorDesc = import_rapier3d_compat3.default.ColliderDesc.cuboid(500, 0.5, 500).setTranslation(384, -0.5, 384);
    this.rapierWorld.createCollider(floorDesc, staticBody);
    if (this.specJson && this.specJson.buildings) {
      for (const b of this.specJson.buildings) {
        let sizeX = b.size.x || 10;
        let sizeZ = b.size.z || 10;
        const angleRad = b.rotation && b.rotation.y ? b.rotation.y * Math.PI / 180 : 0;
        if (Math.abs(Math.sin(angleRad)) > 0.707) {
          const temp = sizeX;
          sizeX = sizeZ;
          sizeZ = temp;
        }
        const halfX = sizeX / 2;
        const halfY = (b.size.y || 10) / 2;
        const halfZ = sizeZ / 2;
        const desc = import_rapier3d_compat3.default.ColliderDesc.cuboid(halfX, halfY, halfZ).setTranslation(b.position.x, b.position.y + halfY, b.position.z);
        this.rapierWorld.createCollider(desc, staticBody);
      }
    }
  }
};

// server/ai/DroneMemory.ts
var DECAY_RATE = 1 / 15;
var UNKNOWN_THRESHOLD = 0.2;
function getMemoryThreeState(confidence) {
  if (confidence === 1) {
    return "confirmed";
  } else if (confidence > UNKNOWN_THRESHOLD && confidence < 1) {
    return "last_seen";
  } else {
    return "unknown";
  }
}
function createMemoryMap(initial) {
  const map = /* @__PURE__ */ new Map();
  if (initial) {
    if (Array.isArray(initial)) {
      for (const r of initial) {
        if (r && r.entityId) {
          map.set(r.entityId, r);
        }
      }
    } else if (Symbol.iterator in Object(initial)) {
      for (const [k, v] of initial) {
        map.set(k, v);
      }
    }
  }
  return new Proxy(map, {
    get(target, prop, receiver) {
      if (prop === "length") {
        return target.size;
      }
      if (typeof prop === "string") {
        const num = Number(prop);
        if (Number.isInteger(num) && num >= 0) {
          let idx = 0;
          for (const val2 of target.values()) {
            if (idx === num) return val2;
            idx++;
          }
          return void 0;
        }
      }
      const val = Reflect.get(target, prop, target);
      if (typeof val === "function") {
        return val.bind(target);
      }
      return val;
    }
  });
}
function updateDroneMemory(drone, perception, nowMs, dt = 0.0166) {
  if (!drone.memoryRecords || Array.isArray(drone.memoryRecords)) {
    drone.memoryRecords = createMemoryMap(drone.memoryRecords);
  }
  const { playerId, detected, heard, reactedToDamage, sightConfidence, soundConfidence, damageConfidence, targetPos } = perception;
  if (detected || heard || reactedToDamage) {
    let record = drone.memoryRecords.get(playerId);
    if (!record) {
      record = {
        entityId: playerId,
        lastSensedPosition: { x: 0, y: 0, z: 0 },
        timeLastSensed: 0,
        confidence: 0
      };
      drone.memoryRecords.set(playerId, record);
    }
    let targetConfidence = 0;
    if (detected) {
      targetConfidence = sightConfidence;
    } else if (heard) {
      targetConfidence = soundConfidence;
    } else if (reactedToDamage) {
      targetConfidence = damageConfidence;
    }
    record.confidence = Math.max(record.confidence, targetConfidence);
    record.lastSensedPosition.x = targetPos.x;
    record.lastSensedPosition.y = targetPos.y;
    record.lastSensedPosition.z = targetPos.z;
    record.timeLastSensed = nowMs / 1e3;
    record.touchedThisTick = true;
  }
}
function decayDroneMemory(drone, dt = 0.0166) {
  if (!drone.memoryRecords) return;
  if (Array.isArray(drone.memoryRecords)) {
    drone.memoryRecords = createMemoryMap(drone.memoryRecords);
  }
  const droneConfig = DRONE_CONFIGS[drone.type];
  const decayRate = droneConfig?.decayRate ?? DECAY_RATE;
  for (const record of drone.memoryRecords.values()) {
    if (!record.touchedThisTick) {
      record.confidence = Math.max(0, record.confidence - decayRate * dt);
    }
    record.touchedThisTick = false;
  }
}
function forgetStaleMemory(drone, threshold = UNKNOWN_THRESHOLD) {
  if (!drone.memoryRecords) return;
  if (Array.isArray(drone.memoryRecords)) {
    drone.memoryRecords = createMemoryMap(drone.memoryRecords);
  }
  for (const [entityId, record] of drone.memoryRecords.entries()) {
    if (record.confidence <= threshold) {
      drone.memoryRecords.delete(entityId);
    }
  }
}

// server/match/types.ts
var MAX_PROJECTILES = 200;
var HISTORICAL_SAMPLES_MAX2 = 120;
var HISTORIC_BLOCK_SIZE2 = 2 + 50 * 4;
function getResolvedWeaponPerformance(weaponId) {
  return getWeaponPerformance(weaponId) || getWeaponPerformance("rifle");
}
function getWeaponReserveCapacity(weaponId) {
  const performance2 = getResolvedWeaponPerformance(weaponId);
  return performance2.reserveCapacity ?? performance2.capacity;
}
function getWeaponReloadTicks(weaponId) {
  const performance2 = getResolvedWeaponPerformance(weaponId);
  return Math.max(1, Math.ceil(performance2.visualConfig.reloadDuration * 60));
}
function resetWeaponSlotState(state, weaponId) {
  const performance2 = getResolvedWeaponPerformance(weaponId);
  state.weaponId = weaponId;
  state.currentMag = performance2.capacity;
  state.reserve = getWeaponReserveCapacity(weaponId);
  state.isReloading = false;
  state.reloadTimer = 0;
  state.leakyBucket = 0;
  state.lastConfirmedShotT = 0;
}
function applyWeaponReload(state) {
  const performance2 = getResolvedWeaponPerformance(state.weaponId);
  const needed = performance2.capacity - state.currentMag;
  const taken = Math.min(needed, state.reserve);
  state.currentMag += taken;
  state.reserve -= taken;
}
var astarPath = (start, end) => {
  if (start === end) return [start];
  const queue = [[start]];
  const visited = /* @__PURE__ */ new Set([start]);
  while (queue.length > 0) {
    const currentPath = queue.shift();
    const lastNode = currentPath[currentPath.length - 1];
    if (lastNode === end) return currentPath;
    const neighbors = TOPOLOGY[lastNode];
    if (!neighbors) continue;
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...currentPath, neighbor]);
      }
    }
  }
  return [start];
};

// server/match/SimulationEngine.ts
var import_rapier3d_compat6 = __toESM(require("@dimforge/rapier3d-compat"), 1);

// shared/asset-details.ts
var STANDARD_WEAPON_CLIPS = {
  idle: "idle",
  sprint: "sprint",
  fire: "fire",
  reload: "reload",
  equip: "equip",
  inspect: "inspect",
  adsEnter: "ads_enter",
  adsHold: "ads_hold",
  adsExit: "ads_exit"
};
var STANDARD_WEAPON_MARKERS = {
  equip_complete: 18,
  ads_ready: 12,
  ads_clear: 24,
  fire: 3,
  muzzle: 3,
  reload_start: 1,
  magazine_out: 12,
  magazine_in: 24,
  reload_complete: 30
};
function createWeaponAnimationContract(measuredSize, magazine) {
  return {
    nodes: {
      root: "WeaponRoot",
      gripPrimary: "GripPrimary",
      gripSupport: "GripSupport",
      muzzle: "Muzzle",
      adsReference: "ADSReference",
      ...magazine ? { magazine: "Magazine" } : {}
    },
    clips: STANDARD_WEAPON_CLIPS,
    markers: magazine ? STANDARD_WEAPON_MARKERS : {
      equip_complete: 18,
      ads_ready: 12,
      ads_clear: 24,
      fire: 3,
      muzzle: 3,
      reload_start: 1,
      reload_complete: 30
    },
    measuredSize
  };
}
function createCompatibilityAnimationAliases(animation) {
  return {
    idle: animation.clips.idle,
    walk: animation.clips.sprint,
    shoot: animation.clips.fire,
    reload: animation.clips.reload,
    draw: animation.clips.equip
  };
}
var RIFLE_ANIMATION = createWeaponAnimationContract([78.764503, 7.600975, 25.293276], true);
var PISTOL_ANIMATION = createWeaponAnimationContract([0.03113, 0.293643, 0.158911], true);
var SMG_ANIMATION = createWeaponAnimationContract([7.899324, 0.660313, 3.354116], true);
var LMG_ANIMATION = createWeaponAnimationContract([2.140608, 19.06014, 5.112448], true);
var SHOTGUN_ANIMATION = createWeaponAnimationContract([1.18001, 4.159216, 0.845963], false);
var SNIPER_ANIMATION = createWeaponAnimationContract([4.98094, 0.80619, 1.400133], true);
var WEAPON_ASSET_DETAILS = {
  rifle: {
    modelKey: "scar_l-optimized.glb",
    svgPath: "/ui_svgs/rifle.svg",
    audio: { fire: "rifle_fire", reload: "rifle_reload" },
    animations: createCompatibilityAnimationAliases(RIFLE_ANIMATION),
    animation: RIFLE_ANIMATION,
    authored: true
  },
  pistol: {
    modelKey: "g17-optimized.glb",
    svgPath: "/ui_svgs/pistol.svg",
    audio: { fire: "pistol_fire", reload: "pistol_reload" },
    animations: createCompatibilityAnimationAliases(PISTOL_ANIMATION),
    animation: PISTOL_ANIMATION,
    authored: true
  },
  smg: {
    modelKey: "ump-optimized.glb",
    svgPath: "/ui_svgs/smg.svg",
    audio: { fire: "smg_fire", reload: "smg_reload" },
    animations: createCompatibilityAnimationAliases(SMG_ANIMATION),
    animation: SMG_ANIMATION,
    authored: true,
    // Basis-table verified: source forward -X -> camera -Z and source up +Z -> screen-up +Y.
    viewModelQuaternion: [-0.5, 0.5, 0.5, 0.5]
  },
  shotgun: {
    modelKey: "benelli-m4-optimized.glb",
    svgPath: "/ui_svgs/shotgun.svg",
    audio: { fire: "shotgun_fire", reload: "shotgun_reload" },
    animations: createCompatibilityAnimationAliases(SHOTGUN_ANIMATION),
    animation: SHOTGUN_ANIMATION,
    authored: true
  },
  lmg: {
    modelKey: "lmg-rifle-optimized.glb",
    svgPath: "/ui_svgs/lmg.svg",
    audio: { fire: "lmg_fire", reload: "lmg_reload" },
    animations: createCompatibilityAnimationAliases(LMG_ANIMATION),
    animation: LMG_ANIMATION,
    authored: true
  },
  sniper: {
    modelKey: "pgm-ultima-ratio-optimized.glb",
    svgPath: "/ui_svgs/sniper.svg",
    audio: { fire: "sniper_fire", reload: "sniper_reload" },
    animations: createCompatibilityAnimationAliases(SNIPER_ANIMATION),
    animation: SNIPER_ANIMATION,
    authored: true
  }
};
function createUtilityAnimationContract(action, measuredSize, markers) {
  return {
    nodes: {
      root: "UtilityRoot",
      usePoint: "UtilityUsePoint",
      placementReference: "PlacementReference",
      throwRelease: "ThrowRelease"
    },
    clips: {
      equip: "equip",
      idle: "idle",
      inspect: "inspect",
      [action]: action
    },
    markers,
    measuredSize
  };
}
var UTILITY_ASSET_DETAILS = {
  "Grenade": {
    modelKey: "m67-grenade-optimized.glb",
    svgPath: "/ui_svgs/utility_grenade.svg",
    audioUseKey: "PLACEHOLDER_GRENADE_USE",
    animationUseKey: "PLACEHOLDER_GRENADE_THROW",
    animation: createUtilityAnimationContract("throw", [0.05957, 0.064784, 0.088684], { equip_complete: 18, throw_release: 30, throw_complete: 42 }),
    authored: true
  },
  "Flashbang": {
    modelKey: "m84-flashbang-optimized.glb",
    svgPath: "/ui_svgs/utility_flashbang.svg",
    audioUseKey: "PLACEHOLDER_FLASHBANG_USE",
    animationUseKey: "PLACEHOLDER_FLASHBANG_THROW",
    animation: createUtilityAnimationContract("throw", [0.089401, 0.060664, 0.183471], { equip_complete: 18, throw_release: 30, throw_complete: 42 }),
    authored: true
  },
  "Med Kit": {
    modelKey: "emergency-medkit-optimized.glb",
    svgPath: "/ui_svgs/medkit.svg",
    audioUseKey: "PLACEHOLDER_MEDKIT_USE",
    animationUseKey: "PLACEHOLDER_MEDKIT_USE",
    animation: createUtilityAnimationContract("use", [0.694197, 0.653067, 0.700505], { equip_complete: 18, use_start: 1, use_commit: 16, use_complete: 40 }),
    authored: true
  },
  "Revive Tool": {
    modelKey: "healthshot-optimized.glb",
    svgPath: "/ui_svgs/utility_revive.svg",
    audioUseKey: "PLACEHOLDER_REVIVE_USE",
    animationUseKey: "PLACEHOLDER_REVIVE_STAB_PRESS",
    animation: createUtilityAnimationContract("use", [0.266678, 0.047595, 0.060812], { equip_complete: 18, use_start: 1, use_commit: 15, use_complete: 32 }),
    authored: true
  },
  "Radio": {
    modelKey: "selex-prr-optimized.glb",
    svgPath: "/ui_svgs/radio.svg",
    audioUseKey: "PLACEHOLDER_RADIO_USE",
    animationUseKey: "PLACEHOLDER_RADIO_CALL",
    animation: createUtilityAnimationContract("use", [2.100569, 0.864385, 3.852933], { equip_complete: 18, use_start: 1, use_commit: 12, use_complete: 36 }),
    authored: true
  },
  "Signal Jammer": {
    modelKey: "prc152-optimized.glb",
    svgPath: "/ui_svgs/utility_jammer.svg",
    audioUseKey: "PLACEHOLDER_SIGNAL_JAMMER_USE",
    animationUseKey: "PLACEHOLDER_SIGNAL_JAMMER_USE",
    animation: createUtilityAnimationContract("use", [137.714355, 73.566498, 695.084595], { equip_complete: 18, use_start: 1, use_commit: 12, use_complete: 36 }),
    authored: true
  },
  "Proximity Mine": {
    modelKey: "proximity-mine-optimized.glb",
    svgPath: "/ui_svgs/utility_mine.svg",
    audioUseKey: "PLACEHOLDER_PROXIMITY_MINE_USE",
    animationUseKey: "PLACEHOLDER_PROXIMITY_MINE_DEPLOY",
    animation: createUtilityAnimationContract("place", [202.469711, 202.469742, 115.684662], { equip_complete: 18, place_commit: 20, place_complete: 38 }),
    authored: true
  },
  "C4": {
    modelKey: "c4-optimized.glb",
    svgPath: "/ui_svgs/utility_c4.svg",
    audioUseKey: "PLACEHOLDER_C4_USE",
    animationUseKey: "PLACEHOLDER_C4_PLACE",
    animation: createUtilityAnimationContract("place", [7.163114, 10.813313, 3.523477], { equip_complete: 18, place_commit: 20, place_complete: 38 }),
    authored: true
  }
};

// shared/utilities.ts
var GRENADE_BASE_COOLDOWN = 30;
var GRENADE_MAX_CHARGES = 2;
var GRENADE_DAMAGE = 80;
var GRENADE_RADIUS = 4;
var GRENADE_FUSE_TIME = 2;
var FLASHBANG_BASE_COOLDOWN = 25;
var FLASHBANG_MAX_CHARGES = 2;
var FLASHBANG_RADIUS = 8;
var FLASHBANG_DURATION = 3.5;
var MEDKIT_BASE_COOLDOWN = 45;
var MEDKIT_MAX_CHARGES = 1;
var MEDKIT_HEAL_AMOUNT = 50;
var MEDKIT_TARGET_RADIUS = 5;
var REVIVE_BASE_COOLDOWN = 60;
var REVIVE_MAX_CHARGES = 1;
var REVIVE_HEALTH_RESTORED = 50;
var REVIVE_TARGET_RADIUS = 5;
var RADIO_BASE_COOLDOWN = 15;
var RADIO_MAX_CHARGES = 999;
var SIGNAL_JAMMER_BASE_COOLDOWN = 90;
var SIGNAL_JAMMER_MAX_CHARGES = 1;
var SIGNAL_JAMMER_DURATION = 10;
var SIGNAL_JAMMER_RADIUS = 15;
var PROXIMITY_MINE_BASE_COOLDOWN = 120;
var PROXIMITY_MINE_MAX_CHARGES = 1;
var PROXIMITY_MINE_DAMAGE = 100;
var PROXIMITY_MINE_RADIUS = 4;
var PROXIMITY_MINE_TRIGGER_RADIUS = 4;
var C4_BASE_COOLDOWN = 120;
var C4_MAX_CHARGES = 1;
var C4_DAMAGE = 150;
var C4_RADIUS = 8;
var UTILITIES = {
  "Grenade": {
    id: "Grenade",
    displayName: "GRENADE",
    classId: "ASSAULT",
    slot: "utility1",
    baseCooldown: GRENADE_BASE_COOLDOWN,
    maxCharges: GRENADE_MAX_CHARGES,
    description: "High-explosive fragmentation grenade. 80 damage, 4m blast radius."
  },
  "Flashbang": {
    id: "Flashbang",
    displayName: "FLASHBANG",
    classId: "ASSAULT",
    slot: "utility2",
    baseCooldown: FLASHBANG_BASE_COOLDOWN,
    maxCharges: FLASHBANG_MAX_CHARGES,
    description: "Non-lethal concussion grenade. Blinds and disorients targets."
  },
  "Med Kit": {
    id: "Med Kit",
    displayName: "MED KIT",
    classId: "MEDIC",
    slot: "utility1",
    baseCooldown: MEDKIT_BASE_COOLDOWN,
    maxCharges: MEDKIT_MAX_CHARGES,
    description: "Deploys medical supply to restore operative health."
  },
  "Revive Tool": {
    id: "Revive Tool",
    displayName: "REVIVE TOOL",
    classId: "MEDIC",
    slot: "utility2",
    baseCooldown: REVIVE_BASE_COOLDOWN,
    maxCharges: REVIVE_MAX_CHARGES,
    description: "Resuscitation unit for field emergency revival."
  },
  "Radio": {
    id: "Radio",
    displayName: "RADIO",
    classId: "RECON",
    slot: "utility1",
    baseCooldown: RADIO_BASE_COOLDOWN,
    maxCharges: RADIO_MAX_CHARGES,
    description: "Intercepts fragments of the LLM commander's last operational cycle. Surfaces as an operational summary."
  },
  "Signal Jammer": {
    id: "Signal Jammer",
    displayName: "SIGNAL JAMMER",
    classId: "RECON",
    slot: "utility2",
    baseCooldown: SIGNAL_JAMMER_BASE_COOLDOWN,
    maxCharges: SIGNAL_JAMMER_MAX_CHARGES,
    description: "Jams local drone sensors and camera reporting in zone."
  },
  "Proximity Mine": {
    id: "Proximity Mine",
    displayName: "PROXIMITY MINE",
    classId: "DEMOLITIONS",
    slot: "utility1",
    baseCooldown: PROXIMITY_MINE_BASE_COOLDOWN,
    maxCharges: PROXIMITY_MINE_MAX_CHARGES,
    description: "Deploys explosive mine triggered by enemy proximity."
  },
  "C4": {
    id: "C4",
    displayName: "C4",
    classId: "DEMOLITIONS",
    slot: "utility2",
    baseCooldown: C4_BASE_COOLDOWN,
    maxCharges: C4_MAX_CHARGES,
    description: "Remote-detonated explosive charge."
  }
};
var UTILITY_MODEL_KEYS = {
  "Grenade": UTILITY_ASSET_DETAILS["Grenade"].modelKey,
  "Flashbang": UTILITY_ASSET_DETAILS["Flashbang"].modelKey,
  "Med Kit": UTILITY_ASSET_DETAILS["Med Kit"].modelKey,
  "Revive Tool": UTILITY_ASSET_DETAILS["Revive Tool"].modelKey,
  "Radio": UTILITY_ASSET_DETAILS["Radio"].modelKey,
  "Signal Jammer": UTILITY_ASSET_DETAILS["Signal Jammer"].modelKey,
  "Proximity Mine": UTILITY_ASSET_DETAILS["Proximity Mine"].modelKey,
  "C4": UTILITY_ASSET_DETAILS["C4"].modelKey
};
function createInitialUtilityState(classId, cooldownMultiplier = 1) {
  let u1Id = "Grenade";
  let u2Id = "Flashbang";
  if (classId === "MEDIC") {
    u1Id = "Med Kit";
    u2Id = "Revive Tool";
  } else if (classId === "RECON") {
    u1Id = "Radio";
    u2Id = "Signal Jammer";
  } else if (classId === "DEMOLITIONS") {
    u1Id = "C4";
    u2Id = "Proximity Mine";
  }
  const u1Def = UTILITIES[u1Id];
  const u2Def = UTILITIES[u2Id];
  return {
    utility1: {
      id: u1Id,
      charges: u1Def.maxCharges,
      maxCharges: u1Def.maxCharges,
      cooldownRemaining: 0,
      baseCooldown: u1Def.baseCooldown * cooldownMultiplier
    },
    utility2: {
      id: u2Id,
      charges: u2Def.maxCharges,
      maxCharges: u2Def.maxCharges,
      cooldownRemaining: 0,
      baseCooldown: u2Def.baseCooldown * cooldownMultiplier
    }
  };
}

// server/bot/BotController.ts
var RIFLE_RANGE = DETAILED_WEAPONS.rifle.falloff.minDamageRange;
var RIFLE_FIRE_RATE_HZ = DETAILED_WEAPONS.rifle.fireRateHz;
var FIRE_COOLDOWN_TICKS = Math.ceil(60 / RIFLE_FIRE_RATE_HZ);
var OBJ_X = 384;
var OBJ_Z = 384;
var OBJ_RADIUS = 3;
var botHitscanArgs = {
  weaponSlot: "primary",
  direction: { x: 0, y: 0, z: 0 },
  origin: { x: 0, y: 0, z: 0 },
  timestamp: 0
};
var bNearestId = "";
var bNearestDist = 0;
var bNearestX = 0;
var bNearestY = 0;
var bNearestZ = 0;
var bDx = 0;
var bDy = 0;
var bDz = 0;
var bBestDistSq = 0;
var bHorizDist = 0;
var bDirLen = 0;
function processBotTick(player, room, dt) {
  if (!player.isAlive || !player.isBot) return;
  const cd = player.botFireCooldown || 0;
  if (cd > 0) {
    player.botFireCooldown = cd - 1;
  }
  bNearestId = "";
  bBestDistSq = Infinity;
  bNearestX = 0;
  bNearestY = 0;
  bNearestZ = 0;
  const drones = room.drones || (room.getDrones ? room.getDrones() : []);
  for (let i = 0; i < drones.length; i++) {
    const d = drones[i];
    if (d.state === 5 /* DEAD */) continue;
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
  if (bNearestId !== "" && bNearestDist <= RIFLE_RANGE) {
    player.botActionId = 1;
    player.botTargetId = bNearestId;
    player.botTargetDist = bNearestDist;
    bDx = bNearestX - player.posX;
    bDy = bNearestY - (player.posY + PLAYER_EYE_LEVEL);
    bDz = bNearestZ - player.posZ;
    bHorizDist = Math.sqrt(bDx * bDx + bDz * bDz) || 1;
    player.botAimYaw = Math.atan2(-bDx, -bDz);
    player.botAimPitch = Math.atan2(bDy, bHorizDist);
    player.yaw = player.botAimYaw;
    player.pitch = player.botAimPitch;
    if ((player.botFireCooldown || 0) <= 0) {
      const wState = player.weaponState.primary;
      if (wState.currentMag > 0 && !wState.isReloading) {
        wState.currentMag--;
        player.firedThisTick = true;
        const cosP = Math.cos(player.pitch);
        botHitscanArgs.direction.x = -Math.sin(player.yaw) * cosP;
        botHitscanArgs.direction.y = Math.sin(player.pitch);
        botHitscanArgs.direction.z = -Math.cos(player.yaw) * cosP;
        bDirLen = Math.sqrt(
          botHitscanArgs.direction.x * botHitscanArgs.direction.x + botHitscanArgs.direction.y * botHitscanArgs.direction.y + botHitscanArgs.direction.z * botHitscanArgs.direction.z
        );
        if (bDirLen > 1e-3) {
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
    player.inputMask = 1;
    return;
  }
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
    player.inputMask = 1;
    player.isHoldingObjective = false;
  }
}

// server/ai/DronePerception.ts
var _sensorPos = { x: 0, y: 0, z: 0 };
var _rDir = { x: 0, y: 0, z: 0 };
function evaluateDronePerception(drone, player, nowMs, rapierWorld, RAPIER_MOD, collisionMap = null) {
  const conf = INTEL_CONFIGS[drone.type];
  const droneConfig = DRONE_CONFIGS[drone.type];
  const sightDistance = droneConfig?.detectionRadius ?? conf.sightDistance;
  const visionConeAngle = droneConfig?.fovHalfAngle ? droneConfig.fovHalfAngle * 2 : conf.visionConeAngle;
  _sensorPos.x = drone.posX;
  _sensorPos.y = drone.posY + 0.5;
  _sensorPos.z = drone.posZ;
  const dx = player.posX - _sensorPos.x;
  const dy = player.posY + 0.5 - _sensorPos.y;
  const dz = player.posZ - _sensorPos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const inDistance = dist <= sightDistance;
  let inFOV = false;
  if (inDistance) {
    const qx = drone.rotX;
    const qy = drone.rotY;
    const qz = drone.rotZ;
    const qw = drone.rotW;
    const forwardX = 2 * (qx * qz + qw * qy);
    const forwardY = 2 * (qy * qz - qw * qx);
    const forwardZ = 1 - 2 * (qx * qx + qy * qy);
    const fLen = Math.sqrt(forwardX * forwardX + forwardY * forwardY + forwardZ * forwardZ);
    const fx = fLen > 0 ? forwardX / fLen : 0;
    const fy = fLen > 0 ? forwardY / fLen : 0;
    const fz = fLen > 0 ? forwardZ / fLen : 1;
    const dirX = dist > 0 ? dx / dist : 0;
    const dirY = dist > 0 ? dy / dist : 0;
    const dirZ = dist > 0 ? dz / dist : 1;
    const dot = Math.max(-1, Math.min(1, fx * dirX + fy * dirY + fz * dirZ));
    const angle = Math.acos(dot);
    let fov = visionConeAngle;
    if (drone.type === 6 /* HUMANOID */) {
      fov = Math.max(Math.PI / 6, Math.PI / 2 * (1 - dist / sightDistance));
    }
    const halfAngle = fov / 2;
    inFOV = angle <= halfAngle;
  }
  let hasLOS = false;
  if (inDistance && inFOV) {
    const droneZone = drone.zone;
    const playerZone = player.zone;
    const areZonesConnected = !droneZone || !playerZone || droneZone === playerZone || Boolean(TOPOLOGY[droneZone]?.includes(playerZone));
    if (!areZonesConnected) {
      hasLOS = false;
    } else {
      hasLOS = true;
      _rDir.x = dx / dist;
      _rDir.y = dy / dist;
      _rDir.z = dz / dist;
      if (collisionMap && collisionMap.rayIntersectsAny(_sensorPos, _rDir, dist)) {
        hasLOS = false;
      }
    }
  }
  const detected = inDistance && inFOV && hasLOS;
  let heard = false;
  if (!detected && player.firedThisTick) {
    if (dist <= conf.hearingRadius) {
      heard = true;
    }
  }
  let reactedToDamage = false;
  if (!detected && !heard && drone.damageLog && drone.damageLog.length > 0) {
    const latestDamage = drone.damageLog[drone.damageLog.length - 1];
    if (latestDamage.playerId === player.id && nowMs - latestDamage.timestamp < 2e3) {
      reactedToDamage = true;
    }
  }
  return {
    playerId: player.id,
    detected,
    heard,
    reactedToDamage,
    sightConfidence: 1,
    // Full optical confidence -> 'confirmed'
    soundConfidence: 0.75,
    // Acoustic sound -> capped at 'last_seen'
    damageConfidence: 0.85,
    // Damage reaction -> 'last_seen'
    targetPos: { x: player.posX, y: player.posY, z: player.posZ }
  };
}

// server/ai/DroneIntelligence.ts
var _livingPlayersScratch = [];
function processDroneIntelligence(nowMs, drones, players, rapierWorld, RAPIER_MOD, dt = 0.0166, collisionMap = null) {
  _livingPlayersScratch.length = 0;
  for (const player of players.values()) {
    if (player.isAlive && player.body) {
      _livingPlayersScratch.push(player);
    }
  }
  for (let i = 0; i < drones.length; i++) {
    const d = drones[i];
    if (d.state === 5 /* DEAD */) continue;
    if (d.type === 99 /* TEST_ENTITY */) continue;
    if (!d.memoryRecords || Array.isArray(d.memoryRecords)) {
      d.memoryRecords = createMemoryMap(d.memoryRecords);
    }
    d.playerInFOV = false;
    const isRecon = d.type === 2 /* RECON */;
    const staggerMod = isRecon ? 2 : 4;
    const idVal = d.id;
    const idHash = typeof idVal === "number" ? idVal : typeof idVal === "string" && idVal.length > 0 ? idVal.charCodeAt(idVal.length - 1) || 0 : i;
    for (let pIdx = 0; pIdx < _livingPlayersScratch.length; pIdx++) {
      const player = _livingPlayersScratch[pIdx];
      const isHighAlert = d.state === 3 /* ATTACKING */ || d.state === 2 /* PURSUING */ || d.playerInFOV;
      const isTurn = isHighAlert || player.firedThisTick || !d.memoryRecords.has(player.id) || (idHash + Math.floor(nowMs / 16.66)) % staggerMod === 0;
      if (isTurn) {
        const perception = evaluateDronePerception(d, player, nowMs, rapierWorld, RAPIER_MOD, collisionMap);
        if (perception.detected) {
          d.playerInFOV = true;
        }
        updateDroneMemory(d, perception, nowMs, dt);
      }
    }
    decayDroneMemory(d, dt);
    forgetStaleMemory(d);
    let bestRecord = null;
    let maxConf = 0;
    for (const record of d.memoryRecords.values()) {
      if (record.confidence > maxConf) {
        maxConf = record.confidence;
        bestRecord = record;
      }
    }
    const classification = getMemoryThreeState(maxConf);
    if (classification === "confirmed" || classification === "last_seen") {
      if (d.mode === "NORMAL") {
        d.mode = "COMBAT";
      }
      d.combatTarget = bestRecord;
    } else {
      if (d.mode === "COMBAT") {
        const isCommittedBomber = d.type === 1 /* BOMBER */ && d.bomberState === "COMMITTED";
        if (!isCommittedBomber) {
          d.mode = "NORMAL";
          d.combatTarget = null;
        }
      } else {
        d.combatTarget = null;
      }
    }
  }
}

// server/ai/behavior/DroneBehaviorController.ts
var import_rapier3d_compat5 = __toESM(require("@dimforge/rapier3d-compat"), 1);

// server/ai/DroneAvoidance.ts
var reusableAvoidanceVector = { avoidX: 0, avoidZ: 0 };
function calculateDroneAvoidance(currentDrone, allDrones, obstacleNormals) {
  let totalForceX = 0;
  let totalForceZ = 0;
  const droneConfig = DRONE_CONFIGS[currentDrone.type];
  const radius = droneConfig?.visualRadius ?? 1.1;
  const maxAccelPerTick = droneConfig?.maxAccelPerTick ?? 0.4;
  const speed = droneConfig?.speed ?? 10;
  const sensingCutoffDistance = radius * 4;
  const kRepulsion = maxAccelPerTick * 30;
  const maxAvoidanceForce = speed * 2;
  for (let i = 0; i < allDrones.length; i++) {
    const other = allDrones[i];
    if (other.id === currentDrone.id) continue;
    if (other.state === 5 /* DEAD */) continue;
    const dx = currentDrone.posX - other.posX;
    const dz = currentDrone.posZ - other.posZ;
    const distSq = dx * dx + dz * dz;
    if (distSq <= 1e-4) continue;
    const dist = Math.sqrt(distSq);
    const otherConfig = DRONE_CONFIGS[other.type];
    const otherRadius = otherConfig?.visualRadius ?? 1.1;
    const minDistance = radius + otherRadius;
    if (dist < sensingCutoffDistance) {
      const effectiveDist = Math.max(0.01, dist - minDistance);
      const normalX = dx / dist;
      const normalZ = dz / dist;
      const mag = kRepulsion * (1 / effectiveDist - 1 / sensingCutoffDistance) * (1 / (effectiveDist * effectiveDist));
      totalForceX += normalX * mag;
      totalForceZ += normalZ * mag;
    }
  }
  if (obstacleNormals) {
    for (let i = 0; i < obstacleNormals.length; i++) {
      const obs = obstacleNormals[i];
      if (obs.distance < sensingCutoffDistance) {
        const effectiveDist = Math.max(0.01, obs.distance - radius);
        const mag = kRepulsion * (1 / effectiveDist - 1 / sensingCutoffDistance) * (1 / (effectiveDist * effectiveDist));
        totalForceX += obs.x * mag;
        totalForceZ += obs.z * mag;
      }
    }
  }
  const forceLen = Math.sqrt(totalForceX * totalForceX + totalForceZ * totalForceZ);
  if (forceLen > maxAvoidanceForce) {
    totalForceX = totalForceX / forceLen * maxAvoidanceForce;
    totalForceZ = totalForceZ / forceLen * maxAvoidanceForce;
  }
  reusableAvoidanceVector.avoidX = totalForceX;
  reusableAvoidanceVector.avoidZ = totalForceZ;
  return reusableAvoidanceVector;
}

// server/ai/behavior/behaviors/RotaryShooterBehavior.ts
function rotaryShooterBehavior(drone, ctx, out) {
  const intel = INTEL_CONFIGS[0 /* ROTARY_SHOOTER */];
  const conf = DRONE_CONFIGS[0 /* ROTARY_SHOOTER */];
  const groupPosture = ctx.getGroupPosture(drone.groupId) || "HARASS";
  drone.posture = groupPosture;
  if (drone.mode === "COMBAT" && drone.combatTarget) {
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dy = target.y - drone.posY;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < intel.engagementMin) {
      out.steerX = -dx / dist;
      out.steerZ = -dz / dist;
      out.targetSpeed = conf.speed;
      out.nextState = 2 /* PURSUING */;
    } else if (dist >= intel.engagementMin && dist <= intel.engagementMax) {
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      out.shouldFire = true;
      out.nextState = 3 /* ATTACKING */;
    } else {
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
      out.nextState = 2 /* PURSUING */;
    }
    const targetY = target.y + 2;
    const dyHover = targetY - drone.posY;
    out.steerY = Math.max(-1, Math.min(1, dyHover));
    out.forceHeadingX = dx / (dist || 1);
    out.forceHeadingZ = dz / (dist || 1);
  } else {
    out.nextState = 1 /* PATROLLING */;
    let wp = WAYPOINTS[drone.zone];
    if (drone.path && drone.path.length > 0 && drone.pathIndex < drone.path.length) {
      const targetZone = drone.path[drone.pathIndex];
      const subWp = WAYPOINTS[targetZone];
      const subDx = subWp.x - drone.posX;
      const subDz = subWp.z - drone.posZ;
      if (subDx * subDx + subDz * subDz < 9) {
        drone.pathIndex = Math.min(drone.pathIndex + 1, drone.path.length - 1);
      }
      wp = WAYPOINTS[drone.path[drone.pathIndex]];
    }
    const dx = wp.x - drone.posX;
    const dz = wp.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.1) {
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed * 0.5;
    } else {
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
    }
    out.steerY = 0;
    out.forceHeadingX = out.steerX;
    out.forceHeadingZ = out.steerZ;
  }
}

// server/ai/behavior/behaviors/BomberBehavior.ts
function bomberBehavior(drone, ctx, out) {
  const conf = DRONE_CONFIGS[1 /* BOMBER */];
  if (drone.mode === "COMBAT" && drone.combatTarget) {
    if (!drone.bomberState) {
      drone.bomberState = "SEEKING";
    }
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dy = target.y - drone.posY;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (drone.bomberState === "SEEKING") {
      drone.bomberState = "LOCKED";
      drone.bomberLockTime = ctx.room.serverTick;
      out.nextState = 2 /* PURSUING */;
    } else if (drone.bomberState === "LOCKED") {
      if (ctx.room.serverTick - (drone.bomberLockTime || 0) > 20) {
        drone.bomberState = "COMMITTED";
      }
      out.nextState = 2 /* PURSUING */;
    } else if (drone.bomberState === "COMMITTED") {
      const detRadius = conf.detonationTriggerRadius ?? 4;
      if (dist < detRadius) {
        ctx.room.applyExplosionDamage(
          { x: drone.posX, y: drone.posY, z: drone.posZ },
          detRadius,
          conf.damage,
          drone.id.toString(),
          "drone"
        );
        out.nextState = 5 /* DEAD */;
        if (ctx.room.despawnDrone) {
          ctx.room.despawnDrone(drone);
        }
        return;
      }
      out.nextState = 2 /* PURSUING */;
    }
    if (dist > 0.1) {
      out.steerX = dx / dist;
      out.steerY = dy / dist;
      out.steerZ = dz / dist;
    } else {
      out.steerX = 0;
      out.steerY = 0;
      out.steerZ = 0;
    }
    out.targetSpeed = conf.speed;
    out.forceHeadingX = out.steerX;
    out.forceHeadingZ = out.steerZ;
  } else {
    drone.bomberState = "SEEKING";
    drone.bomberLockTime = void 0;
    out.nextState = 1 /* PATROLLING */;
    let wp = WAYPOINTS[drone.zone];
    if (drone.path && drone.path.length > 0 && drone.pathIndex < drone.path.length) {
      const targetZone = drone.path[drone.pathIndex];
      const subWp = WAYPOINTS[targetZone];
      const subDx = subWp.x - drone.posX;
      const subDz = subWp.z - drone.posZ;
      if (subDx * subDx + subDz * subDz < 9) {
        drone.pathIndex = Math.min(drone.pathIndex + 1, drone.path.length - 1);
      }
      wp = WAYPOINTS[drone.path[drone.pathIndex]];
    }
    const dx = wp.x - drone.posX;
    const dy = wp.y - drone.posY;
    const dz = wp.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.1) {
      out.steerX = dx / dist;
      out.steerY = dy / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed * 0.5;
    } else {
      out.steerX = 0;
      out.steerY = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
    }
    out.forceHeadingX = out.steerX;
    out.forceHeadingZ = out.steerZ;
  }
}

// server/ai/behavior/behaviors/ReconBehavior.ts
function reconBehavior(drone, ctx, out) {
  const intel = INTEL_CONFIGS[2 /* RECON */];
  const conf = DRONE_CONFIGS[2 /* RECON */];
  const groupPosture = ctx.getGroupPosture(drone.groupId) || "RECON";
  drone.posture = groupPosture;
  if (drone.mode === "COMBAT" && drone.combatTarget) {
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dy = target.y - drone.posY;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const sensorPos = { x: drone.posX, y: drone.posY + 0.5, z: drone.posZ };
    const dir = { x: dx / (dist || 1), y: dy / (dist || 1), z: dz / (dist || 1) };
    const hasLOS = ctx.room.collisionMap ? !ctx.room.collisionMap.rayIntersectsAny(sensorPos, dir, dist) : true;
    if (dist < intel.engagementMin) {
      out.steerX = -dx / dist;
      out.steerZ = -dz / dist;
      out.targetSpeed = conf.speed;
    } else if (dist >= intel.engagementMin && dist <= intel.engagementMax && hasLOS) {
      const time = ctx.nowMs / 1e3;
      const orbitPhase = Math.sin(time * Math.PI);
      const perpX = -dz / dist;
      const perpZ = dx / dist;
      out.steerX = perpX * orbitPhase + dx / dist * 0.2;
      out.steerZ = perpZ * orbitPhase + dz / dist * 0.2;
      out.targetSpeed = conf.speed * 0.6;
      const targetY = target.y + Math.sin(time * 3) * 2;
      drone.targetY = targetY;
      const dyHover = targetY - drone.posY;
      out.steerY = Math.max(-1, Math.min(1, dyHover));
    } else {
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
    }
    out.forceHeadingX = dx / (dist || 1);
    out.forceHeadingZ = dz / (dist || 1);
  } else {
    const wp = WAYPOINTS[drone.zone] || WAYPOINTS.zone_spawn;
    const dx = wp.x - drone.posX;
    const dz = wp.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.1) {
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed * 0.7;
    }
    drone.targetY = wp.y + 8;
    const dyHover = drone.targetY - drone.posY;
    out.steerY = Math.max(-1, Math.min(1, dyHover));
    out.forceHeadingX = out.steerX;
    out.forceHeadingZ = out.steerZ;
  }
}

// server/ai/behavior/behaviors/FixedWingBehavior.ts
function fixedWingBehavior(drone, ctx, out) {
  const intel = INTEL_CONFIGS[3 /* FIXED_WING */];
  const conf = DRONE_CONFIGS[3 /* FIXED_WING */];
  if (!drone.fixedWingPhase) drone.fixedWingPhase = "APPROACH";
  if (drone.mode === "COMBAT" && drone.combatTarget) {
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const targetDirX = dx / dist;
    const targetDirZ = dz / dist;
    const hLen = Math.sqrt(drone.currentHeadingX ** 2 + drone.currentHeadingZ ** 2) || 1;
    const hx = drone.currentHeadingX / hLen;
    const hz = drone.currentHeadingZ / hLen;
    const dot = hx * targetDirX + hz * targetDirZ;
    const strafeApproachDistance = conf.strafeApproachDistance ?? 150;
    const strafeRunStartDistance = conf.strafeRunStartDistance ?? 100;
    const strafeExitDistance = conf.strafeExitDistance ?? 50;
    const strafeRepositionDistance = conf.strafeRepositionDistance ?? 200;
    switch (drone.fixedWingPhase) {
      case "APPROACH": {
        out.steerX = targetDirX;
        out.steerZ = targetDirZ;
        out.targetSpeed = conf.speed;
        if (dist <= strafeRunStartDistance && dot > 0.966) {
          drone.fixedWingPhase = "RUN";
        }
        break;
      }
      case "RUN": {
        out.steerX = hx;
        out.steerZ = hz;
        out.targetSpeed = conf.speed;
        out.shouldFire = true;
        if (dot < 0 && dist > strafeExitDistance) {
          drone.fixedWingPhase = "EXIT";
        }
        break;
      }
      case "EXIT": {
        const awayX = -targetDirX;
        const awayZ = -targetDirZ;
        const sin45 = 0.70710678;
        const cos45 = 0.70710678;
        out.steerX = awayX * cos45 - awayZ * sin45;
        out.steerZ = awayX * sin45 + awayZ * cos45;
        out.targetSpeed = conf.speed;
        if (dist >= strafeRepositionDistance) {
          drone.fixedWingPhase = "REPOSITION";
        }
        break;
      }
      case "REPOSITION": {
        const sideX = -targetDirZ;
        const sideZ = targetDirX;
        const arcTargetX = target.x + sideX * 100;
        const arcTargetZ = target.z + sideZ * 100;
        const adx = arcTargetX - drone.posX;
        const adz = arcTargetZ - drone.posZ;
        const aDist = Math.sqrt(adx * adx + adz * adz);
        if (aDist > 0.1) {
          out.steerX = adx / aDist;
          out.steerZ = adz / aDist;
        }
        out.targetSpeed = conf.speed;
        const arcDot = adx / (aDist || 1) * targetDirX + adz / (aDist || 1) * targetDirZ;
        if (arcDot > 0.7 && dist > strafeApproachDistance * 0.8) {
          drone.fixedWingPhase = "APPROACH";
        }
        break;
      }
    }
  } else {
    const wp = WAYPOINTS[drone.zone] || WAYPOINTS.zone_spawn;
    const dx = wp.x - drone.posX;
    const dz = wp.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.1) {
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
    }
  }
}

// server/ai/behavior/behaviors/HumanoidBehavior.ts
var import_rapier3d_compat4 = __toESM(require("@dimforge/rapier3d-compat"), 1);

// server/ai/behavior/BaseGroundBehavior.ts
function computeGroundSteering(drone, targetX, targetZ, out, config) {
  const dx = targetX - drone.posX;
  const dz = targetZ - drone.posZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > 0.1) {
    out.steerX = dx / dist;
    out.steerZ = dz / dist;
  } else {
    out.steerX = 0;
    out.steerZ = 0;
  }
  out.steerY = 0;
  const decelRadius = config.decelerationRadius ?? 5;
  const maxSpeed = config.speed;
  const minSpeed = config.minSpeed ?? 0;
  const desiredSpeed = dist < 0.1 ? 0 : dist < decelRadius ? maxSpeed * (dist / decelRadius) : maxSpeed;
  out.targetSpeed = Math.max(minSpeed, desiredSpeed);
}
function applyGroundPhysics(drone, out, dt, config) {
  const maxAccelPerTick = config.maxAccelPerTick ?? 0.4;
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const speedVel = Math.sqrt(drone.currentVelocityX * drone.currentVelocityX + drone.currentVelocityZ * drone.currentVelocityZ);
  const nextSpeed = speedVel + clamp(out.targetSpeed - speedVel, -maxAccelPerTick, maxAccelPerTick);
  drone.currentVelocityX = drone.currentHeadingX * nextSpeed;
  drone.currentVelocityZ = drone.currentHeadingZ * nextSpeed;
  drone.currentVelocityY += -18 * dt;
  if (drone.currentVelocityY < -40) {
    drone.currentVelocityY = -40;
  }
}
function checkGrounded(drone, kcc) {
  if (kcc && kcc.computedGrounded && kcc.computedGrounded()) {
    drone.currentVelocityY = 0;
  }
}

// server/ai/behavior/behaviors/HumanoidBehavior.ts
var SERVER_TICK_RATE = 60;
var COVER_CACHE_TICKS = 10;
var INVESTIGATE_HOLD_TICKS = 2 * SERVER_TICK_RATE;
var tempBestCover = { x: 0, y: 0, z: 0 };
var tempRayOrigin = { x: 0, y: 0, z: 0 };
var tempRayDir = { x: 0, y: 0, z: 0 };
var tempPredictPos = { x: 0, y: 0, z: 0 };
var tempFlankLeft = { x: 0, z: 0 };
var tempFlankRight = { x: 0, z: 0 };
var COVER_RAY_1 = null;
var COVER_RAY_2 = null;
var CANDIDATE_ANGLES = 4;
var CANDIDATE_DISTANCES = [3, 6, 9, 12];
function findBestCoverPositionZeroGC(drone, threatX, threatY, threatZ, room, intel) {
  if (!COVER_RAY_1) COVER_RAY_1 = new import_rapier3d_compat4.default.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  if (!COVER_RAY_2) COVER_RAY_2 = new import_rapier3d_compat4.default.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  let found = false;
  let maxScore = -Infinity;
  const optimalRange = (intel.engagementMin + intel.engagementMax) / 2;
  const threatZone = room.zoneRegistry ? room.zoneRegistry.getZoneAtPosition(threatX, threatZ) : null;
  for (let a = 0; a < CANDIDATE_ANGLES; a++) {
    const angle = a * Math.PI * 2 / CANDIDATE_ANGLES;
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    for (let d = 0; d < CANDIDATE_DISTANCES.length; d++) {
      const dist = CANDIDATE_DISTANCES[d];
      const candX = drone.posX + cosA * dist;
      const candY = drone.posY;
      const candZ = drone.posZ + sinA * dist;
      let isReachable = true;
      if (room.rapierWorld) {
        const dx = candX - drone.posX;
        const dz = candZ - drone.posZ;
        const rayDist = Math.sqrt(dx * dx + dz * dz);
        if (rayDist > 0.01) {
          tempRayOrigin.x = drone.posX;
          tempRayOrigin.y = drone.posY + 0.5;
          tempRayOrigin.z = drone.posZ;
          tempRayDir.x = dx / rayDist;
          tempRayDir.y = 0;
          tempRayDir.z = dz / rayDist;
          COVER_RAY_1.origin.x = tempRayOrigin.x;
          COVER_RAY_1.origin.y = tempRayOrigin.y;
          COVER_RAY_1.origin.z = tempRayOrigin.z;
          COVER_RAY_1.dir.x = tempRayDir.x;
          COVER_RAY_1.dir.y = tempRayDir.y;
          COVER_RAY_1.dir.z = tempRayDir.z;
          const hit = room.rapierWorld.castRay(
            COVER_RAY_1,
            rayDist,
            true,
            import_rapier3d_compat4.default.QueryFilterFlags.EXCLUDE_SENSORS | import_rapier3d_compat4.default.QueryFilterFlags.EXCLUDE_DYNAMIC,
            void 0,
            drone.collider || void 0
          );
          if (hit && hit.timeOfImpact < rayDist - 0.2) {
            isReachable = false;
          }
        }
      }
      if (!isReachable) continue;
      const tToCandX = candX - threatX;
      const tToCandY = candY + 0.5 - threatY;
      const tToCandZ = candZ - threatZ;
      const tToCandDist = Math.sqrt(tToCandX * tToCandX + tToCandY * tToCandY + tToCandZ * tToCandZ);
      let providesCover = false;
      if (tToCandDist > 0.01) {
        let isZoneOccluded = false;
        if (threatZone && room.zoneRegistry) {
          const candZone = room.zoneRegistry.getZoneAtPosition(candX, candZ);
          if (candZone && candZone !== threatZone && !TOPOLOGY[candZone]?.includes(threatZone)) {
            isZoneOccluded = true;
          }
        }
        if (isZoneOccluded) {
          providesCover = true;
        } else if (room.collisionMap) {
          tempRayOrigin.x = threatX;
          tempRayOrigin.y = threatY;
          tempRayOrigin.z = threatZ;
          tempRayDir.x = tToCandX / tToCandDist;
          tempRayDir.y = tToCandY / tToCandDist;
          tempRayDir.z = tToCandZ / tToCandDist;
          providesCover = room.collisionMap.rayIntersectsAny(tempRayOrigin, tempRayDir, tToCandDist);
        }
      }
      const coverScore = providesCover ? 100 : 0;
      const distToThreat = tToCandDist;
      const rangeScore = 100 - Math.abs(distToThreat - optimalRange) * 5;
      const proximityScore = 50 - dist;
      const totalScore = coverScore * 2 + rangeScore + proximityScore;
      if (totalScore > maxScore) {
        maxScore = totalScore;
        tempBestCover.x = candX;
        tempBestCover.y = candY;
        tempBestCover.z = candZ;
        found = true;
      }
    }
  }
  return found ? tempBestCover : null;
}
function humanoidBehavior(drone, ctx, out) {
  const intel = INTEL_CONFIGS[6 /* HUMANOID */];
  const conf = DRONE_CONFIGS[6 /* HUMANOID */];
  const groupPosture = ctx.getGroupPosture(drone.groupId) || "ASSAULT";
  drone.posture = groupPosture;
  if (!drone.humanoidPhase) drone.humanoidPhase = "HUNT";
  if (!drone.coverCacheTick) drone.coverCacheTick = 0;
  if (!drone.targetLastMoveTick) drone.targetLastMoveTick = 0;
  if (!drone.investigateHoldTick) drone.investigateHoldTick = 0;
  if (!drone.humanoidPose) drone.humanoidPose = "stand_run";
  if (!drone.peekCooldown) drone.peekCooldown = 0;
  const targetEntity = drone.mode === "COMBAT" && drone.combatTarget ? drone.combatTarget : null;
  if (targetEntity) {
    if (!drone.parkedOrder.active && drone.path && drone.path.length > 0) {
      drone.parkedOrder.type = "move";
      drone.parkedOrder.targetZone = drone.path[drone.path.length - 1];
      drone.parkedOrder.path.length = 0;
      for (let i = 0; i < drone.path.length; i++) drone.parkedOrder.path[i] = drone.path[i];
      drone.parkedOrder.pathIndex = drone.pathIndex;
      drone.parkedOrder.active = true;
    }
  } else if (drone.parkedOrder.active) {
    drone.path.length = 0;
    for (let i = 0; i < drone.parkedOrder.path.length; i++) drone.path[i] = drone.parkedOrder.path[i];
    drone.pathIndex = drone.parkedOrder.pathIndex;
    drone.state = 1 /* PATROLLING */;
    drone.parkedOrder.active = false;
  }
  let targetX = 0;
  let targetY = 0;
  let targetZ = 0;
  let hasTarget = false;
  if (targetEntity && targetEntity.lastSensedPosition) {
    hasTarget = true;
    targetX = targetEntity.lastSensedPosition.x;
    targetY = targetEntity.lastSensedPosition.y;
    targetZ = targetEntity.lastSensedPosition.z;
    const velEma = ctx.getPlayerVelEma(targetEntity.entityId);
    if (velEma) {
      const dx = targetX - drone.posX;
      const dy = targetY - drone.posY;
      const dz = targetZ - drone.posZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const leadTime = dist / 35;
      tempPredictPos.x = targetX + velEma.x * leadTime;
      tempPredictPos.y = targetY + velEma.y * leadTime;
      tempPredictPos.z = targetZ + velEma.z * leadTime;
    } else {
      tempPredictPos.x = targetX;
      tempPredictPos.y = targetY;
      tempPredictPos.z = targetZ;
    }
  }
  const recentlyHit = ctx.room.serverTick - (drone.lastDamageTick || -9999) < 30;
  const getCover = () => {
    if (!hasTarget) return null;
    const ticksSinceCache = ctx.room.serverTick - drone.coverCacheTick;
    let coverCompromised = false;
    if (drone.cachedCoverPos && ctx.room.collisionMap) {
      const hX = drone.posX - targetX;
      const hY = drone.posY + 0.5 - targetY;
      const hZ = drone.posZ - targetZ;
      const hDist = Math.sqrt(hX * hX + hY * hY + hZ * hZ);
      if (hDist > 0.01) {
        tempRayOrigin.x = targetX;
        tempRayOrigin.y = targetY;
        tempRayOrigin.z = targetZ;
        tempRayDir.x = hX / hDist;
        tempRayDir.y = hY / hDist;
        tempRayDir.z = hZ / hDist;
        coverCompromised = !ctx.room.collisionMap.rayIntersectsAny(tempRayOrigin, tempRayDir, hDist);
      }
    }
    if (!drone.cachedCoverPos || ticksSinceCache > COVER_CACHE_TICKS || coverCompromised) {
      const best = findBestCoverPositionZeroGC(drone, targetX, targetY, targetZ, ctx.room, intel);
      if (best) {
        drone.cachedCoverPos.x = best.x;
        drone.cachedCoverPos.y = best.y;
        drone.cachedCoverPos.z = best.z;
      }
      drone.coverCacheTick = ctx.room.serverTick;
    }
    return drone.cachedCoverPos;
  };
  if (recentlyHit && hasTarget) {
    const cover = getCover();
    if (cover) {
      drone.humanoidPhase = "TAKE_COVER";
      computeGroundSteering(drone, cover.x, cover.z, out, { speed: conf.speed * 1.5 });
      drone.humanoidPose = "crouch_sprint";
      return;
    }
  }
  if (groupPosture === "HOLD") {
    out.nextState = 3 /* ATTACKING */;
    out.steerX = 0;
    out.steerZ = 0;
    out.targetSpeed = 0;
    drone.humanoidPose = "crouch_hold";
    if (hasTarget) {
      const hdx = targetX - drone.posX;
      const hdz = targetZ - drone.posZ;
      const hDist = Math.sqrt(hdx * hdx + hdz * hdz) || 1;
      if (hDist >= intel.engagementMin && hDist <= intel.engagementMax) {
        out.forceHeadingX = hdx / hDist;
        out.forceHeadingZ = hdz / hDist;
        out.shouldFire = true;
        drone.humanoidPose = "stand_fire";
      } else {
        drone.humanoidPose = "crouch_hold";
      }
    }
  } else if (groupPosture === "RETREAT") {
    out.nextState = 4 /* REPOSITIONING */;
    drone.humanoidPose = "crouch_sprint";
    const spawnZone = ZONES.SPAWN;
    const path4 = astarPath(drone.zone, spawnZone);
    if (path4 && path4.length > 0) {
      let targetZone = path4[0];
      if (path4.length > 1 && path4[0] === drone.zone) {
        targetZone = path4[1];
      }
      const wp = WAYPOINTS[targetZone] || WAYPOINTS[ZONES.SPAWN];
      computeGroundSteering(drone, wp.x, wp.z, out, { speed: conf.speed });
    } else if (hasTarget) {
      const awayX = drone.posX - targetX;
      const awayZ = drone.posZ - targetZ;
      const awayDist2 = Math.sqrt(awayX * awayX + awayZ * awayZ) || 1;
      const retreatTargetX = drone.posX + awayX / awayDist2 * 15;
      const retreatTargetZ = drone.posZ + awayZ / awayDist2 * 15;
      computeGroundSteering(drone, retreatTargetX, retreatTargetZ, out, { speed: conf.speed });
    } else {
      drone.humanoidPhase = "HUNT";
    }
  } else if (groupPosture === "SUPPRESS") {
    out.nextState = 3 /* ATTACKING */;
    if (hasTarget) {
      const sdx = targetX - drone.posX;
      const sdz = targetZ - drone.posZ;
      const sDist2 = Math.sqrt(sdx * sdx + sdz * sdz) || 1;
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      out.forceHeadingX = sdx / sDist2;
      out.forceHeadingZ = sdz / sDist2;
      out.shouldFire = true;
      drone.humanoidPose = "stand_fire";
    } else {
      drone.humanoidPhase = "HUNT";
    }
  } else if (groupPosture === "FLANK") {
    const suppressors = ctx.countSquadMatesInPosture(drone, "SUPPRESS");
    if (suppressors < 1) {
      out.nextState = 3 /* ATTACKING */;
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      drone.humanoidPose = "crouch_hold";
      if (hasTarget) {
        const dx = targetX - drone.posX;
        const dz = targetZ - drone.posZ;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        out.forceHeadingX = dx / dist;
        out.forceHeadingZ = dz / dist;
        out.shouldFire = true;
      }
      return;
    }
    out.nextState = 2 /* PURSUING */;
    drone.humanoidPose = recentlyHit ? "crouch_sprint" : "stand_run";
    if (hasTarget) {
      const optimalRange = (intel.engagementMin + intel.engagementMax) / 2;
      const tToHX = drone.posX - targetX;
      const tToHZ = drone.posZ - targetZ;
      const tToHDist = Math.sqrt(tToHX * tToHX + tToHZ * tToHZ) || 1;
      tempFlankLeft.x = targetX + -tToHZ / tToHDist * optimalRange;
      tempFlankLeft.z = targetZ + tToHX / tToHDist * optimalRange;
      tempFlankRight.x = targetX + tToHZ / tToHDist * optimalRange;
      tempFlankRight.z = targetZ + -tToHX / tToHDist * optimalRange;
      let leftCover = false;
      if (ctx.room.collisionMap) {
        tempRayOrigin.x = targetX;
        tempRayOrigin.y = targetY;
        tempRayOrigin.z = targetZ;
        tempRayDir.x = -tToHZ / tToHDist;
        tempRayDir.y = 0;
        tempRayDir.z = tToHX / tToHDist;
        leftCover = ctx.room.collisionMap.rayIntersectsAny(tempRayOrigin, tempRayDir, optimalRange);
      }
      const flankTarget = leftCover ? tempFlankLeft : tempFlankRight;
      computeGroundSteering(drone, flankTarget.x, flankTarget.z, out, { speed: conf.speed });
      const fdx = flankTarget.x - drone.posX;
      const fdz = flankTarget.z - drone.posZ;
      if (Math.sqrt(fdx * fdx + fdz * fdz) <= 3) {
        out.shouldFire = true;
        drone.humanoidPose = "stand_fire";
      }
    } else {
      drone.humanoidPhase = "HUNT";
    }
  } else {
    switch (drone.humanoidPhase) {
      case "HUNT": {
        out.nextState = 2 /* PURSUING */;
        drone.humanoidPose = recentlyHit ? "crouch_sprint" : "stand_run";
        if (hasTarget) {
          const cover = getCover();
          if (cover && recentlyHit) {
            drone.humanoidPhase = "TAKE_COVER";
            computeGroundSteering(drone, cover.x, cover.z, out, { speed: conf.speed });
          } else {
            computeGroundSteering(drone, targetX, targetZ, out, { speed: conf.speed });
            out.shouldFire = true;
            drone.humanoidPose = "stand_fire";
          }
        } else {
          let bestMemory = null;
          if (drone.memoryRecords && drone.memoryRecords.size > 0) {
            let highestConf = 0.1;
            for (const mem of drone.memoryRecords.values()) {
              if (mem.confidence > highestConf) {
                highestConf = mem.confidence;
                bestMemory = mem;
              }
            }
          }
          if (bestMemory) {
            drone.humanoidPhase = "INVESTIGATE";
            drone.investigateHoldTick = 0;
          } else {
            out.nextState = 1 /* PATROLLING */;
            const wp = WAYPOINTS[drone.zone] || WAYPOINTS.zone_spawn;
            computeGroundSteering(drone, wp.x, wp.z, out, { speed: conf.speed * 0.5 });
            drone.humanoidPose = "stand_run";
          }
        }
        break;
      }
      case "TAKE_COVER": {
        out.nextState = 4 /* REPOSITIONING */;
        drone.humanoidPose = "crouch_sprint";
        const cover = getCover();
        if (!cover) {
          drone.humanoidPhase = "HUNT";
          break;
        }
        computeGroundSteering(drone, cover.x, cover.z, out, { speed: conf.speed });
        const cdx = cover.x - drone.posX;
        const cdz = cover.z - drone.posZ;
        if (Math.sqrt(cdx * cdx + cdz * cdz) <= 2) {
          drone.humanoidPhase = "IN_COVER";
          drone.peekCooldown = 15 + Math.floor(Math.random() * 30);
        }
        break;
      }
      case "IN_COVER": {
        out.nextState = 3 /* ATTACKING */;
        out.steerX = 0;
        out.steerZ = 0;
        out.targetSpeed = 0;
        drone.humanoidPose = "crouch_hold";
        if (hasTarget) {
          if (drone.peekCooldown > 0) {
            drone.peekCooldown--;
          } else {
            out.shouldFire = true;
            drone.humanoidPose = "stand_fire";
            const tdx = tempPredictPos.x - drone.posX;
            const tdz = tempPredictPos.z - drone.posZ;
            const tDist = Math.sqrt(tdx * tdx + tdz * tdz) || 1;
            out.forceHeadingX = tdx / tDist;
            out.forceHeadingZ = tdz / tDist;
            drone.peekCooldown = 15 + Math.floor(Math.random() * 30);
          }
        } else {
          drone.humanoidPhase = "HUNT";
        }
        break;
      }
      case "INVESTIGATE": {
        out.nextState = 2 /* PURSUING */;
        if (hasTarget) {
          drone.humanoidPhase = "HUNT";
          break;
        }
        let bestMemory = null;
        if (drone.memoryRecords && drone.memoryRecords.size > 0) {
          let highestConf = 0.1;
          for (const mem of drone.memoryRecords.values()) {
            if (mem.confidence > highestConf) {
              highestConf = mem.confidence;
              bestMemory = mem;
            }
          }
        }
        if (!bestMemory) {
          drone.humanoidPhase = "HUNT";
          break;
        }
        const memX = bestMemory.lastSensedPosition ? bestMemory.lastSensedPosition.x : drone.posX;
        const memZ = bestMemory.lastSensedPosition ? bestMemory.lastSensedPosition.z : drone.posZ;
        const mdx = memX - drone.posX;
        const mdz = memZ - drone.posZ;
        const mDist = Math.sqrt(mdx * mdx + mdz * mdz);
        if (mDist > 2) {
          computeGroundSteering(drone, memX, memZ, out, { speed: conf.speed });
          drone.humanoidPose = "crouch_sprint";
          drone.investigateHoldTick = 0;
        } else {
          out.steerX = 0;
          out.steerZ = 0;
          out.targetSpeed = 0;
          drone.investigateHoldTick = (drone.investigateHoldTick || 0) + 1;
          const scanAngle = drone.investigateHoldTick / INVESTIGATE_HOLD_TICKS * Math.PI * 2;
          out.forceHeadingX = Math.sin(scanAngle);
          out.forceHeadingZ = Math.cos(scanAngle);
          drone.humanoidPose = "crouch_hold";
          if (drone.investigateHoldTick >= INVESTIGATE_HOLD_TICKS) {
            drone.humanoidPhase = "HUNT";
          }
        }
        break;
      }
      default: {
        drone.humanoidPhase = "HUNT";
        break;
      }
    }
  }
  applyGroundPhysics(drone, out, ctx.dt, { speed: conf.speed, maxAccelPerTick: conf.maxAccelPerTick });
  checkGrounded(drone, drone.kcc);
}

// server/ai/behavior/behaviors/WheeledBehavior.ts
var INVESTIGATE_ARRIVAL_RADIUS = 2;
var PATROL_SPEED_MULT = 0.5;
var INVESTIGATE_SPEED_MULT = 0.6;
var WAYPOINT_ARRIVAL_THRESHOLD = 0.1;
function wheeledBehavior(drone, ctx, out) {
  const intel = INTEL_CONFIGS[4 /* WHEELED */];
  const conf = DRONE_CONFIGS[4 /* WHEELED */];
  const groupPosture = ctx.getGroupPosture(drone.groupId) || "ASSAULT";
  drone.posture = groupPosture;
  if (groupPosture === "HOLD") {
    out.steerX = 0;
    out.steerZ = 0;
    out.targetSpeed = 0;
    if (drone.mode === "COMBAT" && drone.combatTarget) {
      out.shouldFire = true;
      const target = drone.combatTarget.lastSensedPosition;
      const dx = target.x - drone.posX;
      const dz = target.z - drone.posZ;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      out.forceHeadingX = dx / dist;
      out.forceHeadingZ = dz / dist;
    }
    return;
  }
  if (groupPosture === "SUPPRESS" && drone.mode === "COMBAT" && drone.combatTarget) {
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    out.steerX = 0;
    out.steerZ = 0;
    out.targetSpeed = 0;
    out.shouldFire = true;
    out.forceHeadingX = dx / dist;
    out.forceHeadingZ = dz / dist;
    return;
  }
  if (drone.mode === "COMBAT" && drone.combatTarget) {
    const target = drone.combatTarget.lastSensedPosition;
    const dx = target.x - drone.posX;
    const dy = target.y - drone.posY;
    const dz = target.z - drone.posZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < intel.engagementMin) {
      out.steerX = -dx / dist;
      out.steerZ = -dz / dist;
      out.targetSpeed = conf.speed;
    } else if (dist >= intel.engagementMin && dist <= intel.engagementMax) {
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      out.shouldFire = true;
      out.forceHeadingX = 0;
      out.forceHeadingZ = 0;
    } else {
      out.steerX = dx / dist;
      out.steerZ = dz / dist;
      out.targetSpeed = conf.speed;
    }
  } else {
    const investigateTarget = findBestMemoryTarget(drone);
    if (investigateTarget) {
      const dx = investigateTarget.x - drone.posX;
      const dz = investigateTarget.z - drone.posZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > INVESTIGATE_ARRIVAL_RADIUS) {
        out.steerX = dx / dist;
        out.steerZ = dz / dist;
        out.targetSpeed = conf.speed * INVESTIGATE_SPEED_MULT;
      } else {
        out.steerX = 0;
        out.steerZ = 0;
        out.targetSpeed = 0;
      }
    } else {
      const wp = WAYPOINTS[drone.zone] || WAYPOINTS.zone_spawn;
      const dx = wp.x - drone.posX;
      const dz = wp.z - drone.posZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > WAYPOINT_ARRIVAL_THRESHOLD) {
        out.steerX = dx / dist;
        out.steerZ = dz / dist;
        out.targetSpeed = conf.speed * PATROL_SPEED_MULT;
      }
    }
  }
}
function findBestMemoryTarget(drone) {
  let best = null;
  let bestConf = 0;
  if (drone.memoryRecords) {
    for (const record of drone.memoryRecords.values()) {
      if (record.confidence > bestConf && record.confidence > UNKNOWN_THRESHOLD) {
        bestConf = record.confidence;
        best = record.lastSensedPosition;
      }
    }
  }
  return best;
}

// server/ai/behavior/behaviors/RobotDogBehavior.ts
var RD_PATROL = 0;
var RD_PURSUE_FIRE = 1;
var RD_CIRCLE_STRAFE = 2;
var RD_CHASE = 3;
var RD_INVESTIGATE = 4;
var RD_HOLD_FIRE = 5;
var RD_RETREAT = 6;
var MASK_PATROL = 1 << RD_PATROL;
var MASK_PURSUE_FIRE = 1 << RD_PURSUE_FIRE;
var MASK_CIRCLE_STRAFE = 1 << RD_CIRCLE_STRAFE;
var MASK_CHASE = 1 << RD_CHASE;
var MASK_INVESTIGATE = 1 << RD_INVESTIGATE;
var MASK_HOLD_FIRE = 1 << RD_HOLD_FIRE;
var MASK_RETREAT = 1 << RD_RETREAT;
var POSTURE_ASSAULT_MASK = MASK_PATROL | MASK_PURSUE_FIRE | MASK_CIRCLE_STRAFE | MASK_CHASE | MASK_INVESTIGATE;
var POSTURE_HOLD_MASK = MASK_HOLD_FIRE;
var POSTURE_RECON_MASK = MASK_PATROL | MASK_INVESTIGATE;
var POSTURE_RETREAT_MASK = MASK_RETREAT;
var POSTURE_MASKS = {
  "ASSAULT": POSTURE_ASSAULT_MASK,
  "HOLD": POSTURE_HOLD_MASK,
  "RECON": POSTURE_RECON_MASK,
  "RETREAT": POSTURE_RETREAT_MASK
};
var INVESTIGATE_ARRIVAL_RADIUS2 = 2;
var PATROL_SPEED_MULT2 = 0.6;
var INVESTIGATE_SPEED_MULT2 = 0.7;
var WAYPOINT_ARRIVAL_THRESHOLD2 = 0.1;
var HYSTERESIS_THRESHOLD = 0.15;
var targetExists = false;
var targetPosX = 0;
var targetPosY = 0;
var targetPosZ = 0;
var targetDx = 0;
var targetDz = 0;
var rdDist = 0;
var memoryExists = false;
var memPosX = 0;
var memPosY = 0;
var memPosZ = 0;
var memConfidence = 0;
var rdBestAction = -1;
var rdBestScore = -Infinity;
var pDx = 0;
var pDz = 0;
var pDist = 0;
var iDx = 0;
var iDz = 0;
var iDist = 0;
var awayDx = 0;
var awayDz = 0;
var awayDist = 0;
var sDx = 0;
var sDz = 0;
var sDist = 0;
var tempScore = 0;
function robotDogBehavior(drone, ctx, out) {
  const intel = INTEL_CONFIGS[5 /* ROBOT_DOG */];
  const conf = DRONE_CONFIGS[5 /* ROBOT_DOG */];
  const engagementMin = intel.engagementMin;
  const engagementMax = intel.engagementMax;
  const speed = conf.speed;
  const groupPosture = ctx.getGroupPosture(drone.groupId) || "ASSAULT";
  drone.posture = groupPosture;
  const postureMask = POSTURE_MASKS[groupPosture] !== void 0 ? POSTURE_MASKS[groupPosture] : POSTURE_ASSAULT_MASK;
  targetExists = false;
  rdDist = 0;
  if (drone.mode === "COMBAT" && drone.combatTarget && drone.combatTarget.lastSensedPosition) {
    targetExists = true;
    targetPosX = drone.combatTarget.lastSensedPosition.x;
    targetPosY = drone.combatTarget.lastSensedPosition.y;
    targetPosZ = drone.combatTarget.lastSensedPosition.z;
    targetDx = targetPosX - drone.posX;
    targetDz = targetPosZ - drone.posZ;
    const dy = targetPosY - drone.posY;
    rdDist = Math.sqrt(targetDx * targetDx + dy * dy + targetDz * targetDz);
  }
  memoryExists = false;
  memPosX = 0;
  memPosY = 0;
  memPosZ = 0;
  memConfidence = 0;
  if (drone.memoryRecords) {
    for (const record of drone.memoryRecords.values()) {
      if (record.confidence > memConfidence && record.confidence > UNKNOWN_THRESHOLD) {
        memConfidence = record.confidence;
        memPosX = record.lastSensedPosition.x;
        memPosY = record.lastSensedPosition.y;
        memPosZ = record.lastSensedPosition.z;
        memoryExists = true;
      }
    }
  }
  rdBestAction = -1;
  rdBestScore = -Infinity;
  if ((postureMask & MASK_RETREAT) !== 0) {
    if (2 > rdBestScore) {
      rdBestScore = 2;
      rdBestAction = RD_RETREAT;
    }
  }
  if ((postureMask & MASK_HOLD_FIRE) !== 0) {
    if (2 > rdBestScore) {
      rdBestScore = 2;
      rdBestAction = RD_HOLD_FIRE;
    }
  }
  if ((postureMask & MASK_PURSUE_FIRE) !== 0 && targetExists && rdDist >= engagementMin && rdDist <= engagementMax) {
    tempScore = 1;
    if (tempScore > rdBestScore) {
      rdBestScore = tempScore;
      rdBestAction = RD_PURSUE_FIRE;
    }
  }
  if ((postureMask & MASK_CIRCLE_STRAFE) !== 0 && targetExists && rdDist < engagementMin) {
    tempScore = 1 - rdDist / engagementMin;
    if (tempScore > rdBestScore) {
      rdBestScore = tempScore;
      rdBestAction = RD_CIRCLE_STRAFE;
    }
  }
  if ((postureMask & MASK_CHASE) !== 0 && targetExists && rdDist > engagementMax) {
    tempScore = Math.min(1, (rdDist - engagementMax) / 50);
    if (tempScore > rdBestScore) {
      rdBestScore = tempScore;
      rdBestAction = RD_CHASE;
    }
  }
  if ((postureMask & MASK_INVESTIGATE) !== 0 && memoryExists) {
    tempScore = memConfidence;
    if (tempScore > rdBestScore) {
      rdBestScore = tempScore;
      rdBestAction = RD_INVESTIGATE;
    }
  }
  if ((postureMask & MASK_PATROL) !== 0) {
    tempScore = 0.1;
    if (tempScore > rdBestScore) {
      rdBestScore = tempScore;
      rdBestAction = RD_PATROL;
    }
  }
  if (drone.gearLastPosture !== groupPosture) {
    drone.gearActionScore = 0;
    drone.gearLastPosture = groupPosture;
  }
  if (rdBestAction === drone.gearActionId) {
    drone.gearActionScore = rdBestScore;
  } else if (rdBestScore >= drone.gearActionScore + HYSTERESIS_THRESHOLD) {
    drone.gearActionId = rdBestAction;
    drone.gearActionScore = rdBestScore;
  }
  switch (drone.gearActionId) {
    case RD_PURSUE_FIRE: {
      if (targetExists && rdDist > 1e-3) {
        out.steerX = targetDx / rdDist;
        out.steerZ = targetDz / rdDist;
        out.targetSpeed = speed;
        out.shouldFire = true;
        out.forceHeadingX = targetDx / rdDist;
        out.forceHeadingZ = targetDz / rdDist;
      } else {
        const wp = WAYPOINTS[drone.zone] || WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
        pDx = wp.x - drone.posX;
        pDz = wp.z - drone.posZ;
        pDist = Math.sqrt(pDx * pDx + pDz * pDz);
        if (pDist > 1e-3) {
          out.steerX = pDx / pDist;
          out.steerZ = pDz / pDist;
          out.targetSpeed = speed * PATROL_SPEED_MULT2;
        }
      }
      break;
    }
    case RD_CIRCLE_STRAFE: {
      if (targetExists && rdDist > 1e-3) {
        out.steerX = -targetDz / rdDist;
        out.steerZ = targetDx / rdDist;
        out.targetSpeed = speed;
        out.forceHeadingX = targetDx / rdDist;
        out.forceHeadingZ = targetDz / rdDist;
      } else {
        const wp = WAYPOINTS[drone.zone] || WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
        pDx = wp.x - drone.posX;
        pDz = wp.z - drone.posZ;
        pDist = Math.sqrt(pDx * pDx + pDz * pDz);
        if (pDist > 1e-3) {
          out.steerX = pDx / pDist;
          out.steerZ = pDz / pDist;
          out.targetSpeed = speed * PATROL_SPEED_MULT2;
        }
      }
      break;
    }
    case RD_CHASE: {
      if (targetExists && rdDist > 1e-3) {
        out.steerX = targetDx / rdDist;
        out.steerZ = targetDz / rdDist;
        out.targetSpeed = speed;
        out.forceHeadingX = targetDx / rdDist;
        out.forceHeadingZ = targetDz / rdDist;
      } else {
        const wp = WAYPOINTS[drone.zone] || WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
        pDx = wp.x - drone.posX;
        pDz = wp.z - drone.posZ;
        pDist = Math.sqrt(pDx * pDx + pDz * pDz);
        if (pDist > 1e-3) {
          out.steerX = pDx / pDist;
          out.steerZ = pDz / pDist;
          out.targetSpeed = speed * PATROL_SPEED_MULT2;
        }
      }
      break;
    }
    case RD_INVESTIGATE: {
      if (memoryExists) {
        iDx = memPosX - drone.posX;
        iDz = memPosZ - drone.posZ;
        iDist = Math.sqrt(iDx * iDx + iDz * iDz);
        if (iDist > INVESTIGATE_ARRIVAL_RADIUS2) {
          if (iDist > 1e-3) {
            out.steerX = iDx / iDist;
            out.steerZ = iDz / iDist;
            out.targetSpeed = speed * INVESTIGATE_SPEED_MULT2;
          }
        } else {
          out.steerX = 0;
          out.steerZ = 0;
          out.targetSpeed = 0;
        }
      } else {
        const wp = WAYPOINTS[drone.zone] || WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
        pDx = wp.x - drone.posX;
        pDz = wp.z - drone.posZ;
        pDist = Math.sqrt(pDx * pDx + pDz * pDz);
        if (pDist > 1e-3) {
          out.steerX = pDx / pDist;
          out.steerZ = pDz / pDist;
          out.targetSpeed = speed * PATROL_SPEED_MULT2;
        }
      }
      break;
    }
    case RD_HOLD_FIRE: {
      out.steerX = 0;
      out.steerZ = 0;
      out.targetSpeed = 0;
      if (targetExists && rdDist > 1e-3) {
        out.shouldFire = true;
        out.forceHeadingX = targetDx / rdDist;
        out.forceHeadingZ = targetDz / rdDist;
      }
      break;
    }
    case RD_RETREAT: {
      if (targetExists && rdDist > 1e-3) {
        awayDx = drone.posX - targetPosX;
        awayDz = drone.posZ - targetPosZ;
        awayDist = Math.sqrt(awayDx * awayDx + awayDz * awayDz);
        if (awayDist > 1e-3) {
          out.steerX = awayDx / awayDist;
          out.steerZ = awayDz / awayDist;
          out.targetSpeed = speed;
        }
      } else {
        const sWp = WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
        sDx = sWp.x - drone.posX;
        sDz = sWp.z - drone.posZ;
        sDist = Math.sqrt(sDx * sDx + sDz * sDz);
        if (sDist > 1e-3) {
          out.steerX = sDx / sDist;
          out.steerZ = sDz / sDist;
          out.targetSpeed = speed;
        }
      }
      break;
    }
    case RD_PATROL:
    default: {
      const wp = WAYPOINTS[drone.zone] || WAYPOINTS[ZONES.SPAWN] || WAYPOINTS.zone_spawn;
      pDx = wp.x - drone.posX;
      pDz = wp.z - drone.posZ;
      pDist = Math.sqrt(pDx * pDx + pDz * pDz);
      if (pDist > WAYPOINT_ARRIVAL_THRESHOLD2) {
        if (pDist > 1e-3) {
          out.steerX = pDx / pDist;
          out.steerZ = pDz / pDist;
          out.targetSpeed = speed * PATROL_SPEED_MULT2;
        }
      } else {
        out.steerX = 0;
        out.steerZ = 0;
        out.targetSpeed = 0;
      }
      break;
    }
  }
}

// server/ai/behavior/index.ts
var BEHAVIORS = {
  [0 /* ROTARY_SHOOTER */]: rotaryShooterBehavior,
  [1 /* BOMBER */]: bomberBehavior,
  [2 /* RECON */]: reconBehavior,
  [3 /* FIXED_WING */]: fixedWingBehavior,
  [4 /* WHEELED */]: wheeledBehavior,
  [5 /* ROBOT_DOG */]: robotDogBehavior,
  [6 /* HUMANOID */]: humanoidBehavior
};

// server/ai/behavior/DroneBehaviorController.ts
var BASE_DETECTION_DISTANCE = 3;
var DETECTION_TIME_HORIZON = 0.5;
var MIN_AVOIDANCE_TICKS = 30;
var outputPool = /* @__PURE__ */ new Map();
function getOrCreateOutput(droneId) {
  let out = outputPool.get(droneId);
  if (!out) {
    out = {
      steerX: 0,
      steerY: 0,
      steerZ: 0,
      targetSpeed: 0,
      shouldFire: false,
      nextState: null,
      forceHeadingX: 0,
      forceHeadingZ: 0
    };
    outputPool.set(droneId, out);
  }
  return out;
}
function resetOutput(out) {
  out.steerX = 0;
  out.steerY = 0;
  out.steerZ = 0;
  out.targetSpeed = 0;
  out.shouldFire = false;
  out.nextState = null;
  out.forceHeadingX = 0;
  out.forceHeadingZ = 0;
}
var tempVelEma = { x: 0, y: 0, z: 0 };
function getGroupPosture(groupId) {
  return reusableCtx.room?.groupTacticalState ? reusableCtx.room.groupTacticalState.getPosture(groupId) : null;
}
function countSquadMatesInPosture(drone, posture) {
  if (!reusableCtx.room || !reusableCtx.room.drones) return 0;
  let count = 0;
  const drones = reusableCtx.room.drones;
  for (let i = 0; i < drones.length; i++) {
    const d = drones[i];
    if (d.id !== drone.id && d.groupId === drone.groupId && d.state !== 5 /* DEAD */) {
      const dx = d.posX - drone.posX;
      const dy = d.posY - drone.posY;
      const dz = d.posZ - drone.posZ;
      if (dx * dx + dy * dy + dz * dz <= 400) {
        const p = reusableCtx.room.groupTacticalState ? reusableCtx.room.groupTacticalState.getPosture(d.groupId) : null;
        if (p === posture) count++;
      }
    }
  }
  return count;
}
function countSquadMatesWithinRange(drone, range) {
  if (!reusableCtx.room || !reusableCtx.room.drones) return 0;
  let count = 0;
  const drones = reusableCtx.room.drones;
  const rangeSq = range * range;
  for (let i = 0; i < drones.length; i++) {
    const d = drones[i];
    if (d.id !== drone.id && d.groupId === drone.groupId && d.state !== 5 /* DEAD */) {
      const dx = d.posX - drone.posX;
      const dy = d.posY - drone.posY;
      const dz = d.posZ - drone.posZ;
      if (dx * dx + dy * dy + dz * dz <= rangeSq) {
        count++;
      }
    }
  }
  return count;
}
function getPlayerFromRoom(room, playerId) {
  if (!room || !playerId) return null;
  if (typeof room.getPlayers === "function") {
    const playersMap = room.getPlayers();
    return playersMap ? playersMap.get(playerId) || null : null;
  }
  if (room.players && typeof room.players.get === "function") {
    return room.players.get(playerId) || null;
  }
  return null;
}
function getPlayerVelEma(playerId) {
  const p = getPlayerFromRoom(reusableCtx.room, playerId);
  if (!p) return null;
  tempVelEma.x = p.velEmaX || 0;
  tempVelEma.y = p.velEmaY || 0;
  tempVelEma.z = p.velEmaZ || 0;
  return tempVelEma;
}
var reusableCtx = {
  room: null,
  dt: 0,
  nowMs: 0,
  getGroupPosture,
  countSquadMatesInPosture,
  countSquadMatesWithinRange,
  getPlayerVelEma
};
function processDroneBehaviors(drones, room, dt = 0.0166, nowMs) {
  reusableCtx.room = room;
  reusableCtx.dt = dt;
  reusableCtx.nowMs = nowMs;
  const ctx = reusableCtx;
  const sin45 = 0.70710678;
  const cos45 = 0.70710678;
  for (let i = 0; i < drones.length; i++) {
    const drone = drones[i];
    if (drone.state === 5 /* DEAD */) continue;
    if (drone.isFrozen) {
      if (drone.body) {
        const trans = drone.body.translation();
        drone.posX = trans.x;
        drone.posY = trans.y;
        drone.posZ = trans.z;
      }
      continue;
    }
    if (drone.state === 0 /* IDLE */) {
      drone.cooldown--;
      if (drone.cooldown <= 0) {
        drone.state = 1 /* PATROLLING */;
      }
      continue;
    }
    const behavior = BEHAVIORS[drone.type];
    const out = getOrCreateOutput(drone.id);
    resetOutput(out);
    if (behavior) {
      behavior(drone, ctx, out);
    } else {
      out.targetSpeed = DRONE_CONFIGS[drone.type]?.speed ?? 10;
    }
    if (drone.cooldown > 0) {
      drone.cooldown--;
    }
    const conf = DRONE_CONFIGS[drone.type] || {};
    const isAir = drone.type === 2 /* RECON */ || drone.type === 0 /* ROTARY_SHOOTER */ || drone.type === 1 /* BOMBER */;
    const isFixedWing = drone.type === 3 /* FIXED_WING */;
    const interDrone = calculateDroneAvoidance(drone, drones, null);
    if (interDrone.avoidX !== 0 || interDrone.avoidZ !== 0) {
      out.steerX = out.steerX * 0.7 + interDrone.avoidX * 0.3;
      out.steerZ = out.steerZ * 0.7 + interDrone.avoidZ * 0.3;
      const mag = Math.sqrt(out.steerX * out.steerX + out.steerZ * out.steerZ);
      if (mag > 1e-3) {
        out.steerX /= mag;
        out.steerZ /= mag;
      }
    }
    if (drone.avoidanceState === void 0) {
      drone.avoidanceState = null;
    }
    let obstacleDetected = false;
    let forwardHitDistance = 0;
    const headingLen = Math.sqrt(
      drone.currentHeadingX * drone.currentHeadingX + drone.currentHeadingZ * drone.currentHeadingZ
    );
    const dirX = headingLen > 1e-3 ? drone.currentHeadingX / headingLen : 1;
    const dirZ = headingLen > 1e-3 ? drone.currentHeadingZ / headingLen : 0;
    const currentSpeed = Math.sqrt(
      drone.currentVelocityX * drone.currentVelocityX + drone.currentVelocityY * drone.currentVelocityY + drone.currentVelocityZ * drone.currentVelocityZ
    );
    const detectionDistance = (conf.detectionRadius ?? BASE_DETECTION_DISTANCE) + currentSpeed * DETECTION_TIME_HORIZON;
    if (drone.cachedObstacleDetected === void 0) {
      drone.cachedObstacleDetected = false;
      drone.cachedForwardHitDistance = 0;
    }
    if ((room.serverTick + drone.id) % 3 === 0) {
      if (room.rapierWorld) {
        const rayOrigin = getDroneMuzzleWorldPosition(drone);
        const rayDir = { x: dirX, y: 0, z: dirZ };
        const ray = new import_rapier3d_compat5.default.Ray(rayOrigin, rayDir);
        const hit = room.rapierWorld.castRay(
          ray,
          detectionDistance,
          true,
          import_rapier3d_compat5.default.QueryFilterFlags.EXCLUDE_SENSORS | import_rapier3d_compat5.default.QueryFilterFlags.EXCLUDE_DYNAMIC,
          void 0,
          drone.collider || void 0
        );
        if (hit && hit.timeOfImpact <= detectionDistance) {
          obstacleDetected = true;
          forwardHitDistance = hit.timeOfImpact;
        }
      }
      drone.cachedObstacleDetected = obstacleDetected;
      drone.cachedForwardHitDistance = forwardHitDistance;
    } else {
      obstacleDetected = drone.cachedObstacleDetected;
      forwardHitDistance = drone.cachedForwardHitDistance;
    }
    if (obstacleDetected) {
      if (!drone.avoidanceState || !drone.avoidanceState.active) {
        const probeDistance = Math.max(3, detectionDistance * 0.75);
        const rayOrigin = getDroneMuzzleWorldPosition(drone);
        const leftDirX = dirX * cos45 - dirZ * sin45;
        const leftDirZ = dirX * sin45 + dirZ * cos45;
        const leftRay = new import_rapier3d_compat5.default.Ray(rayOrigin, { x: leftDirX, y: 0, z: leftDirZ });
        const leftHit = room.rapierWorld ? room.rapierWorld.castRay(
          leftRay,
          probeDistance,
          true,
          import_rapier3d_compat5.default.QueryFilterFlags.EXCLUDE_SENSORS | import_rapier3d_compat5.default.QueryFilterFlags.EXCLUDE_DYNAMIC,
          void 0,
          drone.collider || void 0
        ) : null;
        const rightDirX = dirX * cos45 + dirZ * sin45;
        const rightDirZ = -dirX * sin45 + dirZ * cos45;
        const rightRay = new import_rapier3d_compat5.default.Ray(rayOrigin, { x: rightDirX, y: 0, z: rightDirZ });
        const rightHit = room.rapierWorld ? room.rapierWorld.castRay(
          rightRay,
          probeDistance,
          true,
          import_rapier3d_compat5.default.QueryFilterFlags.EXCLUDE_SENSORS | import_rapier3d_compat5.default.QueryFilterFlags.EXCLUDE_DYNAMIC,
          void 0,
          drone.collider || void 0
        ) : null;
        const leftClearDist = leftHit ? leftHit.timeOfImpact : probeDistance;
        const rightClearDist = rightHit ? rightHit.timeOfImpact : probeDistance;
        const chosenDirection = leftClearDist > rightClearDist ? -1 : 1;
        drone.avoidanceState = {
          active: true,
          direction: chosenDirection,
          ticksRemaining: MIN_AVOIDANCE_TICKS
        };
      } else {
        drone.avoidanceState.ticksRemaining--;
        if (drone.avoidanceState.ticksRemaining <= 0) {
          drone.avoidanceState.ticksRemaining = MIN_AVOIDANCE_TICKS;
        }
      }
    } else if (drone.avoidanceState && drone.avoidanceState.active) {
      drone.avoidanceState.ticksRemaining--;
      if (drone.avoidanceState.ticksRemaining <= 0) {
        drone.avoidanceState.active = false;
        drone.avoidanceState.transitioning = true;
        let lastAvoidX = 0;
        let lastAvoidZ = 0;
        if (drone.avoidanceState.direction === -1) {
          lastAvoidX = dirX * cos45 - dirZ * sin45;
          lastAvoidZ = dirX * sin45 + dirZ * cos45;
        } else {
          lastAvoidX = dirX * cos45 + dirZ * sin45;
          lastAvoidZ = -dirX * sin45 + dirZ * cos45;
        }
        const avoidLen = Math.sqrt(lastAvoidX * lastAvoidX + lastAvoidZ * lastAvoidZ);
        if (avoidLen > 1e-3) {
          lastAvoidX /= avoidLen;
          lastAvoidZ /= avoidLen;
        }
        drone.avoidanceState.transitionX = lastAvoidX;
        drone.avoidanceState.transitionZ = lastAvoidZ;
      }
    }
    const avoidanceActive = drone.avoidanceState && drone.avoidanceState.active;
    let avoidX = 0;
    let avoidZ = 0;
    if (avoidanceActive && drone.avoidanceState) {
      if (drone.avoidanceState.direction === -1) {
        avoidX = dirX * cos45 - dirZ * sin45;
        avoidZ = dirX * sin45 + dirZ * cos45;
      } else {
        avoidX = dirX * cos45 + dirZ * sin45;
        avoidZ = -dirX * sin45 + dirZ * cos45;
      }
      const avoidLen = Math.sqrt(avoidX * avoidX + avoidZ * avoidZ);
      if (avoidLen > 1e-3) {
        avoidX /= avoidLen;
        avoidZ /= avoidLen;
      }
    }
    if (avoidanceActive) {
      out.steerX = out.steerX * 0.5 + avoidX * 0.5;
      out.steerZ = out.steerZ * 0.5 + avoidZ * 0.5;
    }
    const maxYawRatePerTick = (conf.maxTurnRate ?? 3) * (1 / 60);
    if (drone.avoidanceState && drone.avoidanceState.transitioning) {
      const currentAngle = Math.atan2(drone.avoidanceState.transitionX, drone.avoidanceState.transitionZ);
      const targetAngle = Math.atan2(out.steerX, out.steerZ);
      let angleDiff = targetAngle - currentAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (Math.abs(angleDiff) <= maxYawRatePerTick) {
        drone.avoidanceState.transitioning = false;
      } else {
        const clampedDiff = Math.max(-maxYawRatePerTick, Math.min(maxYawRatePerTick, angleDiff));
        const nextAngle = currentAngle + clampedDiff;
        drone.avoidanceState.transitionX = Math.sin(nextAngle);
        drone.avoidanceState.transitionZ = Math.cos(nextAngle);
      }
      out.steerX = drone.avoidanceState.transitionX;
      out.steerZ = drone.avoidanceState.transitionZ;
    }
    const maxSpeed = conf.speed ?? 10;
    const minSpeed = isFixedWing ? conf.minSpeed ?? 10 : 0;
    const maxAccelPerTick = conf.maxAccelPerTick ?? 0.4;
    out.targetSpeed = Math.max(minSpeed, Math.min(maxSpeed, out.targetSpeed));
    let desiredTx = 0;
    let desiredTy = 0;
    let desiredTz = 0;
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    if (isAir) {
      const desiredVx = out.steerX * out.targetSpeed;
      const desiredVy = out.steerY * out.targetSpeed;
      const desiredVz = out.steerZ * out.targetSpeed;
      drone.currentVelocityX += clamp(desiredVx - drone.currentVelocityX, -maxAccelPerTick, maxAccelPerTick);
      drone.currentVelocityY += clamp(desiredVy - drone.currentVelocityY, -maxAccelPerTick, maxAccelPerTick);
      drone.currentVelocityZ += clamp(desiredVz - drone.currentVelocityZ, -maxAccelPerTick, maxAccelPerTick);
      const curVelMag = Math.sqrt(
        drone.currentVelocityX ** 2 + drone.currentVelocityY ** 2 + drone.currentVelocityZ ** 2
      );
      if (curVelMag > maxSpeed && curVelMag > 1e-3) {
        const velScale = maxSpeed / curVelMag;
        drone.currentVelocityX *= velScale;
        drone.currentVelocityY *= velScale;
        drone.currentVelocityZ *= velScale;
      }
      desiredTx = drone.currentVelocityX * dt;
      desiredTy = drone.currentVelocityY * dt;
      desiredTz = drone.currentVelocityZ * dt;
      let targetHX = out.forceHeadingX !== 0 ? out.forceHeadingX : drone.currentVelocityX;
      let targetHZ = out.forceHeadingZ !== 0 ? out.forceHeadingZ : drone.currentVelocityZ;
      const hLen = Math.sqrt(drone.currentHeadingX ** 2 + drone.currentHeadingZ ** 2) || 1;
      const cX = drone.currentHeadingX / hLen;
      const cZ = drone.currentHeadingZ / hLen;
      const targetHLen = Math.sqrt(targetHX * targetHX + targetHZ * targetHZ);
      let tX = cX;
      let tZ = cZ;
      if (targetHLen > 0.01) {
        tX = targetHX / targetHLen;
        tZ = targetHZ / targetHLen;
      }
      const targetAngle = Math.atan2(tX, tZ);
      const currentAngle = Math.atan2(cX, cZ);
      let angleDiff = targetAngle - currentAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      const clampedDiff = clamp(angleDiff, -maxYawRatePerTick, maxYawRatePerTick);
      const nextAngle = currentAngle + clampedDiff;
      drone.currentHeadingX = Math.sin(nextAngle);
      drone.currentHeadingZ = Math.cos(nextAngle);
    } else {
      const hLen = Math.sqrt(drone.currentHeadingX ** 2 + drone.currentHeadingZ ** 2) || 1;
      const cX = drone.currentHeadingX / hLen;
      const cZ = drone.currentHeadingZ / hLen;
      const targetAngle = Math.atan2(out.steerX, out.steerZ);
      const currentAngle = Math.atan2(cX, cZ);
      let angleDiff = targetAngle - currentAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      const clampedDiff = clamp(angleDiff, -maxYawRatePerTick, maxYawRatePerTick);
      const nextAngle = currentAngle + clampedDiff;
      drone.currentHeadingX = Math.sin(nextAngle);
      drone.currentHeadingZ = Math.cos(nextAngle);
      const speedVel = Math.sqrt(drone.currentVelocityX ** 2 + drone.currentVelocityZ ** 2);
      const nextSpeed = speedVel + clamp(out.targetSpeed - speedVel, -maxAccelPerTick, maxAccelPerTick);
      drone.currentVelocityX = drone.currentHeadingX * nextSpeed;
      drone.currentVelocityZ = drone.currentHeadingZ * nextSpeed;
      if (isFixedWing) {
        drone.currentVelocityY = out.steerY * nextSpeed;
      } else {
        drone.currentVelocityY += -18 * dt;
        if (drone.currentVelocityY < -40) drone.currentVelocityY = -40;
      }
      desiredTx = drone.currentVelocityX * dt;
      desiredTy = drone.currentVelocityY * dt;
      desiredTz = drone.currentVelocityZ * dt;
    }
    drone.rotY = Math.atan2(drone.currentHeadingX, drone.currentHeadingZ);
    drone.rotW = Math.cos(drone.rotY / 2);
    drone.rotY = Math.sin(drone.rotY / 2);
    drone.rotX = 0;
    drone.rotZ = 0;
    if (!drone.kcc && room.initDronePhysics) {
      room.initDronePhysics(drone);
    }
    if (out.shouldFire && drone.cooldown <= 0) {
      let targetPos = drone.combatTarget ? drone.combatTarget.lastSensedPosition : null;
      if (targetPos) {
        const muzzle = getDroneMuzzleWorldPosition(drone, targetPos);
        const dx = targetPos.x - muzzle.x;
        const dy = targetPos.y - muzzle.y;
        const dz = targetPos.z - muzzle.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const targetPlayerInstance = drone.combatTarget ? getPlayerFromRoom(room, drone.combatTarget.entityId) : null;
        const velX = targetPlayerInstance ? targetPlayerInstance.velEmaX : 0;
        const velY = targetPlayerInstance ? targetPlayerInstance.velEmaY : 0;
        const velZ = targetPlayerInstance ? targetPlayerInstance.velEmaZ : 0;
        const shootSpeed = 35;
        const aimX = targetPos.x + velX * (dist / shootSpeed);
        const aimY = targetPos.y + velY * (dist / shootSpeed);
        const aimZ = targetPos.z + velZ * (dist / shootSpeed);
        const fireMuzzle = getDroneMuzzleWorldPosition(drone, { x: aimX, y: aimY, z: aimZ });
        const dirX2 = aimX - fireMuzzle.x;
        const dirY = aimY - fireMuzzle.y;
        const dirZ2 = aimZ - fireMuzzle.z;
        const dirLen = Math.sqrt(dirX2 * dirX2 + dirY * dirY + dirZ2 * dirZ2);
        if (dirLen > 0.1) {
          let clear = true;
          if (room.rapierWorld) {
            const ray = new import_rapier3d_compat5.default.Ray(fireMuzzle, { x: dirX2 / dirLen, y: dirY / dirLen, z: dirZ2 / dirLen });
            const hit = room.rapierWorld.castRay(
              ray,
              dirLen,
              true,
              import_rapier3d_compat5.default.QueryFilterFlags.EXCLUDE_DYNAMIC
            );
            if (hit && hit.collider && hit.timeOfImpact < dirLen - 0.7) {
              clear = false;
            }
          }
          if (clear) {
            drone.state = 3 /* ATTACKING */;
            room.spawnServerProjectile(
              fireMuzzle.x,
              fireMuzzle.y,
              fireMuzzle.z,
              dirX2,
              dirY,
              dirZ2,
              true,
              conf.damage ?? 10,
              drone.id.toString()
            );
            room.broadcastReliableEvent({
              type: "drone_shoot",
              droneId: drone.id,
              droneType: drone.type,
              posX: fireMuzzle.x,
              posY: fireMuzzle.y,
              posZ: fireMuzzle.z,
              dirX: dirX2,
              dirY,
              dirZ: dirZ2
            });
            drone.cooldown = conf.fireCooldown ?? (drone.type === 6 /* HUMANOID */ ? 40 : 20);
          }
        }
      }
    }
    if (drone.kcc && drone.collider) {
      drone.kcc.computeColliderMovement(
        drone.collider,
        { x: desiredTx, y: desiredTy, z: desiredTz },
        import_rapier3d_compat5.default.QueryFilterFlags.EXCLUDE_SENSORS,
        void 0,
        void 0
      );
      const correctedTrans = drone.kcc.computedMovement();
      const desiredMoveLenSq = desiredTx * desiredTx + desiredTz * desiredTz;
      if (desiredMoveLenSq > 1e-6) {
        const correctedMoveLenSq = correctedTrans.x * correctedTrans.x + correctedTrans.z * correctedTrans.z;
        if (correctedMoveLenSq < 1e-4) {
          drone.stuckTicks = (drone.stuckTicks || 0) + 1;
        } else {
          drone.stuckTicks = 0;
        }
      } else {
        drone.stuckTicks = 0;
      }
      const STUCK_TICK_THRESHOLD = 15;
      if ((drone.stuckTicks || 0) >= STUCK_TICK_THRESHOLD) {
        drone.currentVelocityX = 0;
        if (drone.currentVelocityY !== void 0) drone.currentVelocityY = 0;
        drone.currentVelocityZ = 0;
        let recoveryDirection = 1;
        if (room.rapierWorld) {
          const headingLen2 = Math.sqrt(
            drone.currentHeadingX * drone.currentHeadingX + drone.currentHeadingZ * drone.currentHeadingZ
          );
          const dirX2 = headingLen2 > 1e-3 ? drone.currentHeadingX / headingLen2 : 1;
          const dirZ2 = headingLen2 > 1e-3 ? drone.currentHeadingZ / headingLen2 : 0;
          const probeDistance = Math.max(3, ((conf.detectionRadius ?? BASE_DETECTION_DISTANCE) + 5) * 0.75);
          const rayOrigin = getDroneMuzzleWorldPosition(drone);
          const leftDirX = dirX2 * cos45 - dirZ2 * sin45;
          const leftDirZ = dirX2 * sin45 + dirZ2 * cos45;
          const leftRay = new import_rapier3d_compat5.default.Ray(rayOrigin, { x: leftDirX, y: 0, z: leftDirZ });
          const leftHit = room.rapierWorld.castRay(
            leftRay,
            probeDistance,
            true,
            import_rapier3d_compat5.default.QueryFilterFlags.EXCLUDE_SENSORS,
            void 0,
            drone.collider || void 0
          );
          const rightDirX = dirX2 * cos45 + dirZ2 * sin45;
          const rightDirZ = -dirX2 * sin45 + dirZ2 * cos45;
          const rightRay = new import_rapier3d_compat5.default.Ray(rayOrigin, { x: rightDirX, y: 0, z: rightDirZ });
          const rightHit = room.rapierWorld.castRay(
            rightRay,
            probeDistance,
            true,
            import_rapier3d_compat5.default.QueryFilterFlags.EXCLUDE_SENSORS,
            void 0,
            drone.collider || void 0
          );
          const leftClearDist = leftHit ? leftHit.timeOfImpact : probeDistance;
          const rightClearDist = rightHit ? rightHit.timeOfImpact : probeDistance;
          recoveryDirection = leftClearDist > rightClearDist ? -1 : 1;
        }
        drone.avoidanceState = {
          active: true,
          direction: recoveryDirection,
          ticksRemaining: MIN_AVOIDANCE_TICKS * 2
        };
        const nudgeDirX = headingLen > 1e-3 ? -drone.currentHeadingX / headingLen : -1;
        const nudgeDirZ = headingLen > 1e-3 ? -drone.currentHeadingZ / headingLen : 0;
        drone.posX += nudgeDirX * 0.3;
        drone.posZ += nudgeDirZ * 0.3;
        if (drone.body) {
          drone.body.setNextKinematicTranslation({
            x: drone.posX,
            y: drone.posY,
            z: drone.posZ
          });
        }
        drone.stuckTicks = 0;
      }
      if (drone.type === 6 /* HUMANOID */ || drone.type === 5 /* ROBOT_DOG */ || drone.type === 4 /* WHEELED */) {
        if (drone.kcc.computedGrounded()) {
          drone.currentVelocityY = 0;
        }
      }
      drone.posX += correctedTrans.x;
      drone.posY += correctedTrans.y;
      drone.posZ += correctedTrans.z;
      if (drone.body) {
        drone.body.setNextKinematicTranslation({
          x: drone.posX,
          y: drone.posY,
          z: drone.posZ
        });
      }
    } else {
      drone.posX += desiredTx;
      drone.posY += desiredTy;
      drone.posZ += desiredTz;
    }
    if (out.nextState !== null) {
      drone.state = out.nextState;
    }
  }
}

// shared/dynamicCollision.ts
function getDroneCollisionDimensions(type) {
  const conf = DRONE_CONFIGS[type];
  if (!conf) {
    return { radius: 0.5, halfHeight: 0.4, mass: 1 };
  }
  if (conf.collider.type === "cuboid" && conf.collider.halfExtents) {
    const hx = conf.collider.halfExtents[0];
    const hy = conf.collider.halfExtents[1];
    const hz = conf.collider.halfExtents[2];
    const rad2 = Math.max(hx, hz);
    const mass2 = conf.isAirUnit ? 0.3 : type === 4 /* WHEELED */ ? 2.5 : 1;
    return { radius: rad2, halfHeight: hy, mass: mass2 };
  }
  if (conf.collider.type === "capsule" && conf.collider.halfHeight !== void 0 && conf.collider.radius !== void 0) {
    const rad2 = conf.collider.radius;
    const hy = conf.collider.halfHeight + rad2;
    return { radius: rad2, halfHeight: hy, mass: 1.5 };
  }
  const rad = conf.collider.radius || 0.6;
  const mass = conf.isAirUnit ? 0.3 : 1;
  return { radius: rad, halfHeight: 0.4, mass };
}
var PLAYER_COLLISION_RADIUS = PLAYER_RADIUS;
var PLAYER_COLLISION_HALF_HEIGHT = PLAYER_TOTAL_HEIGHT * 0.5;
var PLAYER_MASS = 1;
var _dx = 0;
var _dz = 0;
var _distSq = 0;
var _dist = 0;
var _minDist = 0;
var _overlap = 0;
var _nx = 0;
var _nz = 0;
var _dy = 0;
var _totalMass = 0;
var _ratio1 = 0;
var _ratio2 = 0;
function resolveCylinderSeparation(pos1, radius1, halfHeight1, mass1, pos2, radius2, halfHeight2, mass2, immovable2 = false) {
  _dy = Math.abs(pos1.y - pos2.y);
  if (_dy >= halfHeight1 + halfHeight2) {
    return false;
  }
  _dx = pos1.x - pos2.x;
  _dz = pos1.z - pos2.z;
  _distSq = _dx * _dx + _dz * _dz;
  _minDist = radius1 + radius2;
  if (_distSq >= _minDist * _minDist) {
    return false;
  }
  if (_distSq < 1e-6) {
    _dx = 1e-3;
    _dz = 0;
    _dist = 1e-3;
  } else {
    _dist = Math.sqrt(_distSq);
  }
  _overlap = _minDist - _dist;
  _nx = _dx / _dist;
  _nz = _dz / _dist;
  if (immovable2) {
    pos1.x += _nx * _overlap;
    pos1.z += _nz * _overlap;
    return true;
  }
  _totalMass = mass1 + mass2;
  if (_totalMass <= 0) _totalMass = 2;
  _ratio1 = mass2 / _totalMass;
  _ratio2 = mass1 / _totalMass;
  pos1.x += _nx * _overlap * _ratio1;
  pos1.z += _nz * _overlap * _ratio1;
  pos2.x -= _nx * _overlap * _ratio2;
  pos2.z -= _nz * _overlap * _ratio2;
  return true;
}

// server/physics/DynamicCollisionSystem.ts
var MAX_SCRATCH_PLAYERS = 32;
var livingPlayers = [];
var p1Pos = { x: 0, y: 0, z: 0 };
var p2Pos = { x: 0, y: 0, z: 0 };
var dronePos = { x: 0, y: 0, z: 0 };
var DynamicCollisionSystem = class {
  /**
   * Run one separation tick across all dynamic entities.
   * Modifies player and drone coordinates in place.
   */
  static resolve(players, drones) {
    livingPlayers.length = 0;
    for (const p of players.values()) {
      if (p.isAlive && !p.isDead) {
        livingPlayers.push(p);
        if (livingPlayers.length >= MAX_SCRATCH_PLAYERS) break;
      }
    }
    const pCount = livingPlayers.length;
    for (let i = 0; i < pCount; i++) {
      const p1 = livingPlayers[i];
      p1Pos.x = p1.posX;
      p1Pos.y = p1.posY;
      p1Pos.z = p1.posZ;
      for (let j = i + 1; j < pCount; j++) {
        const p2 = livingPlayers[j];
        p2Pos.x = p2.posX;
        p2Pos.y = p2.posY;
        p2Pos.z = p2.posZ;
        const collided = resolveCylinderSeparation(
          p1Pos,
          PLAYER_COLLISION_RADIUS,
          PLAYER_COLLISION_HALF_HEIGHT,
          PLAYER_MASS,
          p2Pos,
          PLAYER_COLLISION_RADIUS,
          PLAYER_COLLISION_HALF_HEIGHT,
          PLAYER_MASS,
          false
        );
        if (collided) {
          p1.posX = p1Pos.x;
          p1.posZ = p1Pos.z;
          if (p1.body) {
            p1.body.setNextKinematicTranslation({ x: p1.posX, y: p1.posY, z: p1.posZ });
          }
          p2.posX = p2Pos.x;
          p2.posZ = p2Pos.z;
          if (p2.body) {
            p2.body.setNextKinematicTranslation({ x: p2.posX, y: p2.posY, z: p2.posZ });
          }
        }
      }
    }
    const droneCount = drones.length;
    for (let i = 0; i < pCount; i++) {
      const p = livingPlayers[i];
      p1Pos.x = p.posX;
      p1Pos.y = p.posY;
      p1Pos.z = p.posZ;
      for (let dIdx = 0; dIdx < droneCount; dIdx++) {
        const d = drones[dIdx];
        if (d.state === 5 /* DEAD */) continue;
        dronePos.x = d.posX;
        dronePos.y = d.posY;
        dronePos.z = d.posZ;
        const dDim = getDroneCollisionDimensions(d.type);
        const collided = resolveCylinderSeparation(
          p1Pos,
          PLAYER_COLLISION_RADIUS,
          PLAYER_COLLISION_HALF_HEIGHT,
          PLAYER_MASS,
          dronePos,
          dDim.radius,
          dDim.halfHeight,
          dDim.mass,
          false
        );
        if (collided) {
          p.posX = p1Pos.x;
          p.posZ = p1Pos.z;
          if (p.body) {
            p.body.setNextKinematicTranslation({ x: p.posX, y: p.posY, z: p.posZ });
          }
          d.posX = dronePos.x;
          d.posZ = dronePos.z;
          if (d.body) {
            d.body.setNextKinematicTranslation({ x: d.posX, y: d.posY, z: d.posZ });
          }
        }
      }
    }
  }
};

// server/match/SimulationEngine.ts
var SimulationEngine = class {
  constructor(context) {
    this.context = context;
    this.devPhysicsGravityY = -9.81;
    this.devPhysicsSpeedMultiplier = 1;
    this.devPhysicsPaused = false;
    this.devPhysicsStepOnceRequested = false;
    this.devCubeBody = null;
    this.devCubeCollider = null;
    this.devCubeEvents = [];
    this.devCubePrevState = "none";
    this.devCubeSpawned = false;
  }
  devSpawnCube(playerId, customPos) {
    const rapierWorld = this.context.getRapierWorld();
    if (!rapierWorld) return;
    let player = this.context.getPlayers().get(playerId);
    if (!player && this.context.getPlayers().size > 0) {
      player = Array.from(this.context.getPlayers().values())[0];
    }
    let spawnX = 0, spawnY = 10, spawnZ = 0;
    if (customPos && customPos.x !== void 0 && customPos.y !== void 0 && customPos.z !== void 0) {
      spawnX = Number(customPos.x);
      spawnY = Number(customPos.y);
      spawnZ = Number(customPos.z);
    } else if (player) {
      const forwardX = Math.sin(player.yaw);
      const forwardZ = Math.cos(player.yaw);
      spawnX = player.posX + forwardX * 5;
      spawnY = player.posY + 3;
      spawnZ = player.posZ + forwardZ * 5;
    }
    if (this.devCubeBody) {
      try {
        rapierWorld.removeRigidBody(this.devCubeBody);
      } catch (e) {
      }
    }
    this.devCubeEvents = [];
    this.devCubePrevState = "air";
    this.devCubeSpawned = true;
    const bodyDesc = import_rapier3d_compat6.default.RigidBodyDesc.dynamic().setTranslation(
      spawnX,
      spawnY,
      spawnZ
    );
    this.devCubeBody = rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = import_rapier3d_compat6.default.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    this.devCubeCollider = rapierWorld.createCollider(
      colliderDesc,
      this.devCubeBody
    );
    this.devCubeEvents.push(
      `Spawned dynamic cube at (${spawnX.toFixed(2)}, ${spawnY.toFixed(
        2
      )}, ${spawnZ.toFixed(2)})`
    );
  }
  devClearCube() {
    const rapierWorld = this.context.getRapierWorld();
    if (this.devCubeBody && rapierWorld) {
      try {
        rapierWorld.removeRigidBody(this.devCubeBody);
      } catch (e) {
      }
      this.devCubeBody = null;
      this.devCubeCollider = null;
    }
    this.devCubeSpawned = false;
    this.devCubeEvents = [];
  }
  setDevPhysicsGravityY(gY) {
    this.devPhysicsGravityY = gY;
    const rapierWorld = this.context.getRapierWorld();
    if (rapierWorld) {
      rapierWorld.gravity = { x: 0, y: gY, z: 0 };
    }
    this.context.broadcastReliableEvent({
      type: "dev_physics_settings_sync",
      gravityY: this.devPhysicsGravityY,
      speedMultiplier: this.devPhysicsSpeedMultiplier,
      paused: this.devPhysicsPaused
    });
  }
  setDevPhysicsSpeedMultiplier(sM) {
    this.devPhysicsSpeedMultiplier = sM;
    this.context.broadcastReliableEvent({
      type: "dev_physics_settings_sync",
      gravityY: this.devPhysicsGravityY,
      speedMultiplier: this.devPhysicsSpeedMultiplier,
      paused: this.devPhysicsPaused
    });
  }
  setDevPhysicsPaused(p) {
    this.devPhysicsPaused = p;
    this.context.broadcastReliableEvent({
      type: "dev_physics_settings_sync",
      gravityY: this.devPhysicsGravityY,
      speedMultiplier: this.devPhysicsSpeedMultiplier,
      paused: this.devPhysicsPaused
    });
  }
  setDevPhysicsStepOnce() {
    this.devPhysicsStepOnceRequested = true;
  }
  tickSimulation() {
    const rapierWorld = this.context.getRapierWorld();
    if (!rapierWorld) return;
    const tickStart = Date.now();
    benchmarkCounter("simulation.ticks");
    let preCubePos = { x: 0, y: 0, z: 0 };
    let preCubeVel = { x: 0, y: 0, z: 0 };
    if (this.devCubeBody && this.devCubeSpawned) {
      const translation = this.devCubeBody.translation();
      preCubePos = { x: translation.x, y: translation.y, z: translation.z };
      const linvel = this.devCubeBody.linvel();
      preCubeVel = { x: linvel.x, y: linvel.y, z: linvel.z };
    }
    rapierWorld.step();
    const serverTick = this.context.getServerTick();
    const players = this.context.getPlayers();
    const drones = this.context.getDrones();
    if (serverTick % 60 === 0) {
      let activeDrones = 0;
      for (let i = 0; i < drones.length; i++) {
        if (drones[i].state !== 5 /* DEAD */) activeDrones++;
      }
      recordServerActiveDrones(activeDrones);
      recordServerConnectedPlayers(players.size);
    }
    if (this.devCubeBody && this.devCubeSpawned) {
      const t = this.devCubeBody.translation();
      const vel = this.devCubeBody.linvel();
      if (t.y < -10 && !this.devCubeEvents.some((e) => e.includes("FELL THROUGH WORLD"))) {
        this.devCubeEvents.push(
          `[${serverTick}] FELL THROUGH WORLD! Pos Y: ${t.y.toFixed(2)}`
        );
      }
      let collidedWith = [];
      try {
        const sphereShape = import_rapier3d_compat6.default.ColliderDesc.ball(0.55).shape;
        rapierWorld.intersectionsWithShape(
          t,
          { x: 0, y: 0, z: 0, w: 1 },
          sphereShape,
          (collider) => {
            if (collider.handle === this.devCubeCollider?.handle) return true;
            const hitEntity = this.context.getColliderToEntityMap().get(collider.handle);
            if (hitEntity) {
              if (hitEntity.type === "player") {
                collidedWith.push("Player");
              } else if (hitEntity.type === "drone") {
                collidedWith.push(`Drone (${hitEntity.obj.type})`);
              }
            } else {
              const colTranslation = collider.translation();
              if (collider.shapeType() === import_rapier3d_compat6.default.ShapeType.Cuboid) {
                if (Math.abs(colTranslation.y - -0.5) < 0.1) {
                  collidedWith.push("Floor");
                } else {
                  collidedWith.push("Building");
                }
              } else {
                collidedWith.push("Wall");
              }
            }
            return true;
          }
        );
      } catch (e) {
      }
      if (collidedWith.length > 0) {
        if (this.devCubePrevState !== "ground") {
          const dy = t.y - preCubePos.y;
          const expectedFall = this.devPhysicsGravityY * (1 / 60);
          const normalForceCorrectionY = dy - expectedFall;
          this.devCubeEvents.push(
            `COLLISION: Touch ${collidedWith.join(", ")}`
          );
          this.devCubeEvents.push(
            `  - Pre-Pos:  (${preCubePos.x.toFixed(3)}, ${preCubePos.y.toFixed(
              3
            )}, ${preCubePos.z.toFixed(3)})`
          );
          this.devCubeEvents.push(
            `  - Post-Pos: (${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(
              3
            )})`
          );
          this.devCubeEvents.push(
            `  - Correct:  X: ${(t.x - preCubePos.x).toFixed(
              4
            )} | Y: ${normalForceCorrectionY.toFixed(4)} | Z: ${(t.z - preCubePos.z).toFixed(4)}`
          );
          this.devCubePrevState = "ground";
        }
      } else {
        if (this.devCubePrevState === "ground" && Math.abs(vel.y) > 0.1) {
          this.devCubeEvents.push(
            `Left surface, currently in air. Vel Y: ${vel.y.toFixed(2)}`
          );
          this.devCubePrevState = "air";
        }
      }
      if (this.devCubeEvents.length > 50) {
        this.devCubeEvents.splice(0, this.devCubeEvents.length - 50);
      }
    }
    if (this.context.isMatchActive()) {
      const nextTick = serverTick + 1;
      this.context.setServerTick(nextTick);
      const matchElapsed = (Date.now() - this.context.getMatchStartTime()) / 1e3;
      if (matchElapsed >= ACTIVE_GAMEMODE.matchDuration) {
        this.context.handleMatchEnd("loss");
        return;
      }
      for (const player of players.values()) {
        if (player.body && player.isAlive) {
          const t = player.body.translation();
          player.posX = t.x;
          player.posY = t.y;
          player.posZ = t.z;
        }
        if (!player.isAlive) {
          player.hp = 0;
          player.inputMask = 0;
          player.fire = 0;
          player.velX = 0;
          player.velY = 0;
          player.velZ = 0;
          const dt = 0.016666;
          const beforeCeil = Math.ceil(player.respawnTimer);
          player.respawnTimer -= dt;
          if (player.respawnTimer <= 0) {
            player.isAlive = true;
            player.isDead = false;
            player.hp = player.maxHp;
            player.botActionId = 0;
            player.botTargetId = "";
            player.botTargetDist = 0;
            player.botFireCooldown = 0;
            player.botAimYaw = 0;
            player.botAimPitch = 0;
            resetWeaponSlotState(
              player.weaponState.primary,
              player.weaponState.primary.weaponId
            );
            resetWeaponSlotState(
              player.weaponState.secondary,
              player.weaponState.secondary.weaponId
            );
            if (ACTIVE_GAMEMODE.utilityResetsOnRespawn && player.utilityState) {
              player.utilityState = createInitialUtilityState(
                player.classId || "ASSAULT",
                ACTIVE_GAMEMODE.utilityCooldownMultiplier
              );
              player.channel.emit("reliable_event", {
                type: "UTILITY_STATE",
                state: player.utilityState
              });
            }
            const specJson = this.context.getSpecJson();
            const spawnX = specJson?.playerSpawn?.position?.x ?? (Math.random() - 0.5) * 40;
            const spawnY = (specJson?.playerSpawn?.position?.y ?? 0) + 5;
            const spawnZ = specJson?.playerSpawn?.position?.z ?? 120 + (Math.random() - 0.5) * 10;
            player.posX = spawnX;
            player.posY = spawnY;
            player.posZ = spawnZ;
            if (player.body) {
              player.body.setNextKinematicTranslation({
                x: player.posX,
                y: player.posY,
                z: player.posZ
              });
            }
            player.channel.emit("reliable_event", {
              type: "YOU_RESPAWNED",
              hp: player.hp,
              position: { x: player.posX, y: player.posY, z: player.posZ }
            });
            this.context.broadcastReliableEvent({
              type: "PLAYER_RESPAWN",
              playerId: player.id,
              position: { x: player.posX, y: player.posY, z: player.posZ }
            });
          } else {
            const afterCeil = Math.ceil(player.respawnTimer);
            if (beforeCeil !== afterCeil) {
              player.channel.emit("reliable_event", {
                type: "RESPAWN_COUNTDOWN",
                remaining: afterCeil
              });
            }
          }
          continue;
        }
        const primaryState = player.weaponState.primary;
        const secondaryState = player.weaponState.secondary;
        if (primaryState.isReloading) {
          primaryState.reloadTimer--;
          if (primaryState.reloadTimer <= 0) {
            primaryState.isReloading = false;
            applyWeaponReload(primaryState);
            player.channel.emit("reliable_event", {
              type: "AMMO_STATE",
              primary: player.weaponState.primary,
              secondary: player.weaponState.secondary
            });
          }
        }
        if (secondaryState.isReloading) {
          secondaryState.reloadTimer--;
          if (secondaryState.reloadTimer <= 0) {
            secondaryState.isReloading = false;
            applyWeaponReload(secondaryState);
            player.channel.emit("reliable_event", {
              type: "AMMO_STATE",
              primary: player.weaponState.primary,
              secondary: player.weaponState.secondary
            });
          }
        }
        if (player.utilityState) {
          const dt = 0.016666;
          let stateChanged = false;
          for (const slotKey of ["utility1", "utility2"]) {
            const uSlot = player.utilityState[slotKey];
            if (uSlot.cooldownRemaining > 0) {
              uSlot.cooldownRemaining -= dt;
              if (uSlot.cooldownRemaining <= 0) {
                uSlot.cooldownRemaining = 0;
                if (uSlot.charges < uSlot.maxCharges) {
                  uSlot.charges += 1;
                  stateChanged = true;
                  if (uSlot.charges < uSlot.maxCharges) {
                    uSlot.cooldownRemaining = uSlot.baseCooldown;
                  }
                }
              }
              if (nextTick % 10 === 0) {
                stateChanged = true;
              }
            }
          }
          if (stateChanged) {
            player.channel.emit("reliable_event", {
              type: "UTILITY_STATE",
              state: player.utilityState
            });
          }
        }
        if (player.kcc && player.body && player.collider) {
          if (player.isBot) {
            processBotTick(player, this.context, 0.0166);
          }
          const inputMask = player.inputMask;
          const isForward = (inputMask & 1) !== 0;
          const isLeft = (inputMask & 2) !== 0;
          const isBackward = (inputMask & 4) !== 0;
          const isRight = (inputMask & 8) !== 0;
          const isJump = (inputMask & 16) !== 0;
          const isSprint = (inputMask & 32) !== 0;
          const isCrouch = (inputMask & 64) !== 0;
          const isDash = (inputMask & 128) !== 0;
          if (isCrouch !== player.lastCrouchState) {
            if (isCrouch) {
              player.collider.setHalfHeight(PLAYER_CAPSULE_HALF_HEIGHT_CROUCH);
            } else {
              player.collider.setHalfHeight(PLAYER_CAPSULE_HALF_HEIGHT);
            }
            player.lastCrouchState = isCrouch;
          }
          let speedMultiplier = 1;
          if (isSprint) speedMultiplier = PLAYER_SPRINT_MULTIPLIER;
          if (isCrouch)
            speedMultiplier = PLAYER_CROUCH_SPEED / PLAYER_BASE_SPEED;
          if (isDash) speedMultiplier = PLAYER_DASH_MULTIPLIER;
          let moveX = 0;
          let moveZ = 0;
          if (isForward) moveZ -= 1;
          if (isBackward) moveZ += 1;
          if (isLeft) moveX -= 1;
          if (isRight) moveX += 1;
          const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
          if (len > 0) {
            moveX /= len;
            moveZ /= len;
          }
          const dirX = moveX * Math.cos(player.yaw) + moveZ * Math.sin(player.yaw);
          const dirZ = -moveX * Math.sin(player.yaw) + moveZ * Math.cos(player.yaw);
          const moveSpeed = PLAYER_BASE_SPEED * speedMultiplier;
          player.velX = dirX * moveSpeed;
          player.velZ = dirZ * moveSpeed;
          const gravity = -PLAYER_GRAVITY;
          player.velY += gravity * 0.0166;
          const grounded = player.kcc.computedGrounded();
          if (isJump && grounded) {
            player.velY = PLAYER_JUMP_VELOCITY;
          }
          const desiredTranslation = {
            x: player.velX * 0.0166,
            y: player.velY * 0.0166,
            z: player.velZ * 0.0166
          };
          player.kcc.computeColliderMovement(
            player.collider,
            desiredTranslation,
            import_rapier3d_compat6.default.QueryFilterFlags.EXCLUDE_SENSORS,
            void 0,
            void 0
          );
          const correctedTrans = player.kcc.computedMovement();
          const prevX = player.posX;
          const prevY = player.posY;
          const prevZ = player.posZ;
          if (player.body) {
            const currentPos = player.body.translation();
            const nextPos = {
              x: currentPos.x + correctedTrans.x,
              y: currentPos.y + correctedTrans.y,
              z: currentPos.z + correctedTrans.z
            };
            player.body.setNextKinematicTranslation(nextPos);
            player.posX = nextPos.x;
            player.posY = nextPos.y;
            player.posZ = nextPos.z;
          }
          const dtSec = 0.016666;
          player.stats.timeAlive += dtSec;
          const pDx2 = player.posX - prevX;
          const pDy = player.posY - prevY;
          const pDz2 = player.posZ - prevZ;
          player.stats.distanceTravelled += Math.sqrt(
            pDx2 * pDx2 + pDy * pDy + pDz2 * pDz2
          );
          const coreX = 384;
          const coreZ = 384;
          const objRad = ACTIVE_GAMEMODE.objectiveProximityRadius || 3;
          const odx = player.posX - coreX;
          const odz = player.posZ - coreZ;
          const inObjRadius = odx * odx + odz * odz <= objRad * objRad;
          if (inObjRadius) {
            player.stats.objectiveTimeHeld += dtSec;
            if (player.isHoldingObjective) {
              player.currentObjectiveProgress = (player.currentObjectiveProgress || 0) + dtSec;
              const reqHold = ACTIVE_GAMEMODE.objectiveHoldTime || 8;
              if (nextTick % 10 === 0 || player.currentObjectiveProgress >= reqHold) {
                player.channel.emit("reliable_event", {
                  type: "OBJECTIVE_PROGRESS",
                  progressSec: player.currentObjectiveProgress,
                  requiredSec: reqHold
                });
              }
              if (player.currentObjectiveProgress >= reqHold) {
                this.context.handleMatchEnd("win");
              }
            }
          }
          if (player.posY < prevY && player.velY < -5) {
            if (player.lastFallStartY === 0) player.lastFallStartY = prevY;
          }
          const isCurrentlyGrounded = player.kcc.computedGrounded();
          if (isCurrentlyGrounded) {
            player.velY = 0;
            if (player.lastFallStartY > 0) {
              const fallDist = player.lastFallStartY - player.posY;
              player.lastFallStartY = 0;
              if (fallDist > 14) {
                const fallDamage = Math.floor((fallDist - 14) * 12);
                if (fallDamage > 0) {
                  this.context.applyDamage(
                    player.id,
                    fallDamage,
                    "fall",
                    "0",
                    "environment"
                  );
                }
              }
            }
          }
          const actualVx = (player.posX - prevX) / 0.0166;
          const actualVy = (player.posY - prevY) / 0.0166;
          const actualVz = (player.posZ - prevZ) / 0.0166;
          const speedSq = actualVx * actualVx + actualVz * actualVz;
          if (speedSq > 900) {
            recordSecurityExploit("speed_teleport_detected", {
              playerId: player.id,
              speed: Math.sqrt(speedSq),
              pos: { x: player.posX, y: player.posY, z: player.posZ }
            });
          }
          player.velEmaX = player.velEmaX * 0.8 + actualVx * 0.2;
          player.velEmaY = player.velEmaY * 0.8 + actualVy * 0.2;
          player.velEmaZ = player.velEmaZ * 0.8 + actualVz * 0.2;
        }
      }
      this.context.getOutOfBoundsEnforcer().tick(this.context, 16.66);
      this.updateSystemEntities();
    }
    const durationMs = Date.now() - tickStart;
    benchmarkTimer("simulation.tick", durationMs);
    recordServerTickDuration(durationMs);
  }
  updateSystemEntities() {
    const players = this.context.getPlayers();
    const drones = this.context.getDrones();
    const cameras = this.context.getCameras();
    const zoneSummary = this.context.getZoneSummary();
    const rapierWorld = this.context.getRapierWorld();
    this.context.updateProjectiles();
    let targetPlayer = null;
    for (const p of players.values()) {
      targetPlayer = p;
      break;
    }
    const nowMs = Date.now();
    for (const zoneId of ZONES_ARRAY) {
      if (zoneSummary[zoneId]) {
        zoneSummary[zoneId].droneGroups.length = 0;
      }
    }
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (d.state !== 5 /* DEAD */ && zoneSummary[d.zone]) {
        if (!zoneSummary[d.zone].droneGroups.includes(d.groupId)) {
          zoneSummary[d.zone].droneGroups.push(d.groupId);
        }
      }
    }
    let detectedZones = /* @__PURE__ */ new Set();
    if (targetPlayer) {
      let playerZone = ZONES.CORE;
      for (const zoneId of ZONES_ARRAY) {
        const b = ZONE_BOUNDS[zoneId];
        const dx = Math.abs(targetPlayer.posX - b.center.x);
        const dy = Math.abs(targetPlayer.posY - b.center.y);
        const dz = Math.abs(targetPlayer.posZ - b.center.z);
        if (dx <= b.halfSize.x && dy <= b.halfSize.y && dz <= b.halfSize.z) {
          playerZone = zoneId;
          break;
        }
      }
      targetPlayer.zone = playerZone;
      for (let i = 0; i < drones.length; i++) {
        const d = drones[i];
        if (d.state !== 5 /* DEAD */ && d.zone === playerZone && d.type !== 1 /* BOMBER */ && d.type !== 3 /* FIXED_WING */) {
          const dx = targetPlayer.posX - d.posX;
          const dy = targetPlayer.posY - d.posY;
          const dz = targetPlayer.posZ - d.posZ;
          if (dx * dx + dy * dy + dz * dz < 900) {
            detectedZones.add(playerZone);
            break;
          }
        }
      }
      for (let c = 0; c < cameras.length; c++) {
        if (cameras[c].isActive && (!cameras[c].disabledUntil || cameras[c].disabledUntil <= nowMs)) {
          const dx = targetPlayer.posX - cameras[c].posX;
          const dy = targetPlayer.posY - cameras[c].posY;
          const dz = targetPlayer.posZ - cameras[c].posZ;
          if (dx * dx + dy * dy + dz * dz < cameras[c].detectionRadius * cameras[c].detectionRadius) {
            let hasLOS = true;
            if (rapierWorld) {
              const rayDir = {
                x: targetPlayer.posX - cameras[c].posX,
                y: targetPlayer.posY - cameras[c].posY,
                z: targetPlayer.posZ - cameras[c].posZ
              };
              const len = Math.sqrt(
                rayDir.x * rayDir.x + rayDir.y * rayDir.y + rayDir.z * rayDir.z
              );
              if (len > 0) {
                rayDir.x /= len;
                rayDir.y /= len;
                rayDir.z /= len;
                const ray = new import_rapier3d_compat6.default.Ray(
                  {
                    x: cameras[c].posX,
                    y: cameras[c].posY,
                    z: cameras[c].posZ
                  },
                  rayDir
                );
                const hit = rapierWorld.castRay(
                  ray,
                  len,
                  true,
                  import_rapier3d_compat6.default.QueryFilterFlags.EXCLUDE_DYNAMIC
                );
                if (hit && hit.collider && hit.timeOfImpact < len - 0.7) {
                  hasLOS = false;
                }
              }
            }
            if (hasLOS) detectedZones.add(playerZone);
          }
        }
      }
      if (targetPlayer.firedThisTick) {
        detectedZones.add(playerZone);
        for (const adj of TOPOLOGY[playerZone] || []) {
          detectedZones.add(adj);
        }
      }
      const isSignalDisrupted = targetPlayer.signalDisruptorUntil && targetPlayer.signalDisruptorUntil > nowMs;
      if (isSignalDisrupted) {
        detectedZones.clear();
      }
      for (const zoneId of ZONES_ARRAY) {
        const z = zoneSummary[zoneId];
        if (!z) continue;
        if (isSignalDisrupted && zoneId === playerZone) {
          z.confidence = 0;
        } else if (detectedZones.has(zoneId)) {
          z.confidence = 1;
          z.lastSeenTimestamp = nowMs;
        } else {
          const elapsed = z.lastSeenTimestamp > 0 ? nowMs - z.lastSeenTimestamp : 6e4;
          z.confidence = Math.max(
            0,
            Math.min(1, Math.round((1 - elapsed / 6e4) * 100) / 100)
          );
          for (let i = 0; i < drones.length; i++) {
            if (drones[i].state !== 5 /* DEAD */ && drones[i].type === 2 /* RECON */ && drones[i].zone === zoneId) {
              z.confidence = 1;
            }
          }
        }
      }
    }
    processDroneIntelligence(
      nowMs,
      drones,
      players,
      rapierWorld,
      import_rapier3d_compat6.default,
      0.0166,
      this.context.getCollisionMap()
    );
    processDroneBehaviors(
      drones,
      {
        ...this.context,
        players,
        drones,
        rapierWorld,
        serverTick: this.context.getServerTick(),
        initDronePhysics: (drone) => {
          if (this.context.initDronePhysics) {
            this.context.initDronePhysics(drone);
          }
        },
        spawnServerProjectile: (x, y, z, dirX, dirY, dirZ, isEnemy, damage, sourceId) => {
          if (this.context.spawnServerProjectile) {
            this.context.spawnServerProjectile(
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
        }
      },
      0.0166,
      nowMs
    );
    DynamicCollisionSystem.resolve(players, drones);
    this.context.updateProximityMines();
    for (const p of players.values()) {
      p.firedThisTick = false;
    }
    this.context.recordDroneHistory();
  }
};

// server/match/CombatResolver.ts
var CombatResolver = class {
  constructor(context) {
    this.context = context;
    this.projActive = new Uint8Array(MAX_PROJECTILES);
    this.projPosX = new Float32Array(MAX_PROJECTILES);
    this.projPosY = new Float32Array(MAX_PROJECTILES);
    this.projPosZ = new Float32Array(MAX_PROJECTILES);
    this.projVelX = new Float32Array(MAX_PROJECTILES);
    this.projVelY = new Float32Array(MAX_PROJECTILES);
    this.projVelZ = new Float32Array(MAX_PROJECTILES);
    this.projDamage = new Float32Array(MAX_PROJECTILES);
    this.projDist = new Float32Array(MAX_PROJECTILES);
    this.projEnemy = new Uint8Array(MAX_PROJECTILES);
    this.projSourceId = new Array(MAX_PROJECTILES).fill("");
    this.historicalAABBHistory = new Float32Array(
      HISTORICAL_SAMPLES_MAX2 * HISTORIC_BLOCK_SIZE2
    );
    this.historicalAABBIndex = 0;
    this.activeC4Map = /* @__PURE__ */ new Map();
    this.proximityMines = [];
  }
  spawnServerProjectile(x, y, z, dirX, dirY, dirZ, isEnemy, damage, sourceId) {
    let pIdx = -1;
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (!this.projActive[i]) {
        pIdx = i;
        break;
      }
    }
    if (pIdx !== -1) {
      this.projActive[pIdx] = 1;
      this.projPosX[pIdx] = x;
      this.projPosY[pIdx] = y;
      this.projPosZ[pIdx] = z;
      const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
      this.projVelX[pIdx] = len > 1e-3 ? dirX / len * 35 : 0;
      this.projVelY[pIdx] = len > 1e-3 ? dirY / len * 35 : 0;
      this.projVelZ[pIdx] = len > 1e-3 ? dirZ / len * 35 : 0;
      this.projDamage[pIdx] = damage;
      this.projDist[pIdx] = 0;
      this.projEnemy[pIdx] = isEnemy ? 1 : 0;
      this.projSourceId[pIdx] = sourceId;
      benchmarkCounter("projectiles.spawned");
      const p = this.context.getPlayers().get(sourceId);
      if (p) {
        p.firedThisTick = true;
      }
    }
  }
  updateProjectiles() {
    const players = this.context.getPlayers();
    const drones = this.context.getDrones();
    const cameras = this.context.getCameras();
    const serverTick = this.context.getServerTick();
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (this.projActive[i]) {
        this.projPosX[i] += this.projVelX[i] * 0.1666;
        this.projPosY[i] += this.projVelY[i] * 0.1666;
        this.projPosZ[i] += this.projVelZ[i] * 0.1666;
        this.projDist[i] += Math.sqrt(
          this.projVelX[i] * this.projVelX[i] + this.projVelY[i] * this.projVelY[i] + this.projVelZ[i] * this.projVelZ[i]
        ) * 0.1666;
        if (this.projDist[i] >= 40 || Math.abs(this.projPosX[i]) > 100 || Math.abs(this.projPosZ[i]) > 100 || this.projPosY[i] < 0) {
          this.projActive[i] = 0;
          continue;
        }
        if (this.projEnemy[i]) {
          for (const player of players.values()) {
            if (!player.isAlive) continue;
            if (player.id === this.projSourceId[i]) continue;
            const dx = player.posX - this.projPosX[i];
            const dy = player.posY - this.projPosY[i];
            const dz = player.posZ - this.projPosZ[i];
            if (dx * dx + dy * dy + dz * dz < 2.25) {
              this.applyDamage(
                player.id,
                this.projDamage[i],
                "bullet",
                this.projSourceId[i],
                "drone"
              );
              this.projActive[i] = 0;
              break;
            }
          }
        } else {
          for (let j = 0; j < drones.length; j++) {
            const d = drones[j];
            if (d.state !== 5 /* DEAD */) {
              if (d.id.toString() === this.projSourceId[i]) continue;
              const dx = d.posX - this.projPosX[i];
              const dy = d.posY - this.projPosY[i];
              const dz = d.posZ - this.projPosZ[i];
              if (dx * dx + dy * dy + dz * dz < d.rad * d.rad) {
                d.hp -= this.projDamage[i];
                d.lastDamageTick = serverTick;
                if (!d.damageLog) d.damageLog = [];
                d.damageLog.push({
                  playerId: this.projSourceId[i],
                  timestamp: Date.now()
                });
                this.projActive[i] = 0;
                if (d.hp <= 0) {
                  this.processDroneKillAssists(d, this.projSourceId[i]);
                  const killer = players.get(this.projSourceId[i]);
                  if (killer) {
                    killer.stats.droneEliminations += 1;
                    killer.stats.scoreIndividual += 100;
                  }
                  this.context.despawnDrone(d);
                  this.context.broadcastReliableEvent({
                    type: "drone_killed",
                    id: d.id,
                    zone: d.zone
                  });
                }
                break;
              }
            }
          }
          if (this.projActive[i]) {
            for (let j = 0; j < cameras.length; j++) {
              if (cameras[j].isActive) {
                const dx = cameras[j].posX - this.projPosX[i];
                const dy = cameras[j].posY - this.projPosY[i];
                const dz = cameras[j].posZ - this.projPosZ[i];
                if (dx * dx + dy * dy + dz * dz < 4) {
                  cameras[j].hp -= this.projDamage[i];
                  this.projActive[i] = 0;
                  if (cameras[j].hp <= 0) cameras[j].isActive = false;
                  break;
                }
              }
            }
          }
        }
      }
    }
  }
  recordDroneHistory() {
    const drones = this.context.getDrones();
    const serverTick = this.context.getServerTick();
    const baseIdx = this.historicalAABBIndex * HISTORIC_BLOCK_SIZE2;
    this.historicalAABBHistory[baseIdx] = serverTick;
    let count = 0;
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (d.state !== 5 /* DEAD */) {
        const dBase = baseIdx + 2 + count * 4;
        this.historicalAABBHistory[dBase] = d.id;
        this.historicalAABBHistory[dBase + 1] = d.posX;
        this.historicalAABBHistory[dBase + 2] = d.posY;
        this.historicalAABBHistory[dBase + 3] = d.posZ;
        count++;
      }
    }
    this.historicalAABBHistory[baseIdx + 1] = count;
    this.historicalAABBIndex = (this.historicalAABBIndex + 1) % HISTORICAL_SAMPLES_MAX2;
  }
  executeAABBShotValidation(origin, dir, timestamp) {
    const drones = this.context.getDrones();
    const collisionMap = this.context.getCollisionMap();
    const serverTick = this.context.getServerTick();
    let bestHitDrone = null;
    let minTimeOfImpact = 999999;
    const pingCompensatedTick = Math.max(
      0,
      serverTick - Math.min(12, Math.floor(timestamp / 16.6))
    );
    let recordFoundIdx = -1;
    for (let r = 0; r < HISTORICAL_SAMPLES_MAX2; r++) {
      const baseIdx = r * HISTORIC_BLOCK_SIZE2;
      if (this.historicalAABBHistory[baseIdx] === pingCompensatedTick) {
        recordFoundIdx = baseIdx;
        break;
      }
    }
    if (recordFoundIdx !== -1) {
      const recordedCount = this.historicalAABBHistory[recordFoundIdx + 1];
      for (let i = 0; i < recordedCount; i++) {
        const dBase = recordFoundIdx + 2 + i * 4;
        const dId = this.historicalAABBHistory[dBase];
        const rx = this.historicalAABBHistory[dBase + 1];
        const ry = this.historicalAABBHistory[dBase + 2];
        const rz = this.historicalAABBHistory[dBase + 3];
        const droneRef = drones.find((d) => d.id === dId);
        if (droneRef && droneRef.state !== 5 /* DEAD */) {
          const distToDrone = Math.sqrt(
            (rx - origin.x) * (rx - origin.x) + (ry - origin.y) * (ry - origin.y) + (rz - origin.z) * (rz - origin.z)
          );
          if (distToDrone < minTimeOfImpact) {
            minTimeOfImpact = distToDrone;
            bestHitDrone = droneRef;
          }
        }
      }
    } else {
      for (let i = 0; i < drones.length; i++) {
        const d = drones[i];
        if (d.state !== 5 /* DEAD */) {
          const distToDrone = Math.sqrt(
            (d.posX - origin.x) * (d.posX - origin.x) + (d.posY - origin.y) * (d.posY - origin.y) + (d.posZ - origin.z) * (d.posZ - origin.z)
          );
          if (distToDrone < minTimeOfImpact) {
            minTimeOfImpact = distToDrone;
            bestHitDrone = d;
          }
        }
      }
    }
    if (bestHitDrone) {
      if (collisionMap && collisionMap.rayIntersectsAny(origin, dir, minTimeOfImpact)) {
        return { hit: false, droneId: 0 };
      }
      return { hit: true, droneId: bestHitDrone.id };
    }
    return { hit: false, droneId: 0 };
  }
  applyDamage(playerId, rawDamage, type, entityId, entityType) {
    const p = this.context.getPlayers().get(playerId);
    if (!p || !p.isAlive) return;
    if (p.godMode) {
      p.hp = PLAYER_MAX_HP;
      p.channel.emit("reliable_event", {
        type: "PLAYER_HIT",
        hp: p.hp,
        rawDamage: 0
      });
      return;
    }
    p.hp -= rawDamage;
    p.stats.damageReceived += rawDamage;
    p.lastDamageSource = { type, entityId, entityType };
    if (ACTIVE_GAMEMODE.objectiveResetOnDamage && (p.currentObjectiveProgress || 0) > 0) {
      p.currentObjectiveProgress = 0;
      p.isHoldingObjective = false;
      p.channel.emit("reliable_event", {
        type: "OBJECTIVE_INTERRUPTED"
      });
    }
    p.channel.emit("reliable_event", {
      type: "PLAYER_HIT",
      hp: p.hp,
      rawDamage
    });
    if (p.hp <= 0) {
      p.hp = 0;
      p.isAlive = false;
      p.isDead = true;
      p.respawnTimer = PLAYER_RESPAWN_DELAY_DEFAULT;
      p.deathPosition = { x: p.posX, y: p.posY, z: p.posZ };
      p.stats.deaths++;
      console.log("[DEATH] player died:", playerId, "source:", type);
      p.channel.emit("reliable_event", {
        type: "YOU_DIED",
        respawnTime: PLAYER_RESPAWN_DELAY_DEFAULT
      });
      this.context.broadcastReliableEvent({
        type: "PLAYER_DEATH",
        playerId,
        deathPosition: p.deathPosition,
        killerId: entityId
      });
    }
  }
  applyExplosionDamage(origin, radius, maxDamage, sourceId, sourceType) {
    const players = this.context.getPlayers();
    const drones = this.context.getDrones();
    const serverTick = this.context.getServerTick();
    this.context.broadcastReliableEvent({ type: "EXPLOSION", origin, radius });
    for (const player of players.values()) {
      if (!player.isAlive) continue;
      const dx = player.posX - origin.x;
      const dy = player.posY - origin.y;
      const dz = player.posZ - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < radius) {
        const factor = 1 - dist / radius;
        const splash = Math.floor(maxDamage * factor);
        if (splash > 0) {
          this.applyDamage(player.id, splash, "explosion", sourceId, sourceType);
        }
      }
    }
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (d.state !== 5 /* DEAD */) {
        if (sourceType === "drone" && d.id.toString() === sourceId) {
          continue;
        }
        const dx = d.posX - origin.x;
        const dy = d.posY - origin.y;
        const dz = d.posZ - origin.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < radius) {
          const factor = 1 - dist / radius;
          const splash = Math.floor(maxDamage * factor);
          d.hp -= splash;
          d.lastDamageTick = serverTick;
          if (sourceType === "player") {
            if (!d.damageLog) d.damageLog = [];
            d.damageLog.push({
              playerId: sourceId,
              timestamp: Date.now()
            });
          }
          if (d.hp <= 0) {
            this.processDroneKillAssists(d, sourceId);
            const killer = players.get(sourceId);
            if (killer) {
              killer.stats.droneEliminations += 1;
              killer.stats.scoreIndividual += 100;
            }
            this.context.despawnDrone(d);
            this.context.broadcastReliableEvent({
              type: "drone_killed",
              id: d.id,
              zone: d.zone
            });
          }
        }
      }
    }
  }
  processDroneKillAssists(drone, killerId) {
    if (!drone.damageLog || drone.damageLog.length === 0) return;
    const now = Date.now();
    const assistThresholdMs = 1e4;
    const creditedAssists = /* @__PURE__ */ new Set();
    for (const entry of drone.damageLog) {
      if (entry.playerId && entry.playerId !== killerId && !creditedAssists.has(entry.playerId)) {
        if (now - entry.timestamp <= assistThresholdMs) {
          creditedAssists.add(entry.playerId);
          const assistingPlayer = this.context.getPlayers().get(entry.playerId);
          if (assistingPlayer) {
            assistingPlayer.stats.assists += 1;
            assistingPlayer.stats.scoreIndividual += ACTIVE_GAMEMODE.scoreValues.assistElimination || 50;
          }
        }
      }
    }
  }
  useUtility(playerId, slot) {
    const players = this.context.getPlayers();
    const player = players.get(playerId);
    if (!player || !player.isAlive || !player.utilityState) return;
    const uSlot = player.utilityState[slot];
    if (!uSlot || uSlot.charges <= 0) return;
    const commanderMemory = this.context.getCommanderMemory();
    if (commanderMemory) {
      commanderMemory.onUtilityUsed(playerId, uSlot.id);
    }
    uSlot.charges -= 1;
    if (uSlot.cooldownRemaining <= 0) {
      uSlot.cooldownRemaining = uSlot.baseCooldown;
    }
    player.channel.emit("reliable_event", {
      type: "UTILITY_STATE",
      state: player.utilityState
    });
    this.context.broadcastReliableEvent({
      type: "UTILITY_ACTIVATED",
      playerId: player.id,
      utilityId: uSlot.id,
      slot
    });
    const throwOrigin = { x: player.posX, y: player.posY + 1.6, z: player.posZ };
    const dirX = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const dirY = Math.sin(player.pitch);
    const dirZ = -Math.cos(player.yaw) * Math.cos(player.pitch);
    switch (uSlot.id) {
      case "Grenade": {
        const throwDist = 12;
        const targetPos = {
          x: throwOrigin.x + dirX * throwDist,
          y: Math.max(0, throwOrigin.y + dirY * throwDist),
          z: throwOrigin.z + dirZ * throwDist
        };
        setTimeout(() => {
          this.resolveGrenadeExplosion(player.id, targetPos);
        }, GRENADE_FUSE_TIME * 1e3);
        break;
      }
      case "Flashbang": {
        const throwDist = 10;
        const targetPos = {
          x: throwOrigin.x + dirX * throwDist,
          y: Math.max(0, throwOrigin.y + dirY * throwDist),
          z: throwOrigin.z + dirZ * throwDist
        };
        setTimeout(() => {
          this.resolveFlashbangDetonation(player.id, targetPos);
        }, 1.5 * 1e3);
        break;
      }
      case "Med Kit": {
        let targetPlayer = player;
        let minDist = MEDKIT_TARGET_RADIUS;
        for (const otherPlayer of players.values()) {
          if (otherPlayer.id === player.id || !otherPlayer.isAlive) continue;
          const dx = otherPlayer.posX - player.posX;
          const dy = otherPlayer.posY - player.posY;
          const dz = otherPlayer.posZ - player.posZ;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist <= minDist) {
            minDist = dist;
            targetPlayer = otherPlayer;
          }
        }
        const oldHp = targetPlayer.hp;
        targetPlayer.hp = Math.min(PLAYER_MAX_HP, targetPlayer.hp + MEDKIT_HEAL_AMOUNT);
        const actualHealed = targetPlayer.hp - oldHp;
        targetPlayer.channel.emit("reliable_event", {
          type: "PLAYER_HIT",
          hp: targetPlayer.hp,
          rawDamage: -actualHealed
        });
        this.context.broadcastReliableEvent({
          type: "UTILITY_EFFECT",
          utilityId: "Med Kit",
          playerId: player.id,
          targetId: targetPlayer.id,
          healedAmount: actualHealed,
          newHp: targetPlayer.hp
        });
        break;
      }
      case "Revive Tool": {
        let targetDownedPlayer = null;
        let minDist = REVIVE_TARGET_RADIUS;
        for (const otherPlayer of players.values()) {
          if (otherPlayer.id === player.id || otherPlayer.isAlive) continue;
          const dx = otherPlayer.posX - player.posX;
          const dy = otherPlayer.posY - player.posY;
          const dz = otherPlayer.posZ - player.posZ;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist <= minDist) {
            minDist = dist;
            targetDownedPlayer = otherPlayer;
          }
        }
        if (targetDownedPlayer) {
          targetDownedPlayer.isAlive = true;
          targetDownedPlayer.isDead = false;
          targetDownedPlayer.respawnTimer = 0;
          targetDownedPlayer.hp = REVIVE_HEALTH_RESTORED;
          player.stats.revivesPerformed += 1;
          targetDownedPlayer.channel.emit("reliable_event", {
            type: "PLAYER_REVIVED",
            hp: targetDownedPlayer.hp,
            revivedBy: player.id
          });
          this.context.broadcastReliableEvent({
            type: "UTILITY_EFFECT",
            utilityId: "Revive Tool",
            playerId: player.id,
            targetId: targetDownedPlayer.id,
            restoredHp: targetDownedPlayer.hp
          });
        }
        break;
      }
      case UTILITIES["Radio"].id: {
        uSlot.charges = RADIO_MAX_CHARGES;
        const llm = this.context.getLLMCommander();
        const summary = llm?.lastCycleSummary || "NO TRANSMISSION DETECTED";
        player.channel.emit("radio_intercept", { summary });
        this.context.broadcastReliableEvent({
          type: "UTILITY_EFFECT",
          utilityId: UTILITIES["Radio"].id,
          playerId: player.id
        });
        break;
      }
      case UTILITIES["Signal Jammer"].id: {
        const nowMs = Date.now();
        player.signalDisruptorUntil = nowMs + SIGNAL_JAMMER_DURATION * 1e3;
        let disabledCount = 0;
        const cameras = this.context.getCameras();
        for (let c = 0; c < cameras.length; c++) {
          const cam = cameras[c];
          if (!cam.isActive) continue;
          const dx = cam.posX - throwOrigin.x;
          const dy = cam.posY - throwOrigin.y;
          const dz = cam.posZ - throwOrigin.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist <= SIGNAL_JAMMER_RADIUS) {
            cam.disabledUntil = nowMs + SIGNAL_JAMMER_DURATION * 1e3;
            disabledCount++;
          }
        }
        this.context.broadcastReliableEvent({
          type: "UTILITY_EFFECT",
          utilityId: UTILITIES["Signal Jammer"].id,
          playerId: player.id,
          origin: throwOrigin,
          radius: SIGNAL_JAMMER_RADIUS,
          duration: SIGNAL_JAMMER_DURATION,
          disabledCameras: disabledCount
        });
        break;
      }
      case UTILITIES["Proximity Mine"].id: {
        const mineId = `mine_${player.id}_${Date.now()}`;
        const placePos = {
          x: throwOrigin.x,
          y: throwOrigin.y,
          z: throwOrigin.z
        };
        this.proximityMines.push({
          id: mineId,
          ownerId: player.id,
          x: placePos.x,
          y: placePos.y,
          z: placePos.z,
          triggered: false
        });
        this.context.broadcastReliableEvent({
          type: "UTILITY_EFFECT",
          utilityId: UTILITIES["Proximity Mine"].id,
          action: "place",
          playerId: player.id,
          origin: placePos
        });
        break;
      }
      case "C4": {
        const activeC4 = this.activeC4Map.get(player.id);
        if (activeC4) {
          this.activeC4Map.delete(player.id);
          this.applyExplosionDamage(activeC4, C4_RADIUS, C4_DAMAGE, player.id, "player");
          this.context.broadcastReliableEvent({
            type: "UTILITY_EFFECT",
            utilityId: "C4",
            action: "detonate",
            playerId: player.id,
            origin: activeC4,
            radius: C4_RADIUS,
            damage: C4_DAMAGE
          });
        } else {
          const placePos = {
            x: throwOrigin.x + dirX * 1.5,
            y: throwOrigin.y,
            z: throwOrigin.z + dirZ * 1.5
          };
          this.activeC4Map.set(player.id, placePos);
          this.context.broadcastReliableEvent({
            type: "UTILITY_EFFECT",
            utilityId: "C4",
            action: "place",
            playerId: player.id,
            origin: placePos
          });
        }
        break;
      }
    }
  }
  updateProximityMines() {
    const drones = this.context.getDrones();
    if (this.proximityMines.length === 0) return;
    let writeIdx = 0;
    for (let m = 0; m < this.proximityMines.length; m++) {
      const mine = this.proximityMines[m];
      if (mine.triggered) continue;
      let triggered = false;
      for (let i = 0; i < drones.length; i++) {
        const d = drones[i];
        if (d.state === 5 /* DEAD */) continue;
        const dx = d.posX - mine.x;
        const dy = d.posY - mine.y;
        const dz = d.posZ - mine.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= PROXIMITY_MINE_TRIGGER_RADIUS) {
          triggered = true;
          break;
        }
      }
      if (triggered) {
        mine.triggered = true;
        this.applyExplosionDamage(
          mine,
          PROXIMITY_MINE_RADIUS,
          PROXIMITY_MINE_DAMAGE,
          mine.ownerId,
          "player"
        );
        this.context.broadcastReliableEvent({
          type: "UTILITY_EFFECT",
          utilityId: UTILITIES["Proximity Mine"].id,
          action: "detonate",
          playerId: mine.ownerId,
          origin: mine,
          radius: PROXIMITY_MINE_RADIUS,
          damage: PROXIMITY_MINE_DAMAGE
        });
      } else {
        this.proximityMines[writeIdx] = mine;
        writeIdx++;
      }
    }
    this.proximityMines.length = writeIdx;
  }
  resolveGrenadeExplosion(attackerId, origin) {
    if (this.context.isShutdown()) return;
    this.context.broadcastReliableEvent({
      type: "UTILITY_EFFECT",
      utilityId: "Grenade",
      origin,
      radius: GRENADE_RADIUS
    });
    const drones = this.context.getDrones();
    const players = this.context.getPlayers();
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (d.state === 5 /* DEAD */) continue;
      const dx = d.posX - origin.x;
      const dy = d.posY - origin.y;
      const dz = d.posZ - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= GRENADE_RADIUS) {
        const falloff = 1 - dist / GRENADE_RADIUS * 0.5;
        const dmg = GRENADE_DAMAGE * falloff;
        d.hp -= dmg;
        if (d.hp <= 0) {
          this.processDroneKillAssists(d, attackerId);
          this.context.despawnDrone(d);
          const attacker = players.get(attackerId);
          if (attacker) {
            attacker.score += 100;
            attacker.stats.droneEliminations += 1;
            attacker.stats.scoreIndividual += 100;
          }
        }
      }
    }
    for (const p of players.values()) {
      if (!p.isAlive) continue;
      const dx = p.posX - origin.x;
      const dy = p.posY - origin.y;
      const dz = p.posZ - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= GRENADE_RADIUS) {
        const falloff = 1 - dist / GRENADE_RADIUS * 0.5;
        const dmg = GRENADE_DAMAGE * falloff;
        p.hp -= dmg;
        p.channel.emit("reliable_event", {
          type: "PLAYER_HIT",
          hp: p.hp,
          rawDamage: dmg
        });
        if (p.hp <= 0) {
          p.isAlive = false;
          p.isDead = true;
          p.respawnTimer = 5;
          p.stats.deaths += 1;
          p.channel.emit("reliable_event", {
            type: "YOU_DIED",
            respawnTimer: 5
          });
        }
      }
    }
  }
  resolveFlashbangDetonation(attackerId, origin) {
    if (this.context.isShutdown()) return;
    this.context.broadcastReliableEvent({
      type: "FLASHBANG_DETONATED",
      origin,
      radius: FLASHBANG_RADIUS
    });
    for (const p of this.context.getPlayers().values()) {
      if (!p.isAlive) continue;
      const dx = p.posX - origin.x;
      const dy = p.posY - origin.y;
      const dz = p.posZ - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= FLASHBANG_RADIUS) {
        const intensity = Math.max(0.2, 1 - dist / FLASHBANG_RADIUS * 0.7);
        p.channel.emit("reliable_event", {
          type: "FLASHBANG_HIT",
          duration: FLASHBANG_DURATION,
          intensity
        });
      }
    }
  }
};

// server/match/SwarmLifecycle.ts
var import_rapier3d_compat7 = __toESM(require("@dimforge/rapier3d-compat"), 1);
var SwarmLifecycle = class {
  constructor(context) {
    this.context = context;
    this.drones = [];
    this.cameras = [];
    this.nextDroneId = 1;
    this.spawnIndexMap = {
      AIR_HANGAR: 0,
      GROUND_GARAGE: 0,
      ELEVATOR_SHAFT: 0
    };
    this.initDronePool();
  }
  initDronePool() {
    this.drones = new Array(MAX_DRONES).fill(null).map((_, i) => ({
      id: i + 1,
      type: 4 /* WHEELED */,
      state: 5 /* DEAD */,
      mode: "NORMAL",
      currentVelocityX: 0,
      currentVelocityY: 0,
      currentVelocityZ: 0,
      currentHeadingX: 1,
      currentHeadingZ: 0,
      memoryRecords: createMemoryMap(),
      combatTarget: null,
      bomberState: "SEEKING",
      behavior: "patrol",
      zone: ZONES.CORE,
      posX: 0,
      posY: -999,
      posZ: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      rotW: 1,
      velX: 0,
      velY: 0,
      velZ: 0,
      playerInFOV: false,
      rad: 1,
      hp: 100,
      groupId: "",
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      path: [],
      pathIndex: 0,
      cooldown: 0,
      damageLog: [],
      body: null,
      collider: null,
      kcc: null,
      posture: null,
      humanoidPose: "stand_run",
      peekCooldown: 0,
      lastDamageTick: -9999,
      gearActionId: 0,
      gearActionScore: 0,
      gearLastPosture: "",
      fixedWingPhase: "APPROACH",
      humanoidPhase: "HUNT",
      cachedCoverPos: { x: 0, y: 0, z: 0 },
      coverCacheTick: 0,
      targetLastPos: { x: 0, y: 0, z: 0 },
      targetLastMoveTick: 0,
      suppressToggle: false,
      investigateHoldTick: 0,
      parkedOrder: {
        type: "move",
        targetZone: ZONES.CORE,
        path: [],
        pathIndex: 0,
        active: false
      },
      strafeRunTarget: null,
      avoidanceState: null,
      stuckTicks: 0
    }));
  }
  initCameras() {
    const spec = this.context.getSpecJson();
    if (spec && spec.cameras && spec.cameras.length > 0) {
      this.cameras = spec.cameras.map((c) => ({
        id: c.id,
        posX: c.position.x,
        posY: c.position.y,
        posZ: c.position.z,
        rotY: c.yaw || 0,
        detectionRadius: c.detectionRadius || 25,
        isActive: true,
        hp: c.hp || 50,
        cooldown: 0
      }));
    } else {
      this.cameras = [
        {
          id: 1,
          posX: -20,
          posY: 3,
          posZ: -30,
          rotY: 0,
          detectionRadius: 25,
          isActive: true,
          hp: 50,
          cooldown: 0
        },
        {
          id: 2,
          posX: 0,
          posY: 4,
          posZ: 0,
          rotY: 0,
          detectionRadius: 25,
          isActive: true,
          hp: 50,
          cooldown: 0
        },
        {
          id: 3,
          posX: 25,
          posY: 5,
          posZ: 10,
          rotY: 0,
          detectionRadius: 25,
          isActive: true,
          hp: 50,
          cooldown: 0
        },
        {
          id: 4,
          posX: 0,
          posY: 6,
          posZ: 30,
          rotY: 0,
          detectionRadius: 25,
          isActive: true,
          hp: 50,
          cooldown: 0
        },
        {
          id: 5,
          posX: -25,
          posY: 3,
          posZ: 15,
          rotY: 0,
          detectionRadius: 25,
          isActive: true,
          hp: 50,
          cooldown: 0
        }
      ];
    }
  }
  getNextSpawnPoint(type) {
    const spec = this.context.getSpecJson();
    if (!spec?.droneSpawnPoints) return null;
    const points = spec.droneSpawnPoints.filter((p) => p.type === type);
    if (!points || points.length === 0) return null;
    const idx = (this.spawnIndexMap[type] || 0) % points.length;
    this.spawnIndexMap[type] = idx + 1;
    return points[idx].position;
  }
  initDronePhysics(d) {
    const rapierWorld = this.context.getRapierWorld();
    if (!rapierWorld) return;
    try {
      const config = DRONE_CONFIGS[d.type];
      if (!config) return;
      d.rad = config.collider.halfExtents[0];
      const bodyDesc = import_rapier3d_compat7.default.RigidBodyDesc.kinematicPositionBased().setTranslation(
        d.posX,
        d.posY,
        d.posZ
      );
      d.body = rapierWorld.createRigidBody(bodyDesc);
      let colliderDesc;
      if (config.collider.type === "ball") {
        colliderDesc = import_rapier3d_compat7.default.ColliderDesc.ball(config.collider.halfExtents[0]);
      } else if (config.collider.type === "capsule") {
        colliderDesc = import_rapier3d_compat7.default.ColliderDesc.capsule(
          config.collider.halfExtents[0],
          config.collider.halfExtents[1]
        );
      } else {
        colliderDesc = import_rapier3d_compat7.default.ColliderDesc.cuboid(
          config.collider.halfExtents[0],
          config.collider.halfExtents[1],
          config.collider.halfExtents[2]
        );
      }
      d.collider = rapierWorld.createCollider(colliderDesc, d.body);
      this.context.getColliderToEntityMap().set(d.collider.handle, {
        type: "drone",
        obj: d
      });
      if (config.collider.offset) {
        d.collider.setTranslationWrtParent({
          x: config.collider.offset[0],
          y: config.collider.offset[1],
          z: config.collider.offset[2]
        });
      }
      if (d.type === 5 /* ROBOT_DOG */) {
        recordDroneColliderInit(d.type, {
          id: d.id,
          posX: d.posX,
          posY: d.posY,
          posZ: d.posZ,
          colliderType: config.collider.type,
          halfExtents: config.collider.halfExtents,
          rad: d.rad,
          hasCollider: !!d.collider
        });
      }
      const offset = 0.1;
      d.kcc = rapierWorld.createCharacterController(offset);
      d.kcc.setUp({ x: 0, y: 1, z: 0 });
      d.kcc.setApplyImpulsesToDynamicBodies(true);
      if (d.type === 1 /* BOMBER */ || d.type === 0 /* ROTARY_SHOOTER */) {
        d.currentVelocity = { x: 0, y: 0, z: 0 };
      } else if (d.type === 3 /* FIXED_WING */ || d.type === 2 /* RECON */) {
        d.currentHeading = { x: 1, y: 0, z: 0 };
        d.currentSpeed = 0;
      }
    } catch (e) {
    }
  }
  despawnDrone(d) {
    const oldState = d.state;
    d.state = 5 /* DEAD */;
    const commanderMemory = this.context.getCommanderMemory();
    if (oldState !== 5 /* DEAD */ && commanderMemory) {
      commanderMemory.onDroneDespawned(d);
    }
    if (oldState !== 5 /* DEAD */) {
      this.context.broadcastReliableEvent({
        type: "DRONE_DEATH",
        droneId: d.id,
        posX: d.posX,
        posY: d.posY,
        posZ: d.posZ
      });
    }
    if (d.collider) {
      this.context.getColliderToEntityMap().delete(d.collider.handle);
    }
    if (d.body) {
      try {
        const rapierWorld = this.context.getRapierWorld();
        if (rapierWorld) {
          rapierWorld.removeRigidBody(d.body);
        }
      } catch (e) {
        console.error("[VEXEA SERVER] Error removing drone rigid body:", e);
      }
      d.body = null;
    }
    d.collider = null;
  }
  resetDroneToDefaults(d) {
    d.mode = "NORMAL";
    d.combatTarget = null;
    d.memoryRecords = createMemoryMap();
    d.posture = null;
    d.bomberState = "SEEKING";
    d.bomberLockTime = void 0;
    d.gearActionId = 0;
    d.gearActionScore = 0;
    d.gearLastPosture = "";
    d.playerInFOV = false;
    d.targetX = 0;
    d.targetY = 0;
    d.targetZ = 0;
    d.path = [];
    d.pathIndex = 0;
    d.cooldown = 0;
    d.damageLog = [];
    d.lastDamageTick = -9999;
    d.fixedWingPhase = "APPROACH";
    d.humanoidPhase = "HUNT";
    d.humanoidPose = "stand_run";
    d.cachedCoverPos = { x: 0, y: 0, z: 0 };
    d.coverCacheTick = 0;
    d.targetLastPos = { x: 0, y: 0, z: 0 };
    d.targetLastMoveTick = 0;
    d.suppressToggle = false;
    d.investigateHoldTick = 0;
    d.flankStartTick = void 0;
    d.peekCooldown = 0;
    d.parkedOrder = {
      type: "move",
      targetZone: ZONES.CORE,
      path: [],
      pathIndex: 0,
      active: false
    };
    d.strafeRunTarget = null;
    d.avoidanceState = null;
    d.stuckTicks = 0;
    d.currentVelocityX = 0;
    d.currentVelocityY = 0;
    d.currentVelocityZ = 0;
    d.currentHeadingX = 1;
    d.currentHeadingZ = 0;
    d.velX = 0;
    d.velY = 0;
    d.velZ = 0;
    d.rotX = 0;
    d.rotY = 0;
    d.rotZ = 0;
    d.rotW = 1;
    d.currentVelocity = void 0;
    d.currentHeading = void 0;
    d.currentSpeed = 0;
    d.history = [];
    d.cachedObstacleDetected = false;
    d.cachedForwardHitDistance = 0;
    d.isFrozen = false;
  }
  registerDeveloperSpawner(type, pos) {
    let spawned = false;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state === 5 /* DEAD */) {
        this.resetDroneToDefaults(d);
        d.id = this.nextDroneId++;
        d.type = type;
        d.state = 0 /* IDLE */;
        d.zone = ZONES.COURTYARD;
        const isAir = d.type === 0 /* ROTARY_SHOOTER */ || d.type === 1 /* BOMBER */ || d.type === 2 /* RECON */ || d.type === 3 /* FIXED_WING */;
        if (pos) {
          d.posX = pos.x;
          d.posY = pos.y;
          d.posZ = pos.z;
        } else {
          const spawnType = isAir ? "AIR_HANGAR" : "GROUND_GARAGE";
          let spawnPos = this.context.getMapId() === "map_1_facility" ? this.getNextSpawnPoint(spawnType) : null;
          if (spawnPos) {
            d.posX = spawnPos.x;
            d.posY = spawnPos.y;
            d.posZ = spawnPos.z;
          } else {
            const b = ZONE_BOUNDS[ZONES.COURTYARD];
            d.posX = b.center.x + (Math.random() - 0.5) * b.halfSize.x * 0.4;
            d.posY = isAir ? b.center.y + 4 : b.center.y + PLAYER_CENTER_OFFSET;
            d.posZ = b.center.z + (Math.random() - 0.5) * b.halfSize.z * 0.4;
          }
        }
        d.hp = DRONE_CONFIGS[d.type]?.hp ?? 100;
        d.groupId = "G_DEV";
        d.cooldown = 40;
        this.initDronePhysics(d);
        benchmarkCounter("drones.spawned");
        spawned = true;
        this.context.broadcastReliableEvent({
          type: "group_spawned",
          zone: ZONES.COURTYARD,
          count: 1,
          groupId: d.groupId
        });
        break;
      }
    }
    return spawned;
  }
};

// server/match/PlayerSessionManager.ts
var import_rapier3d_compat8 = __toESM(require("@dimforge/rapier3d-compat"), 1);
var PlayerSessionManager = class {
  constructor(context) {
    this.context = context;
    this.players = /* @__PURE__ */ new Map();
    this.abandonedPlayerIds = /* @__PURE__ */ new Set();
  }
  applyPlayerClassLoadout(pStateOrId, classId, requestedPrimaryWeaponId, requestedSecondaryWeaponId) {
    const pState = typeof pStateOrId === "string" ? this.players.get(pStateOrId) : pStateOrId;
    if (!pState) return;
    const classDef = CLASSES[classId] || CLASSES.ASSAULT;
    const primaryWeaponId = requestedPrimaryWeaponId && isRuntimeWeaponId(requestedPrimaryWeaponId) && isClassWeaponAllowed(classDef.id, "primary", requestedPrimaryWeaponId) ? requestedPrimaryWeaponId : classDef.primaryWeapon;
    const secondaryWeaponId = requestedSecondaryWeaponId && isRuntimeWeaponId(requestedSecondaryWeaponId) && isClassWeaponAllowed(classDef.id, "secondary", requestedSecondaryWeaponId) ? requestedSecondaryWeaponId : classDef.secondaryWeapon;
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
      secondaryWeaponId
    });
    pState.channel.emit("reliable_event", {
      type: "UTILITY_STATE",
      state: pState.utilityState
    });
    console.log(
      `[MATCH] Applied class ${classDef.id} loadout to player ${pState.id}: Primary=${primaryWeaponId}, Secondary=${secondaryWeaponId}, Utility1=${classDef.utility1}, Utility2=${classDef.utility2}`
    );
  }
  registerPlayer(playerId, channel, stats, playerClass, displayName, reqUid, requestedPrimaryWeaponId, requestedSecondaryWeaponId) {
    const mapId = this.context.getMapId();
    console.log(
      `[SERVER registerPlayer] playerId: "${playerId}", displayName: "${displayName || playerId}", mapId: "${mapId}", class: "${playerClass || "ASSAULT"}"`
    );
    if (this.players.has(playerId)) {
      const existing = this.players.get(playerId);
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
        mapId,
        posX: existing.posX,
        posY: existing.posY,
        posZ: existing.posZ,
        hp: existing.hp,
        weapon: existing.weapon,
        classId: existing.classId,
        primaryWeaponId: existing.weaponState.primary.weaponId,
        secondaryWeaponId: existing.weaponState.secondary.weaponId,
        stats: existing.stats
      });
      return existing;
    }
    const specJson = this.context.getSpecJson();
    const spawnX = specJson?.playerSpawn?.position?.x ?? (Math.random() - 0.5) * 40;
    const spawnY = (specJson?.playerSpawn?.position?.y ?? 0) + 5;
    const spawnZ = specJson?.playerSpawn?.position?.z ?? 120 + (Math.random() - 0.5) * 10;
    const chosenClassId = playerClass && CLASSES[playerClass] ? playerClass : "ASSAULT";
    const classDef = CLASSES[chosenClassId];
    const primaryWeaponId = requestedPrimaryWeaponId && isRuntimeWeaponId(requestedPrimaryWeaponId) && isClassWeaponAllowed(chosenClassId, "primary", requestedPrimaryWeaponId) ? requestedPrimaryWeaponId : classDef.primaryWeapon;
    const secondaryWeaponId = requestedSecondaryWeaponId && isRuntimeWeaponId(requestedSecondaryWeaponId) && isClassWeaponAllowed(chosenClassId, "secondary", requestedSecondaryWeaponId) ? requestedSecondaryWeaponId : classDef.secondaryWeapon;
    const primaryPerformance = getResolvedWeaponPerformance(primaryWeaponId);
    const secondaryPerformance = getResolvedWeaponPerformance(secondaryWeaponId);
    const pState = {
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
          leakyBucket: 0
        },
        secondary: {
          weaponId: secondaryWeaponId,
          currentMag: secondaryPerformance.capacity,
          reserve: getWeaponReserveCapacity(secondaryWeaponId),
          isReloading: false,
          reloadTimer: 0,
          fireMode: "auto",
          lastConfirmedShotT: 0,
          leakyBucket: 0
        }
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
        scoreIndividual: 0
      },
      lastFallStartY: 1.2,
      utilityState: createInitialUtilityState(
        chosenClassId,
        ACTIVE_GAMEMODE.utilityCooldownMultiplier
      )
    };
    if (stats) {
      Object.assign(pState.stats, stats);
    }
    const rapierWorld = this.context.getRapierWorld();
    if (rapierWorld) {
      const bodyDesc = import_rapier3d_compat8.default.RigidBodyDesc.kinematicPositionBased().setTranslation(
        pState.posX,
        pState.posY,
        pState.posZ
      );
      pState.body = rapierWorld.createRigidBody(bodyDesc);
      const colliderDesc = import_rapier3d_compat8.default.ColliderDesc.capsule(0.5, 0.4);
      pState.collider = rapierWorld.createCollider(colliderDesc, pState.body);
      this.context.getColliderToEntityMap().set(pState.collider.handle, {
        type: "player",
        obj: pState
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
      secondaryWeaponId: pState.weaponState.secondary.weaponId
    });
    channel.emit("reliable_event", {
      type: "WEAPON_LOADOUT",
      classId: pState.classId,
      primaryWeaponId: pState.weaponState.primary.weaponId,
      secondaryWeaponId: pState.weaponState.secondary.weaponId
    });
    channel.emit("reliable_event", {
      type: "UTILITY_STATE",
      state: pState.utilityState
    });
    return pState;
  }
  registerBotPlayer() {
    const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
    const dummyChannel = {
      emit: () => {
      },
      rawEmit: () => {
      },
      raw: { emit: () => {
      } }
    };
    const pState = this.registerPlayer(
      botId,
      dummyChannel,
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
  spawnTestBots(count) {
    for (let i = 0; i < count; i++) {
      this.registerBotPlayer();
    }
  }
  handlePlayerDisconnect(playerId) {
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
    }, 75e3);
  }
  handlePlayerReconnect(playerId, newChannel) {
    const p = this.players.get(playerId);
    if (p) {
      if (p.disconnectTimer) {
        clearTimeout(p.disconnectTimer);
        p.disconnectTimer = void 0;
        console.log(
          `[MATCH] Player ${playerId} reconnected during 75s grace period.`
        );
      }
      p.channel = newChannel;
      p.lastInputChangeTime = Date.now();
      p.afkWarningIssued = false;
    }
  }
  async handlePlayerAbandonment(playerId) {
    const p = this.players.get(playerId);
    if (!p) {
      this.abandonedPlayerIds.add(playerId);
      return;
    }
    if (p.disconnectTimer) {
      clearTimeout(p.disconnectTimer);
      p.disconnectTimer = void 0;
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
  removePlayer(playerId) {
    const p = this.players.get(playerId);
    if (p) {
      if (p.disconnectTimer) {
        clearTimeout(p.disconnectTimer);
        p.disconnectTimer = void 0;
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
  updatePlayerInput(p, inputMask, pitch, yaw) {
    const inputChanged = p.inputMask !== inputMask || Math.abs(p.pitch - pitch) > 1e-4 || Math.abs(p.yaw - yaw) > 1e-4;
    p.inputMask = inputMask;
    p.pitch = pitch;
    p.yaw = yaw;
    if (inputChanged) {
      if (p.afkWarningIssued) {
        p.afkWarningIssued = false;
        try {
          p.channel.emit("reliable_event", { type: "afk_cleared" });
        } catch (e) {
        }
      }
      p.lastInputChangeTime = Date.now();
    }
  }
  recordPlayerActivity(p) {
    if (p.afkWarningIssued) {
      p.afkWarningIssued = false;
      try {
        p.channel.emit("reliable_event", { type: "afk_cleared" });
      } catch (e) {
      }
    }
    p.lastInputChangeTime = Date.now();
  }
  checkPlayerAFK() {
    if (!this.context.isMatchActive() || this.context.isShutdown()) return;
    const now = Date.now();
    for (const player of this.players.values()) {
      if (player.isBot) continue;
      const idleMs = now - (player.lastInputChangeTime || now);
      if (idleMs >= 12e4) {
        console.log(
          `[AFK] Kicking player ${player.id} due to ${Math.round(
            idleMs / 1e3
          )}s inactivity`
        );
        try {
          player.channel.emit("reliable_event", {
            type: "KICKED_AFK",
            reason: "Kicked for inactivity (AFK)"
          });
        } catch (e) {
        }
        this.removePlayer(player.id);
      } else if (idleMs >= 6e4 && !player.afkWarningIssued) {
        player.afkWarningIssued = true;
        console.log(
          `[AFK] Issuing AFK warning to player ${player.id} (${Math.round(
            idleMs / 1e3
          )}s idle)`
        );
        try {
          player.channel.emit("reliable_event", {
            type: "afk_warning",
            remainingSec: Math.ceil((12e4 - idleMs) / 1e3)
          });
        } catch (e) {
        }
      }
    }
  }
  setPlayerReady(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.isReady = true;
    console.log(`[VEXEA SERVER] Received player_ready for player: ${playerId}`);
    if (!this.context.isMatchActive()) {
      console.log(`[VEXEA SERVER] Player ready. Starting match loop`);
      this.context.triggerStartMatch();
    }
  }
};

// server/match/NetworkBroadcaster.ts
var NetworkBroadcaster = class {
  constructor() {
    this.preallocatedBuffer = new ArrayBuffer(TOTAL_STATE_BUFFER_SIZE);
    this.payloadWriter = new DataView(this.preallocatedBuffer);
    this.playerSyncBuffer = new ArrayBuffer(20);
    this.playerSyncView = new DataView(this.playerSyncBuffer);
  }
  broadcastReliableEvent(players, evt) {
    const json = JSON.stringify(evt);
    if (benchmarkInstrumentationEnabled()) {
      benchmarkCounter("network.reliable.events", players.size);
      benchmarkCounter("network.reliable.bytes", Buffer.byteLength(json) * players.size);
    }
    for (const p of players.values()) {
      try {
        p.channel.emit("reliable_event", JSON.parse(json));
      } catch (e) {
      }
    }
  }
  packWorldNetworkData(drones, cameras, serverTick) {
    this.payloadWriter.setUint32(0, serverTick, true);
    let activeCount = 0;
    for (let i = 0; i < drones.length; i++) {
      if (drones[i].state !== 5 /* DEAD */) {
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
      if (d.state !== 5 /* DEAD */) {
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
        if (byteOffset >= TOTAL_STATE_BUFFER_SIZE) {
          break;
        }
      }
    }
    for (let i = 0; i < cameras.length; i++) {
      const c = cameras[i];
      if (c.isActive) {
        if (byteOffset + CAMERA_STRUCT_SIZE > TOTAL_STATE_BUFFER_SIZE) break;
        this.payloadWriter.setUint16(byteOffset, c.id, true);
        this.payloadWriter.setUint8(byteOffset + 2, 1);
        this.payloadWriter.setUint8(byteOffset + 3, 0);
        byteOffset += CAMERA_STRUCT_SIZE;
      }
    }
    return this.preallocatedBuffer;
  }
  broadcastSync(players, drones, cameras, projActive, projPosX, projPosY, projPosZ, projEnemy, serverTick, zoneSummary, cubeSyncData, devDrones) {
    if (players.size === 0) return;
    const packedData = this.packWorldNetworkData(drones, cameras, serverTick);
    const activeProj = [];
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (projActive[i]) {
        activeProj.push({
          x: projPosX[i],
          y: projPosY[i],
          z: projPosZ[i],
          enemy: projEnemy[i] === 1
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
      isReloading: p.weaponState.primary.isReloading || p.weaponState.secondary.isReloading,
      isAlive: p.isAlive,
      activeCollisions: p.activeCollisions || []
    }));
    if (benchmarkInstrumentationEnabled()) {
      const stateBytes = Buffer.byteLength(JSON.stringify({
        type: "state_sync",
        tick: serverTick,
        projectiles: activeProj,
        players: detailedPlayers,
        serverCube: cubeSyncData,
        devDrones,
        liveZoneSummary: zoneSummary
      }));
      benchmarkCounter("network.raw.messages", players.size * 2);
      benchmarkCounter(
        "network.raw.bytes",
        (packedData.byteLength + this.playerSyncBuffer.byteLength) * players.size
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
          devDrones,
          liveZoneSummary: zoneSummary
        });
      } catch (e) {
      }
    }
  }
  async processMatchEndTransaction(playerId, playerStats, result, adMultiplier, players, abandonedPlayerIds) {
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
      adMultiplier
    };
    try {
      const port = process.env.PORT || 3e3;
      const response = await fetch(
        `http://127.0.0.1:${port}/api/economy/match-rewards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
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
};

// server/MatchRoom.ts
var MatchRoom = class {
  constructor(roomId, geminiKey, mapId = "map_1_facility") {
    this.serverTick = 0;
    this.matchActive = false;
    this.matchStartTime = 0;
    this.apiCallCount = 0;
    this.llmTokensUsedThisMatch = 0;
    this.commanderAP = ACTIVE_GAMEMODE.llmApStartPool;
    this.fixedWingDeploymentsThisMatch = 0;
    this.groupTacticalState = new GroupTacticalState();
    this.outstandingOrders = /* @__PURE__ */ new Map();
    this.failedOperations = [];
    this.networkBroadcaster = new NetworkBroadcaster();
    this.colliderToEntityMap = /* @__PURE__ */ new Map();
    this.zoneRegistry = null;
    this.outOfBoundsEnforcer = new OutOfBoundsEnforcer();
    this.collisionMap = null;
    this.specJson = null;
    // AI
    this.llmCommander = null;
    this.aiCommanderActive = false;
    this.llmCommanderDisabled = false;
    this.lastLLMToolCall = null;
    this.isShutdown = false;
    // Loop Handles
    this.physicsInterval = null;
    this.syncInterval = null;
    this.aiInterval = null;
    this.afkInterval = null;
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
      mapSpecLoaded: Boolean(this.specJson)
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
  // Direct Subsystem Aliases for backwards-compatibility
  get players() {
    return this.sessionManager.players;
  }
  get drones() {
    return this.swarmLifecycle.drones;
  }
  get cameras() {
    return this.swarmLifecycle.cameras;
  }
  get nextDroneId() {
    return this.swarmLifecycle.nextDroneId;
  }
  set nextDroneId(val) {
    this.swarmLifecycle.nextDroneId = val;
  }
  // Combat Resolver Pool Aliases
  get projActive() {
    return this.combatResolver.projActive;
  }
  get projPosX() {
    return this.combatResolver.projPosX;
  }
  get projPosY() {
    return this.combatResolver.projPosY;
  }
  get projPosZ() {
    return this.combatResolver.projPosZ;
  }
  get projVelX() {
    return this.combatResolver.projVelX;
  }
  get projVelY() {
    return this.combatResolver.projVelY;
  }
  get projVelZ() {
    return this.combatResolver.projVelZ;
  }
  get projDamage() {
    return this.combatResolver.projDamage;
  }
  get projDist() {
    return this.combatResolver.projDist;
  }
  get projEnemy() {
    return this.combatResolver.projEnemy;
  }
  get projSourceId() {
    return this.combatResolver.projSourceId;
  }
  get historicalAABBHistory() {
    return this.combatResolver.historicalAABBHistory;
  }
  get historicalAABBIndex() {
    return this.combatResolver.historicalAABBIndex;
  }
  set historicalAABBIndex(val) {
    this.combatResolver.historicalAABBIndex = val;
  }
  get activeC4Map() {
    return this.combatResolver.activeC4Map;
  }
  get proximityMines() {
    return this.combatResolver.proximityMines;
  }
  // Debug Cube Properties
  get devCubeBody() {
    return this.simulationEngine.devCubeBody;
  }
  set devCubeBody(body) {
    this.simulationEngine.devCubeBody = body;
  }
  get devCubeCollider() {
    return this.simulationEngine.devCubeCollider;
  }
  set devCubeCollider(collider) {
    this.simulationEngine.devCubeCollider = collider;
  }
  get devCubeEvents() {
    return this.simulationEngine.devCubeEvents;
  }
  set devCubeEvents(evts) {
    this.simulationEngine.devCubeEvents = evts;
  }
  get devCubePrevState() {
    return this.simulationEngine.devCubePrevState;
  }
  set devCubePrevState(state) {
    this.simulationEngine.devCubePrevState = state;
  }
  get devCubeSpawned() {
    return this.simulationEngine.devCubeSpawned;
  }
  set devCubeSpawned(spawned) {
    this.simulationEngine.devCubeSpawned = spawned;
  }
  get devPhysicsGravityY() {
    return this.simulationEngine.devPhysicsGravityY;
  }
  set devPhysicsGravityY(val) {
    this.simulationEngine.devPhysicsGravityY = val;
  }
  get devPhysicsSpeedMultiplier() {
    return this.simulationEngine.devPhysicsSpeedMultiplier;
  }
  set devPhysicsSpeedMultiplier(val) {
    this.simulationEngine.devPhysicsSpeedMultiplier = val;
  }
  get devPhysicsPaused() {
    return this.simulationEngine.devPhysicsPaused;
  }
  set devPhysicsPaused(val) {
    this.simulationEngine.devPhysicsPaused = val;
  }
  get devPhysicsStepOnceRequested() {
    return this.simulationEngine.devPhysicsStepOnceRequested;
  }
  set devPhysicsStepOnceRequested(val) {
    this.simulationEngine.devPhysicsStepOnceRequested = val;
  }
  initSubsystems() {
    this.swarmLifecycle = new SwarmLifecycle({
      getRapierWorld: () => this.rapierWorld,
      getColliderToEntityMap: () => this.colliderToEntityMap,
      getMapId: () => this.mapId,
      getSpecJson: () => this.specJson,
      getCommanderMemory: () => this.commanderMemory,
      broadcastReliableEvent: (evt) => this.broadcastReliableEvent(evt)
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
      shutdown: () => this.shutdown()
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
      getLLMCommander: () => this.llmCommander
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
      applyDamage: (playerId, rawDamage, type, entityId, entityType) => this.combatResolver.applyDamage(
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
      processDroneKillAssists: (d, killerId) => this.combatResolver.processDroneKillAssists(d, killerId),
      spawnServerProjectile: (x, y, z, dirX, dirY, dirZ, isEnemy, damage, sourceId) => this.combatResolver.spawnServerProjectile(x, y, z, dirX, dirY, dirZ, isEnemy, damage, sourceId),
      initDronePhysics: (d) => this.initDronePhysics(d)
    });
  }
  initMapConfig() {
    if (this.mapId === "benchmark_synthetic") {
      this.specJson = {
        id: "benchmark_synthetic",
        version: "1",
        playerSpawn: { position: { x: 0, y: 0, z: 120 } },
        buildings: []
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
    const specPath = mapDef?.specFile || "specs/map_1_facility.json";
    try {
      if (fs2.existsSync(path3.resolve(specPath))) {
        const specRaw = fs2.readFileSync(path3.resolve(specPath), "utf-8");
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
  initEntities() {
    this.swarmLifecycle.initCameras();
    this.zoneSummary = {
      [ZONES.SPAWN]: {
        id: ZONES.SPAWN,
        name: "SPAWN",
        bounds: { minX: 0, maxX: 128, minZ: 640, maxZ: 768 },
        connectedZones: [ZONES.COURTYARD],
        droneGroups: [],
        confidence: 1,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: false,
        allowsAirUnits: false
      },
      [ZONES.COURTYARD]: {
        id: ZONES.COURTYARD,
        name: "COURTYARD",
        bounds: { minX: 0, maxX: 288, minZ: 352, maxZ: 640 },
        connectedZones: [ZONES.SPAWN, ZONES.WAREHOUSE, ZONES.BRIDGE],
        droneGroups: [],
        confidence: 1,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: true
      },
      [ZONES.WAREHOUSE]: {
        id: ZONES.WAREHOUSE,
        name: "WAREHOUSE",
        bounds: { minX: 0, maxX: 288, minZ: 128, maxZ: 352 },
        connectedZones: [ZONES.COURTYARD, ZONES.TUNNELS],
        droneGroups: [],
        confidence: 1,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: false
      },
      [ZONES.BRIDGE]: {
        id: ZONES.BRIDGE,
        name: "BRIDGE",
        bounds: { minX: 248, maxX: 328, minZ: 456, maxZ: 536 },
        connectedZones: [ZONES.COURTYARD, ZONES.PLANT, ZONES.CORE],
        droneGroups: [],
        confidence: 1,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: true
      },
      [ZONES.PLANT]: {
        id: ZONES.PLANT,
        name: "PLANT",
        bounds: { minX: 288, maxX: 768, minZ: 128, maxZ: 768 },
        connectedZones: [ZONES.BRIDGE, ZONES.CORE, ZONES.TUNNELS],
        droneGroups: [],
        confidence: 1,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: true
      },
      [ZONES.TUNNELS]: {
        id: ZONES.TUNNELS,
        name: "TUNNELS",
        bounds: { minX: 128, maxX: 768, minZ: 0, maxZ: 128 },
        connectedZones: [ZONES.WAREHOUSE, ZONES.PLANT, ZONES.CORE],
        droneGroups: [],
        confidence: 1,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: false
      },
      [ZONES.CORE]: {
        id: ZONES.CORE,
        name: "CORE",
        bounds: { minX: 320, maxX: 448, minZ: 320, maxZ: 448 },
        connectedZones: [ZONES.BRIDGE, ZONES.PLANT, ZONES.TUNNELS],
        droneGroups: [],
        confidence: 1,
        lastSeenTimestamp: 0,
        activeOperations: [],
        combatEffectiveness: "full",
        droneSpawnEnabled: true,
        allowsAirUnits: true
      }
    };
  }
  // --- Session Delegation ---
  registerPlayer(playerId, channel, stats, playerClass, displayName, reqUid, requestedPrimaryWeaponId, requestedSecondaryWeaponId) {
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
  registerBotPlayer() {
    return this.sessionManager.registerBotPlayer();
  }
  spawnTestBots(count) {
    this.sessionManager.spawnTestBots(count);
  }
  applyPlayerClassLoadout(pStateOrId, classId, requestedPrimaryWeaponId, requestedSecondaryWeaponId) {
    this.sessionManager.applyPlayerClassLoadout(
      pStateOrId,
      classId,
      requestedPrimaryWeaponId,
      requestedSecondaryWeaponId
    );
  }
  handlePlayerDisconnect(playerId) {
    this.sessionManager.handlePlayerDisconnect(playerId);
  }
  handlePlayerReconnect(playerId, newChannel) {
    this.sessionManager.handlePlayerReconnect(playerId, newChannel);
  }
  async handlePlayerAbandonment(playerId) {
    await this.sessionManager.handlePlayerAbandonment(playerId);
  }
  removePlayer(playerId) {
    this.sessionManager.removePlayer(playerId);
  }
  updatePlayerInput(p, inputMask, pitch, yaw) {
    this.sessionManager.updatePlayerInput(p, inputMask, pitch, yaw);
  }
  recordPlayerActivity(p) {
    this.sessionManager.recordPlayerActivity(p);
  }
  setPlayerReady(playerId) {
    this.sessionManager.setPlayerReady(playerId);
  }
  setObjectiveHold(playerId, holding) {
    const player = this.sessionManager.players.get(playerId);
    if (player && player.isAlive) {
      player.isHoldingObjective = holding;
      if (!holding && ACTIVE_GAMEMODE.objectiveResetOnExit) {
        player.currentObjectiveProgress = 0;
      }
    }
  }
  // --- Combat & Utility Delegation ---
  spawnServerProjectile(x, y, z, dirX, dirY, dirZ, isEnemy, damage, sourceId) {
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
  executeAABBShotValidation(origin, dir, timestamp) {
    return this.combatResolver.executeAABBShotValidation(
      origin,
      dir,
      timestamp
    );
  }
  applyDamage(playerId, rawDamage, type, entityId, entityType) {
    this.combatResolver.applyDamage(
      playerId,
      rawDamage,
      type,
      entityId,
      entityType
    );
  }
  applyExplosionDamage(origin, radius, maxDamage, sourceId, sourceType) {
    this.combatResolver.applyExplosionDamage(
      origin,
      radius,
      maxDamage,
      sourceId,
      sourceType
    );
  }
  useUtility(playerId, slot) {
    this.combatResolver.useUtility(playerId, slot);
  }
  resolveGrenadeExplosion(attackerId, origin) {
    this.combatResolver.resolveGrenadeExplosion(attackerId, origin);
  }
  resolveFlashbangDetonation(attackerId, origin) {
    this.combatResolver.resolveFlashbangDetonation(attackerId, origin);
  }
  processDroneKillAssists(drone, killerId) {
    this.combatResolver.processDroneKillAssists(drone, killerId);
  }
  // --- Swarm Delegation ---
  initDronePhysics(d) {
    this.swarmLifecycle.initDronePhysics(d);
  }
  despawnDrone(d) {
    this.swarmLifecycle.despawnDrone(d);
  }
  resetDroneToDefaults(d) {
    this.swarmLifecycle.resetDroneToDefaults(d);
  }
  registerDeveloperSpawner(type, pos) {
    return this.swarmLifecycle.registerDeveloperSpawner(type, pos);
  }
  getNextSpawnPoint(spawnType) {
    return this.swarmLifecycle.getNextSpawnPoint(spawnType);
  }
  findHitEntity(colliderHandle) {
    return this.colliderToEntityMap.get(colliderHandle) || null;
  }
  // --- Physics Dev Tools ---
  devSpawnCube(playerId, customPos) {
    this.simulationEngine.devSpawnCube(playerId, customPos);
  }
  devClearCube() {
    this.simulationEngine.devClearCube();
  }
  setDevPhysicsGravityY(gY) {
    this.simulationEngine.setDevPhysicsGravityY(gY);
  }
  setDevPhysicsSpeedMultiplier(sM) {
    this.simulationEngine.setDevPhysicsSpeedMultiplier(sM);
  }
  setDevPhysicsPaused(p) {
    this.simulationEngine.setDevPhysicsPaused(p);
  }
  setDevPhysicsStepOnce() {
    this.simulationEngine.setDevPhysicsStepOnce();
  }
  // --- AI Fallback ---
  offlineSystemFallbackAI() {
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state !== 5 /* DEAD */ && d.state === 0 /* IDLE */) {
        d.state = 1 /* PATROLLING */;
      }
    }
  }
  // --- Broadcasting ---
  broadcastReliableEvent(evt) {
    this.networkBroadcaster.broadcastReliableEvent(
      this.sessionManager.players,
      evt
    );
  }
  // --- Match Flow & Loop Management ---
  async triggerStartMatch() {
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
  startSimulationLoops() {
    const PHYSICS_TICK_RATE = 60n;
    const PHYSICS_TIMESTEP = 1000000000n / PHYSICS_TICK_RATE;
    let lastPhysicsTime = process.hrtime.bigint();
    let physicsAccumulator = 0n;
    const schedulerInterval = 5000000n;
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
      benchmarkGauge("entities.drones", this.swarmLifecycle.drones.filter((drone) => drone.state !== 5 /* DEAD */).length);
      benchmarkGauge("entities.projectiles", this.combatResolver.projActive.reduce((sum, active) => sum + active, 0));
    }, 5);
    this.aiInterval = setInterval(() => {
      if (!this.matchActive) return;
      if (this.llmCommanderDisabled) return;
      if (this.aiCommanderActive && this.llmCommander && Date.now() > this.llmCommander.geminiThrottleCooldownUntil) {
        this.llmCommander.executeLLMStep();
      }
    }, 8e3);
    this.syncInterval = setInterval(() => {
      if (this.sessionManager.players.size === 0) return;
      if (!this.matchActive) return;
      let cubeSyncData = void 0;
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
          events: [...this.simulationEngine.devCubeEvents]
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
    }, 50);
    this.afkInterval = setInterval(() => {
      this.sessionManager.checkPlayerAFK();
    }, 1e3);
  }
  handleMatchEnd(result) {
    this.matchActive = false;
    this.serverTick = 0;
    for (let i = 0; i < this.swarmLifecycle.drones.length; i++) {
      this.swarmLifecycle.drones[i].state = 5 /* DEAD */;
    }
    for (let i = 0; i < this.combatResolver.projActive.length; i++) {
      this.combatResolver.projActive[i] = 0;
    }
    const allStats = {};
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
      message: result === "win" ? "SYSTEM TERMINATED" : "CONTRACT FAILED"
    });
  }
  shutdown() {
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
        } catch (e) {
        }
      }
      try {
        p.channel.emit("reliable_event", {
          type: "MATCH_TERMINATED",
          reason: "server_shutdown"
        });
      } catch (e) {
      }
    }
    this.sessionManager.players.clear();
    this.colliderToEntityMap.clear();
    for (let i = 0; i < this.swarmLifecycle.drones.length; i++) {
      const d = this.swarmLifecycle.drones[i];
      if (d.body) {
        try {
          this.rapierWorld.removeRigidBody(d.body);
        } catch (e) {
        }
        d.body = null;
      }
      d.collider = null;
      d.state = 5 /* DEAD */;
    }
    if (this.rapierWorld) {
      try {
        this.rapierWorld.free();
        this.rapierWorld = null;
      } catch (e) {
        console.error("[VEXEA SERVER] Error freeing rapierWorld:", e);
      }
    }
    if (this.onShutdown) {
      this.onShutdown(this.roomId);
    }
  }
};

// server/execution/room-worker.ts
var currentRoom = null;
var channels = /* @__PURE__ */ new Map();
var ChildChannelAdapter = class {
  constructor(id) {
    this.connected = true;
    this.disconnectListeners = [];
    this.eventListeners = /* @__PURE__ */ new Map();
    this.rawListeners = [];
    this.id = id;
  }
  onDisconnect(callback) {
    this.disconnectListeners.push(callback);
  }
  on(event, callback) {
    const list = this.eventListeners.get(event) || [];
    list.push(callback);
    this.eventListeners.set(event, list);
  }
  onRaw(callback) {
    this.rawListeners.push(callback);
  }
  emit(event, data, options) {
    if (process.send) {
      process.send({
        type: "emit_channel",
        playerId: this.id,
        eventName: event,
        data,
        options
      });
    }
  }
  rawEmit(buffer) {
    if (process.send) {
      process.send({
        type: "raw_emit_channel",
        playerId: this.id,
        buffer: Buffer.from(buffer)
      });
    }
  }
  removeAllListeners() {
    this.disconnectListeners = [];
    this.eventListeners.clear();
    this.rawListeners = [];
  }
  triggerDisconnect() {
    this.connected = false;
    for (const cb of this.disconnectListeners) {
      try {
        cb();
      } catch (e) {
      }
    }
  }
};
function getOrCreateChannel(playerId) {
  let ch = channels.get(playerId);
  if (!ch) {
    ch = new ChildChannelAdapter(playerId);
    channels.set(playerId, ch);
  }
  return ch;
}
async function handleInit(msg) {
  try {
    await import_rapier3d_compat9.default.init();
    const room = new MatchRoom(msg.roomId, msg.geminiKey, msg.mapId);
    currentRoom = room;
    room.onShutdown = (id) => {
      if (process.send) {
        process.send({
          type: "shutdown",
          roomId: id
        });
      }
      setTimeout(() => process.exit(0), 50);
    };
    if (process.send) {
      process.send({
        type: "ready",
        roomId: msg.roomId,
        pid: process.pid
      });
    }
  } catch (err) {
    console.error(`[room-worker] Failed to initialize room ${msg.roomId}:`, err);
    if (process.send) {
      process.send({
        type: "error",
        roomId: msg.roomId,
        error: err?.message || String(err)
      });
    }
    process.exit(1);
  }
}
async function handleRegisterPlayer(msg) {
  if (!currentRoom) return;
  const ch = getOrCreateChannel(msg.playerId);
  currentRoom.registerPlayer(
    msg.playerId,
    ch,
    null,
    msg.classId,
    msg.displayName,
    msg.reqUid,
    msg.primaryWeaponId,
    msg.secondaryWeaponId
  );
}
async function handleRemovePlayer(msg) {
  if (!currentRoom) return;
  currentRoom.removePlayer(msg.playerId);
  const ch = channels.get(msg.playerId);
  if (ch) {
    ch.triggerDisconnect();
    channels.delete(msg.playerId);
  }
}
async function handleInbound(msg) {
  if (!currentRoom) return;
  const room = currentRoom;
  const playerId = msg.playerId;
  const event = msg.event;
  if (playerId === "broadcast" || event.type === "CHAT_MESSAGE" || event.type === "QUICK_COMM") {
    if (event.type === "CHAT_MESSAGE") {
      const message = event.message;
      if (message && typeof message === "string" && message.trim().length > 0) {
        const trimmed = message.trim().slice(0, 150);
        const p2 = playerId !== "broadcast" ? room.players.get(playerId) : null;
        const senderName = event.sender || p2?.displayName || (playerId !== "broadcast" ? playerId : "System");
        if (process.send) {
          process.send({
            type: "outbound",
            targetPlayerId: "broadcast",
            event: {
              type: "CHAT_MESSAGE",
              sender: senderName,
              message: trimmed
            }
          });
        }
        for (const [id, player] of room.players.entries()) {
          player.channel.emit("reliable_event", {
            type: "CHAT_MESSAGE",
            sender: senderName,
            message: trimmed
          });
        }
      }
      return;
    }
    if (event.type === "QUICK_COMM") {
      const optionId = event.optionId;
      if (optionId && typeof optionId === "string") {
        const p2 = playerId !== "broadcast" ? room.players.get(playerId) : null;
        const senderName = event.sender || p2?.displayName || (playerId !== "broadcast" ? playerId : "System");
        if (process.send) {
          process.send({
            type: "outbound",
            targetPlayerId: "broadcast",
            event: {
              type: "QUICK_COMM",
              sender: senderName,
              optionId
            }
          });
        }
        for (const [id, player] of room.players.entries()) {
          player.channel.emit("reliable_event", {
            type: "QUICK_COMM",
            sender: senderName,
            optionId
          });
        }
      }
      return;
    }
  }
  let p = room.players.get(playerId);
  if (!p) {
    if (event.type === "PLAYER_QUIT") {
      await room.handlePlayerAbandonment(playerId);
      return;
    } else if (event.type === "PLAYER_DISCONNECT") {
      room.handlePlayerDisconnect(playerId);
      return;
    } else if (event.type === "REGISTER_PLAYER") {
      const ch = getOrCreateChannel(playerId);
      p = room.registerPlayer(
        playerId,
        ch,
        null,
        event.classId,
        event.displayName,
        event.reqUid,
        event.primaryWeaponId,
        event.secondaryWeaponId
      );
    } else {
      const ch = getOrCreateChannel(playerId);
      p = room.registerPlayer(playerId, ch);
    }
  }
  if (!p) return;
  room.recordPlayerActivity(p);
  switch (event.type) {
    case "INPUT": {
      room.updatePlayerInput(p, event.inputMask, event.pitch, event.yaw);
      break;
    }
    case "USE_UTILITY": {
      if (p.isAlive && (event.slot === "utility1" || event.slot === "utility2")) {
        room.useUtility(p.id, event.slot);
      }
      break;
    }
    case "OBJECTIVE_HOLD": {
      if (p.isAlive) {
        room.setObjectiveHold(p.id, !!event.holding);
      }
      break;
    }
    case "PLAYER_READY": {
      room.setPlayerReady(p.id);
      break;
    }
    case "PLAYER_QUIT": {
      await room.handlePlayerAbandonment(p.id);
      break;
    }
    case "PLAYER_DISCONNECT": {
      room.handlePlayerDisconnect(p.id);
      break;
    }
    case "SELECT_CLASS": {
      room.applyPlayerClassLoadout(p.id, event.classId);
      break;
    }
    case "REMOVE_PLAYER": {
      room.removePlayer(p.id);
      break;
    }
    case "TOGGLE_FIRE_MODE": {
      if (!p.isAlive) break;
      const primary = p.weaponState.primary;
      primary.fireMode = primary.fireMode === "auto" ? "burst" : "auto";
      const evt = {
        type: "FIRE_MODE_CHANGED",
        mode: primary.fireMode
      };
      if (process.send) {
        process.send({
          type: "outbound",
          targetPlayerId: p.id,
          event: evt
        });
      }
      p.channel.emit("reliable_event", evt);
      break;
    }
    case "RELOAD": {
      if (!p.isAlive) break;
      const slot = event.weaponSlot;
      if (!slot) break;
      const wState = p.weaponState[slot];
      const wDef = getWeaponPerformance(wState.weaponId);
      if (!wDef) break;
      const reloadTicks = getWeaponReloadTicks(wState.weaponId);
      if (!wState.isReloading && wState.currentMag < wDef.capacity && wState.reserve > 0) {
        wState.isReloading = true;
        wState.reloadTimer = reloadTicks;
      }
      const evt = {
        type: "AMMO_STATE",
        primary: p.weaponState.primary,
        secondary: p.weaponState.secondary
      };
      if (process.send) {
        process.send({
          type: "outbound",
          targetPlayerId: p.id,
          event: evt
        });
      }
      p.channel.emit("reliable_event", evt);
      break;
    }
    case "CANCEL_RELOAD": {
      if (!p.isAlive) break;
      const slot = event.weaponSlot;
      if (!slot) break;
      const wState = p.weaponState[slot];
      if (wState.isReloading) {
        wState.isReloading = false;
        wState.reloadTimer = 0;
      }
      const evt = {
        type: "AMMO_STATE",
        primary: p.weaponState.primary,
        secondary: p.weaponState.secondary
      };
      if (process.send) {
        process.send({
          type: "outbound",
          targetPlayerId: p.id,
          event: evt
        });
      }
      p.channel.emit("reliable_event", evt);
      break;
    }
    case "FIRE": {
      if (!p.isAlive) break;
      const slot = event.weaponSlot;
      if (slot !== "primary" && slot !== "secondary") break;
      const wState = p.weaponState[slot];
      const weaponStats = getWeaponPerformance(wState.weaponId);
      if (!weaponStats) break;
      const reloadTicks = getWeaponReloadTicks(wState.weaponId);
      if (wState.currentMag <= 0) {
        if (!wState.isReloading && wState.reserve > 0) {
          wState.isReloading = true;
          wState.reloadTimer = reloadTicks;
          const evt = {
            type: "AMMO_STATE",
            primary: p.weaponState.primary,
            secondary: p.weaponState.secondary
          };
          if (process.send) {
            process.send({
              type: "outbound",
              targetPlayerId: p.id,
              event: evt
            });
          }
          p.channel.emit("reliable_event", evt);
        }
        break;
      }
      if (wState.isReloading) break;
      const now = Date.now();
      const allowedInterval = 1e3 / weaponStats.fireRateHz;
      let leakyUpdate = Math.max(
        0,
        wState.leakyBucket - (now - wState.lastConfirmedShotT) / allowedInterval
      );
      if (leakyUpdate < weaponStats.capacity) {
        wState.leakyBucket = leakyUpdate + 1;
        wState.lastConfirmedShotT = now;
        p.firedThisTick = true;
        if (p.infiniteAmmo) {
          wState.currentMag = weaponStats.capacity;
        } else {
          wState.currentMag--;
        }
        if (wState.currentMag === 0 && wState.reserve > 0 && !p.infiniteAmmo) {
          wState.isReloading = true;
          wState.reloadTimer = reloadTicks;
        }
        const evt = {
          type: "AMMO_STATE",
          primary: p.weaponState.primary,
          secondary: p.weaponState.secondary
        };
        if (process.send) {
          process.send({
            type: "outbound",
            targetPlayerId: p.id,
            event: evt
          });
        }
        p.channel.emit("reliable_event", evt);
        processHitscan(p, room, p.channel, event);
      } else {
        recordHitscanRejected("rate_limit_exceeded");
      }
      break;
    }
  }
}
async function handleTerminate(msg) {
  if (currentRoom) {
    currentRoom.shutdown();
  }
  if (process.send) {
    process.send({
      type: "shutdown",
      roomId: currentRoom?.roomId || "unknown",
      reason: msg.reason
    });
  }
  process.exit(0);
}
process.on("message", async (msg) => {
  if (!msg || typeof msg !== "object") return;
  switch (msg.type) {
    case "init":
      await handleInit(msg);
      break;
    case "register_player":
      await handleRegisterPlayer(msg);
      break;
    case "remove_player":
      await handleRemovePlayer(msg);
      break;
    case "inbound":
      await handleInbound(msg);
      break;
    case "terminate":
      await handleTerminate(msg);
      break;
  }
});
process.on("uncaughtException", (err) => {
  console.error(`[room-worker ${process.pid}] uncaughtException:`, err);
  if (process.send && currentRoom) {
    try {
      process.send({
        type: "error",
        roomId: currentRoom.roomId,
        error: err?.message || String(err)
      });
    } catch (e) {
    }
  }
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error(`[room-worker ${process.pid}] unhandledRejection:`, reason);
  if (process.send && currentRoom) {
    try {
      process.send({
        type: "error",
        roomId: currentRoom.roomId,
        error: String(reason)
      });
    } catch (e) {
    }
  }
  process.exit(1);
});
