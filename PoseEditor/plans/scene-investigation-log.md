# Scene Investigation and Mutation Log

Status: `ISSUE_REQUIRES_ACTION` — inventory and causal transformation proposal are not complete; no scene or source mutation is authorized yet. Continue investigation and resolve the issue; do not end the session.

Target: `rifle/hold-idle/local+remote`

Scope: standalone pose editor and raw Playwright/browser evidence only. No gameplay, networking, combat, physics, camera implementation, or unrelated asset scope.

Rules:

- Append entries; do not rewrite prior measurements or verdicts.
- Record measured values and evidence paths. Use `UNKNOWN` instead of estimates.
- One target, one causal hypothesis, and at most one deterministic mutation per proposal.
- A proposal is not permission. Only the primary may change status to `AUTHORIZED FOR ONE MUTATION` after reviewing the complete inventory and fixed gates.
- `ISSUE_REQUIRES_ACTION` is an active repair or measurement state, not a stopping state. Resolve it, work around it, or document the next concrete investigation step.
- A rejected mutation does not authorize a follow-up tweak; it requires a fresh causal diagnosis and proposal.

## Entry 000 — Log initialized

- Date: 2026-09-18
- State: `PLAN/LOG SETUP ONLY`
- Mutation performed: none
- Authorization: `ISSUE_REQUIRES_ACTION`
- Primary target: `rifle/hold-idle/local+remote`
- Required views: local eye-camera and remote complete-body/third-person view
- Required authored relationship: the real animated character, bilateral arms/hands, sleeves, weapon, grips, sockets, eye anchor, and animations remain one shared state

### Carry-forward baseline facts

These values are copied from the prior progress history for orientation only. They are not a fresh inventory and cannot authorize a mutation; each must be re-measured against the current rendered scene before a proposal.

- Shared hold-axis slope: `-0.015` body-right units
- Eye approximately `[-0.0084, 1.4690, 0.0801]`
- Left hand approximately `[0.0174, 1.3410, 0.3708]`
- Right hand approximately `[0.0190, 1.3410, 0.2603]`
- Primary/support grip errors: effectively zero in the prior solver readout
- Trusted muzzle-direction error: approximately `0.0244rad` in the prior readout
- First-person barrel-camera alignment: approximately `0.0736–0.0796rad` in the prior captures
- Prior weapon bounds: approximately `0.0516 × 0.1830 × 0.4417m`; scale approximately `0.00547`
- Prior known defects: shoulder alignment approximately `1.45rad`; local rifle presentation too end-on/narrow; remote rifle not distinct from the chest/arm/sling cluster

### Fresh inventory required before proposal

Record all fields below from the current scene and both required views. Do not mark the entry complete while any field is `UNKNOWN`; create a concrete measurement issue and continue resolving it.

- Render path, camera object, projection/FOV, eye/head anchor, gameplay forward/right/up axes
- Character asset, animation clip/state, root, body mesh, skeleton, parent hierarchy, visibility, and permitted head filtering
- Left/right shoulder joints and sockets: local/world transforms, orientation, scale, dimensions, and occlusion
- Left/right upper arms, elbows, forearms, wrists, palms, and fingers: joint/socket names, local/world transforms, reach, orientation, visibility, and occlusion
- Weapon asset, parent/socket, local/world transforms, orientation, scale, dimensions, sight and muzzle axes, and occlusion in both views
- Primary/support grip transforms and errors, hand-to-grip span, weapon-to-body relationship, and any detachment
- Feet/root grounding, body height, clipping/intersection evidence, and camera-relative placement
- Exact visual defect compared with the supplied local and remote references, separated by view
- Fixed numerical thresholds and their source for solver validity, grip, aim, clipping, grounding, perspective, and readability

### Transformation proposal template

- Proposal ID:
- Date:
- Target ID:
- Causal defect measured:
- Exact object or shared transform-chain operation:
- Axis and signed angle and/or translation:
- Units and scope:
- Relationships and guards intentionally unchanged:
- Predicted visual result:
- Predicted numerical result:
- Acceptance criteria:
- Rejection criteria:
- Authorization: `ISSUE_REQUIRES_ACTION` / `AUTHORIZED FOR ONE MUTATION` / `REJECTED`
- Post-mutation diff:
- Fresh local capture:
- Fresh remote capture:
- Observed numerical result:
- Independent raw-image observation:
- Final verdict:
- Next action:

## Entry 001 — Complete fresh inventory and one causal proposal

- Date: 2026-09-18
- Target ID: `rifle/hold-idle/local+remote`
- Source/scene mutation: none. The worktree remains otherwise dirty as found; no source, asset, serialized pose, test expectation, or server mutation was made for this entry.
- Authorization: `ISSUE_REQUIRES_ACTION`. The inventory is complete and the proposal below is recorded for primary review; no mutation is authorized by this entry.

### Evidence manifest

