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

## Entry 007 — Bounded grip-axis roll trial rejected and reverted

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Fresh mutation boundary: the trial was editor-only and opt-in via `trial=rifle-roll90`; it did not alter the shared solver, gameplay, runtime local/remote systems, camera implementation, server, networking, physics, or assets. The trial source was fully reverted after the required two-view review.
- Prediction: rotating the solved rifle `90°` about the measured primary-to-support grip axis would preserve both hand anchors and expose a readable receiver/sight profile in local and remote views.
- Invariant result from `.hoplite/artifacts/trial-rifle-roll90-report.json`: both grips and grip span stayed fixed to floating-point precision (`7.08e-16m`, `4.00e-16m`, and `4.16e-17m`), but the muzzle axis changed by `0.034520rad`; this violates the trial's `1e-4rad` muzzle invariant. The base solver remained numerically verified, but the trial readout correctly reported `pose=REJECTED`.
- Render health: both trial captures were unique contentful `1280x720` WebGL2 frames with `contextLost=false`, durable/contentful frames, no page errors, and no console issues. The known local GLB-probe `ERR_ABORTED` requests were followed by successful guarded remote GLB responses and are not treated as pose evidence.
- Raw first-person verdict: `.hoplite/artifacts/trial-rifle-roll90-first.png` shows the roll removing the centered baseline sight/receiver presentation and leaving a narrow side strip at the lower right; it fails the readable weapon/profile gate.
- Raw third-person verdict: `.hoplite/artifacts/trial-rifle-roll90-third.png` still shows the complete grounded character, but the rifle remains visually merged into the hand/chest cluster; it fails the distinct remote-weapon gate.
- Reverted final evidence: `.hoplite/artifacts/final-rifle-hold-idle-after-revert-first.png`, `.hoplite/artifacts/final-rifle-hold-idle-after-revert-third.png`, and `.hoplite/artifacts/final-rifle-hold-idle-after-revert-report.json`. The final source state has no trial marker (`editorTrial=null`); only this evidence-log entry remains as a tracked change. The baseline remains numerically solver/composition/readiness verified but visually unresolved.
- Verification: `30/30` focused PoseEditor tests passed, the standalone PoseEditor build passed, and `git diff --check` passed. No `EDITOR_PASS_ACCEPTED` marker was added.
- Final verdict: `REJECTED`; retain `ISSUE_REQUIRES_ACTION`. Do not perform follow-up parameter tuning under this hypothesis; take a new fresh inventory and record a new bounded causal proposal before changing the editor again. Runtime/gameplay/network evidence remains deferred and unproven.

## Entry 008 — Measured transverse-balance hypothesis authorized for one editor trial

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Fresh baseline evidence: `.hoplite/artifacts/final-rifle-hold-idle-after-revert-first.png`, `.hoplite/artifacts/final-rifle-hold-idle-after-revert-third.png`, and `.hoplite/artifacts/final-rifle-hold-idle-after-revert-report.json`. The reverted baseline is the current source/scene state; no implementation mutation is present before this entry.
- Primary observation: the local raw frame shows the real hands and sleeves but only a narrow, nearly end-on rifle profile centered between them. The remote raw frame shows the complete grounded character, while the rifle collapses into the chest/arm/sling silhouette. The measured weapon bounds are `0.051595 × 0.183006 × 0.441691m`; the hand axis is `[0.014998148, 0.000000931, -0.999887521]`, and the muzzle points approximately camera-forward. The three prior orientation trials changed the roll basis without measuring the rendered transverse silhouette; none made both raw views readable.
- New causal diagnosis: the failure is the anisotropic transverse presentation of the authored receiver (`0.051595m` versus `0.183006m`) after the longitudinal grip/muzzle axis is solved. A quarter-turn exposes the broad extent but produces the rejected narrow side strip; another arbitrary roll is not justified. The bounded next operation is to balance the two measured transverse extents, not to sweep angles or move the camera/weapon in screen space.
- Hypothesis: a quaternion roll of exactly `π/4` around the solved target muzzle/grip axis will maximize the minimum projected transverse extent of the measured rectangular receiver envelope. It will preserve the longitudinal grip line and both hand anchors while exposing a diagonal receiver/magazine/sight profile in the local view and a non-collapsed rifle silhouette in the remote view.
- Exact transformation: add an opt-in PoseEditor-only trial context `rifle:rifle_idle:balanced-transverse`. In the shared target-basis construction used by that editor context only, compose `qRoll = new THREE.Quaternion().setFromAxisAngle(targetMuzzleDirection, Math.PI / 4)` and pre-multiply the existing target quaternion. Re-run the existing support-anchor translation solve after the quaternion. Do not use `Euler`, `rotation.set`, direct rotation components, screen-space translation, parameter sweeps, camera changes, scale changes, socket changes, hand-target changes, or local/remote branches. The runtime local and remote callers must not receive the trial context.
- Predicted numerical result: primary/support grip and grip-span errors remain within the existing near-zero tolerance; scale, parent, eye anchor, hands, feet, clipping policy, and longitudinal grip/muzzle line remain unchanged. The transverse envelope should project to approximately `(0.051595 + 0.183006) / √2 = 0.1656m` on each balanced axis before perspective, while the `0.441691m` longitudinal span remains. The muzzle direction may change only by the measured authored socket offset; exact post-trial values must be captured rather than assumed.
- Predicted visual result: the local receiver should enter from the lower-right as a readable diagonal profile with rail, magazine, and barrel relationship visible between the real hands; the remote frame should expose the rifle as a distinct equipped object without changing the complete grounded character. If either raw frame remains end-on/merged, or any connection/grounding/clipping/perspective gate worsens, the hypothesis is rejected and the trial is reverted without follow-up tuning.
- Required evidence: fresh unique raw local and remote `rifle_idle` captures, matching diagnostics, source diff, focused tests, and standalone PoseEditor build. The primary reviewer inspects both raw images before reading diagnostics. No `EDITOR_PASS_ACCEPTED` marker may be added by this trial.
- Authorization: `AUTHORIZED FOR ONE MUTATION`. This is one deterministic quaternion composition only; the delegated implementation subagent may execute it and capture evidence but may not broaden the scope, choose another angle, or self-accept the target.

## Entry 009 — Authored optic-up source-frame hypothesis authorized for one editor trial

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Entry 008 result: the delegated `trial=rifle-balanced-transverse` implementation was reverted after review. Its raw first-person frame showed only a narrow white strip at lower-right with no readable receiver/rail/barrel relationship; its remote frame showed the complete body but no distinct rifle silhouette. Diagnostics recorded truthful grip-position errors near zero, but `gripOrientationError=0.785398rad` and `pose=REJECTED`. The rejected evidence remains at `.hoplite/artifacts/p004-rifle-balanced-transverse-{first,third}.{png,json}`.
- Revert evidence: the trial implementation and focused assertion were removed by the implementation subagent; `PoseEditor/pose-editor.ts`, `client/weapons/pose-solver.ts`, and `tests/pose-solver.test.ts` match their pre-trial state. Focused PoseEditor tests (`30/30`), the standalone build, and `git diff --check` passed. No acceptance marker was added.
- New causal diagnosis: a post-solve quaternion roll cannot be retained because the solver's grip-orientation invariant intentionally couples the weapon's source-up frame to the target-up frame. The prior trials also treated the measured `EXPS3_Socket_0225 - tag_trigger_0223` offset as a generic roll tangent in `buildSourceBasis`; for this authored rifle that socket is an optic/rail-up measurement. The causal correction is to construct the source frame from that measured optic-up vector before the existing quaternion frame alignment, not to rotate the finished pose afterward.
- Hypothesis: using the normalized projection of the authored ADS/optic offset onto the plane perpendicular to the measured primary-support axis as `sourceUp`, then deriving `sourceForward = sourceAxis × sourceUp`, will align the real optic/rail-up direction through the existing quaternion solver. This should preserve grip position, grip span, and the solver's orientation invariant while exposing the receiver/rail profile in both views.
- Exact transformation: add an opt-in PoseEditor-only context `rifle:rifle_idle:optical-up`. For only `weaponKey === "rifle"`, `holdFrame === "rifle-body-forward"`, and that exact context, replace the fallback `sourceForward` construction in `buildSourceBasis` with: `sourceHint = anchors.ads.point - anchors.primary.point`; project and normalize `sourceHint` perpendicular to `sourceAxis` into `sourceUp`; compute and normalize `sourceForward = sourceAxis × sourceUp`; rebuild `sourceBasis` and its inverse; let the existing target-basis quaternion (`setFromRotationMatrix`) and support-anchor translation solve run unchanged. Require the measured ADS candidate and finite non-degenerate projection; fail the opt-in trial rather than inventing a fallback when unavailable. Do not use Euler, direct rotation components, post-solve roll, screen-space placement, camera changes, scale changes, socket identity changes, hand-target changes, or local/remote branches. Runtime callers must never receive the trial context.
- Predicted numerical result: the target axis, hand positions, primary/support grip errors, grip span, weapon scale, parent, camera, grounding, and clipping policy remain unchanged. `gripOrientationError` should return to the existing frame-aligned range because the target quaternion is built from the same measured source frame it diagnoses. Muzzle-direction and barrel-alignment values must be freshly measured; no unchanged value is assumed.
- Predicted visual result: the local view should show the optic/rail and receiver as a connected rifle entering from the lower-right rather than a centered end-on fragment; the remote view should show a distinct rifle seated in the same real hands and no new body/weapon detachment. Reject and revert if either raw frame remains merged/end-on, the ADS frame is unavailable, or any fixed grip, muzzle, clipping, grounding, or perspective gate worsens.
- Required evidence: fresh raw local and remote captures for `trial=rifle-optical-up`, matching diagnostics, focused tests, standalone build, and source diff. The primary reviewer inspects pixels before diagnostics. No `EDITOR_PASS_ACCEPTED` marker may be added.
- Authorization: `AUTHORIZED FOR ONE MUTATION`. The delegated implementation subagent may execute only this measured source-frame change and capture evidence; it may not choose another basis, angle, fallback, or follow-up adjustment.

