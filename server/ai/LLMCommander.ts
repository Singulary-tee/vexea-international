import { MatchRoom, astarPath } from "../MatchRoom";
import { LLMCommanderFeedback } from "./LLMCommanderFeedback";
import {
  ZONES,
  ZoneName,
  ZONE_BOUNDS,
  DroneState,
  DroneType,
  BehaviorProfile,
  DRONE_CONFIGS,
} from "../../shared/constants";
import { ACTIVE_GAMEMODE } from "../../shared/gamemode-configs.js";
import { ServerDrone } from "../MatchRoom";
import { Sentry, recordServerLLMLatency } from "../sentry";
import { serverFlagService } from "../flags/flag-service";
import { ServerFeatureFlagKey } from "../flags/server-flags";
import { PlayerProfileStore, PlayerGameProfile } from "../player-data/PlayerProfileStore";
import { BriefingRenderer } from "../player-data/BriefingRenderer";
import { CommanderAdapter, CommanderTool } from "./adapters/CommanderAdapter";
import { AdapterFactory } from "./adapters/AdapterFactory";
import { StrategyBriefStore } from "./strategy/StrategyBriefStore";
import { Posture } from "./GroupTacticalState";

const MAX_DRONES = 40; // Hardcoded from MatchRoom

const COMMANDER_TOOLS: CommanderTool[] = [
  {
    name: "move_group",
    description: "Defines group zone movement order.",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "string" },
        target_zone: {
          type: "string",
          enum: Object.values(ZONES),
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high"],
        },
      },
      required: ["group_id", "target_zone", "priority"],
    },
  },
  {
    name: "merge_groups",
    description: "Unifies two active control groups.",
    parameters: {
      type: "object",
      properties: {
        source_group_id: { type: "string" },
        target_group_id: { type: "string" },
      },
      required: ["source_group_id", "target_group_id"],
    },
  },
  {
    name: "split_group",
    description: "Subdivides a group to create supplementary wings.",
    parameters: {
      type: "object",
      properties: {
        source_group_id: { type: "string" },
        unit_count: { type: "integer" },
      },
      required: ["source_group_id", "unit_count"],
    },
  },
  {
    name: "spawn_units",
    description: "Requests local swarm unit deployment.",
    parameters: {
      type: "object",
      properties: {
        zone_id: {
          type: "string",
          enum: Object.values(ZONES),
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
            "humanoid",
          ],
        },
        count: { type: "integer" },
        behavior_profile: {
          type: "string",
          enum: ["assault", "patrol", "recon"],
        },
      },
      required: [
        "zone_id",
        "unit_type",
        "count",
        "behavior_profile",
      ],
    },
  },
  {
    name: "hold_position",
    description: "Enforces defensive lock stance.",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "string" },
        duration_seconds: { type: "integer" },
      },
      required: ["group_id", "duration_seconds"],
    },
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
          enum: ["ASSAULT", "SUPPRESS", "FLANK", "HOLD", "RECON", "RETREAT", "HARASS"],
        },
      },
      required: ["group_id", "posture"],
    },
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
          enum: Object.values(ZONES),
        },
      },
      required: ["primary_group_id", "support_group_id", "target_zone"],
    },
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
          enum: Object.values(ZONES),
        },
      },
      required: ["group_id", "zone_id"],
    },
  },
  {
    name: "strafe_run",
    description: "Orders a fixed wing drone to conduct a strafing run across target zone.",
    parameters: {
      type: "object",
      properties: {
        target_zone: {
          type: "string",
          enum: Object.values(ZONES),
        },
      },
      required: ["target_zone"],
    },
  },
  {
    name: "sustain",
    description: "Pass execution for this cycle.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string" },
      },
      required: ["reason"],
    },
  },
];

export interface ExecutionHistoryRecord {
  timestamp: number;
  payload: string;
  calls: any[];
  failedOps: string[];
}