- Fresh complete debugger inventories: `/tmp/inventory-complete-first.json`, `/tmp/inventory-complete-third.json`, captured at `2026-09-18T10:47:49.694Z` and its same-session third-person counterpart.
- Fresh repository inspection records: `.hoplite/artifacts/inventory-first-inspect.json`, `.hoplite/artifacts/inventory-third-inspect.json`.
- Fresh capture records: `.hoplite/artifacts/inventory-first-capture.json`, `.hoplite/artifacts/inventory-third-capture.json`.
- Fresh raw frames: `.hoplite/artifacts/inventory-first.png`, `.hoplite/artifacts/inventory-third.png`.
- First URL: `http://127.0.0.1:3000/pose-editor.html?item=rifle&view=first&backend=webgl2&clip=rifle_idle`.
- Third URL: `http://127.0.0.1:3000/pose-editor.html?item=rifle&view=third&backend=webgl2&clip=rifle_idle`.
- Both requested WebGL URLs fell back to the actual `SVG` renderer. Each raw frame is `1280x720`; the editor canvas is the `1280x645` stage below the header. The frames are contentful and the capture records contain no page or console issues; the known local GLB probe `ERR_ABORTED` is isolated capture-helper noise.

### Shared identity and hierarchy

- Character asset: `Player_one-optimized.glb`; animation state: `rifle_idle`; the same real animated character is present in both views.
- Weapon asset: `scar_l-optimized.glb`; catalog item: `rifle`; the same loaded weapon instance state is present in both views.
- Character scene record: `Scene`, visible, local/world position `[0, 0, 0]`, local/world quaternion `[0, 0, 0, 1]`, local/world uniform scale `0.0258656021`. First-person parent is `FirstPersonContent`; third-person parent is `PoseEditorPose`.
- Complete character inventory: `126` bones and `4` scene mesh records. The two body records are `Aphase1basebody_idle_Aphase1basebody001` (`550` vertices) and `Aphase1basebody_idle_Aphase1basebody001_1` (`13763` vertices), both parented by `Player_Mixamo_Unrigged_Rest` and visible. Their world bounds are respectively `[-0.071619,1.275226,0.015627]..[0.120183,1.642689,0.393010]` and `[-0.260926,-0.025325,-0.245743]..[0.353991,1.744850,0.547480]` metres. The other two scene records are the weapon meshes listed below.
- The first-person permitted head filter is active only on `2` body meshes: `20214` source triangles, `3011` hidden triangles. The third-person head filter is absent, so the complete head remains visible. No arm, hand, torso, leg, or foot mesh is filtered.
- Weapon item root: unnamed wrapper, parent `Scene`, local position `[0.728683,52.049461,11.071620]`, local quaternion `[0.035150,0.025405,-0.715804,0.696953]`, local scale `[0.211518,0.211518,0.211518]`; world position `[0.018848,1.346291,0.286374]`, world quaternion `[0.035150,0.025405,-0.715804,0.696953]`, world scale `[0.005471042,0.005471042,0.005471042]`, visible.
- Weapon hierarchy identity is `Scene → unnamed wrapper → scar_L → SK_Rif_SCAR_L → Object_395 → _rootJoint`, with the authored socket branch under `J_Gun_0199`. The complete inventory contains `91` weapon nodes and `2` visible weapon meshes. The visible meshes are `Object_482` under `Object_395` (`21054` vertices) and `SM_Rif_SCAR_L_Mag_001_ScarMK16Mag_MI_0` under `SM_Rif_SCAR_L_Mag_001` (`1709` vertices). The complete node identity list and every node local/world matrix are retained in both debugger JSON inventories.
- Weapon world bounds are `[-0.010087,1.253862,0.075483]..[0.041508,1.436868,0.517175]` metres, dimensions `0.051595 × 0.183006 × 0.441691m`. Mesh bounds are `Object_482: [-0.004357,1.285385,0.083790]..[0.036567,1.420748,0.512739]` and magazine ` [0.009174,1.256746,0.282343]..[0.026252,1.365364,0.323673]`.

### Camera, body, limb, grounding, and visibility inventory

| view | camera transform and projection | camera-relative axes and placement |
| --- | --- | --- |
| first | camera has no parent; position/world position `[-0.008382,1.469020,0.080141]`, quaternion `[0,1,0,0]`, scale `[1,1,1]`, FOV `72°`, near `0.08m`, forward `[0,0,1]` | camera equals the real eye anchor; eye-to-head offset is `+0.120m` along gameplay forward; body forward is `+Z`, right is `+X`, up is `+Y`; near-depth diagnostic is `0.080040m` |
| third | camera has no parent; position/world position `[1.650000,1.450000,3.100000]`, quaternion `[-0.070057,0.266227,0.019405,0.961165]`, scale `[1,1,1]`, FOV `42°`, near `0.01m`, forward `[-0.509058,-0.145004,-0.848430]` | external inspection camera, looking at the complete character near `[0,0.98,0.35]`; the body remains at the same world transform and authored state as first person |

