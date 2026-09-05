

---

PROMPT FOR GEMINI

```
Read before writing (in this order):
1. `server/ai/LLMCommander.ts` — existing tools, system instructions, tool execution pipeline
2. `server/ai/behavior/behaviors/HumanoidBehavior.ts` — current implementation with bugs
3. `server/ai/behavior/behaviors/RotaryShooterBehavior.ts` — reference pattern
4. `server/ai/behavior/behaviors/WheeledBehavior.ts` — current implementation
5. `server/ai/behavior/behaviors/RobotDogBehavior.ts` — current implementation
6. `server/ai/behavior/types.ts` — BehaviorContext, BehaviorOutput interfaces
7. `server/ai/behavior/DroneBehaviorController.ts` — output consumption
8. `shared/constants.ts` — DRONE_CONFIGS, INTEL_CONFIGS, DroneState, DroneType, ZONES, WAYPOINTS
9. `server/MatchRoom.ts` — ServerDrone interface, outstandingOrders, spawn logic, damage application
10. `server/ai/CommanderMemory.ts` — payload format
11. `CODEBASE_INDEX.md` — audit protocol

Quote back before proceeding:
- The full `COMMANDER_TOOLS` array from `LLMCommander.ts`
- The `ServerDrone` interface fields (all of them)
- The `BehaviorContext` interface
- The `BehaviorOutput` interface
- DRONE_CONFIGS[DroneType.HUMANOID] (speed, damage, fireCooldown, hp)
- INTEL_CONFIGS[DroneType.HUMANOID] (engagementMin, engagementMax)
- The current `humanoidBehavior` function body
- The `outstandingOrders` Map value structure

---

## SECTION 1: New File — `server/ai/GroupTacticalState.ts`

Create a new module. Single responsibility: track and validate group postures.

```typescript
export type Posture = "ASSAULT" | "SUPPRESS" | "FLANK" | "HOLD" | "RECON" | "RETREAT" | "HARASS";

// Which postures each drone type can execute
export const POSTURE_ALLOWLIST: Record<DroneType, Posture[]> = {
  [DroneType.RECON]: ["RECON", "RETREAT"],
  [DroneType.ROTARY_SHOOTER]: ["SUPPRESS", "HARASS", "RETREAT"],
  [DroneType.BOMBER]: [], // Bomber has hardcoded kamikaze behavior, no postures
  [DroneType.FIXED_WING]: [], // Fixed Wing has hardcoded strafe run, no postures
  [DroneType.WHEELED]: ["ASSAULT", "SUPPRESS", "FLANK", "HOLD", "RETREAT"],
  [DroneType.ROBOT_DOG]: ["ASSAULT", "HOLD", "RECON", "RETREAT"],
  [DroneType.HUMANOID]: ["ASSAULT", "SUPPRESS", "FLANK", "HOLD", "RETREAT"],
  [DroneType.TEST_ENTITY]: [],
};

export class GroupTacticalState {
  private groupPostures: Map<string, Posture> = new Map();
  
  public setPosture(groupId: string, posture: Posture): boolean {
    this.groupPostures.set(groupId, posture);
    return true;
  }
  
  public getPosture(groupId: string): Posture | null {
    return this.groupPostures.get(groupId) || null;
  }
  
  public clear(): void {
    this.groupPostures.clear();
  }
  
  public isPostureValidForDrone(droneType: DroneType, posture: Posture): boolean {
    const allowlist = POSTURE_ALLOWLIST[droneType];
    return allowlist.includes(posture);
  }
}
```

Constraints:
- Zero-GC: Map operations only, no array allocations in `isPostureValidForDrone` (the allowlist is a constant reference)
- One concern per file: only posture tracking. No behavior logic. No LLM integration.

---

SECTION 2: LLMCommander.ts — New Tools + System Instructions

New Tools (add to `COMMANDER_TOOLS` array):

1. `set_posture`
   - Parameters: `group_id` (string), `posture` (enum: ASSAULT, SUPPRESS, FLANK, HOLD, RECON, RETREAT, HARASS)
   - Description: "Sets the tactical posture for an active group. Drones will adapt their 60Hz behavior to match this posture. Invalid postures for a group's drone composition are rejected."

2. `coordinate_attack`
   - Parameters: `primary_group` (string), `support_group` (string), `target_zone` (ZoneName)
   - Description: "Coordinates a two-group attack: primary_group suppresses from cover while support_group flanks. Both groups are moved to target_zone and their postures are set automatically (SUPPRESS for primary, FLANK for support)."

3. `search_zone`
   - Parameters: `group_id` (string), `zone_id` (ZoneName), `pattern` (enum: line_abreast, wedge, pincer)
   - Description: "Orders a recon or ground group to methodically sweep a zone. Group is moved to zone and set to RECON posture. Pattern is advisory for future behavior expansion."

4. `strafe_run`
   - Parameters: `target_zone` (ZoneName)
   - Description: "Deploys the fixed wing for a single carpet bomb strafing run. Hard-capped at 1 per match. Fixed wing approaches from nearest air-accessible zone, executes run, and exits. Cannot be used on groups — this is a direct strike asset call."

Updated System Instructions:

Replace the current `baseInstructions` with:

```
You are a tactical allocation engine managing autonomous drone assets against a hostile incursion. Your objective: prevent enemy operatives from reaching and holding the core zone.

