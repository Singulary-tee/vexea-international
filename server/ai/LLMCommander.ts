import { GoogleGenAI, Type } from "@google/genai";
import { MatchRoom, astarPath } from "../MatchRoom";
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

const MAX_DRONES = 40; // Hardcoded from MatchRoom
const MAX_LLM_TOKENS_PER_MATCH = 55000; // Deliberate per-match token budget safety ceiling to protect against free-tier volatility

const FLASH_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash"];

function isRateLimitedError(err: any): boolean {
  const code = err?.status || err?.statusCode || err?.error?.code;
  const msg = String(err?.error?.message || err?.message || err).toLowerCase();
  return (
    code === 429 ||
    code === 503 ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("throttled") ||
    msg.includes("too many requests") ||
    msg.includes("freetier")
  );
}

export interface ExecutionHistoryRecord {
  timestamp: number;
  payload: string;
  calls: any[];
  failedOps: string[];
}

export class LLMCommander {
  public geminiClient: GoogleGenAI | null = null;
  public geminiThrottleCooldownUntil = 0;
  public recentExecutionHistory: ExecutionHistoryRecord[] = [];
  
  constructor(public room: MatchRoom, geminiKey?: string) {
    this.initLLMCommander(geminiKey);
  }

  public initLLMCommander(geminiKey?: string) {
    const key = geminiKey || process.env.GEMINI_API_KEY;
    if (!key) return;
    this.geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
    this.room.aiCommanderActive = true;
  }