- Major joint hierarchy is intact and visible in both inventories: `mixamorigHead → mixamorigNeck → mixamorigSpine2`; both shoulders are children of `mixamorigSpine2`; each arm is `Shoulder → Arm → ForeArm → Hand`; hips are under `Armature`; feet and toes are under their corresponding legs/feet. Exact local/world position, quaternion, scale, and matrix records for all `126` bones are in the evidence JSON.
- Fresh world joint positions (metres) are identical between views: head `[-0.008382,1.469020,-0.039859]`; neck `[-0.008559,1.442019,-0.052344]`; left shoulder `[0.065067,1.420842,-0.054424]`; left upper arm `[0.197374,1.330889,-0.019900]`; left elbow `[0.092788,1.335326,0.151580]`; left hand `[0.017376,1.340999,0.370794]`; right shoulder `[-0.082219,1.420896,-0.051006]`; right upper arm `[-0.222225,1.351108,-0.002876]`; right elbow `[-0.023495,1.349803,0.031091]`; right hand `[0.019033,1.340999,0.260312]`; hips `[-0.000944,0.960850,0.000165]`; spine `[-0.005308,1.055649,-0.019737]`; spine1 `[-0.007535,1.168038,-0.032433]`; spine2 `[-0.008739,1.296837,-0.043574]`; left foot `[0.184838,0.100148,0.120005]`; right foot `[-0.081733,0.100240,-0.126286]`; left toe `[0.233697,0.000484,0.267824]`; right toe `[-0.167223,0.000570,-0.003385]`.
- The complete joint records show local scales approximately `[1,1,1]` and world scales approximately `[0.000258656,0.000258656,0.000258656]`; the exact per-joint local/world orientations are retained in the JSON rather than rounded here. The bilateral shoulder/arm/forearm/hand chains are present, visible, and continuous.
- Grounding: both toe anchors are approximately `0.0005m` above the ground plane, both feet are at `y≈0.100m`, and the body mesh lower bound is `y=-0.025325m`; the remote raw frame shows both feet grounded with no float/sink. No measured body/weapon penetration is reported.
- Local occlusion: both hands and forearms are visible, the torso/head-filter exception is active, and the weapon is partially lost inside the arm/sleeve/receiver cluster. Remote occlusion: head, torso, both arms/hands, legs, and feet are visible; the weapon is present but its receiver/barrel silhouette merges with the chest/arm/sling cluster. No detachment is visible.

### Socket, grip, muzzle, and solver inventory

- Authored/candidate socket records are present and visible: `tag_trigger_0223` (parent `J_Gun_0199`, world `[0.019033,1.340999,0.260312]`), `combat_grip_0233` (parent `J_Gun_0199`, world `[0.017376,1.340999,0.370794]`), `tag_muzzle_0222` (parent `tag_barrel_2_0221`, world `[0.016015,1.347106,0.512403]`), `tag_muzzle_end_0420` (parent `tag_muzzle_0222`, world `[0.016097,1.347573,0.506953]`), `EXPS3_Socket_0225` (parent `J_Gun_0199`, world `[0.018978,1.386254,0.312402]`), `scar_L`, `SK_Rif_SCAR_L`, and `_rootJoint`. Their exact local/world positions, quaternions, scales, and matrices are in both complete inventories. Socket sources are all reported as `candidate`; the node identities are stable across views.
- Primary/support grip errors are `2.694802e-16m` and `3.469447e-18m`; grip-span error is `4.163336e-17m`; grip-orientation error is `0`. The right hand is seated at the primary trigger socket and the left hand at the support grip socket. The item remains attached through the shared scene/solver relationship; it is not a detached arms-only viewmodel.
- Solver result is `solved=true`, `verified=true`, `stable=true`; weapon scale `0.005471042`; trusted muzzle-direction error `0.0244106rad`; elbow-bend error `0`; clipping check is complete with `weaponBody=false`, `weaponArm=false`, `handForearm=false`, `maxPenetration=0`. Score is `0.0488211`.
- The current source contract selects `scar_l-optimized.glb` for `rifle`; the rifle animation contract does not add a named canonical `GripPrimary`/`GripSupport`/`Muzzle` node or a rifle-specific view-model quaternion, so the stable embedded candidates above resolve the authored state. No metadata was changed in this inventory pass.

### Projection and raw-pixel observation

- Local projected character bounds are `[-0.260926,-0.025325,-0.245744]..[0.353991,1.744850,0.547480]`; projected eye/head/shoulders/hands use the exact world points above. Item projection is `[-0.010087,1.253862,0.075483]..[0.041508,1.436868,0.517175]`. Authored muzzle endpoint projection is start `[-0.039777,-0.391641,0.626429]` to end `[-0.039145,-0.388190,0.631159]`; authored direction `[-0.014909,-0.085365,0.996238]`. The measured mesh direction is start `[-0.044464,-0.419797,0.589463]` to end `[-0.040383,-0.393945,0.622865]`, direction `[-0.008457,-0.073055,0.997292]`.
- Local fit diagnostics: both hands visible, hand separation fraction `0.504254`, fit scale `1`, item projected fraction `0.040940 × 0.288177`, body/content projected fraction `1.671080 × 12.302169`, barrel-camera alignment `0.0736093rad`, authored/mesh barrel agreement `0.0139376rad`, muzzle-camera alignment `0.0270173rad`, depth shift `0`, and composition/readiness both accepted by the machine gate. These numerical passes do not override the raw visual failure.
- Third-person projected item/grip points are primary `[0.025189,0.293624,0.994056]`, support `[0.001744,0.291035,0.993875]`, muzzle `[-0.030130,0.292731,0.993625]`; the authored projected endpoint direction remains the same. The complete-body remote frame is valid as a perspective/topology capture, but the rifle is not readable as a distinct equipped weapon.
- Independent raw observation against the supplied references: the reference local view has a large readable receiver/optic/barrel profile entering from the lower-right while preserving the hand/sleeve relationship; the fresh local frame has a narrow nearly end-on white rifle/receiver cluster centered between the hands. The reference remote view shows complete bodies with distinct rifles; the fresh remote frame shows the complete body but the rifle collapses into the chest/arm cluster. The shared defect is present in both views and is not explained by missing body parts, detached parenting, scale, depth, or a camera-only offset.

