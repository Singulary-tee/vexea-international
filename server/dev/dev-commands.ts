import { ChannelAdapter } from "../transport/adapter";
import { MatchRoom, PlayerState } from "../MatchRoom";
import { IS_DEV } from "../../shared/gates/production.gate";
import { DroneState } from "../../shared/constants";
import { CLASSES, ClassId } from "../../shared/classes";
import { FieldValue } from "firebase-admin/firestore";

export function registerDevCommands(
  channel: ChannelAdapter,
  db: any,
  getRoom: () => MatchRoom | null,
  getPlayer: () => PlayerState | null
): void {
  if (!IS_DEV) return;

  channel.on("dev_spawn_bots", (args: any) => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    const count = typeof args.count === "number" ? args.count : 3;
    currentRoom.spawnTestBots(count);
  });

  channel.on("dev_set_class", async (args: any) => {
    const currentRoom = getRoom();
    const pState = getPlayer();
    if (!currentRoom || !pState) return;

    const requestedClassStr = args?.playerClass || args?.class;
    if (!requestedClassStr) return;

    const classId = (typeof requestedClassStr === "string" ? requestedClassStr.toUpperCase() : "ASSAULT") as ClassId;
    if (!(classId in CLASSES)) return;

    let primaryWeaponId: string | undefined;
    let secondaryWeaponId: string | undefined;

    if (db && pState.reqUid) {
      try {
        const userDoc = await db.collection("Users").doc(pState.reqUid).get();
        if (userDoc && userDoc.exists) {
          const data = userDoc.data();
          const classLoadout = data?.armory?.loadouts?.[classId];
          if (Array.isArray(classLoadout)) {
            const primaryItem = classLoadout.find((item: any) => item?.slotName === "PRIMARY");
            const secondaryItem = classLoadout.find((item: any) => item?.slotName === "SECONDARY");
            if (primaryItem?.weaponKey) primaryWeaponId = primaryItem.weaponKey;
            if (secondaryItem?.weaponKey) secondaryWeaponId = secondaryItem.weaponKey;
          }
        }
      } catch (err) {
        console.warn(`[DEV] Failed to fetch loadout for ${classId} from Firestore:`, err);
      }
    }

    currentRoom.applyPlayerClassLoadout(pState, classId, primaryWeaponId, secondaryWeaponId);
  });

  channel.on("dev_spawn_cube", (args: any) => {
    const currentRoom = getRoom();
    const pState = getPlayer();
    if (!currentRoom || !pState) return;
    currentRoom.devSpawnCube(pState.id, args);
  });

  channel.on("dev_clear_cube", () => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    currentRoom.devClearCube();
  });

  channel.on("dev_set_gravity_y", (args: any) => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    if (args && typeof args.gravityY === "number") {
      currentRoom.setDevPhysicsGravityY(args.gravityY);
    }
  });

  channel.on("dev_set_speed_multiplier", (args: any) => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    if (args && typeof args.speedMultiplier === "number") {
      currentRoom.setDevPhysicsSpeedMultiplier(args.speedMultiplier);
    }
  });

  channel.on("dev_set_paused", (args: any) => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    if (args && typeof args.paused === "boolean") {
      currentRoom.setDevPhysicsPaused(args.paused);
    }
  });

  channel.on("dev_step_once", () => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    currentRoom.setDevPhysicsStepOnce();
  });

  channel.on("dev_spawn_drone", (args: any) => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    const type = typeof args.type === "number" ? args.type : Number(args.type);
    const pos = (args.x !== undefined && args.y !== undefined && args.z !== undefined) ? 
      { x: Number(args.x), y: Number(args.y), z: Number(args.z) } : undefined;
    currentRoom.registerDeveloperSpawner(type, pos);
  });

  channel.on("dev_clear_drones", () => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    for (let i = 0; i < currentRoom.drones.length; i++) {
      currentRoom.drones[i].state = DroneState.DEAD;
    }
  });

  channel.on("dev_spawn_frozen_drone", (args: any) => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    const success = currentRoom.registerDeveloperSpawner(args.type, { x: args.x, y: args.y, z: args.z });
    if (success) {
      const spawnedDrone = currentRoom.drones.find(x => x.id === currentRoom.nextDroneId - 1);
      if (spawnedDrone) {
        (spawnedDrone as any).isFrozen = true;
      }
    }
  });

  channel.on("dev_clear_frozen", () => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    for (let i = 0; i < currentRoom.drones.length; i++) {
      if ((currentRoom.drones[i] as any).isFrozen) {
        currentRoom.despawnDrone(currentRoom.drones[i]);
      }
    }
  });

  channel.on("dev_toggle_llm", (args: any) => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    currentRoom.llmCommanderDisabled = !!args?.disabled;
    console.log(`[VEXEA SERVER] LLM Commander disabled toggle processed: ${currentRoom.llmCommanderDisabled}`);
  });

  channel.on("dev_interview_llm", async (args: any) => {
    const currentRoom = getRoom();
    const question = args?.question;
    if (!question || typeof question !== "string" || !question.trim()) return;

    if (currentRoom && currentRoom.llmCommander) {
      const answer = await currentRoom.llmCommander.interviewLLM(question.trim());
      channel.emit("dev_llm_interview_response", {
        question: question.trim(),
        answer,
        timestamp: Date.now(),
      });
    } else {
      channel.emit("dev_llm_interview_response", {
        question: question.trim(),
        answer: "ERROR: MatchRoom or LLM Commander unavailable.",
        timestamp: Date.now(),
      });
    }
  });

  channel.on("refill_credits", async (args: any) => {
    const pState = getPlayer();
    const reqUid = args?.uid || pState?.id;
    if (!reqUid) return;
    try {
      await db.collection("Users").doc(reqUid).update({
        credits: 1000,
        energy: 1000
      });
      console.log(`[VEXEA SERVER] Processed Dev Credits Refill for ${reqUid}`);
      if (pState && pState.id === reqUid) {
        // Credits are not stored in PlayerState stats in this version
      }
    } catch (err) {
      console.error("[VEXEA SERVER] Dev Credits Refill failed:", err);
    }
  });

  channel.on("dev_set_class", (args: any) => {
    const currentRoom = getRoom();
    const pState = getPlayer();
    if (!currentRoom || !pState) return;
    if (args.playerClass) {
      const classId = (args.playerClass as string).toUpperCase() as ClassId;
      if (CLASSES[classId]) {
        currentRoom.applyPlayerClassLoadout(pState.id, classId);
      }
    }
  });

  channel.on("dev_set_position", (args: any) => {
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

  channel.on("dev_toggle_god_mode", (args: any) => {
    const pState = getPlayer();
    if (!pState) return;
    pState.godMode = !!args?.godMode;
    console.log(`[SERVER DEV EVENT] Player ${pState.id} God Mode toggled:`, pState.godMode);
  });

  channel.on("dev_toggle_infinite_ammo", (args: any) => {
    const pState = getPlayer();
    if (!pState) return;
    pState.infiniteAmmo = !!args?.infiniteAmmo;
    console.log(`[SERVER DEV EVENT] Player ${pState.id} Infinite Ammo toggled:`, pState.infiniteAmmo);
  });

  channel.on("dev_set_hp", (args: any) => {
    const pState = getPlayer();
    if (!pState) return;
    if (typeof args?.hp === "number") {
      pState.hp = args.hp;
      pState.channel.emit("reliable_event", {
        type: "PLAYER_HIT",
        hp: pState.hp,
        rawDamage: 0,
      });
      console.log(`[SERVER DEV EVENT] Player ${pState.id} HP set to:`, pState.hp);
    }
  });

  channel.on("dev_nuke_drones", () => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    console.log(`[SERVER DEV EVENT] Nuking all active drones on map`);
    for (let i = 0; i < currentRoom.drones.length; i++) {
      currentRoom.drones[i].hp = 0;
      currentRoom.drones[i].state = DroneState.DEAD;
    }
  });

  channel.on("dev_force_match_end", (args: any) => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    const result = args?.result === "win" ? "win" : "loss";
    console.log(`[SERVER DEV EVENT] Forcing match end with result:`, result);
    (currentRoom as any).handleMatchEnd(result);
  });

  channel.on("debug_get_state", () => {
    const currentRoom = getRoom();
    if (!currentRoom) return;
    const state = {
      players: Array.from(currentRoom.players.values()).map(p => ({
        id: p.id,
        pos: { x: p.posX, y: p.posY, z: p.posZ }
      })),
      drones: currentRoom.drones.filter((d: any) => d.state !== DroneState.DEAD).map((d: any) => ({
        id: d.id,
        type: d.type,
        pos: { x: d.posX, y: d.posY, z: d.posZ }
      })),
      buildings: currentRoom.collisionMap?.boxes || []
    };
    channel.emit("debug_state_response", state);
  });
}