## Entry 010 — Optical-up trial rejected by raw local and remote evidence

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`.
- Evidence manifest: `.hoplite/artifacts/p005-rifle-optical-up-first.png`, `.hoplite/artifacts/p005-rifle-optical-up-third.png`, `.hoplite/artifacts/p005-rifle-optical-up-first.json`, and `.hoplite/artifacts/p005-rifle-optical-up-third.json`.
- Local observation: the raw first-person capture shows a large hand/forearm and splayed fingers, but no readable rifle silhouette or identifiable receiver, optic/rail, magazine, stock, or barrel relationship. The required lower-right-to-center weapon presentation and a connected hand/weapon relationship are absent.
- Remote observation: the raw third-person capture shows the complete character and both hands in front of the torso, but no distinct rifle silhouette is visible. The pose reads as empty-handed; numerical grip verification does not establish a visible weapon connection. The feet are present, but the black editor background provides no independent ground plane.
- Measured result: the trial restored zero reported grip-orientation error and retained near-zero grip-position/span errors, but the measured solver result does not satisfy the visual readability, connection, or perspective gates. The capture metadata reports SVG fallback for the WebGL2 query; this does not change the raw-pixel rejection.
- Causal finding: using the ADS displacement as the source-up frame changed the solved weapon orientation without exposing the authored rifle body in either intended view. This hypothesis is rejected as a whole; no angle, camera, scale, socket, or hand-target follow-up is authorized.
- Verdict and control: `REJECTED`; preserve all p005 evidence and this record, then surgically revert only the p005 implementation/test hunks through the discovered delegation path. After revert, return to a fresh measured inventory before proposing another transformation. `EDITOR_PASS_ACCEPTED` remains absent.

## Entry 011 — Optical-up source and test revert verified

- Date: 2026-09-19
- Delegated revert result: only the Entry 009 optical-up hunks were removed from `PoseEditor/pose-editor.ts`, `client/weapons/pose-solver.ts`, and `tests/pose-solver.test.ts`; those files now match their pre-trial state. No runtime, gameplay, server, networking, camera, physics, asset, or acceptance files were changed.
- Evidence result: p005 raw PNG/JSON captures remain preserved with unchanged hashes for later audit; this rejection record and all prior investigation records remain intact.
- Verification result: focused PoseEditor/solver tests passed `78/78`; the standalone PoseEditor build completed after `47` modules; `git diff --check` passed. No follow-up mutation was made.
- Current control state: `REJECTED` / `ISSUE_REQUIRES_ACTION`. The next allowed step is a fresh measured inventory and a separately authored causal proposal; optical-up angle tuning, parameter sweeps, and diagnostic-only acceptance are not authorized.

## Entry 012 — p006 fresh baseline inventory and primary raw review

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Inventory state: fresh baseline evidence recorded; no scene, source, test, runtime, camera, asset, physics, networking, or acceptance-marker mutation was performed.
- Evidence manifest: `.hoplite/artifacts/p006-baseline-rifle-idle-first.png` / `.json` and `.hoplite/artifacts/p006-baseline-rifle-idle-third.png` / `.json`; both are raw Playwright `1280x720` captures from the intended local eye-camera and external third-person views.
- SHA-256: `.hoplite/artifacts/p006-baseline-rifle-idle-first.png` `14072bb24d83f75a67fc5c700dd4887ac926c317b48af61ea6ed825dda25bcff`; `.hoplite/artifacts/p006-baseline-rifle-idle-first.json` `4e14764a626bbae272b884be3c1e0f10187b6b21c30c1ef9425a2fabbbcaf9b0`; `.hoplite/artifacts/p006-baseline-rifle-idle-third.png` `605ebf851c8d88a0f0fc536817eb06d49dd9641717396d11f026090d9243b41f`; `.hoplite/artifacts/p006-baseline-rifle-idle-third.json` `c7b361bb629b1f725043afcc53d2fae90b45a5aaa29940af1e225c43aa85af06`.

### Runtime and authored asset inventory

- Asset identity: weapon `scar_l-optimized.glb`; character `Player_one-optimized.glb`; clip `rifle_idle`; active rendered backend `SVG` fallback. The numerical solver reports `verified=true`; weapon scale is `0.00547104197`; world bounds are `0.051595 x 0.183006 x 0.441691m`; primary/support grip errors and grip-span error are approximately zero; muzzle error is `0.0244106rad`; clipping is clear.
- Resolved candidate socket nodes: primary `tag_trigger_0223`; support `combat_grip_0233`; muzzle `tag_muzzle_0222`; ADS `EXPS3_Socket_0225`.
- Decoded authored node translations: `tag_muzzle_0222=[0,-6.2538,0]`; `tag_trigger_0223=[0,-0.4841,-1.3709]`; `combat_grip_0233=[-0.0478,-20.6066,0.3525]` with approximately `90°` authored Z rotation; `EXPS3_Socket_0225=[-0.1149,-9.2634,7.6836]` with approximately `90°` authored Z rotation.
- Decoded rifle mesh source bounds: `[-13.28,-4.36,67.54]` to `[12.01,3.24,146.31]`; the magazine is a separate component near negative Z.
- Fresh character bounds: min `[-0.2609255,-0.0253252,-0.2457435]`, max `[0.3539913,1.7448502,0.5474802]`. Eye/head anchor is `[-0.0083817,1.4690200,0.0801409]` / `[-0.0083817,1.4690200,-0.0398591]`; shoulders are `[0.0650673,1.4208417,-0.0544236]` / `[-0.0822189,1.4208955,-0.0510057]`; hands are `[0.0173757,1.3409985,0.3707938]` / `[0.0190329,1.3410,0.2603118]`.
- Local camera inventory: position equals the eye anchor, forward `[0,0,1]`, authored barrel direction `[-0.0149085,-0.0853645,0.9962382]`, barrel-camera alignment `0.0736093rad`; both hands report visible and the head filter hides `3011/20214` triangles across two meshes.
- Remote camera inventory: position `[1.65,1.45,3.1]`, forward `[-0.5090581,-0.1450044,-0.8484301]`; it views the same character/weapon transforms externally. Third-person barrel measurement is not performed (`actual=null`).

### Raw review and control state

- First-person raw pixels: the frame is dominated by forearms and splayed hands with only a thin bright edge-on rifle fragment visible. No readable receiver, optic/rail, magazine, stock, or barrel relationship is present; the broad lower-right-to-center weapon relationship in the supplied reference is not present.
- Third-person raw pixels: the complete head-to-feet character and feet/stance are visible, but no distinct rifle silhouette or clear hand-to-weapon connection is visible; the pose reads empty-handed. The black editor background has no independent ground plane.
- Infrastructure limitation: the standalone Vite public tree lacks the two model files, so Playwright temporarily served the real GLBs from `/tmp/pose-primitive-assets`; the browser emitted the existing WebGPU context-provider warning and used SVG fallback. No repository asset or implementation file was changed.
- Primary verdict: `REJECTED`; current control state `ISSUE_REQUIRES_ACTION`; no `EDITOR_PASS_ACCEPTED` marker or acceptance count was added.

## Entry 013 — Delegated adversarial review of P-001 frame prediction

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Reviewer verdict: `FAIL`.
- Authorization: no mutation authorized. This is a review-only entry; implementation, tests, runtime, camera, assets, and acceptance files remain unchanged.

### P-001 review finding

- P-001's target-frame construction is mathematically coherent and is distinct from the p004 finished-pose roll and the p005 ADS/source-frame trial. Its documented `+π/2` prediction is nevertheless false for the actual selected p006 `rifle_idle` candidate because `buildTargetBasis` receives `forwardPitch=+0.12` after hand-target solving.
- Measured active values: `targetAxis=[0.014998148,0.000000931,-0.999887521]`; `bodyForward=normalize([0,0.12,1])=[0,0.119145221,0.992876838]`; `abs(targetAxis·bodyForward)=0.992765050`.
- Existing projected frame: `targetForward=[0.124004745,0.992279880,0.001860975]`.
- Proposed projected-world-up frame: `targetForward=[-0.000000014,1.000000000,0.000000931]`.
- The signed frame delta about `targetMuzzleDirection=-targetAxis` is `+0.124338844rad` / `7.124091deg`, not `+π/2`. The active forward pitch makes the existing projected body-forward reference already close to world-up, so the proposed replacement cannot produce the documented quarter-turn.

### Historical evidence and invariant boundary

- Existing P-001 evidence remains preserved at `.hoplite/artifacts/p001-rifle-hold-idle-first.png`, `.hoplite/artifacts/p001-rifle-hold-idle-first.json`, `.hoplite/artifacts/p001-rifle-hold-idle-first-inspect.json`, `.hoplite/artifacts/p001-rifle-hold-idle-third.png`, `.hoplite/artifacts/p001-rifle-hold-idle-third.json`, and `.hoplite/artifacts/p001-rifle-hold-idle-third-inspect.json`.
- Historical P-001 measurements were approximately `0.056765 x 0.183691 x 0.441500m` bounds and `0.071748rad` barrel alignment; both raw local and remote frames still failed readability.
- If a P-001-like branch were applied, the valid conditional invariants are `targetAxis`/muzzle direction, source-to-target anchor seating, grip positions/span, uniform scale `0.005471042`, and internal grip orientation. Root position is not invariant. Absolute world muzzle/barrel direction, clipping, projected bounds, occlusion, and visual readability require measurement rather than assumption.
- Historical distinction: p004 rotated the finished pose and broke `gripOrientationError=0.785398rad`; p005 changed the source basis using ADS and measured bounds approximately `0.181299 x 0.063819 x 0.439623m`, while its raw local and remote views also failed.

### Disposition and future review constraints

- Do not reapply P-001. The target remains `REJECTED` / `ISSUE_REQUIRES_ACTION`; no `EDITOR_PASS_ACCEPTED` marker or acceptance count was added.
- Any future proposal must account for the active forward pitch, pass hold-frame context through `buildTargetBasis`, use normalized vectors/cross products and quaternion-matrix construction, remain guarded to the rifle hold frame, and require fresh local and remote raw-pixel evidence.

## Entry 014 — P-001 evidence-integrity correction

- Date: 2026-09-19
- Fresh workspace check after Entry 039: `find .hoplite/artifacts -type f -iname '*p001*' -print` returned no p001 files. The six p001 artifact paths referenced above are historical log references only in this checkout and were not directly re-inspected in this run.
- Current directly inspected raw evidence is the p006 baseline plus retained p004/p005 files. The unavailable p001 PNG/JSON paths are not current evidence and are not claimed as directly inspected captures.
- This evidence-availability limitation does not change the delegated P-001 reviewer verdict `FAIL`, the `REJECTED` / `ISSUE_REQUIRES_ACTION` disposition, or the no-mutation decision. The review result rests on the measured p006 quaternion/frame math and the historical measurements already recorded in the logs.

## Entry 015 — Hand-contact proposal review remains conditional

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Fresh inventory basis: p006 local/remote raw frames and measurements remain the current evidence. Primary/support grip seating, span, weapon scale, muzzle error, eye anchor, camera contracts, and grounding are unchanged and must remain invariants.
- Causal defect under review: the authored `Hand` orientations and open finger descendants are not solved to the weapon contact frame. The exact hierarchy is `Shoulder → Arm → ForeArm → Hand → Thumb/Index descendants`; there is no separate wrist bone.
- Proposed measured frame, not yet authorized: `a=normalize(rightHand-leftHand)`, `m=-a`; `bodyForwardPitch=normalize(project(normalize(bodyForward+0.12*bodyUp), perpendicularTo(a)))`; `u=normalize(bodyForwardPitch×a)`; `desiredPalmNormal(right)=+u`, `desiredPalmNormal(left)=-u`. For each hand, derive a proper anatomical measured triad from the hand origin, `Index1`, and `Thumb1` descendants; construct `C=makeBasis(m×desiredPalmNormal, m, desiredPalmNormal)` and `Q=C×inverse(H)` separately for left and right. Apply `Q` to the `Hand` world quaternion through its unchanged parent while preserving origin, local translation, and scale; descendants inherit the rotation once.
- Required guards: validate all normalized vectors, non-degenerate triads, finite parent frames, and determinant `+1` before mutating either hand; no partial mutation on failure. Guard exactly to standalone PoseEditor `rifle` + `rifle_idle`; no `rifle_aim_idle`, movement clip, other weapon, utility, gameplay, networking, camera implementation, physics, asset, or evaluation change.
- Ordering requirement: sample `rifle_idle`, call the existing hold-frame IK to establish fixed origins, apply the hand-contact correction, then run the existing weapon solver without reapplying hold IK so diagnostics cover the final hand geometry; bake SVG skin only afterward.
- Reviewer disposition: `CONDITIONAL`; blockers are explicit handedness/anatomical-frame definition, stale post-solver diagnostics if ordering is wrong, and missing world/local/descendant/degenerate regression coverage. No mutation is authorized by this entry.
- Temporary probe outcome: a direct browser module/GLB hand probe stalled and was terminated without source or artifact mutation; it is not evidence. Fresh raw local and remote captures remain mandatory after any authorized mutation.
- Next action: obtain review of this fully specified contract; only a `GO` review may authorize one bounded editor-only implementation.

## Entry 016 — Conditional authorization for one hand-contact experiment

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Delegated re-review: `CONDITIONAL FOR ONE NARROW HAND-CONTACT TRIAL`; `NO-GO` as a sufficient repair for the full target because the hand-only change cannot alter the p006 rifle's projected width/orientation or either camera.
- Authorization: `AUTHORIZED FOR ONE MUTATION` for the exact editor-only contact experiment below; no follow-up tuning is authorized under this entry.
- Exact operation: in standalone PoseEditor `buildPose`, guard only `rifle` + `rifle_idle`; apply existing hold-frame IK once; derive `a`, `m`, pitched projected forward, and `u` from the measured world origins/axes; build separate proper-handed `H` and `C` triads from each `Hand`/`Index1`/`Thumb1`; apply `Q=C×inverse(H)` through each unchanged hand parent; then run the weapon solver with no second hold-frame application. Rotate only `Hand`; do not mutate `ForeArm`, descendants individually, weapon, camera, scale, root, or placement.
- Fixed invariants: both hand origins and local hand translation/scale; parent transforms; weapon world transform/scale/grips/span/muzzle; body/root/eye/shoulders/elbows/feet/grounding; local/remote camera contracts; assets and runtime callers.
- Implementation guards: all vectors finite and normalized, non-degenerate projections/triads, proper determinant `+1`, atomic no-partial-mutation failure, explicit `rifle_idle` scope, and focused regression coverage.
- Trial acceptance is not authorized by this entry. Fresh unmodified local/remote raw frames must be inspected first. Reject/revert if local rifle remains end-on/thin, remote rifle remains merged/empty-handed, connection is unclear, or hands clip/look unnatural. A passing diagnostic cannot override raw pixels.

## Entry 017 — p007 hand-contact trial rejected and reverted

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Mutation result: the exact authorized per-hand contact correction was implemented only in standalone PoseEditor, focused-tested, built, captured, directly inspected, and reverted. No shared solver, hold-IK, runtime, camera, networking, physics, asset, or acceptance mutation remains.
- Evidence: `.hoplite/artifacts/p007-hand-contact-rifle-idle-first.png`, `.hoplite/artifacts/p007-hand-contact-rifle-idle-third.png`, and matching JSON reports; both are fresh raw `1280x720` SVG captures with `ready=true`, contentful pixels, and no page errors.
- Raw review: local pixels remain a large white/blue hand-and-forearm mass with only a small buried/edge-on weapon fragment; no broad receiver/rail/barrel silhouette or clear hand-to-weapon contact is readable. Remote pixels show the complete grounded player but no distinct rifle silhouette or clear weapon connection; it remains visually empty-handed.
- Numerical/invariant review: solver/grip/muzzle/clipping diagnostics remained positive, but the one-call hold-frame ordering changed p006 weapon scale `0.005471042` to `0.005243078`, weapon bounds to approximately `0.049 × 0.175 × 0.423m`, and both hand origins by approximately `[+0.0174,0,+0.0081]` / `[+0.0173,0,+0.0127]`. This violates the fixed baseline origin/scale relationship; no stabilization mutation is permitted.
- Verdict: `REJECTED`; p007 is preserved only as rejected evidence and the source is reverted. `EDITOR_PASS_ACCEPTED` remains absent and accepted counts remain `0`.
- Next action: investigate a new causal defect from the reverted p006 baseline. Do not tune/reapply hand-contact, P-001, p004, or p005; any new proposal requires a fresh inventory and delegated adversarial review before mutation.

## Entry 018 — Fresh reverted-baseline inventory closes the admissible PoseEditor transform space

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Source/scene mutation: none. The p006 implementation is still the authoritative reverted baseline; no gameplay, runtime, solver, hold-IK, camera, physics, asset, or acceptance source changed.
- Fresh raw evidence: `.hoplite/inspection/fresh-baseline-first.png` and `.hoplite/inspection/fresh-baseline-third.png`, captured through raw Playwright `page.screenshot(fullPage:false)` at `1280x720` from the intended local eye and remote body URLs. SHA-256: first `14072bb24d83f75a67fc5c700dd4887ac926c317b48af61ea6ed825dda25bcff`; third `605ebf851c8d88a0f0fc536817eb06d49dd9641717396d11f026090d9243b41f`. The hashes exactly match the retained p006 baseline, confirming no source mutation since the revert.
- Renderer path: both requested inspection modes resolve to the standalone editor's SVG fallback in this environment. The raw frames are contentful and have no page errors; this is an editor-renderer limitation, not a reason to substitute a non-raw or debug capture.

### Measured shared state

- Character: `Player_one-optimized.glb`, `rifle_idle`, complete remote body, bilateral local arm/hand chains, 126 bones, and only the permitted first-person head filtering (`3011/20214` triangles across 2 meshes). Feet/root and body height remain grounded in the baseline.
- Weapon: `scar_l-optimized.glb`, attached by `solveVerifiedGripPose` beneath the character; the diagnostic parent label `Scene` is the character's GLB root name, not evidence of a detached world-level item. The selected candidate remains `rifle-high-ready` (`forwardPitch=+0.12`). Candidate sockets remain `tag_trigger_0223`, `combat_grip_0233`, `tag_muzzle_0222`, and `EXPS3_Socket_0225`.
- Fixed weapon fingerprint: scale `0.005471041969`; world bounds `0.051594641 × 0.183006104 × 0.441691344m`; world matrix and grip/muzzle points match p006. Primary/support grip errors are `2.6948e-16m` / `3.4694e-18m`, grip-span error `4.1633e-17m`, grip-orientation error `0rad`, muzzle error `0.024410572rad`, and clipping penetration `0`.
- Local camera contract: eye/camera `[-0.008381670,1.469020011,0.080140938]`, FOV `72°`, near `0.08m`, forward `+Z`. The rifle's measured barrel alignment is `0.073609264rad`; the local item projection is only `0.040940053` viewport width fraction by `0.288177207` height fraction before occlusion.
- Remote camera contract: position `[1.65,1.45,3.10]`, FOV `42°`, forward `[-0.509058054,-0.145004415,-0.848430090]`. The projected primary/support/muzzle points are `[0.025189007,0.293624273]`, `[0.001743895,0.291034599]`, and `[-0.030129855,0.292730885]`; they collapse into the hands/torso cluster in the fixed remote view. The item world bounds remain wholly within the character's broad world AABB, so body/arm occlusion is a measured composition defect rather than a missing asset or detached-parent defect.

### Independent raw-pixel review and causal conclusion

- The fresh local frame and its retained crop show the large splayed hand/forearm mass occupying the lower frame. A narrow white rifle fragment is visible beneath the palms, but no readable receiver, rail/optic, magazine, stock, barrel relationship, or clear hand-to-weapon connection exists.
- The fresh remote frame and its enlarged hand/torso crop show a complete grounded character and hands but no distinct rifle silhouette; it reads empty-handed. This is a raw-pixel failure despite `ready=true`, `solver=VERIFIED`, near-zero grip errors, trusted muzzle alignment, and clear clipping diagnostics.
- The causal inventory leaves no admissible deterministic quaternion mutation that can satisfy both views while preserving the immutable target contract. Weapon transform/scale/orientation and the camera contracts fix the rifle's projected silhouette and remote occlusion. The only remaining within-contract visual degree of freedom was the measured hand-contact frame; the exact authorized `Q=C×inverse(H)` trial was p007, and its fresh raw frames failed both readability/connection gates while also violating the baseline hand-origin/weapon-scale invariant under its required call ordering. No alternate hand quaternion is available without violating the same measured frame contract, and rotating hand/finger geometry cannot expose a weapon whose projected transform and body occlusion remain fixed.
- Rejected as out of scope or causally insufficient: camera or screen-space correction, weapon scale/placement/orientation, asset replacement, root/body/forearm/elbow movement, and reapplication/tuning of P-001, p004, p005, or p007. None is authorized by this inventory.

- Verdict: `BLOCKED_BY_FIXED_INVARIANTS`; implementation remains unchanged, `EDITOR_PASS_ACCEPTED` remains absent, and accepted weapon/utility counts remain `0`. This is a scope blocker, not a visual acceptance decision.
- Required external resolution before any further mutation: explicitly relax at least one immutable constraint that controls the defect (authored hand/arm animation or geometry, weapon frame/placement, camera contract, or asset identity). Without that resolution, another PoseEditor-only quaternion trial would be unsupported tuning rather than a causal repair.

## Entry 019 — Independent scene-graph and quaternion audit closes the remaining legal space

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Audit method: two delegated read-only reviews independently traced `PoseEditor/pose-editor.ts`, `client/weapons/pose-solver.ts`, and `client/weapons/player-hold-ik.ts`, then compared their findings with fresh raw local/remote pixels. No source or runtime mutation was made.
- Pixel result: the current raw first-person frame remains a hand/forearm mass with a buried narrow rifle fragment; the current raw third-person frame remains a complete grounded body that reads empty-handed. Both captures are byte-identical to p006 and retain the fixed hashes recorded in Entry 018.
- Attachment result: the same cloned character and rifle are used in both views. The rifle is parented beneath the character root after the solver runs, and ordinary depth behavior is used. There is no detached weapon, missing mesh, transparent material, `renderOrder`, `depthTest=false`, or `depthWrite=false` path that could explain or legitimately repair the failure.
- Animation result: the editor samples `rifle_idle` and applies the hold-frame solver before the weapon solve. Static finger tracks and modest arm variation do not supply a supported fix for the fixed weapon projection or remote occlusion; changing the sample would also change the immutable hold-idle state without a causal readability guarantee.
- Quaternion result: the solver maps the authored source basis to the hand-span target basis and the retained weapon transform fixes the projected geometry. Any rigid orientation change large enough to expose the rifle broadside is a forbidden weapon-frame change; any render-order change would fake depth rather than repair connection.
- Conditional residual: a deterministic elbow swivel around each shoulder-to-hand axis is the only overlooked origin-preserving arm degree of freedom. It would move forearm/elbow geometry while preserving hand origins, hand span, weapon world matrix, scale, eye, root, feet, and cameras. Because authored arm/elbow geometry is frozen, this is recorded only as a scope-dependent follow-up and was not implemented.
- Verdict: `BLOCKED_BY_FIXED_INVARIANTS`; no acceptance marker, source mutation, or new pose trial is justified. The controlling constraint must be explicitly relaxed before further work.

## Entry 020 — Gameplay reference comparison confirms raw readability and connection gates

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Reference: `.hoplite/attachments/art_upload_2b9a5e64c9c54431992a72e7587e4c68/1762691503120_1762691503120.webp` was directly inspected as visual source material. It presents a readable local rifle profile from the lower center/right and recognizable rifles physically connected to remote players' hands and torsos.
- Baseline comparison: the current local capture lacks a continuous receiver/handguard/stock silhouette and the current remote capture lacks a distinct rifle or hand-to-weapon connection. The grounded body and hands remain visible, so this is a presentation/readability failure rather than a missing-character failure.
- Fixed evidence: the raw baseline remains byte-identical to p006; first SHA-256 `14072bb24d83f75a67fc5c700dd4887ac926c317b48af61ea6ed825dda25bcff`, third SHA-256 `605ebf851c8d88a0f0fc536817eb06d49dd9641717396d11f026090d9243b41f`.
- Causal disposition: the reference does not change the immutable contract or make screen-space/depth overrides physically valid. The Entry 019 scene-graph and quaternion audit remains controlling; no additional transformation was authorized.
- Verdict: `BLOCKED_BY_FIXED_INVARIANTS`; no acceptance marker or implementation mutation is justified until a controlling constraint is explicitly relaxed.

## Entry 021 — Bounded connected-hold repair hypothesis

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Scene measurements: the resolved rifle anchors are `tag_trigger_0223` (primary), `combat_grip_0233` (support), and `tag_muzzle_0222` (muzzle). The baseline hand origins coincide with the two grip points, but the local `Hand` +Y/index directions differ substantially between sides and the raw palms/fingers face outward. The current rifle muzzle is approximately body-forward; the remote camera direction is sufficiently close to that axis that the receiver collapses into the torso/forearms.
- Hypothesis: preserve grip points and arm reach, align mirrored hand frames from measured index/thumb geometry to the resolved rifle forward and body-up axes, and use a bounded third-person across-body yaw around the grip midpoint. The first-person path retains camera-forward orientation; the third-person path changes only the standalone editor's weapon/arm presentation.
- Invariants: exact bilateral grip contact, fixed hand origins/local translation/scale, quaternion-only bone rotations, normalized proper-handed target frames with determinant `+1`, authored muzzle direction in the local view, no cross-state effect, no changes outside `PoseEditor` and its append-only evidence.
- Rejection criteria: any degenerate hand frame, unreachable grip, changed hand origin, non-finite transform, failed raw local/remote silhouette/connection, or mismatch between final rendered state and diagnostics.

## Entry 022 — Connected-hold candidate rejected by local perspective evidence

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- Mutation under review: `PoseEditor/rifle-presentation.ts` measured proper-handed hand-frame/contact correction plus a view-aware across-body rifle presentation, applied only to the standalone editor's rifle idle target.
- First-person raw review: `.hoplite/inspection/diagonal-axis-first.png` shows the hands/forearms occupying the lower frame without a readable receiver, rail, magazine, stock, or barrel relationship. The numeric solver reports grip contact and clipping success, but the measured barrel is `0.317666865rad` from camera-forward, so the first-person composition gate truthfully rejects it.
- Third-person raw review: `.hoplite/inspection/diagonal-axis-third.png` shows a small rifle across the character's chest and remains useful as evidence that the presentation changed, but it cannot establish target acceptance without a passing local view and a clearer connected silhouette.
- Verdict: `REJECTED`; this candidate counts as `0` accepted weapons. The next operation must preserve these captures, remove or replace the failing candidate, and use a new causal hypothesis. No acceptance marker is permitted.

## Entry 023 — Fresh Operation 1 hierarchy, matrix, and axis inventory

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- `[EVIDENCE]` Fresh raw frames: `.hoplite/inspection/operation-1-inventory-first.png` and `.hoplite/inspection/operation-1-inventory-third.png`. Fresh WebGL inventories: `.hoplite/inspection/operation-1-scene-first-webgl.json` and `.hoplite/inspection/operation-1-scene-third-webgl.json`. The captures are visual evidence only; the JSON is the measured scene record.
- `[LOCAL CAMERA]` Position `[-0.0083816696,1.4690200107,0.0801409384]`; forward `[0,0,1]`. The camera is placed at the measured eye point and uses the existing first-person FOV/near setup. Local intended body frame is forward `[0,0,1]`, up `[0,1,0]`.
- `[REMOTE CAMERA]` Position `[1.65,1.45,3.1]`; forward `[-0.5090580539,-0.1450044153,-0.8484300898]`; look target remains the existing editor target. Remote body frame is forward `[0,0,1]`, up `[0,1,0]`.
- `[CHARACTER]` Root name `Scene`; feet/ground bounds are represented by the measured character bounds in the inventories. Eye/head are `[ -0.0083816696,1.4690200107,0.0801409384 ]` / `[ -0.0083816696,1.4690200107,-0.0398590616 ]`; shoulders are left `[0.0650673215,1.4208417399,-0.0544235796]`, right `[-0.0822189395,1.4208955124,-0.0510056841]`.
- `[WEAPON HIERARCHY]` Held rifle root is reported under parent `Scene`; it is not parented to a hand. The current world matrices are preserved verbatim in each inventory. Local scale is `0.0069319882100`, remote scale is `0.0072124739730`; these differences arise from the existing view-aware presentation and are observations, not constraints.
- `[SOCKETS]` Resolved nodes/sources are primary `tag_trigger_0223/candidate`, support `combat_grip_0233/candidate`, muzzle `tag_muzzle_0222/candidate`, and ADS `EXPS3_Socket_0225/candidate`. Local anchor positions are primary `[0.0971084470,1.3509986342,0.2616708705]`, support `[0.1380404861,1.3509986121,0.3955535875]`, muzzle `[0.1876687456,1.3437836408,0.5680088513]`. Remote anchor positions are primary `[0.0415231541,1.3510042775,0.3428131526]`, support `[0.1793655294,1.3509985652,0.2957205320]`, muzzle `[0.3560295210,1.3428766646,0.2353647369]`.
- `[AXES]` Local authored barrel direction is `[0.3126632527,0.0823897908,0.9462841079]`; measured mesh direction is `[0.3038908411,0.0722046516,0.9499667599]`. The local actual barrel-camera angle is `0.3176668654rad`. Remote authored barrel direction is `[0.9462816273,0.0846610389,-0.3120634396]`; remote camera alignment is not measured by the current editor path. The full hand-bone world/local quaternions and X/Y/Z axes are retained in the JSON inventories; no hand axis is inferred here.
- `[HAND CONNECTION]` Local left/right hand points are `[0.1380404861,1.3509986121,0.3955535875]` / `[0.0971084470,1.3509986342,0.2616708705]` and therefore coincide with support/primary points numerically. Raw pixels still show hands/forearms occluding the rifle. This separates contact diagnostics from visible silhouette evidence.
- `[UNKNOWN]` The weapon-only renderability and visual frame are unverified. The head filter removed only head-weighted triangles (`3011/20214` across two meshes), so it cannot answer whether arms/hands are the occluding cause.
- `[NEXT HYPOTHESIS]` Hide the solved character render only, leaving the scene/camera/item matrices unchanged, and inspect a fresh raw local weapon-only frame. A readable rifle-only silhouette authorizes measured weapon-frame construction; an edge-on/misdirected/undersized rifle sends the investigation to weapon geometry/parent/scale/depth rather than hand solving.
- `[VERIFICATION]` No source pose mutation, acceptance marker, count increment, or asset identity/content change occurred during this inventory. The existing solver/readiness values remain diagnostic only.

## Entry 024 — Operation 2 isolation attempt A was invalid because the weapon is nested under the character

- Date: 2026-09-19
- `[OBSERVATION]` The first `weaponOnly=1` implementation set the cloned character root invisible. The resulting raw frame `.hoplite/inspection/operation-2-weapon-only-first.png` contains no rendered weapon pixels (`contentFraction=0`); this is an isolation failure, not proof of an empty asset.
- `[MATRIX/HIERARCHY]` The earlier public `itemParent=Scene` label is insufficient because both the character root and the nested weapon's parent are named `Scene`. The rendered weapon must be treated as a subtree nested below the character root for visibility control. No transform relationship is inferred beyond this measured visibility result.
- `[HYPOTHESIS]` Keep the character root and all ancestors visible, hide only body render meshes outside the `state.item` subtree, and the existing weapon matrix will render alone from the same local camera.
- `[OPERATION]` Replace the root-visibility toggle with an opt-in mesh-level exclusion: collect the weapon subtree nodes, then set non-weapon character mesh visibility false. Leave the weapon subtree, root, camera, solver, and transforms unchanged.
- `[EXPECTATION]` The next raw frame must contain rifle pixels and no hand/forearm/body pixels. Its world item matrix and measured barrel direction should match Operation 1 to floating-point tolerance.
- `[VERDICT]` Attempt A rejected as a tooling implementation. The controlled weapon-frame question remains unanswered.

## Entry 025 — Operation 2 corrected isolation establishes the next measured question

- Date: 2026-09-19
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The corrected mesh-level exclusion produces a contentful weapon-only frame while leaving the nested weapon's world matrix unchanged. The capture is `.hoplite/inspection/operation-2-weapon-only-first-mesh-except.png`; its matching record is `.hoplite/inspection/operation-2-weapon-only-first-mesh-except.json`.
- `[EVIDENCE]` The raw `1280x720` frame has `contentFraction=0.0584265988` and `itemProjected=0.236x1.387`. It contains rifle pixels but no visible character meshes. The isolated result is therefore valid evidence about weapon framing. The readout remains `pose=REJECTED` only because the existing composition gate measures the barrel as non-camera-forward; that diagnostic does not substitute for the raw visual verdict.
- `[RAW VERDICT]` The rifle is visible but not product-readable: its projected mass is pushed into the lower edge and its receiver, sight/rail, stock/body, and muzzle relationship do not form the deliberate lower-right first-person silhouette in the supplied reference. Do not infer readability from `solver=VERIFIED`, zero grip errors, or `clipping=clear`.
- `[MEASURED FRAME]` Operation 1 records the local camera forward as `[0,0,1]`, primary/support points as `[0.0971084470,1.3509986342,0.2616708705]` and `[0.1380404861,1.3509986121,0.3955535875]`, authored muzzle point as `[0.1876687456,1.3437836408,0.5680088513]`, and actual measured barrel-camera angle as `0.3176668654rad`. The rifle mesh `Object_482` has `21054` vertices; its preserved source bounds are long in local `z` (`67.5446..146.3090`) but the rendered skinned barrel must be treated as measured geometry, not assumed from node axes.
- `[UNKNOWN]` The corrected isolation does not yet identify which proper-handed transverse frame best exposes the authored receiver while keeping the muzzle direction believable. The prior p004 balanced roll and p005 ADS source-up basis are rejected hypotheses and are not to be tuned or repeated.
- `[HYPOTHESIS]` A new frame construction may use the measured skinned-mesh barrel direction as the longitudinal axis and a separately measured receiver/optic transverse direction as the up reference, then apply one deterministic quaternion/matrix in the weapon's parent space. This is distinct from a post-solve arbitrary roll and must be rejected if the reference frame cannot be measured without a fallback.
- `[OPERATION]` Before mutation, record the actual mesh probe, primary/muzzle vectors, the chosen proper-handed basis, the world-to-parent conversion, and the expected local/world deltas. Apply exactly one weapon-frame matrix mutation in the opt-in standalone editor path. Do not mutate hands, camera, scale, asset files, solver/runtime code, or acceptance markers.
- `[EXPECTATION]` The next isolated local frame should expose a coherent rifle body rather than the current lower-edge cluster. If it remains edge-on, buried, too small, or points away from camera, preserve and reject it; do not compensate with a hand rule or a random orientation sweep.
- `[VERIFICATION]` Require a fresh raw `1280x720` local weapon-only capture, fresh metrics, source diff, focused tests, standalone build, and `git diff --check`. Raw pixels remain authoritative.
- `[DISPOSITION]` Operation 2 is complete. The corrected visibility control is retained as opt-in diagnostic tooling; no weapon-frame candidate is accepted yet and the accepted count remains `0`.

## Entry 026 — Operation 3 measured frame authorization

- Date: 2026-09-20.
- Target ID: `rifle/hold-idle/local+remote`.
- `[OBSERVE]` Fresh current local WebGL2 control: camera `[-0.0083816696,1.4690200107,0.0801409384]`, camera/body forward `[0,0,1]`, body up `[0,1,0]`, weapon parent `Scene`, uniform world scale `[0.0069319882100,0.0069319882100,0.0069319882100]`.
- `[OBSERVE]` World-space skinned probe after animation and rejected broadside: start `[0.1705529586,1.3395635823,0.5152954649]`, end `[0.1837825955,1.3427069522,0.5566514836]`, direction `[0.3038908411,0.0722046516,0.9499667599]`. Inverse-old-roll expectation: pre-broadside start `[0.1633637292,1.3549158845,0.5174934346]`, end `[0.1790636325,1.3543556381,0.5580942168]`, direction `[0.3606339943,-0.0128691164,0.9326186294]`. Implementation must sample the live evaluated mesh after animation and before the new transform, not use reconstruction as a constant.
- `[OBSERVE]` Transverse reference is world `+Y` of authored `EXPS3_Socket_0225` after animation. Post-broadside ADS-Y `[0.9164178998,-0.2882098267,-0.2776926086]`; expected pre-mutation ADS-Y `[-0.2749218700,-0.9575643269,0.0865362656]`; source-up after projection `[-0.2727206756,-0.9576609797,0.0922435958]`, source-right `[-0.8919453768,0.2876105591,0.3488747785]`, determinant `+1.000000`.
- `[OBSERVE]` Target semantics are body `+Z` forward, `+Y` up, `up × forward = +X` right, determinant `+1.000000`; target is an object frame, not camera right/up/forward.
- `[UNKNOWN]` ADS-Y signed meaning, raw local/remote silhouette, scale under parent conversion, clipping/depth, and hand drift remain unverified.
- `[HYPOTHESIS]` `alignPoseFrame` supplies `qTarget * inverse(qSource)`, expected `[0.1824122895,0.0204069084,0.9723971650,-0.1440592525]`; left-compose it with current world quaternion, rotate around primary, and then apply one measured-span body-frame translation.
- `[OPERATION]` Runtime-sample the skinned barrel and authored ADS world-Y after animation/solver updates, before SVG/software baking. Reject missing, duplicate, non-finite, collinear, or non-authored data. Compute `handSpan=0.1400000490m`; apply `delta=-right*span + up*(span/2) + forward*(span/4)=[-0.1400000490,0.0700000245,0.0350000123]` once after primary-pivot rotation. Re-measure the live/baked mesh after mutation.
- `[OPERATION]` Compose through the unchanged parent inverse with uniform-scale and matrix-equality guards. The complete mutation is transactional; invalid basis, determinant, quaternion, parent, scale, finite-value, or postcondition restores captured parent and every character/weapon descendant. Do not alter hands or add a compensating child transform.
- `[EXPECTATION]` Predicted local primary is approximately `[-0.0428916020,1.4209986588,0.2966708828]`, projection `[0.1105388263,-0.3052497924]`, depth `0.2165299443m`; raw isolated local pixels should show a readable lower-center/right rifle. Failure means reject rather than tune.
- `[EVIDENCE]` Operation 2 corrected isolation remains `.hoplite/inspection/operation-2-weapon-only-first-mesh-except.png` / `.json`; its rifle-only pixels are valid but rejected. New evidence must be unmodified `1280x720` intended-perspective frames with fresh WebGL2 metrics and browser health.
- `[VERIFICATION]` Required checks are focused frame/transaction tests, standalone build, `git diff --check`, fresh EGL capture, raw-pixel inspection, and delegated adversarial review. Solver/readiness/contact values are supporting evidence only.
- `[VERDICT]` One measured Operation 3 trial is authorized but not accepted. Accepted weapons/utilities remain `0`; no acceptance marker is present.
- `[DISPOSITION]` Remove the rejected broadside path and implement only this measured weapon-root frame transaction. Retain all prior artifacts and reject/rollback if the raw control fails.

## Entry 027 — Static bind/T-pose control before animation

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The existing editor's rifle path samples `rifle_idle`, applies the editor hold frame, solves grips, and then attempts the measured weapon presentation. The final presentation transaction rejects on local and remote post-contact error, so the animated result is not a usable baseline.
- `[UNKNOWN]` The actual Player_one bind/rest skeleton pose and its deterministic arm reach have not been captured from the current source. The attached gameplay reference is visual source material only; it does not freeze an animation or bone transform.
- `[HYPOTHESIS]` Resetting every cloned skinned skeleton to its authored bind pose, then applying only the existing static rifle hold-frame and grip solve, will isolate the authored rig/weapon relationship from animation sampling.
- `[OPERATION]` Introduce an editor-only static mode for the rifle target. Default the rifle to static unless `animation=on` is supplied. In static mode, set the cloned skeleton to bind pose, skip mixer/action creation, use the explicit `t-pose` state label, run `prepareRifleHold` and `chooseVerifiedGripPose`, and do not call the rejected measured-root presentation.
- `[EXPECTATION]` The static local frame should show both arms and a connected rifle without animation-specific splay; the static remote frame should show a complete grounded character visibly holding the same rifle. Any failure is recorded as static-pose evidence, not corrected by animation tuning.
- `[VERIFICATION]` Confirm no mixer exists in static mode through the state/readout and source guard; capture fresh local/remote raw pixels and JSON; inspect pixels before diagnostics; run focused tests/build/diff checks.
- `[VERDICT]` One static control is authorized, not accepted. No acceptance marker or count increment is allowed.
- `[DISPOSITION]` Preserve all animated captures. Continue only from fresh static evidence; re-enable animation later only as an explicit comparison.

## Entry 028 — Post-normalization bind reset rejected

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The first static trial did not create a mixer and reported `animationMode=static`, `clip=t-pose`, but the hold preparation failed in both views. Fresh diagnostics show plausible animated hand world positions around `y=1.35m`; the same normalized model after `skeleton.pose()` reports queried bone positions near the origin.
- `[UNKNOWN]` No separate authored bind reset is needed because the freshly loaded GLTF template is not animated until a mixer is created. The exact skeleton-pose behavior under the normalized root is not a reason to mutate shared calibration.
- `[HYPOTHESIS]` Removing the explicit post-normalization `skeleton.pose()` call will retain the imported bind/rest pose and let the existing deterministic hold solver reach its targets.
- `[OPERATION]` Keep static mode as no mixer/action creation, remove only the `skeleton.pose()` reset, and recapture. No animation, camera, weapon presentation, scale, or solver tuning is authorized by this correction.
- `[VERDICT]` First static trial rejected as a reset implementation failure; no counts or markers change.
- `[DISPOSITION]` Preserve `.hoplite/inspection/static-tpose-*` failure evidence and proceed with the no-mixer/no-reset control.

## Entry 029 — Corrected static no-reset geometry diagnosis

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVATION]` The no-reset static capture retains the imported authored bind/rest state. The first-person hold solver verifies with effectively zero primary/support contact error, but the unpresented rifle remains buried and the composition gate reports `measured barrel is not camera-forward`. The third-person hold solver rejects and restores the transaction.
- `[MEASUREMENT]` From the live static arm chain, the left and right arm-root maximum reaches are approximately `0.4328m` and `0.4349m`. With the existing third-person constants (`forward=0.34m`, `lateral=0.13m`, axis `[-0.47 forward, 0.88295 lateral]`, span `0.14m`), the right target is approximately `0.4741m` from the right arm root. The corresponding first-person hold remains reachable.
- `[HYPOTHESIS]` The third-person static target is unreachable independently of animation because its lateral/forward placement exceeds the bind-pose arm envelope. A coupled candidate must first bring that target into the authored reach envelope, then establish a readable weapon frame and re-solve both hands together; isolated weapon rotation would otherwise sever contact.
- `[OPERATION]` No source mutation in this entry. Record the fresh corrected static raw/diagnostic evidence and measurements before the next candidate.
- `[EVIDENCE]` `.hoplite/inspection/static-bind-no-reset-first-raw.png`, `.hoplite/inspection/static-bind-no-reset-third-raw.png`, their matching capture JSON files, and their matching diagnostics JSON files. First-person weapon-only control is preserved separately at `.hoplite/inspection/static-bind-no-reset-first-weapon-only.png`.
- `[VERIFICATION]` Both rasters are contentful `1280x720` WebGL2 captures without page or console errors. PoseEditor suite `46/46`, standalone build (`48` modules), and `git diff --check` passed before this diagnosis.
- `[VERDICT]` Rejected static control; no acceptance marker or count changes.

