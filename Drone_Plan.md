Prompt A: `DroneMemory.ts` + `MatchRoom.ts` — Map Conversion & Stale Memory Cleanup

Read before writing: ARCHITECTURE.md  (Sections 2, 11, 13),  CODEBASE_INDEX.md, `server/ai/DroneMemory.ts`, `server/MatchRoom.ts`

Quote back before proceeding: 
1. The current `updateDroneMemory` and `decayDroneMemory` function bodies from `DroneMemory.ts`.
2. Every line in `MatchRoom.ts` that reads or writes `memoryRecords` (there are 4 locations: `initEntities`, `triggerTestEntitySight`, `triggerTestEntitySound`, `packWorldNetworkData`).

Do not write any code until you have quoted these sections back.

---

Behavior to implement:

1. Convert `DroneMemory.ts` internal storage from `MemoryRecord[]` to `Map<string, MemoryRecord>` keyed by `entityId`.
2. `updateDroneMemory` must use `Map.get()` / `Map.set()` with O(1) lookup. No `Array.find()` or `Array.push()` may remain.
3. `decayDroneMemory` must iterate via `Map.values()`. After applying decay to untouched records, reset `touchedThisTick = false` on ALL records — this fixes the bug where touched records never decay again.
4. Add and export `forgetStaleMemory(drone: ServerDrone, threshold?: number)` that deletes Map entries where `confidence <= threshold` (default `UNKNOWN_THRESHOLD`). This must be called once per tick, immediately after `decayDroneMemory`, in whichever file currently invokes `decayDroneMemory` (likely `DroneIntelligence.ts`).
5. Update `ServerDrone.memoryRecords` type in `MatchRoom.ts` from `any[]` to `Map<string, MemoryRecord>`.
6. Update all `MatchRoom.ts` usages:
   - `initEntities`: initialize as `new Map()` instead of `[]`
   - `triggerTestEntitySight`: use `.get()` / `.set()` / `.has()` instead of `.find()` / `.push()`
   - `triggerTestEntitySound`: same
   - `packWorldNetworkData` dev sync: `Array.from(d.memoryRecords.values())` before `.filter()`
7. Ensure `forgetStaleMemory` is invoked per tick. If `DroneIntelligence.ts` calls `decayDroneMemory`, add `forgetStaleMemory` there. If `MatchRoom.ts` calls it directly, add it there.

Constraints:
- No client-side changes.
- No behavior changes to confidence rules (sight = 1.0, sound = 0.75, damage = 0.85).
- Zero-GC: avoid temporary object allocations in the hot path. Do not create wrapper objects per tick.
- `DECAY_RATE` and `UNKNOWN_THRESHOLD` remain as exported constants.

Verification requirements (quote back and confirm):
- `DroneMemory.ts` compiles with zero errors.
- `ServerDrone` interface in `MatchRoom.ts` uses `Map<string, MemoryRecord>`.
- All `MatchRoom.ts` usages of `memoryRecords` compile without `.find()`, `.push()`, or `.filter()` directly on the Map.
- `forgetStaleMemory` is exported and documented.
- `touchedThisTick` is reset every tick so decay actually works for previously-touched records.

---

Prompt B: `server/ai/DronePerception.ts` — Remove Redundant Rapier Raycast

Read before writing: ARCHITECTURE.md  (Sections 2, 11, 13),  CODEBASE_INDEX.md, `server/ai/DronePerception.ts`

Quote back before proceeding: The entire Stage 3 block inside `evaluateDronePerception` — the `if (inDistance && inFOV)` block that sets `hasLOS`, including both the `collisionMap.rayIntersectsAny` check and the `rapierWorld.castRay` check.

Do not write any code until you have quoted this section back.

---

Behavior to implement:

1. In `evaluateDronePerception`, Stage 3 (Line of Sight): delete the entire `rapierWorld.castRay` block.
2. `hasLOS` must be determined solely by `collisionMap.rayIntersectsAny(sensorPos, rDir, dist)`. The AABB check is the gameplay-authoritative LOS gate per project architecture.
3. Keep `rapierWorld` and `RAPIER_MOD` parameters in the function signature for caller backward compatibility, but do not use them for LOS logic.
4. Remove the `new RAPIER_MOD.Ray(...)` instantiation and the `rapierWorld.castRay(...)` call.

Constraints:
- No behavior changes to detection logic: `detected` must still equal `inDistance && inFOV && hasLOS`.
- No client-side changes.
- Do not change the function signature.
- If the Rapier world contains static obstacles not present in `collisionMap`, those obstacles must be registered in `collisionMap.loadFromSpec` — perception must not bypass the authoritative AABB system.

Verification requirements (quote back and confirm):
- `DronePerception.ts` compiles with zero errors.
- No `rapierWorld.castRay` calls remain in `evaluateDronePerception`.
- `hasLOS` is set exclusively by `collisionMap.rayIntersectsAny`.
- `RAPIER_MOD.Ray` is not instantiated in this file.

---

Prompt C: `shared/collision.ts` — Grid Spatial Hash (50m Cells)

Read before writing:ARCHITECTURE.md  (Sections 2, 11, 13),  CODEBASE_INDEX.md, `shared/collision.ts`

Quote back before proceeding: The current `rayIntersectsAny` method body and the `loadFromSpec` method body.

Do not write any code until you have quoted this section back.

---

Behavior to implement:

1. Add a spatial hash grid to `CollisionSystem` with 50-meter cell size.
2. Grid storage: use a `Map<number, number[]>` where the key is a composite integer that correctly handles negative coordinates (e.g., offset-then-split-bit or offset-then-multiply approach). Do NOT use `cx * 100000 + cz` — this collides for negative cell coordinates.
3. `loadFromSpec`: after pushing each AABB to `this.boxes`, compute all grid cells the AABB overlaps (based on `xMin/xMax` and `zMin/zMax` divided by 50). Push the box index into every overlapping cell's array.
4. `rayIntersectsAny`: replace the O(n) linear scan with grid traversal:
   - Trace the ray's 2D projection (X-Z plane) through grid cells using a 2D DDA (Digital Differential Analysis) algorithm or equivalent zero-allocation traversal.
   - For each cell along the ray path within `maxDistance`, check all box indices in that cell using the existing `rayIntersectsAABB`.
   - Return `true` on first hit.
   - If no cell contains boxes or the ray exits the populated grid area, return `false`.
5. Keep `rayIntersectsAABB` completely unchanged.
6. Keep `this.boxes` intact for other consumers.

Constraints:
- No client-side changes.
- Zero-allocation in the hot path: no `new` objects, no array spreads, no string concatenation inside the traversal loop. Use scalar temporaries only.
- Cell size is strictly 50 meters.
- Grid must correctly handle AABBs that span multiple cells.
- Composite grid key must be collision-free for negative coordinates.

Verification requirements (quote back and confirm):
- `shared/collision.ts` compiles with zero errors.
- `rayIntersectsAny` no longer iterates `this.boxes` directly.
- Grid is populated in `loadFromSpec` with correct multi-cell coverage for each box.
- `rayIntersectsAABB` remains unmodified.
- Grid key does not produce collisions for negative cell coordinates (e.g., `(-1, 0)` vs `(0, -1)` must map to different keys).

---

Prompt D: `server/ai/DroneAvoidance.ts` + `MatchRoom.ts` — Fix Potential Field & Integrate Inter-Drone Avoidance

Read before writing: ARCHITECTURE.md  (Sections 2, 11, 13),  CODEBASE_INDEX.md, `server/ai/DroneAvoidance.ts`, `server/MatchRoom.ts`

Quote back before proceeding: 
1. The current `calculateDroneAvoidance` function body from `DroneAvoidance.ts`.
2. The drone movement section from `MatchRoom.ts` starting where `baseSteerX = steerX; baseSteerZ = steerZ;` is assigned, through to just before the `if (isAir)` branching.

Do not write any code until you have quoted this section back.

---

Behavior to implement:

1. Eliminate all hardcoded magic numbers in `DroneAvoidance.ts`. Replace with explicit derivations from `DRONE_CONFIGS`:
   - `kRepulsion = droneConfig.maxAccelPerTick * 30.0` — scales the drone's acceleration budget into repulsive field stiffness
   - `maxAvoidanceForce = droneConfig.speed * 2.0` — caps repulsion at twice max speed for numerical stability
   - `minDistance = currentDroneConfig.visualRadius + otherDroneConfig.visualRadius` — uses both drones' physical radii, not `radius * 2.0`
2. Keep the repulsive potential field formula structure: `F = k * (1/d - 1/d0) * (1/d²) * normal`. The math shape stays the same; only the parameter sources change.
3. `sensingCutoffDistance` derivation remains `radius * 4.0` (already physically derived).
4. Integrate into `MatchRoom.ts` drone movement loop: `calculateDroneAvoidance` is currently not imported or called. Import it and invoke it inside the per-drone tick. Exact insertion point:
   - After `baseSteerX = steerX; baseSteerZ = steerZ;`
   - After the `d.avoidanceState && d.avoidanceState.transitioning` block that may override `baseSteerX`/`baseSteerZ`
   - Before the `if (isAir)` branching
   - Blend the returned `avoidX`/`avoidZ` into `baseSteerX`/`baseSteerZ` with weight `0.5`, then re-normalize:
     
```
     const interDrone = calculateDroneAvoidance(d, this.drones);
     baseSteerX = baseSteerX * 0.5 + interDrone.avoidX * 0.5;
     baseSteerZ = baseSteerZ * 0.5 + interDrone.avoidZ * 0.5;
     // re-normalize if magnitude > 0.001
     ```

   - Pass `null` for the optional `obstacleNormals` parameter — static obstacle avoidance is already handled by the existing KCC + forward-raycast state machine.
5. Add the import of `calculateDroneAvoidance` to `MatchRoom.ts`.

Constraints:
- No client-side changes.
- No behavior changes to potential field math structure.
- ARCHITECTURE.md Section 11 compliance: every numeric parameter must trace back to `DRONE_CONFIGS`, not a literal constant.
- Comments must explain physical derivation of `kRepulsion` and `maxAvoidanceForce`.

Verification requirements (quote back and confirm):
- `DroneAvoidance.ts` compiles with zero errors.
- No literal numeric constants like `12.0` or `15.0` remain as hardcoded parameters.
- `minDistance` calculation uses `visualRadius` from both drones' configs.
- `calculateDroneAvoidance` is imported and invoked in `MatchRoom.ts` at the specified insertion point.
- The blended `baseSteerX`/`baseSteerZ` is re-normalized before entering `isAir` / ground steering blocks.
- Comments explain physical derivation of `kRepulsion` and `maxAvoidanceForce`.