### Fixed gates for the next same-pose test

- Source thresholds: grip position `≤0.035m`, grip orientation `≤0.35rad`, muzzle angle `≤0.35rad`, hand span `≤0.01m` error, max body penetration `≤0.05m`, max arm penetration `≤0.04m`, elbow bend error `≤0.001`; composition thresholds: barrel-camera alignment `≤0.08rad`, barrel-axis agreement `≤π/3`, projected item/content fractions `≥0.01`, fit width `≤0.72`, fit height `≤0.68`, depth shift `≤1.2m`, and raw channel range `≥16`. Sources are `client/weapons/pose-solver.ts`, `client/pose-editor-composition.ts`, and `client/pose-editor.ts`.
- These gates are unchanged from the rejected trials. Prior hold-axis slope changes (`-0.04`, `-0.25`, `-0.35`), shared center offsets (`+0.02`, `-0.01`), camera/depth/scale experiments, and metadata-only changes are not reused by this proposal.

### Proposal P-001 — shared rifle target-frame roll correction

- Observation: `applyPlayerHoldFrame` and `buildTargetBasis` keep the bilateral hand span nearly collinear with gameplay forward: the current hand-derived rifle axis is approximately `[0.015,0,-0.9999]`, while the muzzle points approximately `+Z`. `buildTargetBasis` then projects body forward off that nearly collinear grip axis; at the current `-0.015` slope this selects approximately body-right as the weapon roll reference. The result preserves all grip/muzzle errors but presents the authored SCAR mesh with its narrow cross-section toward both cameras. The raw local and remote failures are the same shared presentation failure.
- Hypothesis: the causal defect is the ambiguous shared **roll basis** in the weapon-to-character frame, not the already-tested hold center, hold-axis slope, socket selection, camera, scale, or depth. When the rifle grip axis is collinear with body forward, the weapon's authored profile should use the character up axis as its roll reference; the present body-forward projection supplies the wrong quarter-turn for this rifle.
- Exact shared operation: in `client/weapons/pose-solver.ts:buildTargetBasis`, for the `rifle-body-forward` hold frame when `abs(targetAxis.dot(bodyForward)) > 0.99`, use normalized `worldUp` as the perpendicular roll reference before constructing `targetForward`, then recompute `targetUp = targetForward × targetAxis` and the existing target quaternion. At this measured pose, this is exactly a `+π/2` rotation about the target muzzle direction `-targetAxis ≈ [-0.015,0,0.9999]` (approximately world `+Z`), with zero translation and zero scale change. It changes only the shared weapon frame consumed by the same local and remote character/arm/weapon state.
- Scope: one `rifle/hold-idle/local+remote` solver mutation; no camera, eye anchor, character root, animation clip, hand targets, hold-center position, `-0.015` slope, socket identity, weapon parent, scale policy, head-filter policy, gameplay code, or remote-only/local-only branch changes.
- Predicted numerical result: primary/support grip errors, span error, and clipping remain at their measured near-zero/zero values; weapon scale remains `0.005471042`; muzzle direction error remains approximately `0.0244106rad`; barrel-camera and authored/mesh direction errors remain approximately `0.0736093rad` and `0.0139376rad` because the long/muzzle axis is unchanged. The world item dimensions should exchange their transverse presentation from approximately `0.051595 × 0.183006 × 0.441691m` toward `0.183006 × 0.051595 × 0.441691m` without changing volume or scale; exact post-mutation bounds must be measured, not assumed.
- Predicted visual result: the local receiver/magazine/sight cross-section becomes horizontal and materially wider instead of a narrow end-on cluster, while both real hands, forearms, sleeves, and the eye anchor remain in the same pose. The same roll should separate the remote rifle silhouette from the chest/arm/sling cluster without changing the complete-body view.
- Same-pose render test: after explicit authorization, rebuild and restart the editor, recapture the same `rifle_idle` state at the two URLs with fresh unique paths `p001-rifle-hold-idle-first.png` and `p001-rifle-hold-idle-third.png`, capture matching JSON, independently inspect raw pixels before reading diagnostics, and compare against `inventory-first.png`/`inventory-third.png`. No other state or catalog item may be exercised.
- Retain only if both raw frames show the continuous real character/weapon relationship, the local receiver/barrel/sight profile is readable, the remote rifle is distinct, feet remain grounded, no clipping/detachment appears, and every fixed numerical gate remains within tolerance. Revert the one mutation if the profile remains end-on/merged, any grip/muzzle/clipping/grounding/perspective gate changes, or either view requires a camera/depth/screen-space correction. No follow-up tuning is authorized under P-001.
- Review status: `ISSUE_REQUIRES_ACTION`; proposal recorded, source/scene unchanged, and `EDITOR_PASS_ACCEPTED` remains absent.

## Entry 002 — Adversarial review and authorization of P-001

- Date: 2026-09-18
- Target ID: `rifle/hold-idle/local+remote`
- Review mode: primary manual fresh-context review. Delegated review was attempted twice but the available subagent tool rejected its schema before creating a reviewer; no delegated findings are claimed.
- Authorization: `AUTHORIZED FOR ONE MUTATION`. This authorizes only the bounded shared target-basis mutation below; no render, gameplay, metadata, camera, asset, or follow-up tuning mutation is authorized.