export class LLMCommander {
  public adapter: CommanderAdapter | null = null;
  public llmThrottleCooldownUntil = 0;
  public recentExecutionHistory: ExecutionHistoryRecord[] = [];
  public feedback: LLMCommanderFeedback = new LLMCommanderFeedback();
  public loadedStrategyBrief: string | null = null;
  public isStrategyBriefLoaded = false;
  public lastCycleSummary: string = "NO_RECENT_LLM_TRANSMISSIONS";

  // Backward compatibility getters/setters
  public get geminiClient(): any {
    return this.adapter;
  }
  public set geminiClient(val: any) {
    this.adapter = val;
  }
  public get geminiThrottleCooldownUntil(): number {
    return this.llmThrottleCooldownUntil;
  }
  public set geminiThrottleCooldownUntil(val: number) {
    this.llmThrottleCooldownUntil = val;
  }

  constructor(public room: MatchRoom, apiKey?: string) {
    this.initAdapter(apiKey);
  }

  public async initAdapter(apiKey?: string) {
    const family = await serverFlagService.getString(
      ServerFeatureFlagKey.LLM_COMMANDER_FAMILY,
      { roomId: this.room.roomId },
      "gemini"
    );
    this.adapter = AdapterFactory.getAdapter(family, apiKey);
    this.room.aiCommanderActive = true;
  }

  public initLLMCommander(apiKey?: string) {
    this.initAdapter(apiKey);
  }

