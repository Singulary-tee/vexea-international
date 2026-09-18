# Standalone LLM Pose Editor

A dedicated, isolated workspace for authoring, evaluating, and validating 3D weapon and utility poses, camera compositions, and IK grip relationships.

This tool is isolated from the main game client runtime and Vite production pipeline. It does not introduce runtime dependencies, dev menu tabs, or asset coupling into `client/`.

---

## Directory Structure

```
PoseEditor/
├── index.html                 # Primary editor HTML entry point
├── pose-editor.html           # HTML alias for direct routing
├── pose-editor.ts             # Main pose editor orchestrator & Three.js WebGPU/SVG/WebGL viewer
├── pose-editor-config.ts      # Catalog definitions, item configurations, and placement frames
├── pose-editor-composition.ts # First-person framing, aspect evaluation, and readiness checks
├── pose-editor-geometry.ts    # Geometry probing, mesh axis measurement, bounds, and placement
├── dev_pose_diagnosis.ts      # Diagnostic inspection routines for weapon grips and IK
├── vite.config.ts             # Standalone Vite configuration (serves independently on port 3100)
├── vitest.config.ts           # Standalone Vitest configuration for pose editor test suites
├── docs/                      # Authoring methodologies and documentation
│   └── pose-editor-method.md  # Methodology specification for automated LLM pose evaluation
├── plans/                     # Investigation logs, subagent execution plans, and progress logs
│   ├── plan.md                # Iteration plan and execution control guidelines
│   ├── progress-log.md        # Event history of test captures, hypotheses, and verdicts
│   └── scene-investigation-log.md # Measured scene inventory for character, weapon, and grip anchors
├── scripts/                   # Playwright automation and headless inspection scripts
│   ├── analyze-boundary-neighbors.mjs
│   ├── analyze-full-components.mjs
│   ├── analyze-pose-asset.mjs
│   ├── analyze-production-components.mjs
│   ├── analyze-sleeve-neighbor-detail.mjs
│   ├── capture-pose-variant-exec-004.mjs
│   ├── capture-pose-variant.mjs
│   ├── inspect-pose-current.mjs
│   ├── inspect-pose-first.mjs
│   └── settings.json
└── tests/                     # Unit test suites validating pose solver and editor invariants
    └── pose-editor.test.ts
```

---

## Running the Pose Editor Standalone

### 1. Standalone Development Server
Launch the Pose Editor independent of the main game:
```bash
npx vite --config PoseEditor/vite.config.ts
```
The editor will be accessible at:
- `http://localhost:3100/` or `http://localhost:3100/pose-editor.html`

Query parameters supported:
- `item`: item key (`rifle`, `pistol`, `smg`, `shotgun`, `lmg`, `sniper`, `Grenade`, `Med Kit`, etc.)
- `view`: `first` (first person) or `third` (third person)
- `backend`: `webgpu`, `webgl`, or `svg`
- `clip`: animation clip name (e.g., `rifle_idle`, `rifle_run`, `rifle_aim_idle`)

### 2. Standalone Build
Build the static bundle without affecting the main game's `dist/client`:
```bash
npx vite build --config PoseEditor/vite.config.ts
```
Outputs static bundle to `dist/pose-editor/`.

### 3. Running Unit Tests
Run the Pose Editor tests:
```bash
npx vitest run --config PoseEditor/vitest.config.ts PoseEditor/tests/pose-editor.test.ts
```
or via the root Vitest suite:
```bash
npx vitest run PoseEditor/tests/pose-editor.test.ts
```

### 4. Running Inspection Scripts
Run headless Playwright captures (requires a running server):
```bash
node PoseEditor/scripts/inspect-pose-first.mjs
```