### Claim and contract reviewed

- Claim under review: replacing the ambiguous rifle hold-frame roll reference when the hand axis is collinear with body forward will expose the authored rifle cross-section in both the local eye view and the remote complete-body view without changing hand seating, muzzle aim, scale, or parentage.
- Contract: the real animated bilateral character, sleeves/hands, authored weapon, sockets, local eye camera, and complete remote view remain one shared state; all existing numerical, grip, muzzle, clipping, grounding, perspective, and raw-readability gates remain enforceable; a failed readability result must revert this one mutation rather than trigger a follow-up tweak.

### Review findings

- The fresh hand-axis calculation is `[0.014998148, 0.000000931, -0.999887521]`; its absolute dot with body forward is `0.999887521`, so the proposed branch is deterministically selected at the measured pose.
- Projecting body forward off that axis produces the current roll reference near `+X`; projecting world up produces the proposed reference near `+Y`. The frame change is `+π/2` about the target muzzle direction `-targetAxis`, not about the grip axis with the opposite sign. The signed axis and angle in P-001 are correct.
- `solveVerifiedGripPose` is the shared local/remote solver. Both callers pass the same `holdFrame`, preserve the character-to-weapon parenting, and solve the weapon from the same bilateral hand targets before diagnostics. The proposed seam is therefore genuinely shared rather than a local/remote placement branch.
- The current `buildTargetBasis` signature has no hold-frame argument. The exact mutation must pass `options.holdFrame` into that function and guard the new roll reference with `cache.weaponKey === "rifle" && holdFrame === "rifle-body-forward"`; an unguarded dot-product branch would broaden behavior to unrelated weapons or poses and is rejected.
- The rotation preserves the target grip axis and hand targets, but the muzzle endpoint has a measured nonzero angular offset and the clipping result is geometry-dependent. Unchanged muzzle, clipping, scale, and grounding values are predictions only and must be freshly measured.
- The local barrel-camera alignment remains near `0.0736rad` by construction. That means P-001 can widen the rifle cross-section but cannot correct a still-end-on longitudinal presentation. This is an explicit rejection condition, not permission for a second mutation.

### Authorized exact transformation

- In `client/weapons/pose-solver.ts:buildTargetBasis`, pass the active `holdFrame` through the existing shared call. For `weaponKey === "rifle"`, `holdFrame === "rifle-body-forward"`, and `abs(targetAxis.dot(bodyForward)) > 0.99`, project normalized `worldUp` perpendicular to `targetAxis` as `targetForward`; retain the existing `worldUp`/deterministic fallback guards otherwise. Recompute `targetUp = targetForward × targetAxis` and the existing target quaternion. Translation is zero; scale is unchanged.
- The source change is one shared solver seam only. Do not alter `applyPlayerHoldFrame`, hand targets, hold center, lateral slope, sockets, parent, camera, animation, metadata, scale, depth, or either view branch.

### Same-pose test and verdict rules

- Rebuild and restart the editor, then capture fresh unique local and remote `rifle_idle` SVG frames and matching diagnostics. Inspect raw pixels independently before relying on machine diagnostics.
- Retain only if the local rifle receiver/barrel/sight profile is readable, the remote rifle is distinct from the chest/arm/sling cluster, the real character relationship remains continuous, and every fixed numerical, clipping, grounding, perspective, and composition gate passes.
- Revert P-001 if the local frame remains end-on or the remote frame remains merged, or if any existing gate worsens. No follow-up tuning is authorized by this entry. `EDITOR_PASS_ACCEPTED` remains absent until the raw-image and separately validated runtime gates pass.

## Entry 003 — P-001 rejected and reverted

- Date: 2026-09-18
- Target ID: `rifle/hold-idle/local+remote`
- Post-mutation source state: P-001 was applied only at `client/weapons/pose-solver.ts:buildTargetBasis`, then reverted after the required same-pose test. The pre-P-001 shared solver behavior is restored; no second mutation was made.
- Fresh local capture: `.hoplite/artifacts/p001-rifle-hold-idle-first.png`, `.hoplite/artifacts/p001-rifle-hold-idle-first.json`, `.hoplite/artifacts/p001-rifle-hold-idle-first-inspect.json`.
- Fresh remote capture: `.hoplite/artifacts/p001-rifle-hold-idle-third.png`, `.hoplite/artifacts/p001-rifle-hold-idle-third.json`, `.hoplite/artifacts/p001-rifle-hold-idle-third-inspect.json`.
- Capture health: both frames were contentful `1280x720` SVG renders with no page or console errors. The two local GLB probe `ERR_ABORTED` request failures remain the known capture-helper noise; both guarded asset responses were successful.

### Observation and measured result

- Both solver results stayed numerically valid: `solved=true`, `verified=true`, `stable=true`, primary/support grip errors at or below `1.04e-16m`, grip-span error `1.39e-17m`, grip-orientation error `0`, muzzle error `0.0244106rad`, scale `0.005471042`, and clear clipping with zero penetration.
- The shared target did not produce the predicted quarter-turn in the actual selected `rifle_idle` pose. P-001 local bounds were `0.056765 × 0.183691 × 0.441500m` versus the fresh baseline `0.051595 × 0.183006 × 0.441691m`; the transverse dimensions did not exchange. The local barrel diagnostic remained `0.071748rad`.
- Independent raw-pixel review: the local frame still shows a narrow white end-on weapon/receiver cluster buried between the hands rather than a readable receiver/barrel/sight profile. The remote frame still shows the complete grounded body but no distinct readable rifle; the weapon remains merged with the chest/arm/sling cluster. The real hands, sleeves, body, weapon parenting, and grounding remain present, but the readability gates fail in both views.

