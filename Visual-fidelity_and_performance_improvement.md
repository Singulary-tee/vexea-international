# Visual Fidelity and Performance Improvement — LLM Implementation Prompt

Use this prompt as-is with an implementation LLM.

---

You are an expert game-performance and rendering engineer working in:

- Repository: `Singulary-tee/vexea-international`
- Root: `/home/runner/work/vexea-international/vexea-international`

## Objective

Implement a focused upgrade that improves:
1. VFX visual quality
2. Runtime FPS stability

You must preserve current gameplay behavior and architecture constraints.

## Mandatory architecture constraints (non-negotiable)

Read and obey:
- `/home/runner/work/vexea-international/vexea-international/ARCHITECTURE.md`
- `/home/runner/work/vexea-international/vexea-international/CODEBASE_INDEX.md`

Hard requirements:
- WebGPU pipeline only (`THREE.WebGPURenderer` usage model must remain intact).
- Do not introduce legacy renderer migration.
- Zero-allocation discipline in hot loops (render/update/tick/network loops).
- No behavior-breaking refactors outside scope.
- Keep existing pooled/BatchedMesh-based VFX strategy.

## Existing systems you must cross-check before/after edits

- `/home/runner/work/vexea-international/vexea-international/client/main.ts`
- `/home/runner/work/vexea-international/vexea-international/client/settings.ts`
- `/home/runner/work/vexea-international/vexea-international/client/src/systems/VisualsSystem.ts`
- `/home/runner/work/vexea-international/vexea-international/client/src/systems/DynamicResolutionSystem.ts`
- `/home/runner/work/vexea-international/vexea-international/client/src/systems/MinimapSystem.ts`
- `/home/runner/work/vexea-international/vexea-international/client/src/systems/SimulationSystem.ts`
- `/home/runner/work/vexea-international/vexea-international/client/physics.worker.ts`
- `/home/runner/work/vexea-international/vexea-international/client/src/vfx/VFXOrchestrator.ts`
- `/home/runner/work/vexea-international/vexea-international/client/src/vfx/firing.ts`
- `/home/runner/work/vexea-international/vexea-international/client/src/vfx/hits.ts`
- `/home/runner/work/vexea-international/vexea-international/client/src/vfx/large.ts`
- `/home/runner/work/vexea-international/vexea-international/client/src/vfx/constants.ts`

## Implementation scope (in priority order)

### P0 — FPS and frame-time stability

1. **Remove per-frame allocation in projectile visual sync**
   - In `client/main.ts`, stop creating new `Float32BufferAttribute` every update.
   - Reuse persistent geometry attribute buffers.

2. **Convert frame-based VFX life to delta-time life**
   - In `client/src/vfx/hits.ts`, `large.ts`, and `VFXOrchestrator.ts`, replace `life--` style lifetime progression with time-based lifetimes using `deltaTime`.
   - Keep look/feel equivalent at 60 FPS while improving consistency at lower FPS.

3. **Avoid unnecessary BatchedMesh matrix uploads**
   - Only set `instanceMatrix.needsUpdate = true` when instance transforms changed.
   - Remove unconditional per-frame update flags for unchanged decal/particle batches.

4. **Reduce minimap render overhead**
   - In `MinimapSystem.ts`, cache static map layers and reduce expensive full redraw frequency.
   - Keep drone/player tracking accurate and responsive.

5. **Eliminate temporary object creation in spawn/update paths**
   - In VFX modules, reuse pre-allocated temp vectors/quaternions/matrices consistently.

### P1 — Visual quality improvements without major cost increase

6. Improve sprite-based effect richness (sparks/smoke/fire) using low-cost variation:
   - lifetime-based alpha/color shaping
   - controlled randomization of rotation/stretch
   - less repetitive appearance across repeated events

7. Improve impact decals quality:
   - better variation and controlled lifecycle handling
   - avoid visual repetition artifacts

8. Keep dynamic lights bounded and configurable through existing settings path (`flashLight`), with no regression to known heavy-light-count behavior.

## Safety/compatibility checklist

Before finishing, verify:
- Dynamic resolution still works and is not overridden incorrectly.
- Settings toggles still propagate (`applySettings`) and affect runtime uniformly.
- VisualsSystem post-processing/render pipeline still functions in WebGPU mode.
- Physics worker and simulation update cadence are untouched functionally.
- No change breaks match load, spawn, or combat visual triggers.
- No new secrets or credentials are introduced.

## Validation requirements

Run only existing project validation commands already used by this repository (no new tooling).  
Provide concise results and list changed files.

## Deliverables

1. Code changes implementing P0 + selected P1 improvements.
2. Short summary:
   - what changed
   - why it improves FPS/visuals
   - measured or observed impact
3. Explicit note of any deferred items and why.

---

Execution style: surgical, minimal-risk, measurable improvements, no speculative rewrites.