Identity: You are a field commander, not a pilot. You control zones, groups, and timing. Individual drones execute tactically at 60Hz without your input. You operate with incomplete battlefield intelligence.

Spawn Mechanics: You do not control exact spawn coordinates. Drones emerge from pre-positioned killzones within the target zone — Air Hangars for aerial units, Ground Garages for ground units, Elevator Shafts for tunnel zones. The server manages spawn point allocation.

Economy: You manage a finite AP pool. Humanoid (8 AP) — elite anchor, use sparingly. Robot Dog (5 AP) — zone denial. Wheeled (3 AP) — backbone. Rotary (2 AP) — harassment. Recon (1 AP) — intel. Bomber (4 AP) — kamikaze area denial. Fixed Wing (10 AP, 1/match) — strategic strike.

Unit Capabilities:
- Recon: RECON, RETREAT only. Non-combat. Flees from contact.
- Rotary Shooter: SUPPRESS, HARASS, RETREAT. Aerial harassment. Never holds ground.
- Wheeled: ASSAULT, SUPPRESS, FLANK, HOLD, RETREAT. Backbone unit. Turret rotates 360°.
- Robot Dog: ASSAULT, HOLD, RECON, RETREAT. Forward gun. Climbs stairs. Relentless.
- Humanoid: ASSAULT, SUPPRESS, FLANK, HOLD, RETREAT. Elite. Cover system. Squad coordination.
- Bomber: No postures. Moves to zone, kamikazes on contact.
- Fixed Wing: No postures. Call strafe_run for strike. One use per match.

Decision Cycle (8 seconds):
1. Assess — Read zone confidence, casualties, AP pool, outstanding orders
2. Predict — Where are players going? Core? Plant? Tunnels?
3. Allocate — Spawn new groups, merge depleted ones, split for multi-prong
4. Posture — Set group tactical posture based on predicted contact
5. Coordinate — Pair suppressors with flankers for combined arms

You do not control: individual drone positions, cover selection, peek timing, firing decisions, pathfinding around obstacles.