### Causal finding

- The proposal's unpitched sign calculation was correct, but it did not describe the actual selected candidate. The measured post-solve `shoulderAlignmentError` was `1.451366rad`, consistent with the selected `rifle_idle` candidate carrying approximately `+0.12` forward pitch. After that pitch, the existing projected body-forward roll reference is already near world up, so replacing it with world up produces only a small orientation change instead of the predicted `+π/2` cross-section rotation. The prior review did not inventory the selected candidate's forward pitch; this is the root-cause error in P-001.
- Because the unchanged longitudinal barrel-camera alignment was already identified as a hard rejection condition, the unchanged raw end-on presentation is sufficient to reject the proposal. No follow-up roll, pitch, camera, depth, scale, offset, or screen-space adjustment is authorized under P-001.

- Regression result while P-001 was applied: the focused six-file suite passed, `6` files and `135` tests; the production build passed with existing dynamic-import/chunk-size and CJS `import.meta` warnings only. These checks do not override the failed raw-readability gates.
- Final verdict: `REJECTED`; P-001 is reverted. `EDITOR_PASS_ACCEPTED` remains absent, accepted weapon/utility counts remain `0`, and the target remains `ISSUE_REQUIRES_ACTION`.
- Next action: perform a fresh candidate/forward-pitch inventory and record a new causal proposal before any further source mutation. Do not reuse P-001 or its rejected roll premise.

## Entry 004 — Fresh selected-candidate inventory and P-002 proposal

- Date: 2026-09-18
- Target ID: `rifle/hold-idle/local+remote`
- Source/scene mutation: none for this entry. The rejected P-001 basis is still reverted; no source, asset, serialized pose, test expectation, or server mutation was made while collecting this inventory.
- Authorization: `ISSUE_REQUIRES_ACTION`. P-002 is recorded for primary adversarial review; it is not yet authorized in this entry.

### Evidence manifest

- Fresh local inventory: `.hoplite/artifacts/inventory-004-first-inspect.json`.
- Fresh remote inventory: `.hoplite/artifacts/inventory-004-third-inspect.json`.
- Fresh candidate/selection inventory: `.hoplite/artifacts/inventory-004-candidate-inspect.json`.
- Exact candidate-basis calculation: `.hoplite/artifacts/inventory-004-candidate-basis.json` and `.hoplite/artifacts/p002-prediction.json` (the latter is the pre-mutation body-right prediction).
- Fresh local frame and capture record: `.hoplite/artifacts/inventory-004-rifle-hold-idle-first.png` and `.hoplite/artifacts/inventory-004-rifle-hold-idle-first.json`.
- Fresh remote frame and capture record: `.hoplite/artifacts/inventory-004-rifle-hold-idle-third.png` and `.hoplite/artifacts/inventory-004-rifle-hold-idle-third.json`.
- Render URLs: `pose-editor.html?item=rifle&view=first&backend=webgl2&clip=rifle_idle` and the same URL with `view=third`. Both requested WebGL2 and rendered through the editor's SVG fallback; both frames are `1280x720`, contentful, and have no page or console errors. The capture helper reports the two known guarded GLB-probe `ERR_ABORTED` requests; they do not prevent the loaded SVG scene or diagnostics.

### Shared authored identity and hierarchy

- Character: `Player_one-optimized.glb`, animation state `rifle_idle`, same real animated character in both views; the complete `126`-bone hierarchy and `4` scene meshes remain loaded. Both shoulders, upper arms, forearms, wrists, palms, fingers, torso, legs, and feet remain visible in the remote view; the bilateral arm/hand chains remain visible locally.
- First-person head filtering remains limited to `2` body meshes and `3011/20214` source triangles. No arm, hand, sleeve, torso, leg, or foot geometry is filtered. The third-person head filter remains absent.
- Weapon: `scar_l-optimized.glb`, the same visible instance relationship in both views, parented under `Scene` through the unnamed wrapper and the authored `scar_L → SK_Rif_SCAR_L → Object_395 → _rootJoint` hierarchy. The complete authored socket branch remains present.
- Authored/candidate sockets remain `tag_trigger_0223` primary, `combat_grip_0233` support, `tag_muzzle_0222` muzzle, and `EXPS3_Socket_0225` ADS; all four resolve from `candidate` sources. The fresh inventories retain their node transforms and world matrices.

### Cameras, axes, limbs, weapon, and grounding