## Entry 030 — Zero-lateral static hold-axis rejection and next causal test

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The static bind/no-mixer path renders in WebGL2 with the real `scar_l-optimized.glb` rifle and the arm-preserving body filter. The first-person raw pixels show both hands and a visible rifle, but the rifle’s measured mesh barrel is not camera-forward. The remote raw pixels retain the complete grounded body and the verified static hold.
- `[MEASURE]` The first-person hold center uses forward `0.33m`, lateral center `0.05m`, vertical `0.01m`, and a zero-lateral normalized hold axis. Runtime values are `hands=0.751`, left/right visible, `muzzleCameraAlignment=0.0395700059rad`, `barrelCameraAlignment=0.1026113611rad`, `barrelAxisAgreement=0.0139376224rad`, `scale=0.0063512223`, and grip errors approximately zero. The remote scale is `0.0069319882` with grip errors approximately zero and clipping clear.
- `[UNKNOWN]` The static path has not yet measured whether a small non-collinear hand-axis slope improves the solver’s roll/reference frame without losing bilateral hand readability or third-person reachability.
- `[HYPOTHESIS]` Zero lateral makes `targetAxis = rightHand - leftHand` collinear with body-forward. The shared solver then falls through from body-forward projection to its world-up fallback. Reusing the previously measured `-0.015` body-right slope makes the target axis non-collinear while preserving the same causal hand-target/weapon solve relationship.
- `[OPERATION]` Change only the first-person static hold-axis pair to the normalized `-0.015` body-right slope and its matching forward component. Leave the center, span, third-person target, camera, depth, scale policy, animation mode, asset identity, and acceptance state unchanged. Capture fresh raw first- and third-person frames before any further decision.
- `[EXPECTATION]` The first-person measured barrel alignment should move toward the camera-forward gate while both hands remain readable and the third-person static hold remains verified. Any loss of reach, contact, clipping, remote grounding, or raw silhouette rejects the candidate.
- `[DISPOSITION]` One trial only; no brute-force slope sweep or isolated weapon rotation is authorized.