Clinical mechanical execution only. No roleplay. No narrative.
```

Tool Execution Updates:

- Add `set_posture`, `coordinate_attack`, `search_zone`, `strafe_run` to `pipelineOrder` array
- Implement handlers for all 4 new tools in the `switch (call.name)` block
- `set_posture` handler: Validate that all active drones in the group can execute the requested posture using `POSTURE_ALLOWLIST`. If any drone in the group has a type not in the allowlist, reject with reason. If valid, call `room.groupTacticalState.setPosture(group_id, posture)` and record SUCCESS.
- `coordinate_attack` handler: Move both groups to target_zone (set path + PATROLLING), set primary to SUPPRESS, support to FLANK via groupTacticalState. Record SUCCESS.
- `search_zone` handler: Move group to zone, set posture to RECON. Record SUCCESS.
- `strafe_run` handler: Check `fixedWingDeploymentsThisMatch < 1`. If no fixed wing is currently active, reject. If active, trigger its strafe run by setting a new field on the fixed wing drone (see Section 5). Record SUCCESS.

---

SECTION 3: BehaviorContext Update (`server/ai/behavior/types.ts`)

Add to `BehaviorContext` interface:

```typescript
export interface BehaviorContext {
  room: MatchRoom;
  dt: number;
  now: number;
  serverTick: number;
  // NEW:
  getGroupPosture(groupId: string): Posture | null;
  getSquadMates(drone: ServerDrone): ServerDrone[];
  getPlayerVelEma(playerId: string): { x: number; y: number; z: number } | null;
}
```

Implement these as lightweight functions in `DroneBehaviorController.ts` (or a new helper module):
- `getGroupPosture`: Reads from `room.groupTacticalState.getPosture(groupId)`
- `getSquadMates`: Iterates `room.drones`, filters `state !== DEAD`, `groupId === drone.groupId`, distance < 20m. Returns array. Zero-GC: use a pre-allocated result array or return a generator — do NOT allocate a new array inside the behavior tick loop. Actually, for zero-GC, implement this as a counter function instead: `countSquadMatesInPosture(drone, posture): number` which iterates and counts without creating arrays.
- `getPlayerVelEma`: Reads from `room.players.get(playerId)?.velEmaX/Y/Z`

REVISE: Do not add `getSquadMates` as an array-returning function. Add `countSquadMatesInPosture(drone: ServerDrone, posture: Posture): number` and `countSquadMatesWithinRange(drone: ServerDrone, range: number): number` instead. These return scalars. No allocations.

---

SECTION 4: HumanoidBehavior.ts — Full Rewrite

The humanoid is posture-driven. It reads `ctx.getGroupPosture(drone.groupId)` and executes accordingly.

State Machine (per posture):

ASSAULT:
- Has combatTarget: If dist > engagementMax, steer toward target at conf.speed (sprint). If dist within [engagementMin, engagementMax], find cover in direction of target, move to it, peek and fire. If dist < engagementMin, reposition outward.
- No combatTarget: Follow LLM path/zone waypoints at conf.speed. If path complete and no target, patrol.

SUPPRESS:
- Has combatTarget: Find cover with LOS to target. Stay in cover. Irregular peek fire (countdown timer). Never leave cover unless cover is compromised (player grenade nearby or damage taken). Body faces target via forceHeading.
- No combatTarget: Hold position. Do not pursue.

FLANK:
- Has combatTarget: Check `countSquadMatesInPosture(drone, "SUPPRESS")`. If < 1, switch to HOLD (cannot flank without suppression). If >= 1, compute flank position (perpendicular to target, at engagementMax distance). Move to flank position using cover. Only fire when at flank position AND target is not facing this angle.
- No combatTarget: Follow path.

HOLD:
- Has combatTarget: Find best cover in current zone. Stay there. Fire only when target enters engagement range. If target gets too close (< engagementMin), reposition to secondary cover.
- No combatTarget: Hold position. Patrol minimal area.

RETREAT:
- Always: Move toward nearest safe zone via A path (use existing astarPath). Sprint at conf.speed. No combat engagement. If combatTarget exists, ignore it.

Damage Reaction:
- Track `lastDamageTick` on ServerDrone (set in MatchRoom.ts when damage is applied).
- In behavior function: `if (serverTick - drone.lastDamageTick < 30)` (within 0.5s of being shot):
  - If in SUPPRESS/FLANK/HOLD: Immediately override to sprint to nearest cover at 1.5× conf.speed. Set `humanoidPose = "crouch_sprint"`.
  - If in ASSAULT: Immediately return fire (skip peek interval). Set `humanoidPose = "stand_fire"`.

Irregular Peek:
- Replace `serverTick % 30 === 0` with countdown timer.
- `drone.peekCooldown` ticks down each behavior call. When it hits 0, fire and reset to `random(15, 45)`.

Predictive Positioning:
- Use `ctx.getPlayerVelEma(targetId)` to compute predicted position: `targetPos + (velEma * predictionTime)` where `predictionTime = dist / conf.speed` (time to intercept).

Animation Flags:
- Set `drone.humanoidPose` per state:
  - Sprinting to cover/assault: `"crouch_sprint"`
  - In cover holding: `"crouch_hold"`
  - Standing and firing: `"stand_fire"`
  - Running upright: `"stand_run"`
  - Prone (if implemented later): `"prone_hold"`

Park and Resume:
- `ServerDrone` gets `parkedOrder: { type: "move" | "hold", targetZone: ZoneName, path: ZoneName[], pathIndex: number } | null`
- When `processDroneIntelligence` sets `mode = "COMBAT"`, if `drone.parkedOrder === null`, store current `path`, `pathIndex`, and `targetZone` into `parkedOrder`.
- When `mode` returns to `"NORMAL"` and `parkedOrder !== null`, restore `path`, `pathIndex`, and set `state = PATROLLING`. Clear `parkedOrder`.

Bug Fixes:
- INVESTIGATE state: Use `bestMemory.lastSensedPosition.x/y/z`, NOT `bestMemory.posX` (which doesn't exist on MemoryRecord).
- Remove redundant LOS checks inside behavior. `processDroneIntelligence` already verified LOS before setting `combatTarget`. Trust it.

Zero-GC Constraints:
- No `new` keywords inside behavior function.
- No object literals `{}` inside behavior function.
- No array allocations `[]` or `.push()` inside behavior function.
- All numeric thresholds from `INTEL_CONFIGS` or `DRONE_CONFIGS`.
- Module-scope constants for any behavior-specific thresholds (e.g., `const DAMAGE_REACTION_TICKS = 30;`).

---

SECTION 5: MatchRoom.ts — ServerDrone Field Additions

Add to `ServerDrone` interface:

```typescript
posture: Posture | null;
humanoidPose: string;
peekCooldown: number;
lastDamageTick: number;
parkedOrder: { type: "move" | "hold"; targetZone: ZoneName; path: ZoneName[]; pathIndex: number } | null;
```

In `initEntities`, initialize:

```typescript
posture: null,
humanoidPose: "stand_run",
peekCooldown: 0,
lastDamageTick: -9999,
parkedOrder: null,
```

In `applyDamage` (when drone is hit by projectile or explosion):

```typescript
d.lastDamageTick = this.serverTick;
```

Add to `MatchRoom` class:

```typescript
public groupTacticalState: GroupTacticalState = new GroupTacticalState();
```

---

SECTION 6: Other Behavior Files — Posture Integration

Update these behavior files to read posture and adapt:

WheeledBehavior.ts:
- Default posture if none set: ASSAULT
- ASSAULT: Aggressive push. Turret tracks target. Body holds when firing.
- SUPPRESS: Park and turret-fire. 360° turret rotation means body can face any direction.
- FLANK: Move to angle, turret tracks.
- HOLD: Defend position.
- RETREAT: Break contact.

RobotDogBehavior.ts:
- Default posture if none set: ASSAULT
- ASSAULT: Pursue at full speed.
- HOLD: Deny corridor. Forward gun means body must face target.
- RECON: Scout ahead, avoid combat.
- RETREAT: Break contact.

RotaryShooterBehavior.ts:
- Default posture if none set: HARASS
- HARASS: Current behavior (hover, shoot, move).
- SUPPRESS: Sustained fire from hover position. Less movement.
- RETREAT: Fly away from target.

ReconBehavior.ts:
- Default posture if none set: RECON
- RECON: Maintain distance, update zone confidence, avoid combat.
- RETREAT: Flee from any contact.

BomberBehavior.ts and FixedWingBehavior.ts:
- No posture integration. They have hardcoded behavior. Fixed Wing gets a `strafeRunTarget: ZoneName | null` field that `strafe_run` tool sets.

---

SECTION 7: CODEBASE_INDEX.md

Register:
- `server/ai/GroupTacticalState.ts` — NEW
- `server/ai/behavior/behaviors/HumanoidBehavior.ts` — MODIFIED (full rewrite)
- `server/ai/behavior/types.ts` — MODIFIED (BehaviorContext additions)
- `server/ai/behavior/DroneBehaviorController.ts` — MODIFIED (context helpers)
- `server/ai/LLMCommander.ts` — MODIFIED (new tools, system instructions)
- `server/MatchRoom.ts` — MODIFIED (ServerDrone fields, groupTacticalState)

Add cycle audit log entry.

---

VERIFICATION REQUIREMENTS (Quote back and confirm):

(1) `GroupTacticalState.ts` created with `POSTURE_ALLOWLIST` mapping each DroneType to valid Posture array
(2) `LLMCommander.ts` has 4 new tools: `set_posture`, `coordinate_attack`, `search_zone`, `strafe_run`
(3) System instructions updated with commander identity, spawn mechanics, AP economy, unit capability matrix
(4) `BehaviorContext` has `getGroupPosture`, `countSquadMatesInPosture`, `countSquadMatesWithinRange`, `getPlayerVelEma`
(5) Zero object literals `{}` inside `humanoidBehavior` function body
(6) Zero `new` keywords inside `humanoidBehavior` function body
(7) Zero array allocations inside `humanoidBehavior` function body
(8) `humanoidBehavior` reads posture from `ctx.getGroupPosture(drone.groupId)` and branches accordingly
(9) `humanoidBehavior` uses `drone.peekCooldown` countdown instead of `serverTick % 30`
(10) `humanoidBehavior` checks `serverTick - drone.lastDamageTick < 30` for damage reaction
(11) `humanoidBehavior` uses `ctx.getPlayerVelEma()` for predictive positioning in FLANK and ASSAULT
(12) `humanoidBehavior` sets `drone.humanoidPose` string per state
(13) `humanoidBehavior` implements park-and-resume using `drone.parkedOrder`
(14) INVESTIGATE state uses `bestMemory.lastSensedPosition` not `bestMemory.posX`
(15) `MatchRoom.ts` has all new `ServerDrone` fields initialized in `initEntities`
(16) `MatchRoom.applyDamage` updates `d.lastDamageTick = this.serverTick`
(17) `MatchRoom` instantiates `groupTacticalState: GroupTacticalState`
(18) Wheeled, RobotDog, RotaryShooter, Recon behaviors read posture and branch
(19) Bomber and FixedWing behaviors unchanged (no posture integration)
(20) `CODEBASE_INDEX.md` updated with all file changes and cycle audit
(21) `npm run lint` and `npm run build` pass with zero errors

```

---