- Local camera is the real eye anchor `[-0.008381670, 1.469020011, 0.080140938]`, FOV `72°`, near `0.08m`, forward `+Z`. Remote camera is `[1.65, 1.45, 3.10]`, FOV `42°`, forward `[-0.509058054,-0.145004415,-0.848430090]`; it views the same body/weapon state externally.
- Gameplay axes remain body-forward `+Z`, body-right `+X`, world-up `+Y`. Fresh left/right shoulders are `[0.065067322,1.420841740,-0.054423580]` and `[-0.082218939,1.420895512,-0.051005684]`; fresh left/right hands are `[0.017375679,1.340998541,0.370793841]` and `[0.019032891,1.340998644,0.260311831]`. The selected hand span is `[0.014998148,0.000000931,-0.999887521]` after normalization.
- Weapon scale is `0.005471041969`; world dimensions are `0.051594641 × 0.183006104 × 0.441691344m`; the parent is `Scene`; current world position is `[0.018847820,1.346290652,0.286374114]`; the current selected target quaternion is `[0.035149504,0.025404734,-0.715804233,0.696952948]`.
- Primary/support grip errors are `2.6948e-16m` and `3.4694e-18m`; grip-span error is `4.1633e-17m`; grip-orientation error is `0`; muzzle error is `0.024410572rad`; clipping penetration is `0`; solver is `solved=true`, `verified=true`, `stable=true`. Feet/root grounding and body height match the prior fresh inventory; no measured weapon/body or weapon/arm penetration or detachment is present.

### Selected candidate and target-frame inventory

- The rifle candidate set is exactly `rifle-neutral (0)`, `rifle-low-ready (-0.12)`, and `rifle-high-ready (+0.12)` forward-pitch radians from `VERIFIED_POSE_CANDIDATES`. The live `shoulderAlignmentError=1.4504327878874201rad` exactly matches the calculated `rifle-high-ready` basis; the selected candidate is therefore `rifle-high-ready`, `forwardPitch=+0.12rad`.
- Selected candidate body-forward basis after pitch: `[0,0.119145221,0.992876838]`.
- Current target basis: `targetAxis=[0.014998148,0.000000931,-0.999887521]`, `targetForward=[0.124004747,0.992279880,0.001860975]`, `targetUp=[-0.992168271,0.124018710,-0.014882245]`. The target muzzle direction is `-targetAxis=[-0.014998148,-0.000000931,0.999887521]`.
- Current source basis from the resolved authored geometry is `sourceAxis=[0.085330981,0.002367321,-0.996349848]`, `sourceForward=[-0.991677646,0.096960185,-0.084700460]`, `sourceUp=[-0.096405752,-0.995285446,-0.010621327]`. The resulting current target quaternion is `[0.035149504,0.025404734,-0.715804233,0.696952948]`.

### Observation and causal hypothesis

- Independent raw-pixel review of the fresh frames confirms the baseline defect: the local frame shows a narrow end-on receiver/sight cluster buried between the hands instead of a readable continuous rifle; the remote frame shows the complete grounded character, but the rifle remains merged into the chest/arm/sling cluster. The editor readout's `readable=yes` is not accepted as visual evidence.
- The hand axis is nearly body-forward, so the solver correctly maps the authored rifle's longitudinal grip/muzzle axis toward the local camera. The selected `+0.12rad` candidate then uses pitched body-forward as the roll reference; after projection, that reference is already nearly world-up, producing `targetForward≈+Y` and `targetUp≈-X`. P-001 replaced that near-world-up reference with world-up and therefore made only a small change; this entry does not reuse P-001's world-up premise.
- Hypothesis: the causal presentation defect is the selected candidate's pitched body-forward roll reference, not translation, scale, camera depth, socket seating, or the authored muzzle axis. A projected gameplay body-right roll reference should preserve the exact hand/muzzle line while exposing the weapon's authored broad receiver/sight cross-section to both cameras.

### Proposal P-002 — projected gameplay-right target basis

- Exact transformation, one shared operation: in `client/weapons/pose-solver.ts:buildTargetBasis`, when `abs(targetAxis.dot(bodyForward)) > 0.99`, replace only the roll reference used to construct `targetForward` with normalized `worldUp × bodyForward` (the gameplay body-right direction). Keep `targetAxis`, `targetMuzzleDirection`, `forwardPitch`, grip anchors, translation solve, scale solve, camera transforms, and all visibility/filter rules unchanged; then run the existing perpendicular projection, cross-product, and quaternion construction.
- Predicted selected target basis: `targetForward=[0.999887521,-0.000000014,0.014998148]`, `targetUp=[0,0.9999999999996,0.000000931]`, with unchanged `targetAxis` and muzzle direction.
- Predicted target quaternion: `[-0.050079256,-0.002891044,0.997564429,-0.048465652]`; predicted rotation delta from the current selected quaternion is `1.446457495rad`. Translation and scale are predicted unchanged because grip anchors and target hand positions are unchanged.
- Visual prediction: the local frame should show a continuous receiver/sight/barrel silhouette rather than the narrow end-on cluster; the remote frame should show a distinct rifle crossing the hands and chest rather than a merged chest/arm/sling mass. Numerical grip, muzzle, clipping, grounding, and same-character identity gates must remain at baseline or within their fixed thresholds.
- Same-pose render test: after authorization, make exactly this one shared solver change, rebuild/restart the editor, then capture unique `rifle_idle` local and remote SVG frames at the same sample and camera contracts. Inspect the raw pixels independently and retain only if both views pass the visual prediction and every fixed gate; revert immediately if either view remains end-on/merged or any fixed gate worsens. No follow-up tuning is authorized under P-002.

### Fixed gates for P-002