  public async executeLLMStep() {
    if (!this.adapter) {
      await this.initAdapter();
    }
    if (!this.adapter) return;

    const tokenCeiling = await serverFlagService.getNumber(
      ServerFeatureFlagKey.LLM_TOKEN_CEILING,
      { roomId: this.room.roomId },
      55000
    );

    if (this.room.llmTokensUsedThisMatch >= tokenCeiling) {
      console.warn(
        `[LLMCommander] Match token budget ceiling reached (${this.room.llmTokensUsedThisMatch} / ${tokenCeiling} tokens). Skipping API call and falling back to offline AI for rest of match.`,
      );
      this.room.offlineSystemFallbackAI();
      return;
    }
    const _llmStartTime = Date.now();

    let initialBriefingBlock = "";
    if (this.room.apiCallCount === 0) {
      const humanPlayers = this.room.players
        ? Array.from(this.room.players.values())
            .filter((p) => !p.isBot)
            .map((p) => ({ id: p.id, isBot: false }))
        : [];

      const profilesMap = new Map<string, PlayerGameProfile | null>();
      for (const p of humanPlayers) {
        const prof = await PlayerProfileStore.getProfile(p.id);
        profilesMap.set(p.id, prof);
      }

      initialBriefingBlock = `\n${BriefingRenderer.renderMatchBriefing(humanPlayers, profilesMap)}\n`;
    }

    this.room.apiCallCount++;

    const apRegenFlag = await serverFlagService.getNumber(
      ServerFeatureFlagKey.LLM_AP_REGEN_RATE,
      { roomId: this.room.roomId },
      ACTIVE_GAMEMODE.llmApRegenPerCycle
    );

    // Regenerate AP pool per cycle
    const elapsedSeconds = (Date.now() - this.room.matchStartTime) / 1000;
    const currentApRegen = ACTIVE_GAMEMODE.llmDifficultyScaling
      ? apRegenFlag +
        Math.floor(elapsedSeconds / ACTIVE_GAMEMODE.llmDifficultyScaleInterval) *
          ACTIVE_GAMEMODE.llmDifficultyScaleAmount
      : apRegenFlag;
    this.room.commanderAP += currentApRegen;

    // Evaluate unresolved outstanding orders
    const pendingOrders: { group_id: string; destination: string; cycles_outstanding: number }[] = [];
    for (const [groupId, order] of this.room.outstandingOrders.entries()) {
      const activeGroupDrones = this.room.drones.filter(
        (d) => d.groupId === groupId && d.state !== DroneState.DEAD,
      );
      if (activeGroupDrones.length === 0) {
        this.room.outstandingOrders.delete(groupId);
        continue;
      }

      if (order.holdRemainingCycles !== undefined) {
        order.holdRemainingCycles--;
        if (order.holdRemainingCycles <= 0) {
          this.room.outstandingOrders.delete(groupId);
        } else {
          order.cyclesOutstanding++;
          pendingOrders.push({
            group_id: groupId,
            destination: `HOLD_IN_${order.targetZone} (${order.holdRemainingCycles} cycles left)`,
            cycles_outstanding: order.cyclesOutstanding,
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
            cycles_outstanding: order.cyclesOutstanding,
          });
        }
      }
    }

    const compressedContext = this.room.commanderMemory
      ? this.room.commanderMemory.buildCompressedPayload()
      : `Current Zone Summary: ${JSON.stringify(this.room.zoneSummary)}`;
    const statePayload = compressedContext;
    const outstandingPayload =
      pendingOrders.length > 0
        ? `\nOutstanding Orders: ${JSON.stringify(pendingOrders)}`
        : "";
    const feedbackBlock = this.feedback.formatFeedbackPromptBlock();
    const payloadToLLM = `Dynamic payload:\n${compressedContext}${outstandingPayload}\nCommander AP Pool: ${this.room.commanderAP}\n${feedbackBlock}${initialBriefingBlock}Failed operations from previous cycle: ${JSON.stringify(this.room.failedOperations)}`;
    this.room.failedOperations.length = 0;

    if (!this.isStrategyBriefLoaded) {
      const mapId = this.room?.mapId;
      if (mapId) {
        const briefDoc = await StrategyBriefStore.getBrief(mapId);
        let briefText = briefDoc ? briefDoc.content : "";
        if (briefText) {
          const maxChars = 1600; // ~400 tokens
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

    const systemInstructions = this.loadedStrategyBrief
      ? `${baseInstructions}\n\n${this.loadedStrategyBrief}`
      : baseInstructions;

    try {
      let { calls, usage, modelUsed } = await this.adapter.execute(
        payloadToLLM,
        systemInstructions,
        COMMANDER_TOOLS,
        { roomId: this.room.roomId }
      );

      const maxToolCalls = await serverFlagService.getNumber(
        ServerFeatureFlagKey.LLM_MAX_TOOL_CALLS_PER_CYCLE,
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
        const callSummary = calls.map((c: any) => `${c.name}(${JSON.stringify(c.args || {})})`).join("; ");
        this.lastCycleSummary = callSummary;
        this.room.lastLLMToolCall = callSummary;
      }
      this.recentExecutionHistory.push({
        timestamp: Date.now(),
        payload: statePayload,
        calls: calls ? calls : [],
        failedOps: [...this.room.failedOperations],
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
        modelUsed: modelUsed,
        familyUsed: this.adapter.family,
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
          "sustain",
        ];
        const sortedCalls = [...calls].sort(
          (a, b) =>
            pipelineOrder.indexOf(a.name) - pipelineOrder.indexOf(b.name),
        );
        const groupLocks = new Set<string>();

        for (let i = 0; i < sortedCalls.length; i++) {
          const call = sortedCalls[i];
          const args: any = call.args;

          const mutatesGroups = [
            "split_group",
            "merge_groups",
            "move_group",
            "hold_position",
            "set_posture",
            "coordinate_attack",
            "search_zone",
          ].includes(call.name);
          if (mutatesGroups) {
            const g1 = args.group_id || args.source_group_id;
            const g2 = args.target_group_id;
            if ((g1 && groupLocks.has(g1)) || (g2 && groupLocks.has(g2))) {
              this.room.failedOperations.push(
                `Task rejected: Group lock collision for ${call.name}`,
              );
              continue;
            }
            if (g1) groupLocks.add(g1);
            if (g2) groupLocks.add(g2);
          }

          switch (call.name) {
            case "spawn_units": {
              const { zone_id, unit_type, count, behavior_profile } = args;

              const typeMapping: Record<string, DroneType> = {
                recon_drone: DroneType.RECON,
                rotary_shooter: DroneType.ROTARY_SHOOTER,
                bomber_drone: DroneType.BOMBER,
                fixed_wing: DroneType.FIXED_WING,
                wheeled_drone: DroneType.WHEELED,
                robot_dog: DroneType.ROBOT_DOG,
                humanoid: DroneType.HUMANOID,
              };

              const requestedDroneType = typeMapping[unit_type];
              if (requestedDroneType === undefined) {
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

              // 1. Active capacity check
              let currentActiveCount = 0;
              for (let j = 0; j < this.room.drones.length; j++) {
                if (this.room.drones[j].state !== DroneState.DEAD)
                  currentActiveCount++;
              }
              if (currentActiveCount + count > MAX_DRONES) {
                const reason = `Spawn rejected: Count exceeded max active capacity of ${MAX_DRONES}`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("spawn_units", args, "REJECTED", reason);
                break;
              }

              // 2. Fixed Wing hard cap check (1 per match)
              if (requestedDroneType === DroneType.FIXED_WING) {
                if (
                  this.room.fixedWingDeploymentsThisMatch >= 1 ||
                  count > 1
                ) {
                  const reason = `Spawn rejected: Fixed Wing deployment hard cap (1 per match) reached`;
                  this.room.failedOperations.push(reason);
                  this.feedback.recordResult("spawn_units", args, "REJECTED", reason);
                  break;
                }
              }

              // 3. AP cost check against commander AP pool
              const requiredAP = droneConfig.apCost * count;
              if (this.room.commanderAP < requiredAP) {
                const reason = `Spawn rejected: Insufficient AP pool (${this.room.commanderAP} AP available, ${requiredAP} AP required for ${count}x ${unit_type})`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("spawn_units", args, "REJECTED", reason);
                break;
              }

              // Deduct AP cost
              this.room.commanderAP -= requiredAP;

              if (requestedDroneType === DroneType.FIXED_WING) {
                this.room.fixedWingDeploymentsThisMatch++;
              }

              let successfullySpawned = 0;
              const newGroupId = `G_INC_${Math.floor(Math.random() * 1000)}`;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.state === DroneState.DEAD) {
                  const b = ZONE_BOUNDS[zone_id as ZoneName];
                  d.id = this.room.nextDroneId++;
                  d.type = requestedDroneType;
                  d.state = DroneState.IDLE;
                  d.behavior = behavior_profile as BehaviorProfile;
                  d.zone = zone_id as ZoneName;

                  const isAir = droneConfig.isAirUnit;
                  const isTunnels =
                    zone_id === ZONES.TUNNELS ||
                    String(zone_id).toLowerCase().includes("tunnel");
                  const spawnType = isAir
                    ? "AIR_HANGAR"
                    : isTunnels
                      ? "ELEVATOR_SHAFT"
                      : "GROUND_GARAGE";

                  let spawnPos =
                    this.room.mapId === "map_1_facility"
                      ? this.room.getNextSpawnPoint.bind(this.room)(spawnType)
                      : null;
                  if (spawnPos) {
                    d.posX = spawnPos.x;
                    d.posY = spawnPos.y;
                    d.posZ = spawnPos.z;
                  } else {
                    d.posX =
                      b.center.x + (Math.random() - 0.5) * b.halfSize.x * 0.5;
                    d.posY =
                      b.center.y + (Math.random() - 0.5) * b.halfSize.y * 0.5;
                    d.posZ =
                      b.center.z + (Math.random() - 0.5) * b.halfSize.z * 0.5;
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
                groupId: newGroupId,
              });
              break;
            }

            case "split_group": {
              const { source_group_id, unit_count } = args;
              const matches: ServerDrone[] = [];
              for (let j = 0; j < this.room.drones.length; j++) {
                if (
                  this.room.drones[j].groupId === source_group_id &&
                  this.room.drones[j].state !== DroneState.DEAD
                ) {
                  matches.push(this.room.drones[j]);
                }
              }
              if (matches.length <= unit_count) {
                const reason = `Split rejected: Source group ${source_group_id} has insufficient members (${matches.length})`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("split_group", args, "REJECTED", reason);
                break;
              }
              const newGroupId = `G_SPL_${Math.floor(Math.random() * 1000)}`;
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
                size: unit_count,
              });
              break;
            }

            case "merge_groups": {
              const { source_group_id, target_group_id } = args;
              let srcFound = false;
              let dstFound = false;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.state !== DroneState.DEAD) {
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
                  target: target_group_id,
                });
              }
              break;
            }

            case "move_group": {
              const { group_id, target_zone } = args;
              let movedCount = 0;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.groupId === group_id && d.state !== DroneState.DEAD) {
                  d.path = astarPath(d.zone, target_zone as ZoneName);
                  d.pathIndex = 0;
                  d.state = DroneState.PATROLLING;
                  movedCount++;
                }
              }
              if (movedCount === 0) {
                const reason = `Move rejected: No active members found for group: ${group_id}`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("move_group", args, "REJECTED", reason);
              } else {
                this.room.outstandingOrders.set(group_id, {
                  targetZone: target_zone as ZoneName,
                  cyclesOutstanding: 0,
                });
                this.feedback.recordResult("move_group", args, "SUCCESS");
                this.room.broadcastReliableEvent.bind(this.room)({
                  type: "group_movement",
                  id: group_id,
                  zone: target_zone,
                });
              }
              break;
            }

            case "hold_position": {
              const { group_id, duration_seconds } = args;
              const holdCycles = duration_seconds ? Math.max(1, Math.ceil(Number(duration_seconds) / 8.0)) : 4;
              let foundGroupZone: ZoneName | null = null;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.groupId === group_id && d.state !== DroneState.DEAD) {
                  d.velX = 0;
                  d.velY = 0;
                  d.velZ = 0;
                  d.state = DroneState.PURSUING;
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
                if (d.groupId === group_id && d.state !== DroneState.DEAD) {
                  if (this.room.groupTacticalState.isPostureValidForDrone(d.type, posture as Posture)) {
                    count++;
                  }
                }
              }
              if (count === 0) {
                const reason = `set_posture rejected: No units in group ${group_id} support posture ${posture}`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("set_posture", args, "REJECTED", reason);
              } else {
                this.room.groupTacticalState.setPosture(group_id, posture as Posture);
                this.feedback.recordResult("set_posture", args, "SUCCESS");
                this.room.broadcastReliableEvent.bind(this.room)({
                  type: "group_posture_changed",
                  groupId: group_id,
                  posture: posture,
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
                if (d.state !== DroneState.DEAD) {
                  if (d.groupId === primary_group_id) {
                    d.path = astarPath(d.zone, target_zone as ZoneName);
                    d.pathIndex = 0;
                    d.state = DroneState.PATROLLING;
                    primCount++;
                  }
                  if (d.groupId === support_group_id) {
                    d.path = astarPath(d.zone, target_zone as ZoneName);
                    d.pathIndex = 0;
                    d.state = DroneState.PATROLLING;
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
                this.room.outstandingOrders.set(primary_group_id, { targetZone: target_zone as ZoneName, cyclesOutstanding: 0 });
                this.room.outstandingOrders.set(support_group_id, { targetZone: target_zone as ZoneName, cyclesOutstanding: 0 });
                this.feedback.recordResult("coordinate_attack", args, "SUCCESS");
                this.room.broadcastReliableEvent.bind(this.room)({
                  type: "coordinated_attack_started",
                  primary: primary_group_id,
                  support: support_group_id,
                  targetZone: target_zone,
                });
              }
              break;
            }

            case "search_zone": {
              const { group_id, zone_id } = args;
              let count = 0;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.groupId === group_id && d.state !== DroneState.DEAD) {
                  d.path = astarPath(d.zone, zone_id as ZoneName);
                  d.pathIndex = 0;
                  d.state = DroneState.PATROLLING;
                  count++;
                }
              }
              if (count === 0) {
                const reason = `search_zone rejected: Group ${group_id} not found or dead`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("search_zone", args, "REJECTED", reason);
              } else {
                this.room.groupTacticalState.setPosture(group_id, "RECON");
                this.room.outstandingOrders.set(group_id, { targetZone: zone_id as ZoneName, cyclesOutstanding: 0 });
                this.feedback.recordResult("search_zone", args, "SUCCESS");
              }
              break;
            }

            case "strafe_run": {
              const { target_zone } = args;
              let fwDrone: ServerDrone | null = null;
              for (let j = 0; j < this.room.drones.length; j++) {
                const d = this.room.drones[j];
                if (d.type === DroneType.FIXED_WING && d.state !== DroneState.DEAD) {
                  fwDrone = d;
                  break;
                }
              }
              if (!fwDrone) {
                const reason = `strafe_run rejected: No active Fixed Wing drone found`;
                this.room.failedOperations.push(reason);
                this.feedback.recordResult("strafe_run", args, "REJECTED", reason);
              } else {
                fwDrone.strafeRunTarget = target_zone as ZoneName;
                fwDrone.fixedWingPhase = "APPROACH";
                fwDrone.path = astarPath(fwDrone.zone, target_zone as ZoneName);
                fwDrone.pathIndex = 0;
                fwDrone.state = DroneState.PATROLLING;
                this.feedback.recordResult("strafe_run", args, "SUCCESS");
                this.room.broadcastReliableEvent.bind(this.room)({
                  type: "strafe_run_ordered",
                  droneId: fwDrone.id,
                  targetZone: target_zone,
                });
              }
              break;
            }
          }
        }
      }
    } catch (err: any) {
      const rawErrMsg = err?.error?.message || err?.message || String(err);
      const errMsg =
        typeof rawErrMsg === "object" ? JSON.stringify(rawErrMsg) : rawErrMsg;
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
        familyUsed: this.adapter?.family || "unknown",
      });

      if (
        errStatus === "RESOURCE_EXHAUSTED" ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota") ||
        errMsg.includes("exceeded") ||
        errMsg.includes("429") ||
        errMsg.includes("rate limit")
      ) {
        const isDailyExhaustion =
          errMsg.includes("FreeTier") ||
          errMsg.includes("daily") ||
          errMsg.includes("per day");
        const coolingPeriodMs = isDailyExhaustion ? 60000 : 35000;
        this.llmThrottleCooldownUntil = Date.now() + coolingPeriodMs;
        this.room.offlineSystemFallbackAI.bind(this.room)();
      } else {
        this.room.failedOperations.push(`Processor fail: ${errMsg}`);
      }
    }
  }

  public async interviewLLM(question: string): Promise<string> {
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

    const statePayload = JSON.stringify(this.room.zoneSummary);
    const historyPayload = JSON.stringify(this.recentExecutionHistory.slice(-5));

    const prompt = `CURRENT STATE:\n${statePayload}\n\nRECENT EXECUTION HISTORY:\n${historyPayload}\n\nINQUIRY:\n${question}`;

    try {
      const { calls, usage, modelUsed } = await this.adapter.execute(
        prompt,
        systemInstruction,
        [],
        { roomId: this.room.roomId }
      );
      return `Analysis from ${this.adapter.family} (${modelUsed}): ${JSON.stringify(calls)}`;
    } catch (err: any) {
      const rawErrMsg = err?.error?.message || err?.message || String(err);
      const errMsg =
        typeof rawErrMsg === "object" ? JSON.stringify(rawErrMsg) : rawErrMsg;
      return `ERROR processing inquiry: ${errMsg}`;
    }
  }
}