## Entry 031 — Static non-collinear axis rejected; reach-preserving center hypothesis

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The `-0.015` first-person axis trial moves the measured barrel to `0.0762rad` from camera-forward and keeps both hand visibility flags true, but the raw local raster shows a narrow upright rifle rather than the requested lower-center/right silhouette. The third-person raster is unchanged and remains a grounded connected hold.
- `[MEASURE]` The trial changes first-person item width from approximately `0.148m` in the zero-lateral control to `0.085m`, while retaining `hands=0.751`; this is a visual narrowing, not a complete repair. The remote scale and solver values remain unchanged.
- `[HYPOTHESIS]` The zero-lateral first-person target center at `+0.05m` body-right places the nominal left target about `0.445681m` from its bind-pose arm root, beyond the measured effective reach of about `0.432598m`. The hold solver therefore clamps that hand, and the resulting small tilt controls the target frame. Moving the first-person center to `+0.09m` should place the nominal left target at about `0.430842m`, inside reach, without changing the hand span or third-person target.
- `[OPERATION]` Change only the first-person lateral hold-center offset to `+0.09m`; keep the first-person hold axis lateral component at zero, retain forward `0.33m`, vertical `0.01m`, span `0.14m`, and leave the third-person center/axis untouched. Capture both raw intended perspectives and inspect pixels independently.
- `[EXPECTATION]` Exact bilateral static targets should remove reach-induced frame tilt, preserve bilateral hand readability, reduce measured barrel alignment below `0.08rad`, and broaden the rifle silhouette without isolated weapon rotation. Any failure of these conditions rejects the candidate.
- `[DISPOSITION]` One bounded reach correction only; no offset sweep or compensating transform is authorized.