  public async executeLLMStep() {
    if (!this.geminiClient) return;
    if (this.room.llmTokensUsedThisMatch >= MAX_LLM_TOKENS_PER_MATCH) {
      console.warn(
        `[LLMCommander] Match token budget ceiling reached (${this.room.llmTokensUsedThisMatch} / ${MAX_LLM_TOKENS_PER_MATCH} tokens). Skipping API call and falling back to offline AI for rest of match.`,
      );
      this.room.offlineSystemFallbackAI();
      return;
    }
    const _llmStartTime = Date.now();
    this.room.apiCallCount++;

    // Regenerate AP pool per 8s cycle
    const elapsedSeconds = (Date.now() - this.room.matchStartTime) / 1000;
    const currentApRegen = ACTIVE_GAMEMODE.llmDifficultyScaling
      ? ACTIVE_GAMEMODE.llmApRegenPerCycle +
        Math.floor(elapsedSeconds / ACTIVE_GAMEMODE.llmDifficultyScaleInterval) *
          ACTIVE_GAMEMODE.llmDifficultyScaleAmount
      : ACTIVE_GAMEMODE.llmApRegenPerCycle;
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

    const statePayload = JSON.stringify(this.room.zoneSummary);
    const outstandingPayload =
      pendingOrders.length > 0
        ? `\nOutstanding Orders: ${JSON.stringify(pendingOrders)}`
        : "";
    const payloadToLLM = `Dynamic payload: Current Zone Summary: ${statePayload}${outstandingPayload}\nCommander AP Pool: ${this.room.commanderAP}\nFailed operations from previous cycle: ${JSON.stringify(this.room.failedOperations)}`;
    this.room.failedOperations.length = 0;

    const systemInstructions = `You are an automated state-machine orchestrator managing unit group allocations and zone routing. Respond strictly and exclusively with tool calls. Do not roleplay, invent narrative, adopt a persona, or output natural language. Clinical mechanical execution only.

Unit types:
- Recon Drone (recon_drone): HP 20, Speed Highest, Air. Non-combat intelligence unit that maintains confirmed player presence in its zone summary.
- Rotary Shooter (rotary_shooter): HP 40, Dmg 8, Speed High, Air. Mobile aerial pressure unit for zone harassment and location confirmation.
- Bomber Drone (bomber_drone): HP 30, Dmg 80 (explosion, 4u radius), Speed High, Air. Single-use kamikaze unit that flies directly at players to detonate.
- Fixed Wing (fixed_wing): HP 60, Dmg 15, Speed Highest Sustained, Air. Fast strafing unit for open zones; hard-capped at 1 deployment per match.
- Wheeled Drone (wheeled_drone): HP 80, Dmg 12, Speed Medium, Ground. Backbone ground unit that pathfinds aggressively toward player zones.
- Robot Dog (robot_dog): HP 150, Dmg 18, Speed Slow, Ground. Relentless defensive unit that holds long LOS corridors for zone denial.
- Humanoid (humanoid): HP 200, Dmg 20, Speed Slow, Ground. Elite anchor unit using cover actively to hold critical chokepoints.

Topological graph adjacency (Zones):
- zone_spawn connected to: zone_courtyard
- zone_courtyard connected to: zone_spawn, zone_warehouse, zone_bridge
- zone_warehouse connected to: zone_courtyard, zone_tunnels, zone_plant
- zone_bridge connected to: zone_courtyard, zone_plant
- zone_plant connected to: zone_warehouse, zone_bridge, zone_core
- zone_tunnels connected to: zone_warehouse, zone_core
- zone_core connected to: zone_plant, zone_tunnels`;

    let response: any = null;
    let lastError: any = null;
    let usedModel = "";

    try {
      for (const modelName of FLASH_MODELS) {
        try {
          response = await this.geminiClient.models.generateContent({
            model: modelName,
            contents: payloadToLLM,
            config: {
              systemInstruction: systemInstructions,
              tools: [
                {
                  functionDeclarations: [
                    {
                      name: "move_group",
                      description: "Defines group zone movement order.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          group_id: { type: Type.STRING },
                          target_zone: {
                            type: Type.STRING,
                            enum: Object.values(ZONES),
                          },
                          priority: {
                            type: Type.STRING,
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
                        type: Type.OBJECT,
                        properties: {
                          source_group_id: { type: Type.STRING },
                          target_group_id: { type: Type.STRING },
                        },
                        required: ["source_group_id", "target_group_id"],
                      },
                    },
                    {
                      name: "split_group",
                      description:
                        "Subdivides a group to create supplementary wings.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          source_group_id: { type: Type.STRING },
                          unit_count: { type: Type.INTEGER },
                        },
                        required: ["source_group_id", "unit_count"],
                      },
                    },
                    {
                      name: "spawn_units",
                      description: "Requests local swarm unit deployment.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          zone_id: {
                            type: Type.STRING,
                            enum: Object.values(ZONES),
                          },
                          unit_type: {
                            type: Type.STRING,
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
                          count: { type: Type.INTEGER },
                          behavior_profile: {
                            type: Type.STRING,
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
                        type: Type.OBJECT,
                        properties: {
                          group_id: { type: Type.STRING },
                          duration_seconds: { type: Type.INTEGER },
                        },
                        required: ["group_id", "duration_seconds"],
                      },
                    },
                    {
                      name: "sustain",
                      description: "Pass execution for this cycle.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          reason: { type: Type.STRING },
                        },
                        required: ["reason"],
                      },
                    },
                  ],
                },
              ],
            },
          });
          usedModel = modelName;
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          if (isRateLimitedError(err)) {
            console.warn(`[LLMCommander] Model '${modelName}' rate limited. Attempting fallback Flash model...`);
            continue;
          }
          break;
        }
      }

      if (!response && lastError) {
        throw lastError;
      }

      const callTokens =
        response?.usageMetadata?.totalTokenCount ??
        ((response?.usageMetadata?.promptTokenCount || 0) +
          (response?.usageMetadata?.candidatesTokenCount || 0));
      if (callTokens > 0) {
        this.room.llmTokensUsedThisMatch += callTokens;
      }

      const calls = response.functionCalls;
      if (calls && calls.length > 0) {
        this.room.lastLLMToolCall = JSON.stringify(calls);
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
      this.room.broadcastReliableEvent.bind(this.room)({
        type: "dev_llm_feed",
        payload: statePayload,
        calls: calls ? JSON.stringify(calls) : "[]",
        latency: llmLatency,
        count: this.room.apiCallCount,
        tokensUsed: this.room.llmTokensUsedThisMatch,
        failedOps: [...this.room.failedOperations],
        modelUsed: usedModel,
      });

      if (calls && calls.length > 0) {
        const pipelineOrder = [
          "spawn_units",
          "split_group",
          "merge_groups",
          "move_group",
          "hold_position",
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
                this.room.failedOperations.push(
                  `Spawn rejected: Unknown unit_type ${unit_type}`,
                );
                break;
              }

              const droneConfig = DRONE_CONFIGS[requestedDroneType];
              if (!droneConfig) {
                this.room.failedOperations.push(
                  `Spawn rejected: Missing config for ${unit_type}`,
                );
                break;
              }

              // 1. Active capacity check
              let currentActiveCount = 0;
              for (let j = 0; j < this.room.drones.length; j++) {
                if (this.room.drones[j].state !== DroneState.DEAD)
                  currentActiveCount++;
              }
              if (currentActiveCount + count > MAX_DRONES) {
                this.room.failedOperations.push(
                  `Spawn rejected: Count exceeded max active capacity of ${MAX_DRONES}`,
                );
                break;
              }

              // 2. Fixed Wing hard cap check (1 per match)
              if (requestedDroneType === DroneType.FIXED_WING) {
                if (
                  this.room.fixedWingDeploymentsThisMatch >= 1 ||
                  count > 1
                ) {
                  this.room.failedOperations.push(
                    `Spawn rejected: Fixed Wing deployment hard cap (1 per match) reached`,
                  );
                  break;
                }
              }

              // 3. AP cost check against commander AP pool
              const requiredAP = droneConfig.apCost * count;
              if (this.room.commanderAP < requiredAP) {
                this.room.failedOperations.push(
                  `Spawn rejected: Insufficient AP pool (${this.room.commanderAP} AP available, ${requiredAP} AP required for ${count}x ${unit_type})`,
                );
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
                this.room.failedOperations.push(
                  `Split rejected: Source group ${source_group_id} has insufficient members (${matches.length})`,
                );
                break;
              }
              const newGroupId = `G_SPL_${Math.floor(Math.random() * 1000)}`;
              for (let j = 0; j < unit_count; j++) {
                matches[j].groupId = newGroupId;
              }
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
                this.room.failedOperations.push(
                  `Merge rejected: Missing target groupings.`,
                );
              } else {
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
                this.room.failedOperations.push(
                  `Move rejected: No active members found for group: ${group_id}`,
                );
              } else {
                this.room.outstandingOrders.set(group_id, {
                  targetZone: target_zone as ZoneName,
                  cyclesOutstanding: 0,
                });
                this.room.broadcastReliableEvent.bind(this.room)({
                  type: "group_movement",
                  id: group_id,
                  zone: target_zone,
                });
              }
              break;
            }

            case "hold_position": {
              const { group_id } = args;
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
        this.geminiThrottleCooldownUntil = Date.now() + coolingPeriodMs;
        this.room.offlineSystemFallbackAI.bind(this.room)();
      } else {
        this.room.failedOperations.push(`Processor fail: ${errMsg}`);
      }
    }
  }

  public async interviewLLM(question: string): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!this.geminiClient && key) {
      this.initLLMCommander(key);
    }
    if (!this.geminiClient) {
      return "ERROR: Gemini API client not initialized. GEMINI_API_KEY environment variable missing or empty.";
    }
    if (Date.now() < this.geminiThrottleCooldownUntil) {
      return "THROTTLED: Gemini API cooling down after prior rate limits. Retry shortly.";
    }

    const systemInstruction = `You are an automated state-machine log parser and execution analyzer for a group routing and unit allocation system. You are not roleplaying. There is no narrative. Provide clinical, mechanical, objective, and dry explanations for unit group routing, state changes, zone allocations, and resource counts. Answer the inquiry directly using the provided spatial state and recent execution history. Never adopt any persona, roleplay, or larp.`;

    const statePayload = JSON.stringify(this.room.zoneSummary);
    const historyPayload = JSON.stringify(this.recentExecutionHistory.slice(-5));

    const prompt = `CURRENT STATE:\n${statePayload}\n\nRECENT EXECUTION HISTORY:\n${historyPayload}\n\nINQUIRY:\n${question}`;

    let responseText = "";
    let lastError: any = null;

    for (const modelName of FLASH_MODELS) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
          },
        });
        responseText = response.text || "No analytical output generated by LLM Commander.";
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        if (isRateLimitedError(err)) {
          console.warn(`[LLMCommander Interview] Model '${modelName}' rate limited. Attempting fallback Flash model...`);
          continue;
        }
        break;
      }
    }

    if (!responseText && lastError) {
      const rawErrMsg = lastError?.error?.message || lastError?.message || String(lastError);
      const errMsg =
        typeof rawErrMsg === "object" ? JSON.stringify(rawErrMsg) : rawErrMsg;
      return `ERROR processing inquiry: ${errMsg}`;
    }

    return responseText;
  }
}
