# Codebase Optimization & Architecture Audit Plan

## Required Architectural Quotes

### Architecture.md Section 10 (Barred Terminology & Themes)
> "Barred Words: The words "neon", "scifi", "tactical", "futuristic", "cyberpunk", and "mecha" are strictly barred from this workspace. They must not be used in the design, UI text, labels, descriptors, code comments, or architecture. All content, aesthetic choices, and lighting must remain completely grounded, neutral, and clean without leaning into speculative or stylized subgenres."

### design-system.ts Item 1
> "1. ROUNDED CORNERS AND GLASSMORPHISM ARE STRICTLY FORBIDDEN.
>    - All containers, cards, tabs, buttons, and interactive components must use
>      perfectly sharp, orthogonal edges (no border-radius, i.e., 0px).
>    - No fuzzy frosted glass panels or complex radial-gradient reflections."

### design-system.ts Item 3
> "3. DARK BACKGROUNDS MUST ALWAYS USE TRANSPARENCY AND SMOKE-LIKE BLURRY EDGES.
>    - Never use hard dark blocks, rigid card boundaries, or stark light-dark dividing walls.
>    - Dark backgrounds must merge seamlessly with the scene using smooth, transparent,
>      smoke-like radial/linear gradients fading gently to 100% transparent."

---

## Candidate Optimizations & Architecture Audit

### 1. Pre-allocation of Drone Procedural States (`client/src/systems/DroneSystem.ts`)
* **Current Implementation:** `DroneSystem.getOrCreateProceduralState(id)` instantiates a new procedural state object using object spread and vector instantiation (`{ ...createProceduralState(), lastPos: new THREE.Vector3(), velocity: new THREE.Vector3(), smoothedVelocity: new THREE.Vector3(), lastFireTime: 0 }`) when a drone ID is first encountered.
* **Proposed Optimization:** Pre-allocate a fixed pool of 50 procedural state objects during `DroneSystem` initialization and recycle them on drone spawn/despawn.
* **What It Saves:** Prevents transient GC allocations on frames where new drones spawn into the scene.
* **Trade-offs:** Negligible static heap footprint (~50 pre-allocated objects). Safe and zero runtime trade-off.

### 2. Module-Scoped Scratch Vectors in VFX Firing Routines (`client/src/vfx/firing.ts`)
* **Current Implementation:** `firing.ts` instantiates temporary `THREE.Vector3` objects during muzzle flash positioning and tracer trajectory generation.
* **Proposed Optimization:** Replace inline vector instantiations with pre-allocated, module-scoped scratch vectors (`tempMuzzlePos`, `tempTracerDir`).
* **What It Saves:** Eliminates 10-20 allocations per weapon shot during active combat.
* **Trade-offs:** Requires careful management of scratch vector mutation within single-threaded call stacks.

### 3. Jitter Buffer Search (`client/src/systems/DroneSystem.ts`) - **REJECTED**
* **Current Implementation:** Linear loop through `match.droneJitterMap` buffer (`count <= 3`) to find render keyframes.
* **Weighing Against Optimization:** Since the ring buffer capacity is capped at 3 network packets (Architecture.md Section 7), a binary search or index caching scheme adds branching overhead for `N <= 3`.
* **What It Saves:** 0.00ms.
* **Trade-offs:** Adds unnecessary code complexity without measurable performance benefit. Recommending NO change.

### 4. Architecture Compliance Audit
* **Renderer Verification:** Confirmed `THREE.WebGPURenderer` is used exclusively in `client/main.ts`. `THREE.WebGLRenderer` is absent.
* **Transport Alignment:** Confirmed Socket.io + JSON transport in `client/transport/adapter.ts` adheres to AI Studio preview sandbox fallback overrides in Architecture.md Section 2.
* **Barred Terminology Audit:** Verified no prohibited terms ("neon", "scifi", "tactical", "futuristic", "cyberpunk", "mecha") are present in codebase design labels, UI text, or comments.