## Entry 032 — Static center-adjusted candidate rejected on raw local connection

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The `+0.09m` first-person center trial produced fresh raw WebGL2 frames at `.hoplite/inspection/static-center009-first-webgl-raw.png` and `.hoplite/inspection/static-center009-third-webgl-raw.png`. The local frame broadens the rifle and brings the measured barrel to `0.0734rad` from camera-forward, but the rifle remains anchored at the left/lower frame edge and the visible forward glove obscures the support-hand/arm relationship. The unmodified pixels do not show a natural readable two-arm hold.
- `[MEASURE]` Local runtime state is `animation=static clip=t-pose`, `pose=VERIFIED solver=VERIFIED`, `scale=0.00693`, grip errors `0/0`, `muzzle=0.0244rad`, `clipping=clear`, `hands=0.815 readable=yes`, and `diagnosticAlignment=0.0734rad`. The unchanged remote frame remains a complete grounded body with a visible across-chest static rifle and connected hands. The capture harness has no page or console issues; its duplicate asset-close abort records leave `ready=false`.
- `[VERDICT]` `REJECTED` because the first-person raw weapon-composition and bilateral hand/arm gates fail independently. The remote result is retained as paired evidence, not used to infer local acceptance. No acceptance marker or count changed.
- `[DISPOSITION]` Preserve the exact center candidate, diagnostics, and prior `-0.015` evidence. Resolve the next action through a new measured causal inventory/authorization; do not combine the rejected slope and center mutations, sweep transforms, tune the camera/weapon in isolation, or re-enable animation.