- Solver: solved, verified, stable; primary/support grip and grip-span errors ≤ `0.035m`; grip-orientation error ≤ `0.35rad`; trusted muzzle error ≤ `0.35rad`; complete clipping proxy; no weapon/body, weapon/arm, or hand/forearm penetration.
- Shared relationship: same real `Player_one-optimized.glb`, same `rifle_idle` animation/sample, bilateral hands/sleeves/body, authored weapon hierarchy, candidate sockets, eye anchor, and grounding in local and remote views; no fake arms, detached weapon, or independent local/remote pose.
- Local composition: eye anchor and `+Z` camera contract unchanged; bilateral hand visibility, complete-body continuity, natural crop, near depth ≥ `0.08m`, and measured authored barrel alignment ≤ the baseline `0.073609264rad` with axis agreement ≤ `0.013937619rad`.
- Remote composition: complete head/body/arms/hands/weapon/feet readable from the external camera; no head filter; weapon visibly distinct from the chest/arm/sling cluster.
- Raw readability is authoritative over solver/readout labels. Acceptance counts remain zero until all gates pass in both fresh frames.

## Entry 005 — P-002 rejected and reverted

- Date: 2026-09-18
- Target ID: `rifle/hold-idle/local+remote`
- Post-mutation source state: P-002 was applied only in the shared `buildTargetBasis` solver seam, diagnosed against the fixture's actual source-forward axis, bounded to the active rifle hold frame during regression comparison, then reverted after the required same-pose capture. The P-002-only regression assertion was also removed. No camera, asset, metadata, scale, depth, offset, or follow-up pose mutation was made.
- Focused P-002 test: the corrected fixture assertion passed when P-002 was active; it measures the fixture's local `+X` source-forward basis, not its local `+Z` roll/up axis. An unguarded P-002 branch failed the existing world-fixed triangle clipping invariant; disabling the branch made that invariant pass, and the bounded hold-frame guard restored the full suite. This was treated as a scope guard, not as a new visual adjustment.
- Regression and build evidence while P-002 was active: the six-file focused suite passed `6` files and `136` tests after the hold-frame guard; the production build passed with the existing dynamic-import, chunk-size, and CJS `import.meta` warnings. A default-heap `pnpm run lint` attempt terminated with Node heap exhaustion before typecheck completion.
- Fresh local capture: `.hoplite/artifacts/p002-rifle-hold-idle-first.png`, `.hoplite/artifacts/p002-rifle-hold-idle-first.json`.
- Fresh remote capture: `.hoplite/artifacts/p002-rifle-hold-idle-third.png`, `.hoplite/artifacts/p002-rifle-hold-idle-third.json`.
- Capture health: both frames were unique contentful `1280x720` SVG renders with no page errors or console issues. The two local GLB probe `ERR_ABORTED` failures remain the known capture-helper noise; guarded remote asset responses were successful.

### Observation and measured result

- The local diagnostics report `solver=VERIFIED`, zero grip errors, `muzzle=0.0244rad`, `clipping=clear`, but `pose=REJECTED` because the measured barrel is not camera-forward (`diagnosticAlignment=0.0881rad`).
- The remote diagnostics report `pose=VERIFIED`, zero grip errors, `muzzle=0.0244rad`, and `clipping=clear`, but the raw frame does not show a distinct readable rifle crossing the hands and chest.
- Independent raw-pixel review rejects both views. The local frame remains a large hand/sleeve mass with only a buried end-on/narrow weapon fragment at the lower right; it does not show a continuous receiver, sight, and barrel relationship. The remote frame shows the complete grounded character, but the weapon is not visually separable from the hand/chest cluster. The readout's `readable=yes` label is not accepted over the pixels.

### Verdict and next action

- Final verdict: `REJECTED`; P-002 is reverted. `EDITOR_PASS_ACCEPTED` remains absent, accepted weapon/utility counts remain `0`, and the target remains `ISSUE_REQUIRES_ACTION`.
- No follow-up tuning is authorized under P-002. A future attempt requires a new fresh inventory and a separately reviewed bounded proposal; runtime/gameplay/network evidence remains unperformed and unproven.

## Entry 006 — Post-revert verification

- Date: 2026-09-18
- Post-revert audit: `git diff --check` passes; no P-002-only solver branch, test assertion, or debug marker remains in `client`, `tests`, `server`, or `shared`. The broader pre-existing worktree changes remain untouched.
- Reverted focused regression: `6` files and `135` tests passed, covering the retained shared pose, local, remote, animation-contract, and muzzle behavior. The one-test difference from the active P-002 run is the removed temporary P-002 assertion.
- Reverted production build: `pnpm run build` passed. Existing dynamic-import, chunk-size, and CJS `import.meta` warnings remain non-fatal.
- Heap-expanded typecheck: `NODE_OPTIONS=--max-old-space-size=4096 pnpm run lint` reaches the compiler and fails on the pre-existing `benchmarks/diagnostics/measure_benchmark_ipc.ts:27` `RunnerOptions.profile` type error; no P-002 file is implicated.
- Rejected P-002 local/remote PNG and JSON artifacts remain present and unchanged at `.hoplite/artifacts/p002-rifle-hold-idle-{first,third}.{png,json}`; both PNGs are `1280x720`.
- Status remains `REJECTED` and `ISSUE_REQUIRES_ACTION`; `EDITOR_PASS_ACCEPTED` and accepted weapon/utility counts remain `0`. Runtime/gameplay/network/server usability remains unperformed and unproven.