## Entry 033 — Delegated minus015 clarification reconciled with raw evidence

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[REVIEW]` The delegated review confirms `-0.015` body-right as the only bounded numeric first-person trial and says the conditional `+0.09m` center proposal must not be combined with it. The reported measured barrel alignment is `0.0762rad`, with `hands=0.751`, source body ready, and solver/readiness verified.
- `[OBSERVE]` Fresh captures from the restored source are `.hoplite/inspection/restored-minus015-first-webgl-raw.png` and `.hoplite/inspection/restored-minus015-third-webgl-raw.png`. The first-person raw frame is deterministically identical to the preserved minus015 evidence and remains a narrow/upright, end-on rifle presentation; the support-hand/arm relationship is not naturally readable against the supplied reference. The remote frame remains grounded with a visible across-chest rifle.
- `[OPERATION]` Restore only the prior bounded minus015 source state: first-person center `+0.05m`, normalized forward component `0.999887493671163`, and body-right component `-0.015`. No second hand-target mutation, weapon rotation, camera change, sweep, or animation change was applied.
- `[VERDICT]` `REJECTED` on the raw first-person gate despite the numeric `0.0762rad` pass. No acceptance marker or count changed.
- `[DISPOSITION]` Preserve the delegated result as numeric evidence and preserve both candidate families as rejected. The next action requires a fresh measured causal inventory; do not infer acceptance from solver/readiness or combine the rejected center and slope proposals.

## Entry 034 — First-person occlusion isolation authorization

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[INVENTORY]` The local-only `hideFirstPersonBodyExceptArms` path runs after the rifle hold has been solved and the held item attached, but before the cloned character is attached to `FirstPersonContent`. The third-person branch bypasses this path entirely. The imported static rig distinguishes `mixamorigLeftArm`/`mixamorigRightArm` from `mixamorigLeftForeArm`/`mixamorigRightForeArm` and their hand/finger descendants. The existing broad `arm` matcher retains triangles weighted only to upper arms or shoulders, while the regression fixture proves that it hides only the torso triangle.
- `[OBSERVE]` The restored `-0.015` raw local frame remains rejected because shoulder/upper-arm mass fills the camera and obscures the rifle/contact silhouette even though the static hold has zero grip error and the remote complete-body frame is grounded. The real rifle, hands, and forearms must remain visible; the upper arm, shoulder, torso, head, and character-only mesh geometry are local occluders rather than required contact evidence.
- `[HYPOTHESIS]` Filtering the first-person clone to distal contact influences only—forearm/lower-arm, wrist, hand, finger, and thumb—will expose the existing solved rifle silhouette while retaining hand-to-rifle contact. This changes neither the arm/hand/weapon transforms nor the remote rendering path.
- `[OPERATION]` Replace the broad arm-bone matcher with the distal contact-chain matcher. Stage every cloned filtered geometry before replacing any mesh, retain visible-index metadata for bounds/projection measurements, continue skipping every held-item node, and hide only local non-skinned character meshes after the geometry transaction is prepared. Do not modify the restored `-0.015` constants, elbow logic, camera, scale, animation mode, asset, solver, acceptance markers, or remote branch.
- `[EXPECTATION]` The focused regression will retain only the forearm triangle, hide upper-arm and torso triangles, preserve held-item visibility and filtered bounds/projection behavior, and leave all existing pose tests green. Fresh local and remote raw captures remain the sole evidence for whether the visual target improves.
- `[REJECTION]` Reject the filter candidate if the raw local frame remains buried/end-on/disconnected, if any contact hand or forearm disappears, if the remote body/rifle changes, or if retained-index measurements or focused tests regress. No acceptance count or `EDITOR_PASS_ACCEPTED` marker may change without independent raw visual acceptance in both views.

## Entry 035 — Distal-contact result and causal forearm inventory

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The authorized distal-contact clone filter is correctly local: the fresh third-person raw PNG is byte-identical to the preserved grounded armed frame (`4059b61f962b787d320d6e04361d4bb71b15503465722ab8f73cf1f89ab850c8`). The fresh first-person frame (`5c867c3d0398a17000d7b9ae078bdcb5c1361db3d33cc75318ee4ad833c8e203`) remains visually rejected.
- `[MEASURE]` The source GLB has two skinned primitives. Under the distal matcher, primitive 0 retains `342` triangles: `13` hand/digit-only and `329` forearm-required. Primitive 1 retains `2185`: `1059` hand/digit-only and `1126` forearm-required. The dominant retained components are forearm-dominant rather than contact-only.
- `[MEASURE]` The local runtime body metrics show the retained character source spans `0.828x1.419` viewport fractions against a solved item projection of `0.069x0.344`. The weapon-only local control remains narrow/upright without any character occlusion, proving visibility alone is not sufficient to produce the requested rifle presentation.
- `[RAW REVIEW]` The visible forearm/glove mass fills the local frame and obscures the existing rifle/contact silhouette. Solver verification, zero grip errors, a `0.0244rad` muzzle result, contentful canvas, and unchanged remote pixels are supporting diagnostics only; they do not pass the local raw-pixel gate.
- `[HEALTH]` First- and third-person capture metadata report no page errors or console issues. Their `ready=false` status is caused only by expected duplicate GLB `ERR_ABORTED` close events.
- `[VERDICT]` The distal-contact candidate is rejected. Keep its artifacts and regression; do not change an acceptance marker or count.

## Entry 036 — Hand-only counterfactual identifies the contact-geometry ceiling

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[HYPOTHESIS]` Because the measured retained components were forearm-dominant, retain only wrist/hand/finger/thumb influences in the local clone while preserving the held item and all transform paths.
- `[OPERATION]` The test-first fixture proved that a forearm triangle must be hidden while hand and index-finger triangles remain visible. It failed against the distal matcher and passed after the scoped matcher change. No arm, hand, weapon, camera, scale, animation, solver, asset, or remote code changed.
- `[MEASURE]` The local projected content shrank from `0.828x1.419` to `0.389x1.419`, and the filtered primitive groups reduced to `39` and `3177` indices. The remote raw PNG remains exactly `4059b61f962b787d320d6e04361d4bb71b15503465722ab8f73cf1f89ab850c8`; the first-person candidate is `2669d9e6845aa5344b0748a423e6686236d7254d50e2bfe2f1da2ba8e81ae223`.
- `[RAW REVIEW]` The resulting raster still shows an oversized, disconnected glove/hand mass in front of a narrow/upright rifle. Thus the remaining obstruction is essential hand contact geometry, not removable forearm geometry. A finger-only or no-hand filter would knowingly remove the required connection evidence rather than repair it.
- `[VERDICT]` Reject and roll back this hand-only refinement to the prior distal matcher. The artifact is valuable as a causal bound: first-person visibility filtering cannot solve the target under the authored static hold.
- `[DISPOSITION]` Preserve all captures, diagnostics, red/green test result, and the remote byte-identity proof. No more visibility-only narrowing is authorized without a new measured causal hypothesis.

## Entry 037 — Rollback identity confirmation

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[VERIFY]` Restoring the forearm-inclusive distal matcher returns the exact prior raw WebGL2 pixels: the fresh post-rollback local and remote PNGs have zero changed channels against the corresponding distal captures. The local SHA-256 is `5c867c3d0398a17000d7b9ae078bdcb5c1361db3d33cc75318ee4ad833c8e203`; the remote SHA-256 is `4059b61f962b787d320d6e04361d4bb71b15503465722ab8f73cf1f89ab850c8`.
- `[VERIFY]` This proves the rejected hand-only matcher left no active first- or third-person presentation change. It does not alter the raw local rejection or create any acceptance state.

## Entry 038 — First-person static hold has a camera-crossing elbow branch

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` Fresh read-only active-baseline evidence is retained in `.hoplite/inspection/static-baseline-skeleton-weapon-diagnostics.json` and its reduced summary. The local static camera is `[-0.023356,1.495392,0.074146]`, looks along body `+Z`, and has a `0.080m` near plane. The static solver holds the rifle grips exactly, but its right arm chain is `mixamorigRightArm=[-0.255939,1.407760,-0.050284] → mixamorigRightForeArm=[-0.057681,1.409204,-0.013665] → mixamorigRightHand=[0.027694,1.417760,0.203282]`. The elbow is therefore `0.087811m` behind the eye plane while the hand/grip is in front of it. The left forearm is also only `0.043769m` ahead of the eye plane.
- `[MEASURE]` The two-bone geometry is deterministic: preserving the right arm's measured upper/lower lengths (`0.201616m`/`0.233299m`) and the identical hand target gives the other analytic elbow point `[-0.197547,1.415365,0.142541]`. It is `0.068395m` ahead of the eye plane, a `0.156207m` body-forward improvement over the selected branch. The left arm is nearly fully extended (`0.432698m` target distance), so its two branch positions differ by only `0.003819m` in body-forward depth. This is not an offset, weapon transform, scale, camera, or visibility-filter observation.
- `[CAUSAL DEFECT]` `solveEditorArm()` has exactly two valid elbow positions around the fixed shoulder-to-hand axis, but always takes the sign implied by the outward body-right pole. It does not compare the two branches against first-person body-forward clearance, and the existing clipping proxy only evaluates weapon/body/arm intersections rather than arm/camera-plane crossing. The retained distal hand/forearm geometry consequently includes a right forearm that traverses the local camera region; this explains the dominant clipped glove/forearm mass independently of the already rejected visibility filtering.
- `[HYPOTHESIS]` For the first-person static rifle hold only, choosing the valid elbow branch with the greater world-space projection on normalized body `+Z` will keep the same fixed hand targets, arm lengths, weapon transform, socket/grip errors, scale, camera, and retained contact geometry while removing the right elbow's camera-crossing branch. It is a deterministic two-bone IK branch choice, not another scalar elbow lowering, camera-relative offset, weapon rotation, or parameter sweep.
- `[OPERATION]` In `PoseEditor/rifle-presentation.ts`, calculate both signed elbow candidates after reachability clamping. When `view === "first"`, select `argmax(dot(elbowCandidate, bodyForward))`; when `view === "third"`, retain the current outward-pole candidate exactly. The operation has no authored translation or fixed rotation angle: only the existing shoulder/elbow quaternion solve follows from the selected geometric point. `prepareRifleHold()` continues to require `weaponId=rifle`, `clipName=rifle_idle`, static authored bind/T-pose input, and the existing `MAX_GRIP_ERROR` transaction rollback.
- `[UNCHANGED]` No weapon root, grip anchor, hand target, finger/hand frame, camera implementation or transform, near-plane value, scale, geometry filtering, animation mode, asset, gameplay, networking, physics, remote pose, acceptance count, or acceptance marker may change. Third-person source behavior is intentionally unchanged and must remain byte-identical to its active raw baseline.
- `[EXPECTATION]` Numerical evidence must show the local right elbow branch has greater body-forward projection than the current outward-pole branch while both hand errors remain within `0.035m`; the local raw frame should reduce the camera-crossing forearm/glove dominance and retain a visibly connected hand/rifle relationship. The remote raw PNG must retain SHA-256 `4059b61f962b787d320d6e04361d4bb71b15503465722ab8f73cf1f89ab850c8`.
- `[FIXED REJECTION]` Reject and roll back if any hand target changes, grip error exceeds tolerance, static mode is not `t-pose`, third-person pixels differ, local pixels remain disconnected/obscured/narrow-upright, or any prohibited transform/filter/camera/asset domain changes. Solver/readiness flags cannot override raw local pixels.
- `[AUTHORIZATION]` `AUTHORIZED FOR ONE MUTATION`. Add a focused regression that demonstrates branch selection preserves the fixed target and selects the greater body-forward elbow candidate in the first-person path before changing the implementation. Then run the focused suite, standalone build, diff check, and fresh unmodified first/third WebGL2 captures.

## Entry 039 — Forward-clear elbow-branch implementation precondition

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The active static baseline selects the outward body-right bend for both views. The focused first-person regression reproduces the measured defect: the solved elbow has body-forward `z=0.1400739848`, while its valid reflected analytic counterpart has `z=0.2599171397` with the hand target still reachable.
- `[UNKNOWN]` The raw local result after selecting the forward branch has not yet been rendered. The branch can remove the camera-crossing forearm mechanism without necessarily making the narrow/upright authored rifle visually acceptable.
- `[HYPOTHESIS]` Selecting the greater-projection analytic elbow candidate only for the existing first-person static path will retain the fixed shoulder-to-hand target, measured arm lengths, weapon/grip relationship, and all non-arm presentation state while moving the right forearm ahead of the eye plane.
- `[OPERATION]` Pass the already-derived normalized body-forward basis to `solveEditorArm()`. After target reachability clamping, construct the existing outward candidate and its signed counterpart. For first person only, use the candidate with the larger dot product against body-forward; retain the outward candidate unconditionally for third person.
- `[EXPECTATION]` The focused first-person contract turns green with both hands within `0.035m` of their existing targets. The third-person contract continues to select its existing outward branch, and fresh remote pixels remain byte-identical to SHA-256 `4059b61f962b787d320d6e04361d4bb71b15503465722ab8f73cf1f89ab850c8`.
- `[EVIDENCE]` Pre-implementation command `pnpm exec vitest run --config PoseEditor/vitest.config.ts PoseEditor/tests/pose-editor.test.ts -t 'selects the forward-clear elbow branch|keeps the third-person static hold on its existing outward elbow branch'` reports the expected one red/one green state: first-person fails only at the forward-branch assertion; third-person passes.
- `[VERIFICATION]` The red assertion compares the solved point with the reflected second analytic point rather than a screen-space proxy. It verifies the exact invariant to be changed and confirms the unchanged third-person branch before the source mutation.
- `[VERDICT]` The baseline is still rejected and no acceptance count or marker changes. The failing focused regression is expected evidence that the authorized source mutation has not yet been applied.
- `[DISPOSITION]` Perform one implementation mutation in `PoseEditor/rifle-presentation.ts`, then run the focused and full PoseEditor checks, build, diff check, and fresh raw first/third WebGL2 captures. Roll back if target/grip invariants, static bind mode, remote identity, or either raw-pixel gate fails.

## Entry 040 — Forward-clear elbow branch rejected and restored

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The authorized implementation selected the measured alternate right-elbow point exactly: `[-0.197547,1.415365,0.142541]`. This moves the elbow ahead of the eye plane while preserving the same right-hand point `[0.027694,1.417760,0.203282]` and static `t-pose` input.
- `[MEASURE]` Fresh first-person diagnostics retain static mode, `pose=VERIFIED`, grip errors `2.78e-17m`/`3.47e-18m`, muzzle error `0.0244rad`, and unchanged item projection `0.069x0.344`. The body/content projection instead expands to `1.393x1.419` from the rejected baseline's `0.828x1.419`; the branch fixes its local depth coordinate but does not produce an acceptable raw silhouette.
- `[EVIDENCE]` Fresh raw captures and metadata are `.hoplite/inspection/forward-clear-branch-first-webgl-raw.png` / `-capture.json`, `.hoplite/inspection/forward-clear-branch-third-webgl-raw.png` / `-capture.json`, and `.hoplite/inspection/forward-clear-branch-first-skeleton-weapon-diagnostics.json`. Both WebGL2 captures are contentful at `1280x720` with no page or console errors. The standard harness reports only the known duplicate GLB close-time `ERR_ABORTED` requests.
- `[RAW REVIEW]` The local raw frame still consists primarily of oversized sleeve/glove geometry across the camera, with only a narrow near-vertical rifle segment. It does not show a readable camera-forward rifle with naturally connected arms/hands. The right-elbow depth mechanism was real, but repairing it alone worsened the retained body footprint and fails the independent first-person gate.
- `[VERIFICATION]` The focused branch contracts pass `2/2`, the isolated PoseEditor suite passes `50/50`, `pnpm exec vite build --config PoseEditor/vite.config.ts` succeeds with `48` transformed modules, and `git diff --check` succeeds. The third-person PNG SHA-256 is exactly `4059b61f962b787d320d6e04361d4bb71b15503465722ab8f73cf1f89ab850c8`, identical to the active remote baseline; it remains grounded and visibly armed.
- `[VERDICT]` `REJECTED`. Green solver/tests and the unmodified remote view cannot compensate for the failed raw first-person frame. No `EDITOR_PASS_ACCEPTED` marker or accepted counts change.
- `[DISPOSITION]` Restore the exact outward-branch source implementation and retain all fresh evidence. Do not tune the opposite branch, combine it with prior rejected transforms or filters, or advance any first-person/remote acceptance state without a new independent causal authorization.

## Entry 041 — Forward-clear branch rollback identity confirmation

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[VERIFICATION]` The restored source no longer contains the alternate-candidate or first-person body-forward selection path, and the trial-specific contracts were removed with it. Fresh rollback captures are `.hoplite/inspection/post-forward-clear-rollback-first-webgl-raw.png` / `-capture.json` and `.hoplite/inspection/post-forward-clear-rollback-third-webgl-raw.png` / `-capture.json`.
- `[EVIDENCE]` The fresh first-person rollback PNG SHA-256 is exactly `5c867c3d0398a17000d7b9ae078bdcb5c1361db3d33cc75318ee4ad833c8e203`; the fresh third-person PNG SHA-256 is exactly `4059b61f962b787d320d6e04361d4bb71b15503465722ab8f73cf1f89ab850c8`. Both are byte-identical to their corresponding active distal-baseline captures. The captures remain contentful WebGL2 frames with no page or console errors; their only harness failures are the known duplicate GLB close-time aborts.
- `[RAW REVIEW]` Exact rollback restores the known rejected local raster: glove/forearm mass dominates the frame and the rifle remains narrow/upright. It also restores the supporting remote raster exactly, with the grounded character visibly armed.
- `[VERDICT]` The rejected branch leaves no active pose or presentation mutation. The target remains incomplete because the raw local view fails independently; accepted weapons/utilities remain `0`, and `EDITOR_PASS_ACCEPTED` remains absent.
- `[DISPOSITION]` Preserve the branch trial and rollback evidence as a causal result. No additional code mutation is authorized by this trial; any next attempt requires a new measured hypothesis and pre-mutation authorization.

## Entry 042 — Overlay and forward-target counterfactuals close two residual local mechanisms

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The current full-frame editor capture contains a diagnostic `<pre>` over the canvas. Read-only layout inspection measures the canvas at `1280x645` starting at page y=`75`, and `#pose-readout` at canvas-relative `[16,16]` with size `608x299.5625`: it covers `47.5%` of canvas width and `46.4%` of canvas height. Separately, the active first-person left chain is already at its maximum reach: upper/lower lengths are `0.2009057303m`/`0.2318919016m`, so the source clamp maximum is `0.4326976319m`; the existing requested shoulder-to-left-target distance is `0.4326976327m` (only `7.65e-10m` beyond numerical clamp precision).
- `[UNKNOWN]` Before this inventory, it was unknown whether the diagnostic panel materially concealed an otherwise readable 3D rifle, or whether advancing the shared first-person hold center could pull the sleeves/hands safely forward without changing camera, weapon-only transform, scale, asset content, static bind pose, or remote presentation.
- `[HYPOTHESIS]` If the overlay is causal, an otherwise unmodified canvas counterfactual without the panel will reveal a readable receiver/barrel/hand relationship. If forward-center depth is causal, the existing two-bone solver can advance both hands meaningfully while preserving its `0.035m` contact threshold; neither claim requires a source mutation to test.
- `[OPERATION]` Performed two read-only diagnostics only: captured the current WebGL2 canvas after temporarily hiding only the DOM readout in the browser (no persisted source, scene, pose, renderer, camera, or asset change), and evaluated the existing `solveEditorArm()` clamp equation against the captured static skeleton. The browser counterfactual is explicitly not an acceptance frame.
- `[EXPECTATION]` A viable mechanism would expose a broad, connected local rifle in the counterfactual and leave a usable forward displacement inside the static arm envelope. A still-narrow rifle or millimetre-scale reachable movement rejects the corresponding mechanism rather than authorizing a tuning sweep.
- `[EVIDENCE]` Counterfactual canvas artifacts are `.hoplite/inspection/readout-suppressed-first-canvas-counterfactual.png` / `.json` and `readout-suppressed-third-canvas-counterfactual.png` / `.json`; their state remains `backend=webgl2`, `animation=static`, `clip=t-pose`, with no page or console errors. The unoccluded local pixels still show the same dominant sleeve/glove mass and a narrow, near-vertical rifle segment; the panel was not the cause of the failed local visual gate. The supporting raw state remains the byte-identical rollback pair recorded in Entry 041.
- `[VERIFICATION]` Solving the source clamp math gives a maximum forward center increase of `0.0381262935m` before the left target exceeds `MAX_GRIP_ERROR=0.035m`. Even at that boundary, the clamped left hand moves only `0.0057718735m` forward. A `+0.040m` center advance requests `0.4694302526m`, exceeds reach by `0.0367326207m`, and is rejected by the existing contact guardrail while moving the reachable left hand only `0.0060226368m`. This cannot clear the observed camera-dominant arm geometry or change the weapon's narrow intrinsic projection; an equal whole-rig transform preserves that unfavorable ratio.
- `[VERDICT]` `REJECTED` as two independent causal mechanisms. Hiding diagnostics cannot establish the required raw local hold, and a forward-center mutation would either roll back or provide less than `6.1mm` of left-hand clearance while preserving the same rifle presentation.
- `[DISPOSITION]` Do not change the diagnostic UI merely to alter evidence, and do not trial or sweep the first-person forward center. The active source stays at the restored distal-contact baseline. A new source mutation remains unauthorized unless it addresses an untested mechanism without combining rejected weapon-frame, arm-branch, visibility, camera, scale, or target-center paths.

## Entry 043 — Continuation inventory closes the constrained local presentation space

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The fresh active-source first-person raster is exactly the retained rejected raster, not merely visually similar: `.hoplite/inspection/continuation-blocker-first-webgl-raw.png` has SHA-256 `5c867c3d0398a17000d7b9ae078bdcb5c1361db3d33cc75318ee4ad833c8e203`. It remains dominated by essential sleeve/glove/forearm geometry and exposes only a narrow, near-vertical rifle presentation. The independently fresh remote raster is likewise byte-identical to its supported grounded hold at SHA-256 `4059b61f962b787d320d6e04361d4bb71b15503465722ab8f73cf1f89ab850c8`.
- `[UNKNOWN]` Whether any legal editor-only operation remains that can increase the fixed rifle silhouette and preserve a natural hand connection without changing the camera, asset, weapon/hand/arm transforms, scale/depth/target placement, or retained visible geometry.
- `[HYPOTHESIS]` No such operation exists in the active scene pipeline. A whole-content transform is not an independent visual mechanism because `composeFirstPersonPose()` derives and moves the first-person camera with `FirstPersonContent`; it preserves the relative camera-to-rifle projection. The remaining geometry-affecting controls belong to the already rejected mechanism families. Render-order and material/lighting-only changes do not move projected rifle vertices or the actual hand contact relationship, so they cannot repair the required broad, connected local silhouette.
- `[OPERATION]` Performed only a read-only source-flow audit of `buildPose()` / `composeFirstPersonPose()` and a fresh raw recapture through the managed Preview route. No code, query-driven presentation setting, scene object, camera, material, pose, asset, animation, solver, or acceptance marker was mutated.
- `[EXPECTATION]` A defensible next candidate would have to change the rifle's local projected geometry or its true hand-to-rifle spatial relationship while avoiding every excluded mechanism family. The audited pipeline offers no independent control with that effect; a change that only hides geometry, draws the weapon on top, alters contrast, or moves the whole content group would fail that causal requirement before raw capture.
- `[EVIDENCE]` `.hoplite/inspection/continuation-blocker-{first,third}-webgl-raw.png` and matching capture JSON files record `backend=webgl2`, `animation=static`, and `clip=t-pose`. Both canvases are contentful at `1280x645` with no page errors or console issues. The capture harness reports its known duplicate GLB close-time `net::ERR_ABORTED` entries only; all visual/state checks passed and the image bytes match the preserved rollback pair exactly.
- `[VERIFICATION]` `git diff --check` passed. The configured PoseEditor Vitest command completed with `44` files / `385` tests passed, and `npx vite build --config PoseEditor/vite.config.ts` completed with `48` transformed modules. The standalone build emitted only its known chunk-size advisory.
- `[VERDICT]` `BLOCKED_BY_CONSTRAINED_PRESENTATION_SPACE`. The remote pass remains supporting evidence only; the local raw visual gate remains failed. No candidate is authorized, and no acceptance state changes.
- `[DISPOSITION]` Preserve the baseline, all trial captures, and the documented branch exclusions. Do not use a render-order/contrast workaround as an apparent repair. A future implementation requires an explicit scope choice that supplies a new local representation or reopens a previously rejected camera, asset, animation, weapon-frame, arm-pose, target, scale, or visibility family.

## Entry 044 — Oblique three-dimensional hand-target axis is a distinct causal candidate

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The raw reference requires an oblique, longitudinally readable local rifle: its visible muzzle-to-rear silhouette rises from lower-right toward upper-left/center. The active source has a planar first-person hold axis (`bodyUp` coefficient zero), so `leftTarget - rightTarget` is almost entirely body-forward. In `client/weapons/pose-solver.ts`, `buildTargetBasis()` derives `targetAxis = rightHand - leftHand` and `targetMuzzleDirection = -targetAxis`; the existing input therefore produces the measured `0.0762rad` end-on barrel and the narrow raw raster by construction.
- `[UNKNOWN]` Whether the bind-pose arm envelope can support an oblique coupled grip frame while preserving both real contacts and the remote presentation.
- `[HYPOTHESIS]` A body-space hold axis built from `-0.35 bodyRight + 0.35 bodyUp + 0.87 bodyForward`, normalized once by the existing vector operation, will orient the grip-derived muzzle screen-left/up and expose the rifle’s longitudinal geometry. Unlike historical yaw/roll trials, the weapon is never rotated after the solve: both hands move through the same deterministic two-bone solution first, then the shared solver places the original rifle from those actual hand locations.
- `[OPERATION]` Add one focused red test over `prepareRifleHold()`’s returned first-person targets, then add the single missing `bodyUp` axis term and the selected axis components. Keep the center, span, solve order, camera, static animation mode, first-person filter, grip solver, third-person axis, and asset unchanged. Capture raw first and third WebGL2 images immediately after the bounded change.
- `[EXPECTATION]` At the unchanged center/span, read-only geometry gives left/right requested distances of approximately `0.4493m` and `0.4044m`; the left clamp residual remains below `MAX_GRIP_ERROR=0.035m` and the right is reachable. The correct result has a broader diagonal local rifle while retaining visibly connected hands; an unchanged remote raster proves the first-person-only axis boundary. Diagnostics may retain their stricter camera-alignment rejection because that criterion is intentionally not changed; raw intended-perspective pixels remain the decision evidence.
- `[EVIDENCE]` Current baseline identity and current skeleton dimensions are recorded in Entries 038–043. The reference image is local thread source material only and is not an acceptance capture. The attempted read-only subagent request failed before start because `GLM 5.3 FLASH` is unavailable, so this entry relies only on primary source and geometry inspection.
- `[VERIFICATION]` Pending the red test, candidate implementation, focused/full checks, standalone build, `git diff --check`, and independent raw local/remote capture review.
- `[VERDICT]` Pending; no acceptance state changes.
- `[DISPOSITION]` Trial exactly this one coupled axis vector. Roll back all candidate code and tests if local raw pixels do not produce a naturally connected readable rifle, if reach/contact degrades, or if the remote frame changes. No parameter sweep or combined transform is authorized.

## Entry 045 — Oblique three-dimensional hand-target axis is visually insufficient

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The one permitted 3D hand-target-axis implementation correctly changed the rifle’s grip-derived direction rather than applying a post-solve rotation: candidate local barrel-camera alignment became `0.6046rad`, the weapon projection grew to approximately `0.259x0.536`, and grip errors remained effectively zero. Raw pixels nevertheless show the enlarged diagonal segment emerging amid dominant torso/sleeve/glove geometry, not a legible naturally held rifle. The trigger-side hand is no longer screen-readable.
- `[UNKNOWN]` There is no distinct untouched causal control in the current local representation that can independently change this arm/weapon occlusion relationship without re-entering a rejected family.
- `[HYPOTHESIS]` Rejected: adding a body-up component to the true two-hand target frame cannot satisfy both an oblique rifle silhouette and readable bilateral hands in the static bind-pose envelope.
- `[OPERATION]` Followed the predeclared one-candidate protocol: added red coverage, implemented only the body-up target-axis term and selected components, captured raw first/third WebGL2 frames, inspected each separately, and rolled back source and test immediately. No camera, asset, mesh filter, scale, center, post-solve weapon frame, elbow, finger, animation, gameplay, networking, combat, physics, acceptance marker, or evaluation criterion changed.
- `[EXPECTATION]` The expected diagonal weapon silhouette appeared in part, but the necessary connected-hand/arm composition did not. This is a failure of the visual mechanism itself, not a solver, asset-load, or renderer-health failure.
- `[EVIDENCE]` Candidate local/remote evidence is `.hoplite/inspection/axis3d-oblique-{first,third}-webgl-raw.png` with matching capture JSON. Both are contentful `1280x645` WebGL2 frames, static `t-pose`, with zero page errors and zero console errors. The candidate local state reports composition/readiness rejection solely from the unreadable right hand. The candidate and rollback third-person PNGs share SHA-256 `e3580cd06c1842d8077a079c4549036c2c8cbd9389e6ae4c4718b79494a8c08f`, confirming the first-person-only candidate did not alter remote pixels. Fresh restored local/remote evidence is `.hoplite/inspection/axis3d-oblique-rollback-{first,third}-webgl-raw.png`.
- `[VERIFICATION]` The candidate red test failed before implementation and passed afterward; candidate checks passed at `49/49` focused, `44/386` full, build `48` modules, and clean diff whitespace. Post-rollback checks pass at `48/48` focused, `44/385` full, build `48` modules, and clean diff whitespace. The full suite emits its existing Doppler relative-URL warning but exits successfully; it is unrelated to the editor candidate.
- `[VERDICT]` `REJECTED`. The local raw view fails independently; the remote raw view remains supporting-only. Acceptance counts remain zero and `EDITOR_PASS_ACCEPTED` remains absent.
- `[DISPOSITION]` The constrained-presentation-space blocker stands. Preserve the restored planar-axis baseline and all artifacts. A future change must explicitly authorize a new local representation (such as an independent first-person hand/viewmodel rig), a different allowed local pose source, or relaxation of a frozen camera/asset/evaluation constraint; do not parameter-sweep or combine rejected mechanisms.

## Entry 046 — Actual-game camera viewmodel fallback authorized

- Date: 2026-09-20
- Target ID: `rifle/hold-idle/local+remote`
- `[OBSERVE]` The real-game frame loop already updates `weaponsContainer` under the camera and suppresses it only when `localPlayerVisual.ownsWeapon` is true. The local character clone currently creates a second weapon under the character and gates visibility on the rejected solver verification, so the game can have no usable first-person rifle even though the legacy camera viewmodel is fully integrated.
- `[UNKNOWN]` Whether the current rifle calibration reads as front/right in the unmodified game viewport after the legacy container is re-enabled, and whether all head geometry is represented by the existing skin-weight filter.
- `[HYPOTHESIS]` Returning first-person weapon ownership to the existing camera container is causally distinct from the rejected PoseEditor weapon/hand-axis trials. Applying a small rifle-only idle offset there should move the intact weapon without changing any hand, body, camera, asset, or remote transform.
- `[OPERATION]` Remove the local solver-owned weapon presentation seam from the first-person path, retain the existing global muzzle/animation/recoil path, change only the rifle hip calibration to a positive screen-right/front camera offset under the container's established axis convention, and hide explicitly head-named or head-bone-attached meshes in the local clone while retaining the existing skinned head-triangle filter.
- `[EXPECTATION]` The raw local game frame should contain a head-free first-person view and a visible rifle in the lower-right/front of the camera. The remote frame, network state, combat muzzle resolution, and gameplay simulation should be unchanged.
- `[EVIDENCE]` Pre-change evidence is the source audit in `client/main.ts`, `client/src/systems/LocalPlayerVisualSystem.ts`, `client/weapons_model.ts`, and `shared/weapons.ts`. Post-change evidence must be a fresh screenshot/raw frame and read-only runtime state from the managed Preview.
- `[VERIFICATION]` Focused red/green client tests, full test suite, Vite build, whitespace check, and browser capture are required. Visual output, not solver diagnostics, decides whether this actual-game fallback is useful.
- `[VERDICT]` Pending raw game pixels.
- `[DISPOSITION]` Keep this one bounded runtime presentation change separate from the rejected PoseEditor candidate families. Do not tune additional weapon, camera, arm, hand, scale, or animation parameters unless the fresh actual-game frame demonstrates a specific new defect and the user explicitly authorizes it.
