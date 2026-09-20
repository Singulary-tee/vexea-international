# Player Representation Iteration Plan

## Purpose

Replace the current presentation with one coherent, authored, animation-driven player representation for a multiplayer first-person shooter. The plan treats the local first-person view and the remote-player view as two camera presentations of the same character, hand, weapon, utility, socket, and animation state. The editor and screenshots are validation means; the player representation is the product.

## Definition of done

The work is complete only when a real gameplay-perspective local view matches the supplied first-person references and a real remote-player view matches the supplied multiplayer reference:

- The local camera occupies the real player eye/head anchor, approximately 1.6 m above the calibrated feet, using the gameplay forward and aiming axes.
- The local presentation shows the real equipped weapon, real animated hands/forearms, and natural visible sleeve/body geometry; the weapon is held by the animated character rather than independently placed.
- The complete real character remains loaded and animated in first person; only head geometry that intersects the eye camera may be hidden.
- Remote players show the complete real character, including head, torso, both arms and hands, legs, feet, equipped weapon, and applicable utilities/items.
- The same authored state drives local and remote presentations. A hold, aim, fire, reload, equip, inspect, use, or place action cannot produce unrelated poses.
- Weapon and utility anchors, grips, scales, axes, and animation relationships remain valid across every required state.
- Feet are grounded, body height is calibrated, equipment does not float or sink, and geometry has no unacceptable clipping or detachment.
- All acceptance evidence is captured from the actual intended perspectives, not an external editor inspection camera.
- Gameplay, networking, combat, physics, input, camera interpolation, matchmaking, and AI behavior remain unchanged unless a presentation-only integration seam is strictly required and explicitly verified.

## Current execution control

The product requirements, reference images, A–Z technical loop, acceptance matrix, and explicit non-goals below remain authoritative. This section controls how this execution pass is performed so posing cannot devolve into untracked brute force.

### Additional execution rules

- **Quaternion-first rotations:** do not author pose mutations with Euler angles, `Euler`, `rotation.set`, or direct `rotation.x/y/z` assignments. Use normalized `THREE.Quaternion` values and explicit quaternion composition from measured axes, `setFromUnitVectors`, or a bounded axis-angle rotation. Preserve the measured grip and muzzle invariants after applying the quaternion.
- **No brute-force or eyeballing:** do not sweep arbitrary translations, Euler triples, roll values, or camera offsets. Every mutation must follow a written scene description, one causal hypothesis, one exact transformation, and one predicted end result before execution.
- **No simulated progress:** a script running, a readiness flag, a solver report, or a contentful canvas is not evidence of a successful pose. Only raw, unmodified Playwright captures inspected by the primary reviewer establish visual progress.
- **Implementation ownership:** the primary agent writes the description, hypothesis, exact change, invariants, and expected end result. A delegated implementation subagent executes only that specific transformation, captures the required evidence, and reports the observed result. The subagent may not expand scope, self-accept the target, or replace the plan with a parameter search.
- **Subagent identity:** discover subagent IDs through the task-control surface before delegation. Human-readable agent names are not model or subagent IDs and must never be passed as identifiers.
- **No intentional failure path:** do not avoid delegation, manufacture a failing implementation, or return an intermediate artifact to simulate completion. If the bounded hypothesis is rejected, record the raw evidence and stop for a new primary-authored hypothesis.

### Role split

- **Primary agent — owner/reviewer:** reads and enforces this plan, selects the current asset/state, reviews every rendered capture against the plan and both references, records the verdict, and gives the operator one precise next action or acceptance.
- **Operator subagent — worker:** operates the pose editor through Playwright, makes only the instructed change, captures the result, and appends only the operator fields to `tasks/progress-log.md`. The operator may not declare an item accepted, write the reviewer verdict or next action, expand scope, run the game, inspect gameplay, or touch source/server code.
- **Acceptance authority:** only the primary agent may mark a target `EDITOR_PASS_ACCEPTED`. This is an accepted editor target, not final product completion. An item does not count toward the editor-pass count until that verdict and its evidence paths are recorded.

This role split replaces the previous worker-self-review sequence for this execution pass: the primary reviews the operator's work as an independent reviewer. A second critic is optional only if the primary cannot decide from the rendered evidence; it never replaces the primary verdict.

### Hard execution boundary

- Use the standalone pose editor and Playwright captures only for this pass.
- Do not run or inspect the game, managed gameplay Preview, or gameplay server.
- Do not modify server, networking, combat, physics, matchmaking, AI, or unrelated files.
- The operator may not modify any source file. If editor evidence proves a source fix is required, the primary stops the target and records a separately authorized remediation task; it is not silently folded into posing.
- Preserve the existing dirty worktree and rejected artifacts; do not delete or revert work to restart.
- Do not accept editor readouts, numerical diagnostics, or code changes without personally inspecting the rendered pixels.

### Pass precedence and deferred product checks

For this editor pass, this section overrides any A–Z wording that requests gameplay/server execution or runtime evidence. The following remain product requirements but are **DEFERRED**, not skipped or satisfied: B's real-gameplay baseline, R's local/remote runtime invariance, S's gameplay transition stress, V's gameplay captures, X's runtime regression checks, and the final runtime portions of Z. U and the editor portions of P/Q remain active. No deferred check may be run or claimed from editor evidence.

### Anti-loop gates

- Work on exactly one immutable target ID at a time: `asset/state/view-pair`, starting with `rifle/hold-idle/local+remote`.
- Before the first mutation, the primary records fixed aim, grip, grounding, clipping, and perspective thresholds with their source. Missing or unavailable thresholds create an explicit `ISSUE_REQUIRES_ACTION`, never reviewer discretion.
- Every operator iteration must state one hypothesis, make one deterministic mutation, capture the required views, and append only: target ID, hypothesis, exact change, expected result, screenshot paths, and observed result. The primary appends the independent observation, verdict, and next action.
- The required evidence bundle is two unique raw Playwright captures for the same target: local eye-camera and remote complete-body/third-person inspection. Do not overwrite, crop, composite, or substitute readouts for either capture. Missing evidence blocks `EDITOR_PASS_ACCEPTED`.
- The primary opens and inspects the raw captures before reading the operator's interpretation. No blind batches, parameter sweeps, or arbitrary pose searches are allowed.
- Rejection counts are cumulative per immutable target ID. Three rejected captures require a stop; the primary must record an evidence-based root-cause diagnosis and a new bounded plan before any fourth attempt. A new target ID may not be used to reset the count.
- A passed target is frozen. Later work may not silently change its authored relationship; any regression opens a new logged target.

### Mandatory scene inventory and mutation leash

No source, scene, asset, serialized pose, test expectation, or server change is authorized until the primary completes a fresh measured inventory for the immutable target in `tasks/scene-investigation-log.md`. The existing progress log is an event history and cannot substitute for this inventory.

The inventory must explicitly record, for the body and weapon, the object and parent hierarchy; asset and animation identity; joints and sockets; local and world position, orientation, scale, and dimensions; shoulder, elbow, wrist, palm, finger, and grip relationships; eye/head anchor and gameplay axes; visibility and occlusion; camera-relative placement; and any clipping, grounding, or detachment evidence in both required views. Unknown values remain `UNKNOWN`; they may not be filled with estimates.

Before each possible mutation, the primary must write one complete proposal in the same log containing:

1. the exact object or shared transform-chain operation;
2. the axis, signed angle and/or translation, units, and scope;
3. the unchanged relationships and guards;
4. the measured causal defect that makes the operation necessary;
5. the logically predicted visual and numerical result;
6. fixed acceptance criteria and explicit rejection criteria; and
7. authorization status: `ISSUE_REQUIRES_ACTION`, `AUTHORIZED FOR ONE MUTATION`, or `REJECTED`.

Only `AUTHORIZED FOR ONE MUTATION` permits one bounded edit. A missing field, unsupported causal claim, parameter sweep, scalar trial without a completed inventory, or proposal based only on apparent screenshot improvement creates an `ISSUE_REQUIRES_ACTION`. That issue must be repaired, worked around, or measured before authorization; it is not a reason to end the session. After the edit, the primary must append the actual diff, fresh local and remote captures, measured result, independent raw-image observation, and a pass/reject decision before another proposal can be written. Three rejected attempts remain a stop condition and require a new causal diagnosis; they do not permit more tuning of the same hypothesis.

### Persistent record

`tasks/progress-log.md` is the append-only memo board for this work. It records plan decisions, the immutable target/state manifest, delegated instructions, every capture, every rejection, every editor-pass acceptance, blockers, thresholds, and the final evidence index. The primary consults it before each delegation and uses it as the source for status reports.

`tasks/scene-investigation-log.md` is the mandatory append-only measurement and authorization record. It is the only place where a scene inventory or transformation proposal may authorize the next bounded mutation. Its status is `ISSUE_REQUIRES_ACTION` until the inventory and proposal fields above are complete; every issue must be actively resolved or worked around.

## User specification — verbatim

Goal: Correct First-Person and Remote-Player Representation

Replace the current player presentation with a fully authored, animation-driven player representation matching the provided reference images.

This is not a camera adjustment, weapon-positioning pass, or model-polish pass. The entire relationship between character body, hands, weapon, grips, sockets, animations, and camera must be corrected together.

1. Local Player — First Person

The local player uses the actual gameplay character and its authored animation rig, viewed from the character's real eye/head anchor at approximately 1.6 m.

The first-person view must show:

- the real equipped weapon
- both hands when the animation calls for them
- forearms
- natural sleeve/body geometry where visible
- correct authored grip positions
- correct wrist and elbow articulation
- correct shoulder connection
- weapon positioned and rotated according to the authored character/weapon relationship
- weapon sights aligned with the gameplay aiming axis/crosshair

Do not create an independent floating first-person weapon pose.

Do not manually fake the hands around the weapon.

Do not detach the weapon from the character's animation system.

Do not reposition the weapon independently of the hands/grip sockets to make the screenshot look correct.

The complete character must remain loaded and animated. The head may be hidden from the first-person render if required to prevent camera intersection; no other body parts may be removed merely to simplify first-person presentation.

The resulting view must look like the camera is physically occupying the character's head/eye position while the character is genuinely holding the weapon.

2. Remote Players — Complete Character

Every remote player must render as the complete authored character, not a simplified substitute.

Remote players must visibly contain:

- head
- torso
- both arms
- hands
- legs
- feet
- equipped weapon
- equipped utilities/items where applicable

Weapons and utilities must attach through their authored sockets, with the correct scale, orientation, and positional relationship to the hands/body.

The remote character must actually perform the authored animations. The weapon must move with the hands and body rather than remaining independently positioned.

The character must remain properly grounded: feet contact the ground according to the animation, body height is correct, and the character does not float, sink, or slide because of incorrect transforms.

3. Animation Contract

The same underlying character/weapon relationships must remain valid throughout:

- idle
- movement
- sprint
- aim
- fire
- reload
- equip
- inspect
- use
- place
- interaction animations

For every animation:

hands → grips → weapon → arms → shoulders → torso

must remain physically and visually connected.

No animation may produce:

- hands detached from the weapon
- fingers visibly missing the grip
- wrists bent through the weapon
- elbows disconnected from the arms
- arms disconnected from shoulders
- weapon floating away from hands
- weapon intersecting through hands/body
- weapon floating beside the character
- utilities detached from their sockets
- body parts clipping through equipment
- feet floating above or sinking into the ground

4. First-Person vs Remote Consistency

First-person and remote-player presentation must represent the same underlying player state.

Do not create two unrelated visual representations whose poses merely happen to resemble each other.

If the local player is holding, aiming, firing, reloading, equipping, inspecting, using, or placing an item, the corresponding remote representation must show the appropriate authored body/hand/weapon action.

The local view may hide the head and other geometry that is physically behind the camera, but it must not alter the actual character's authored pose, grip, socket, or animation relationships.

5. Acceptance Test

The implementation is correct only when all of the following are simultaneously true:

1. First-person view looks like a real character holding the weapon from the character's own eye position.
2. Both local hands, arms, weapon, and visible body geometry form one continuous articulated character.
3. Weapon sights align with the gameplay aiming axis.
4. Remote players visibly have complete bodies.
5. Remote weapons/utilities are correctly seated in authored sockets.
6. Remote players perform the corresponding authored animations.
7. The relationships remain correct during idle, aim, fire, reload, equip, inspect, use, and place.
8. No floating, detached, incorrectly scaled, incorrectly rotated, or visibly clipped player/equipment geometry exists.
9. Nothing is solved by hiding, deleting, detaching, or independently repositioning components that should be connected.

The reference images define the intended visual result. Treat them as acceptance criteria, not inspiration.

The previous implementation failed because it treated first-person presentation, weapon placement, grips, and remote-player presentation as separate problems. This task must correct the complete player-representation system as one connected visual/animation system.

## Reference interpretation

The two supplied references are acceptance targets, not mood boards:

1. The snowy multiplayer image is a gameplay first-person camera. The local weapon occupies the lower foreground while complete remote characters are visible in the world ahead. The remote characters have full bodies, grounded feet, connected shoulders/arms/hands, and weapons held as part of their animated bodies.
2. The isolated weapon image is a gameplay first-person weapon view. The camera is at the player's eye position; the weapon, sight picture, forearm, sleeve, and hand occupy the lower-right/center foreground; the weapon points along the gameplay aiming axis. It is not an external full-body inspection.

The final proof must show both situations: a true local first-person gameplay perspective and a true remote-player perspective from another player's camera. An editor viewport with a camera outside the character is not proof of either.

## A–Z iteration loop

### A — Audit the current presentation path

Trace the actual runtime path for the local player, remote players, weapon attachment, utility attachment, animation mixer/state, eye anchor, and camera aim. Identify every independently positioned clone, viewmodel-only arm/body, head/limb filter, screen-space offset, and external diagnostic camera. Record exact files and preserve the forbidden runtime boundaries.

**Exit guard:** no implementation change begins until each visible player/equipment mesh has a known owner, parent, socket, animation source, and camera presentation.

### B — Baseline real gameplay evidence

Capture the current local first-person and remote-player outputs using real assets and actual gameplay perspective. Keep the user references beside the captures. Record selected asset IDs, animation clips, camera position/forward vector, socket errors, scale, body completeness, grounding, and clipping.

**Exit guard:** baseline evidence must be labeled as accepted or rejected; editor-only images cannot be used as gameplay proof.

### C — Canonical representation contract

Define one canonical character presentation state containing the normalized player rig, animation state/time, hand bones, weapon/utility asset, authored sockets, aim direction, ground transform, and visibility policy. Local and remote render paths consume that state rather than inventing separate poses.

**Exit guard:** no second pose source may silently override the canonical state.

### D — Determine authoritative anchors

Inventory the real player eye/head anchor, feet origin, shoulder/forearm/hand bones, and every weapon/utility root, primary grip, support grip, muzzle, ADS, use, placement, throw, or release anchor. Document source-space axes and units for each asset.

**Exit guard:** missing or ambiguous anchors reject the asset; no screen-space correction is allowed.

### E — Establish calibrated body transforms

Use the existing gameplay player calibration as the source of truth for height, feet, facing, and skeleton scale. Preserve the complete body and animation hierarchy. Apply only the permitted first-person head visibility rule after the pose is solved.

**Exit guard:** body height, feet origin, authored forward, and eye anchor remain stable across local and remote views.

### F — Build the real first-person camera

Place the camera at the animated character's real eye/head anchor, approximately 1.6 m above calibrated feet, with gameplay FOV, near plane, up axis, and forward/aim axis. Do not place the camera at an external preview location and do not move the character to fake a camera offset.

**Exit guard:** camera-space evidence proves the view is eye-level and the local weapon is in the lower foreground like the references.

### G — Attach the local weapon through the character

Use the real equipped weapon and the real animated hand bones. Solve its root transform from the authored primary/support grip relationship; the weapon follows the hands. Do not create a floating viewmodel or independently translate the weapon after solving to improve a screenshot.

**Exit guard:** both required hands, grip anchors, wrists, elbows, and shoulders form one connected chain.

### H — Align weapon orientation and sight picture

Use each weapon's authored muzzle and ADS contract, validated against mesh geometry. Align the weapon's business end and sights to the gameplay aiming axis without changing the hand/weapon relationship. Preserve asset-specific axes, including reversed or lateral source axes.

**Exit guard:** sight/aim error and measured muzzle error are below explicit thresholds; no orientation is accepted from a visually convenient but unauthored rotation.

### I — Integrate hand and body animations

Drive the local character from the actual authored animation rig. Verify idle, movement, sprint, aim, fire, reload, equip, and inspect transitions with the weapon attached. Hands, wrists, elbows, shoulders, torso, and visible sleeves must remain continuous.

**Exit guard:** no animation state can detach hands, bend wrists through the weapon, or produce a missing arm/limb.

### J — Integrate remote-player presentation

Render remote players from the same canonical character/weapon state with no first-person body reduction. Keep head, torso, arms, hands, legs, feet, weapon, and utilities visible as applicable. Use the remote camera only to inspect what another player sees.

**Exit guard:** a remote capture visibly contains the complete character and the weapon moves with the animated hands/body.

### K — Grounding and locomotion

Validate feet contact, body height, root motion/placement, movement, sprint, crouch if supported, and transition continuity. Check that transform normalization does not float, sink, or slide the remote character.

**Exit guard:** foot-ground distance and root displacement remain within defined tolerances for every tested clip.

### L — Utility representation

Apply the same authored-anchor process to every real utility: hand-held, use, throw, and place states; authored placement references first; catalogued source frames only when the asset lacks an authored node. Verify scale, orientation, anchor, and release/use relationships.

**Exit guard:** utilities never float, invert, detach, or use a screen-space placement correction.

### M — Animation-state matrix

Create a matrix of weapons and utilities against idle, movement, sprint, aim, fire, reload, equip, inspect, use, place, and interaction states. Mark unsupported states explicitly instead of silently substituting a misleading pose.

**Exit guard:** every supported cell has a real clip/state and passes the relationship checks.

### N — Numerical pose guards

Add or retain guards for complete body presence, bilateral arm chains, socket existence, grip error, sight/aim alignment, muzzle axis agreement, scale, ground contact, near-plane safety, and camera perspective classification.

**Exit guard:** a pose cannot report verified when any required numerical guard is missing, unavailable, or out of tolerance.

### O — Geometry and clipping guards

Use broad-phase bounds followed by exact triangle proximity/intersection checks for hands, arms, body, weapon, and utility meshes. Include indexed seam welding and closed-solid containment where needed. Treat tolerated contact separately from hard clipping.

**Exit guard:** no loosened global threshold or hidden geometry may be used to turn a failed pose green.

### P — Perspective guard

Classify evidence by camera relationship: local first person must be at the eye anchor with weapon foreground; remote evidence must be outside the character and show the complete body. Reject screenshots that merely show an editor camera, debug geometry, or diagnostic readout.

**Exit guard:** each screenshot has a machine-readable view label and a human-inspected perspective verdict.

### Q — Asset identity guard

Verify every rendered player, weapon, and utility is the real optimized GLB asset selected by its catalog identity. Reject proxies, synthetic sleeves, substituted weapons, arms-only extracts, and unrelated meshes.

**Exit guard:** evidence records asset model keys and source ownership for every visible representation.

### R — Runtime invariance

Compare local and remote transforms and animation samples for the same player state. Confirm that hiding first-person head geometry does not mutate the authored pose, socket transforms, or animation state consumed by the remote representation.

**Exit guard:** differences are limited to camera presentation and permitted visibility, not pose relationships.

### S — State transition stress pass

Exercise rapid and sequential transitions: equip → idle → aim → fire → reload → sprint → inspect → use/place. Repeat with each weapon and applicable utility. Check that no stale clone, cached bounds, or prior socket transform survives a state change.

**Exit guard:** transitions are deterministic and leave no detached or mis-scaled assets.

### T — Test coverage

Add focused unit/regression tests for canonical state ownership, eye anchor, grip solving, axes, animation-state coverage, body completeness, grounding, exact clipping, perspective guards, utility anchors, cache invalidation, and local/remote consistency.

**Exit guard:** every non-trivial representation rule has a runnable test and tests do not weaken runtime behavior.

### U — UI/editor alignment

Make the pose editor an authoring and validation tool for the same runtime representation. Its first-person mode must be an eye-camera gameplay view; its remote mode must be a complete-character inspection of what another player sees. Readouts supplement, never replace, visual proof.

**Exit guard:** editor labels, camera placement, rendered result, and diagnostics agree.

### V — Visual verification

Run a real browser session with actual assets and capture the required local first-person and remote-player scenes. Personally inspect the rendered pixels, not only DOM/readout state. Retain rejected captures privately and publish only correct evidence.

**Exit guard:** visual inspection agrees with all numerical guards and no browser errors affect the result.

### W — Whole-catalog verification

Exercise all six weapon entries and all eight utility entries through their applicable local and remote states. Record asset identity, clip, grips/anchors, orientation, scale, clipping, grounding, and evidence paths.

**Exit guard:** no catalog entry is accepted solely because another asset passed.

### X — Scope and regression review

Review the diff for forbidden changes to gameplay/server/networking/combat/physics/input/camera interpolation/matchmaking/AI systems. Run focused tests, build, syntax checks, and the full relevant test command; classify unrelated failures honestly.

**Exit guard:** no unrelated runtime change is hidden inside the pose work.

### Y — Acceptance package

Assemble the plan, implementation diff, test logs, runtime captures, per-catalog verification matrix, rejected-case notes, and known environment limitations. Ensure every claim is linked to fresh evidence.

**Exit guard:** a reviewer can determine what is proven, what is rejected, and what remains unresolved without trusting narration.

### Z — Final sign-off

Sign off only when the real local first-person view and real remote-player view satisfy the verbatim specification together. If any hand, grip, socket, limb, animation, weapon, utility, perspective, grounding, clipping, or consistency guard fails, the result remains incomplete.

**Final verdict:** complete player representation, not a pose-editor screenshot.

## Acceptance matrix

| Area | Required result | Evidence | Hard failure |
|---|---|---|---|
| Local camera | Real eye/head anchor, gameplay perspective, correct forward/FOV | Camera transform plus inspected first-person capture | External framing or screen-space weapon placement |
| Local body | Real complete character retained; head-only visibility exception | Body asset identity, skeleton/mesh inventory, capture | Arms-only, legs removed, synthetic sleeves, hidden torso |
| Local weapon | Real weapon, both applicable hands, authored primary/support grips | Socket/hand measurements and capture | Floating weapon, fake hands, independent offset |
| Sight/muzzle | Sights and business end follow gameplay aim | Aim and muzzle angle measurements | Visually convenient but unauthored rotation |
| Remote body | Complete head-to-feet real character | Inspected remote capture and mesh inventory | Simplified or partial substitute |
| Remote equipment | Weapon/utilities move with body and hands | Parent/socket/state trace | Detached or static equipment |
| Animation | All supported states preserve chain | State matrix captures/tests | Any detached hand, wrist, arm, or weapon |
| Grounding | Feet and root remain physically grounded | Foot/root measurements | Float, sink, slide |
| Clipping | No hard mesh intersection/proximity failure | Exact geometry diagnostics plus capture | Hidden geometry or weakened global threshold |
| Consistency | Local/remote share same underlying state | Same-state transform/animation comparison | Two unrelated pose systems |
| Evidence | Correct perspectives personally inspected | Fresh browser captures | Editor-only or readout-only proof |

## Execution order

### 0. Plan gate and log initialization

Read this plan and the attached task text before every execution pass. Confirm the role split, current boundary, selected target, and existing rejected evidence in `tasks/progress-log.md`. Do not begin implementation or posing until the next action is written in the log.

Create or update the immutable state manifest in the log before catalog expansion: each asset lists its applicable states and required local/remote evidence. An unsupported state requires a primary `ISSUE_REQUIRES_ACTION` record and never counts as accepted until the state is implemented or an explicit supported-state decision is recorded.

**Exit guard:** scope is editor-only; the target ID, applicable state, fixed thresholds, exact next action, and evidence paths are written; no source, server, or gameplay work is authorized.

### 1. Source and editor audit

Audit the existing presentation/editor path against A–D and U without running the game. Identify the real asset, character hierarchy, eye/head anchor, feet origin, hand bones, authored grips, weapon/utility root, animation clip, camera mode, and any existing independent offsets. Record exact files, selectors, and evidence paths.

**Exit guard:** the operator has a concrete target and the primary can state what relationship must be corrected; missing data creates an investigation issue to resolve instead of inviting guesses.

### 2. Establish one editor baseline

Load the real rifle and complete authored character in the pose editor. Capture its first-person eye-camera and remote/third-person inspection modes with Playwright. The primary reviews the pixels against the references and records the first specific defect; this baseline is evidence, not acceptance.

**Exit guard:** the baseline identifies one bounded defect and one hypothesis for the first change.

### 3. Delegate one bounded iteration

Spawn one operator subagent with the exact immutable target ID, allowed editor actions, hypothesis, deterministic mutation, expected result, required local/remote capture paths, and operator-only log fields. The operator changes only the instructed pose/relationship, captures both required editor views, appends its fields, and stops. It must not write a verdict or next action.

**Exit guard:** both raw captures and the operator portion of the log entry exist before any next instruction.

### 4. Primary review and controlled decision

The primary opens the two raw screenshots first and personally inspects them at useful scale against the plan, both references, authored body/hand/weapon continuity, eye anchor, grips, sockets, grounding, animation state, and clipping. Only afterward does the primary read the operator's interpretation. The primary records `EDITOR_PASS_ACCEPTED`, `REJECTED`, or `ISSUE_REQUIRES_ACTION` with concrete visual evidence.

- `EDITOR_PASS_ACCEPTED`: freeze the target and record both evidence paths. This does not satisfy final runtime product completion.
- `REJECTED`: send exactly one new bounded hypothesis/change to the operator.
- `ISSUE_REQUIRES_ACTION`: diagnose from recorded evidence, repair or work around the issue, and continue; do not invent another pose.

**Exit guard:** no next iteration occurs without a primary verdict.

### 5. Complete the rifle before expanding scope

Finish the rifle's required editor states in dependency order: authored hold/idle, aim, fire, reload, equip, inspect, then applicable use/place states. Validate local eye-camera and complete remote/third-person presentation for each state. Apply the three-rejection stop rule independently to each target.

**Exit guard:** the rifle has primary-approved editor captures and log entries for every applicable state; otherwise editor-pass weapons remain at zero.

### 6. Expand vertically through the catalog

After the rifle is accepted, process one weapon at a time, then one utility at a time. For each item, repeat the same baseline → one hypothesis → one capture → primary verdict loop. Never infer an item's pose from another catalog entry. Record unsupported states explicitly rather than substituting a misleading pose.

**Exit guard:** each accepted catalog cell has its own screenshot, reviewer verdict, asset identity, animation state, and evidence path.

### 7. Handle evidence-backed remediation separately

If an editor defect proves that the existing source cannot express the required authored relationship, the primary records the defect, affected path, smallest client/editor-only remediation, and verification command as an actionable follow-up. The operator does not implement it, and no source change occurs during this editor acceptance pass unless that remediation is explicitly authorized. The remediation returns to the same immutable target and resets neither its evidence nor rejection count.

**Exit guard:** no source change, server change, gameplay run, or unrelated test work is smuggled into posing.

### 8. Final editor evidence and scope review

Assemble the accepted editor captures, rejected-case notes, progress log, focused verification results, and diff scope review. Confirm no server or gameplay files were changed during this pass. Do not call editor approval final gameplay completion: the product Definition of Done still requires the real runtime perspectives when that separately authorized phase is allowed.

**Exit guard:** every claimed accepted item is independently reviewable from the log and a fresh rendered capture.

### 9. Sign-off

Report exact counts from `tasks/progress-log.md`: `EDITOR_PASS_ACCEPTED` weapons/utilities and final product-complete weapons/utilities separately. An editor target is complete only with a primary `EDITOR_PASS_ACCEPTED` verdict; final product completion remains zero until the deferred runtime phase is authorized and passes. If any required relationship, state, perspective, grounding, clipping, or consistency guard fails, report the item as rejected or requiring action rather than complete.

## Explicit non-goals

- No gameplay feature redesign.
- No network protocol redesign.
- No combat, physics, matchmaking, or AI changes.
- No independent floating viewmodel system.
- No fake hand geometry.
- No screenshot-only or editor-only acceptance.
- No weakening of shared solver/clipping thresholds.
- No treating a successful diagnostic readout as proof without inspecting the intended perspective.

## 10. Current visual-first posing operation and research record

> **Read this section last and treat it as the current execution control.** This appendix preserves the earlier plan and evidence; it does not erase or rewrite rejected work. It explicitly supersedes earlier agent-authored pose “immutable” or “fixed-invariant” language that was not supplied by the user.

### 10.0 User directive and constraint labels

- **[USER-DIRECTIVE]** Preserve all prior hypotheses, source changes, captures, measurements, reviews, and rejection records. Do not throw away historical evidence.
- **[USER-DIRECTIVE]** Write the research, ordered operation list, working rules, and verification checklist into this plan before another pose mutation.
- **[USER-DIRECTIVE]** Use the written material to supplement every `observe → hypothesis → expected result` cycle. Do not select random pose hypotheses.
- **[USER-DIRECTIVE]** No pose aspect is frozen. Arm pose, hand pose, weapon placement, weapon rotation, weapon scale, weapon presentation, and the choice of editor-side presentation transform remain available for investigation.
- **[SCOPE]** The target remains `rifle/hold-idle/local+remote` in the standalone `PoseEditor`.
- **[SCOPE]** Gameplay, networking, combat, physics, camera implementation, asset-file identity/content, evaluation criteria, and acceptance markers remain outside this presentation operation. A standalone editor presentation transform is not a gameplay-camera change.
- **[POSE-FROZEN]** None. This label must remain absent unless the user explicitly freezes a pose property.
- **[INVARIANT]** None may be invented. A measured quantity can be a diagnostic or acceptance check without becoming a mutation constraint.
- **[LEGACY]** Earlier entries that called the target immutable or claimed that the admissible PoseEditor transform space was closed remain historical records of the prior reasoning failure. They are not current pose constraints.
- **[WORKING-RULE]** A working rule is procedural guidance, not a product invariant. Every new working rule must be written with this label, its reason, its expected benefit, and its review/exit condition. It may be revised when evidence disproves it.
- **[RESEARCH]** External sources guide hypotheses; they do not override repository code, the attached reference, or the user's explicit scope.
- **[OBSERVATION]**, **[HYPOTHESIS]**, **[OPERATION]**, **[EXPECTATION]**, **[EVIDENCE]**, **[VERIFICATION]**, and **[VERDICT]** are evidence-record labels. They are not constraints.

### 10.1 Preserved visual target from the attached reference

- **[REFERENCE]** `.hoplite/attachments/art_upload_2b9a5e64c9c54431992a72e7587e4c68/1762691503120_1762691503120.webp` is a `1200x722` WebP reference and remains source material for visual review.
- **[OBSERVATION][LOCAL]** The first-person rifle occupies a broad, readable lower-center/right composition. Receiver, sight/rail, handguard, barrel, stock/body, and the supporting arm/hand read as one continuous weapon presentation. The weapon points into the forward view rather than appearing edge-on or buried in the forearms.
- **[OBSERVATION][REMOTE]** The visible remote characters are complete and grounded. Their rifles have readable stock/receiver/barrel silhouettes and visibly connected arms/hands; they do not read as empty-handed.
- **[OBSERVATION][PAIR]** The visual target is not satisfied by a solver readout, a valid grip distance, a contentful canvas, or a small remote rifle alone. Both raw intended perspectives must be understandable as rifle-holding views.
- **[CHECK]** The reference is an appearance target, not an instruction to copy its environment, characters, weapon asset, camera implementation, or gameplay behavior.

### 10.2 Web research record

The search was performed on 2026-09-19. Official engine documentation is preferred for API behavior. Practical FPS/rig references are recorded as design patterns, not as authority or code to copy.

#### Authoritative transform and IK references

- **[RESEARCH][THREE.JS]** `Object3D` distinguishes local `matrix` from world `matrixWorld`, and provides hierarchy-aware world/local operations. World matrices must be current before measurements are trusted. Source: <https://threejs.org/docs/pages/Object3D.html>
- **[RESEARCH][THREE.JS]** `Matrix4.compose(position, quaternion, scale)` is the documented transform composition path. Source: <https://threejs.org/docs/pages/Matrix4.html>
- **[RESEARCH][THREE.JS]** Three.js expects normalized quaternions for rotations. Source: <https://threejs.org/docs/pages/Quaternion.html>
- **[RESEARCH][THREE.JS]** `SkinnedMesh` uses a skeleton, bind matrices, and animated bone transforms; animated bounds may need per-frame recomputation. Source: <https://threejs.org/docs/pages/SkinnedMesh.html>
- **[RESEARCH][THREE.JS]** `CCDIKSolver` supports targets, effectors, bone links, angle limits, iterations, and blend factors, but a more powerful solver cannot correct a wrong weapon frame or solve order. Source: <https://threejs.org/docs/pages/CCDIKSolver.html>
- **[RESEARCH][UNITY]** Unity's Two Bone IK model separates root/mid/tip bones, a hand target, and an elbow hint. Target position, target rotation, hint weight, and target-offset behavior are separate controls. Source: <https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.1/manual/constraints/TwoBoneIKConstraint.html>
- **[RESEARCH][BLENDER]** Blender's IK documentation separates the end target from the pole target that determines elbow direction, and documents chain length and constraint ordering. Sources: <https://docs.blender.org/manual/en/latest/animation/armatures/posing/bone_constraints/inverse_kinematics/introduction.html> and <https://docs.blender.org/manual/en/5.2/animation/constraints/tracking/ik_solver.html>

#### Practical first-person weapon-rig references

- **[RESEARCH][PRACTICAL]** Kinemation describes an `IK weapon_bone`, weapon-relative hand targets, head/camera-relative inheritance, an aim point, a pivot point, and a positive-Z weapon-forward convention. Source: <https://kinemation.gitbook.io/character-animation-system-docs/fps-addon/quickstart/skeleton-and-ik>
- **[RESEARCH][PRACTICAL]** Kinemation's weapon setup explicitly distinguishes an aim point, a pivot point, and a left-hand target; it warns that weapon forward convention matters. Source: <https://kinemation.gitbook.io/fps-animation-framework/tutorial/getting-started/weapon-setup>
- **[RESEARCH][PRACTICAL]** MoCap Online describes first-person animation as its own discipline and contrasts camera-relative arms with body-driven arms plus camera offset. Source: <https://mocaponline.com/blogs/mocap-news/first-person-animation-guide>
- **[RESEARCH][PRACTICAL]** The Procedural First Person Toolkit documents an order of weapon positioning/offset, procedural rebase/motion, hand offsets, aim offsets, and final hand IK. Source: <https://vinipistudios.gitbook.io/procedural-first-person-toolkit/anim-node-reference/the-procedural-pipeline>
- **[RESEARCH][PRACTICAL]** Motion documents separate first-person and world item presentations with distinct relative transforms, held poses, solve settings, and first-person tuning. Source: <https://docs.motionco.re/guides/first-person-item-configs>
- **[RESEARCH][PRACTICAL]** NGG describes a hand-reference approach in which weapon and a hand-reference mesh define hand placement, with IK and bone transforms supporting both first-person and third-person views. Source: <https://neilgilbertg.ca/2024/04/18/ue5-hand-reference-based-weapon-animation-system-2-0/>
- **[RESEARCH][EXAMPLE]** A code-oriented viewmodel example describes separate procedural layers for sway, bob, recoil, ADS, and two-bone hand IK, plus a standardized weapon frame. This is an example, not an authoritative repository dependency. Source: <https://deepwiki.com/mshumer/Claude-of-Duty/7.2-viewmodel-animation-and-ballistics>

#### Research-derived principles, not frozen rules

- **[WORKING-RULE] Weapon-authoritative order:** establish a readable rifle frame first; make hands follow the weapon rather than deriving the weapon's camera presentation from the current hands.
- **[WORKING-RULE] Explicit weapon frame:** identify the actual weapon forward axis, primary grip, support grip/foregrip, aim/sight point, pivot, and any authored up/reference axis from the loaded scene before choosing a quaternion.
- **[WORKING-RULE] Two-bone arm control:** use a hand target plus an elbow hint/pole concept for each arm. The support hand must not be inferred solely from its current animated orientation.
- **[WORKING-RULE] Solve order:** base animation → weapon presentation → dominant-hand relationship → support-hand target/hint → final hand/arm pose → visual review.
- **[WORKING-RULE] Matrix audit:** update world matrices and explicitly convert world-space measurements into the actual parent-local space before applying rotations or translations.
- **[WORKING-RULE] View-specific presentation:** local and remote views may require distinct editor-side presentation transforms while retaining the same rifle identity and authored state. This is a hypothesis to test, not a frozen architecture.
- **[WORKING-RULE] Raw visual priority:** solver/readiness/diagnostic results are secondary. A raw screenshot that does not resemble a rifle-holding FPS/local or remote view fails regardless of numeric status.

### 10.3 Ordered operation list

This is the sequence for the next investigation. It is an operation order, not a new set of hidden invariants. Each operation must produce its own observation/evidence before the next operation is chosen.

#### Operation 0 — Preserve and reset the written context

- **[STATUS]** Completed by this appendix; no pose mutation is made in this operation.
- Preserve `diagonal-axis-first/third`, all earlier `.hoplite` artifacts, the current `PoseEditor/rifle-presentation.ts` candidate, and all historical log entries.
- Treat the current candidate as rejected evidence, not as a baseline and not as accepted code.
- Read this section before the next operation. Do not reuse an earlier “fixed invariant” unless a fresh observation and explicit label justify it.

#### Operation 1 — Fresh scene and presentation inventory

- **[OBSERVE]** Load the standalone editor and record the actual local camera transform, remote inspection camera transform, character root/feet, rifle root, primary grip, support grip/foregrip, muzzle, sight/aim point if present, parent chain, and current animation/pose state.
- **[OBSERVE]** Record each relevant object's local transform and updated world matrix, including the actual forward/up axes measured from geometry or named authored nodes. Do not assume `+Z`, `-Z`, hand `+Y`, or socket orientation.
- **[OBSERVE]** Record whether the current editor transaction can isolate or hide arms/hands without changing asset identity; if not, record the smallest editor-only visual isolation method available.
- **[EXPECTATION]** A complete scene graph and axis map exists before a new transform hypothesis is written.
- **[VERIFICATION]** Inventory JSON/artifact plus direct review of the hierarchy and matrix data. Missing data is an investigation failure, not permission to guess.

#### Operation 2 — Weapon-only first-person control

- **[OPERATION]** Render the actual rifle from the intended local first-person camera with the hand/arm presentation isolated as far as the standalone editor permits. Do not solve or rotate hands in this operation.
- **[HYPOTHESIS]** The rifle's own loaded frame can be placed into a readable lower-center/right local composition using one deterministic editor-side weapon transform.
- **[EXPECTATION]** The raw local capture shows a broad, continuous receiver/handguard/barrel/stock silhouette, a forward-pointing muzzle/sight relationship, and enough weapon detail to identify the rifle without relying on diagnostics.
- **[FAILURE BRANCH]** If the weapon-only frame is edge-on, buried, too small, or not camera-forward, stop hand work and diagnose camera/asset axis/parenting/scale/depth from Operation 1. Do not add a compensating hand rule.
- **[VERIFICATION]** Fresh unmodified `1280x720` local capture, direct pixel inspection, projected weapon bounds, barrel/muzzle-to-camera alignment, and matrix trace.

#### Operation 3 — Establish the weapon frame from measured data

- **[OBSERVE]** Use the actual resolved muzzle/aim/receiver and grip geometry from Operation 1, not an assumed node axis.
- **[HYPOTHESIS]** A proper-handed basis built from measured weapon forward plus a non-collinear authored/world-up reference will orient the weapon frame toward the local camera without destroying the intended rifle silhouette.
- **[OPERATION]** Construct normalized basis vectors and a quaternion/matrix from those vectors; apply one editor-only transform transaction. The exact formula and chosen reference vector must be written in the candidate record before execution.
- **[EXPECTATION]** The weapon's muzzle direction is camera-forward, the receiver and handguard remain readable, and the projected weapon bounds occupy the reference-like lower center/right region without arbitrary screen-space correction.
- **[VERIFICATION]** Compare predicted and measured world axes, quaternion determinant/normalization, local-to-world conversion, raw pixels, and projected bounds. If the prediction fails, reject the hypothesis instead of adding a second corrective rotation.

#### Operation 4 — Dominant-hand connection

- **[OBSERVE]** With the weapon frame passing its control check, measure the dominant-hand grip relationship and the arm chain in the current sampled animation.
- **[HYPOTHESIS]** The dominant hand can be placed/oriented against the weapon's primary grip while preserving a natural elbow bend and without allowing the hand to redefine the weapon frame.
- **[OPERATION]** Apply one deterministic dominant-hand/arm pose or target relationship in the correct parent-local space. The weapon remains the reference object for this operation.
- **[EXPECTATION]** The trigger/primary grip is visibly connected, the arm is not splayed across the rifle, and the weapon silhouette remains substantially unchanged.
- **[VERIFICATION]** Raw local capture, contact/orientation measurements, elbow bend, clipping, and comparison against the weapon-only control.

#### Operation 5 — Support-hand target and elbow hint

- **[OBSERVE]** Measure the actual foregrip/support-grip location and the current support arm chain.
- **[HYPOTHESIS]** A support-hand target on the foregrip plus an explicit elbow hint/pole produces a natural two-handed rifle hold without rotating the weapon away from the local camera.
- **[OPERATION]** Apply one support-hand target/orientation and elbow-direction construction. Keep the weapon frame from Operation 3 as the reference; do not derive a new weapon yaw/roll from the solved support hand.
- **[EXPECTATION]** The support palm/fingers meet the foregrip, the elbow bends plausibly, both hands read as supporting the same rifle, and the local silhouette remains readable.
- **[VERIFICATION]** Raw local capture first; then contact, orientation, reachability, elbow, clipping, and weapon-axis checks. A solver pass without visual connection fails.

#### Operation 6 — Complete local presentation gate

- **[OBSERVE]** Review the full local frame against the supplied reference without readout overlays or crops.
- **[EXPECTATION]** The local frame independently passes: readable rifle silhouette, connected hands, forward perspective, natural arm/body relationship, acceptable scale/depth, no hard clipping, and no external/editor framing artifact.
- **[VERIFICATION]** Save fresh raw `1280x720` PNG plus JSON diagnostics; inspect raw pixels directly. If any visual item fails, reject the candidate and return to the first failed dependency rather than adding a mini-rule.

#### Operation 7 — Remote connected presentation

- **[OBSERVE]** Use the same rifle identity and authored hold state in the complete remote character; measure the remote camera/body relationship and current weapon occlusion.
- **[HYPOTHESIS]** A deliberate editor-side remote presentation transform can expose a connected across-body rifle while retaining the same weapon/hand state and grounded complete body.
- **[OPERATION]** Apply one deterministic remote presentation transform or pose change, separate from the local control if the evidence requires it. Record it as `[WORKING-RULE]` or `[HYPOTHESIS]`, never as a frozen invariant.
- **[EXPECTATION]** Receiver, barrel, stock, and both hand connections are visibly readable on the complete grounded character; the rifle does not appear detached, buried, or empty-handed.
- **[VERIFICATION]** Fresh raw `1280x720` remote capture, direct pixel inspection, parent/socket/hand trace, grounding, clipping, and comparison with the accepted local weapon identity/state.

#### Operation 8 — Paired decision and engineering verification

- **[VERDICT]** Accept only if both local and remote raw frames pass their visual gates together. Otherwise reject the pair and preserve every artifact.
- No `EDITOR_PASS_ACCEPTED` marker or count increment is allowed from diagnostics alone.
- Run focused PoseEditor tests, standalone build, and `git diff --check` after a selected candidate. Run broader checks only when source changes justify them.
- Review the diff for scope: standalone editor presentation/tests/plans only; no gameplay, networking, physics, camera implementation, asset-file, evaluation, or acceptance-marker changes.

### 10.4 Observe → hypothesis → expected-result record

Every candidate record must use this structure. Empty or unknown fields are written as `UNVERIFIED`; they are not filled with assumptions.

```md
## Candidate <id> — <short name>

- [OBSERVE] What the fresh raw frame, scene graph, matrices, and reference comparison actually show.
- [UNKNOWN] What has not yet been measured and could invalidate the hypothesis.
- [HYPOTHESIS] One causal claim explaining the observed defect.
- [OPERATION] One deterministic quaternion/matrix/vector/pose transformation, with exact nodes and parent-local space.
- [EXPECTATION] The predicted visual and measured result if the hypothesis is correct.
- [EVIDENCE] Fresh raw local/remote PNG paths, JSON paths, and direct pixel observations.
- [VERIFICATION] Tests/build/diff checks plus matrix, axis, contact, clipping, grounding, and perspective checks as applicable.
- [VERDICT] ACCEPTED, REJECTED, or ISSUE_REQUIRES_ACTION.
- [DISPOSITION] Preserve, revert, or replace the candidate; state the next dependency, not a compensating random tweak.
```

**[WORKING-RULE] One candidate changes one causal relationship.** This is an explicit reviewable operating rule, not a frozen property of the pose. Its exit condition is reached when the evidence identifies that the hypothesis is wrong or when a selected candidate passes the relevant gate.

### 10.5 Verification checklist

The checklist is a gate, not a source of new pose constraints. Mark each item `PASS`, `FAIL`, or `UNVERIFIED` in the candidate record.

#### Scope and evidence

- [ ] `[SCOPE]` Target is exactly `rifle/hold-idle/local+remote`.
- [ ] `[SCOPE]` Only standalone PoseEditor presentation/test/plan evidence changed.
- [ ] `[SCOPE]` No gameplay, networking, combat, physics, camera implementation, asset identity/content, evaluation criteria, or acceptance-marker change occurred.
- [ ] `[EVIDENCE]` Prior rejected source, logs, captures, and measurements remain preserved.
- [ ] `[EVIDENCE]` Candidate has fresh raw unmodified `1280x720` local and remote captures.
- [ ] `[EVIDENCE]` Raw pixels were inspected independently of solver/readiness text.

#### Scene and transform chain

- [ ] `[OBSERVATION]` Actual local and remote camera transforms are recorded.
- [ ] `[OBSERVATION]` Actual rifle root, parent chain, primary grip, support grip/foregrip, muzzle, aim/sight point, and relevant hand bones are recorded.
- [ ] `[OBSERVATION]` Actual weapon/hand axes are measured from the loaded scene; no axis convention is assumed.
- [ ] `[VERIFICATION]` World matrices were updated before measurement.
- [ ] `[VERIFICATION]` Every world-space target was converted into the correct parent-local space before mutation.
- [ ] `[VERIFICATION]` Quaternions are finite and normalized; constructed bases are non-degenerate and proper-handed.
- [ ] `[VERIFICATION]` Apply/restore transaction returns the scene to its prior state outside the candidate target.

#### Weapon-first local presentation

- [ ] `[VISUAL]` Weapon-only/control presentation is readable before hands are used to justify it.
- [ ] `[VISUAL]` Receiver, handguard, barrel/muzzle, stock/body, and sight/rail relationship are visible enough to identify a rifle.
- [ ] `[VISUAL]` Rifle occupies a deliberate lower-center/right first-person composition comparable to the reference.
- [ ] `[MEASURED]` Muzzle/barrel direction agrees with the intended local camera-forward direction.
- [ ] `[MEASURED]` Scale and depth are within the authored presentation's acceptable range; no arbitrary screen-space correction was used.
- [ ] `[VISUAL]` Weapon does not disappear into the hands, forearms, torso, or near plane.

#### Hand and arm connection

- [ ] `[VISUAL]` Dominant hand visibly contacts the primary grip/trigger area.
- [ ] `[VISUAL]` Support hand visibly contacts the foregrip/support grip.
- [ ] `[VISUAL]` Both arms bend naturally enough to read as holding the same rifle.
- [ ] `[MEASURED]` Hand targets, rotations, reachability, and elbow/pole directions are valid.
- [ ] `[MEASURED]` No hard hand, wrist, forearm, weapon, or torso clipping is present.
- [ ] `[VISUAL]` Hand solving does not rotate the weapon away from the independently validated local weapon frame.

#### Remote presentation

- [ ] `[VISUAL]` Complete remote character is visible head-to-feet and grounded.
- [ ] `[VISUAL]` Remote rifle has a readable stock/receiver/barrel silhouette.
- [ ] `[VISUAL]` Remote hands/arms visibly connect to the rifle.
- [ ] `[MEASURED]` Remote weapon parent/socket/hand relationship is traceable.
- [ ] `[VISUAL]` Remote presentation does not read empty-handed, detached, floating, or deeply occluded.

#### Paired acceptance and regression

- [ ] `[PAIR]` Local and remote frames use the same rifle identity and authored hold/idle state.
- [ ] `[PAIR]` Both raw visual gates pass together; neither view is accepted by inference from the other.
- [ ] `[TEST]` Focused PoseEditor tests pass.
- [ ] `[BUILD]` Standalone PoseEditor build passes.
- [ ] `[DIFF]` `git diff --check` passes.
- [ ] `[REVIEW]` The selected diff contains no hidden mini-rule presented as a frozen invariant.
- [ ] `[ACCEPTANCE]` Only after all preceding items pass may `EDITOR_PASS_ACCEPTED` be considered; otherwise the count remains zero.

### 10.6 Current status after writing this appendix

- **[STATUS]** Planning/research record written; no new pose mutation performed in this step.
- **[STATUS]** Existing candidate `PoseEditor/rifle-presentation.ts` remains preserved and rejected; its raw evidence remains preserved.
- **[STATUS]** Accepted weapon count remains `0`.
- **[NEXT]** Begin with Operation 1, not another transformation: fresh scene/presentation inventory followed by the weapon-only first-person control in Operation 2.

## 10.7 Operation 3 authorization — measured weapon-frame replacement

- **Date:** 2026-09-20.
- **Target ID:** `rifle/hold-idle/local+remote`.
- **[AUTHORIZATION]** One and only one opt-in standalone PoseEditor weapon-root mutation is authorized. This replaces the rejected `RIFLE_PRESENTATION_ROLL = Math.PI / 2` broadside path; it must not be stacked on top of that path. No acceptance marker, count increment, gameplay/runtime/networking/physics/camera/asset mutation, or hand mutation is authorized by this record.
- **[OBSERVE]** Fresh pre-mutation WebGL2 evidence is `.hoplite/inspection/scale105-roll45-egl-first.json` and `.hoplite/inspection/scale105-roll45-egl-first-raw.png`, with matching third-person files. The local camera is `[-0.0083816696,1.4690200107,0.0801409384]` with forward `[0,0,1]`; the sampled body frame is forward `[0,0,1]`, up `[0,1,0]`. The weapon is nested under the character-side `Scene` node and current world scale is uniform `[0.0069319882100,0.0069319882100,0.0069319882100]`.
- **[OBSERVE]** The current rejected candidate's post-broadside actual skinned-mesh probe is start `[0.1705529586,1.3395635823,0.5152954649]`, end `[0.1837825955,1.3427069522,0.5566514836]`, direction `[0.3038908411,0.0722046516,0.9499667599]`, sampled in world space after animation and after the existing broadside. Reversing only that rejected roll around axis `[0.2923716054,-0.0000001577,0.9563047863]` reconstructs expected direct pre-new-transform probe start `[0.1633637292,1.3549158845,0.5174934346]`, end `[0.1790636325,1.3543556381,0.5580942168]`, direction `[0.3606339943,-0.0128691164,0.9326186294]`. The implementation must sample the live evaluated mesh at this post-animation, pre-new-transform stage; the reconstruction is evidence, not a constant.
- **[OBSERVE]** The resolved authored nodes are primary `tag_trigger_0223`, support `combat_grip_0233`, muzzle `tag_muzzle_0222`, and ADS `EXPS3_Socket_0225`. ADS world `+Y` comes from `EXPS3_Socket_0225.getWorldQuaternion()` after animation. Fresh post-broadside ADS-Y is `[0.9164178998,-0.2882098267,-0.2776926086]`; inverse-old-roll expectation is `[-0.2749218700,-0.9575643269,0.0865362656]`. Orthogonalization against the measured barrel gives source-up `[-0.2727206756,-0.9576609797,0.0922435958]`, source-right `[-0.8919453768,0.2876105591,0.3488747785]`, and source determinant `dot(cross(right,up),forward)=+1.000000`.
- **[OBSERVE]** The target is an object/body frame, not a camera-basis shortcut: target-forward is character world `+Z` `[0,0,1]`, target-up is character world `+Y` `[0,1,0]`, target-right is `cross(targetUp,targetForward)` `[1,0,0]`, and target determinant is `+1.000000`. This avoids treating Three.js camera `-Z` as an object forward axis.
- **[UNKNOWN]** Raw pixels have not established that ADS world-Y is the best transverse semantic, that the translated weapon remains visible in both intended views, or that untouched hands look connected. These are trial questions; diagnostics do not pre-accept them.
- **[HYPOTHESIS]** Mapping measured source `(right,up,forward)` to body `(right,up,forward)` will expose receiver/handguard/barrel without arbitrary roll. `alignPoseFrame(sourceForward, sourceUp, targetForward, targetUp)` supplies `qDelta = qTarget * inverse(qSource)`, expected normalized `(x,y,z,w)=[0.1824122895,0.0204069084,0.9723971650,-0.1440592525]`.
- **[OPERATION]** After `rifle_idle` animation and the existing solver, before SVG/software baking and before any new presentation transform, resolve all four authored anchors and directly sample the live skinned barrel with the existing probe utilities. Sample ADS world-Y from the unique authored ADS node at the same stage. Reject missing probes, fallback/authored-only directions, duplicate ADS nodes, non-finite/degenerate/collinear data, or a barrel whose direction does not point toward muzzle; no fallback axis is permitted. Re-measure from the live post-mutation mesh (or its explicit baked replacement) rather than retaining stale probes.
- **[OPERATION]** Build normalized source/target bases and compose `qAfter = qDelta * qCurrentWorld`. Rotate the weapon root around measured primary `p`: `pRootAfter = p + qDelta * (pRootBefore - p)`. Do not rotate hands or use hand orientation to redefine the frame. This is explicitly a weapon-only pre-hand stage; post-trial grip drift must be reported, and solver `verified` must not be treated as connected-pose acceptance.
- **[OPERATION]** Compute the only translation from measured `handSpan=distance(primary,support)=0.1400000490m`: `delta=-targetRight*handSpan + targetUp*(handSpan/2) + targetForward*(handSpan/4)=[-0.1400000490,0.0700000245,0.0350000123]`. Add it once after primary-pivot rotation. Predicted primary is approximately `[-0.0428916020,1.4209986588,0.2966708828]`, local projection approximately NDC `[0.1105388263,-0.3052497924]`, depth `0.2165299443m`.
- **[OPERATION]** Preserve captured parent and uniform world scale. Reject near-singular/non-finite parent matrices and non-uniform/sheared scale that cannot be represented safely. Compose desired world position/quaternion/scale, convert exactly once with `parent.matrixWorld.clone().invert().multiply(worldMatrix)`, decompose, update, and verify recomposed world matrix, parent identity, scale, child ordering, anchors, axes, and descendant inheritance.
- **[OPERATION]** Wrap the complete root mutation in the existing transaction snapshot. Any invalid probe, determinant, quaternion, parent conversion, scale, finite-value, or postcondition restores every captured character/weapon descendant transform and original parent before returning a rejected result.
- **[EXPECTATION]** Fresh isolated local pixels should show a coherent broad lower-center/right rifle silhouette with readable receiver, sight/rail, handguard, barrel, and muzzle direction. Edge-on, buried, clipped, too small, away-pointing, or incoherent pixels reject this hypothesis; no second rotation, random sweep, hand compensation, camera change, or scale tweak is allowed.
- **[EVIDENCE]** The pre-mutation control remains `.hoplite/inspection/operation-2-weapon-only-first-mesh-except.png` / `.json`; it proves the nested rifle renders without character meshes but is visually rejected. The trial must save fresh raw `1280x720` local weapon-only PNG/JSON and, if readable, fresh full local/remote raw frames with runtime pre/post probes, frame bases/determinants, quaternion/matrix, projections, depth/bounds, grip drift, and browser health.
- **[VERIFICATION]** Add focused tests for source/target sign and quaternion order, mirrored proper-handed frames, rotated-parent conversion, primary-pivot/measured-span translation, unchanged hands/scale/parent, one-time descendant inheritance, scope guards, degenerate/no-op paths, and atomic rollback. Run focused tests, standalone Vite build, `git diff --check`, EGL WebGL2 capture, direct raw-pixel inspection, and delegated adversarial review.
- **[VERDICT]** Authorized for one trial only; not accepted. `EDITOR_PASS_ACCEPTED` remains absent and accepted weapon/utility counts remain `0`.
- **[DISPOSITION]** Replace the rejected broadside implementation with this measured frame transaction. Preserve a readable result for the next hand-connection operation; otherwise restore/reject and retain evidence without tuning.

### 10.3 Static bind/T-pose control before animation

- **[USER-DIRECTIVE]** Disable animation, pose the rifle from the authored bind/T-pose, and defer animation changes until the stiff hold has been measured from raw local and remote pixels.
- **[WORKING-RULE]** For the current rifle target, static bind/T-pose is the default editor control; `animation=on` is the explicit animated comparison. This is an editor workflow choice, not a gameplay invariant.
- **[OPERATION]** Reset cloned skinned meshes with `skeleton.pose()`, create no `AnimationMixer` in static mode, label the state `t-pose`, run the existing deterministic rifle hold-frame and grip solve, and skip the previously rejected measured weapon-root presentation.
- **[SCOPE]** The control is limited to standalone `PoseEditor` source, tests, documentation, and retained inspection artifacts. Gameplay, networking, combat, physics, camera implementation, asset identity/content, and acceptance state remain untouched.
- **[GATE]** Fresh raw static local and remote captures must be inspected before any animation is re-enabled or any further weapon/hand/scale/camera transform is tuned.

### 10.4 Bind-reset correction

- **[OBSERVE]** The first static trial created the requested `animation=static` state but `prepareRifleHold` failed. Diagnostics distinguish a plausible animated skeleton from a normalized skeleton after `skeleton.pose()`, whose queried bones collapse near the origin.
- **[DECISION]** Treat the freshly loaded GLTF scene as the authored bind/rest pose. Do not call `skeleton.pose()` after `normalizeGameplayPlayerModel`; the only static control is no mixer/action creation followed by the existing deterministic hold solve.
- **[GATE]** This correction is accepted only as a diagnostic path until fresh raw local and remote screenshots prove the static hold. No weapon, hand, camera, scale, or animation tuning is allowed before that evidence.

### 10.5 Zero-lateral static candidate rejection and bounded follow-up

- **[OBSERVE]** The zero-lateral static candidate is preserved at `.hoplite/inspection/static-zero-lateral-first-webgl-raw.png` and `.hoplite/inspection/static-zero-lateral-third-webgl-raw.png`, with matching WebGL2 capture and runtime diagnostic JSON. First-person hands are readable, the solver and clipping checks pass, and the remote static hold remains grounded; the raw local barrel measures `0.102611361rad` from camera-forward.
- **[DECISION]** Reject the candidate because `0.102611361rad > 0.08rad`. Readable hands, solver verification, contentful pixels, and a passing remote view do not override the measured local barrel gate. Counts remain `0` and `EDITOR_PASS_ACCEPTED` remains absent.
- **[CAUSE]** The first-person hold axis is exactly body-forward, which makes the solver’s hand-derived target axis collinear with body-forward and invokes its perpendicular fallback. This is a coupled hand-target/frame construction issue, not evidence for isolated weapon rotation or a camera/depth correction.
- **[NEXT OPERATION]** Authorize one first-person-only static target-axis trial using the previously measured `-0.015` body-right slope and the matching normalized forward component. Preserve the hold center, span, third-person target, animation-off default, camera, scale/depth policy, asset identity, and all acceptance state. Fresh raw local and remote captures remain mandatory.
- **[STOP RULE]** Reject without further tuning if the single trial loses bilateral hand readability, static reachability, clipping/grounding, or the measured local barrel gate. Do not sweep nearby slopes or reintroduce animation until both static views pass.

### 10.6 Non-collinear static-axis trial rejected; reach-preserving center trial

- **[OBSERVE]** The authorized `-0.015` first-person hold-axis trial produced fresh WebGL2 rasters at `.hoplite/inspection/static-axis-minus015-first-webgl-raw.png` and `.hoplite/inspection/static-axis-minus015-third-webgl-raw.png`. Runtime diagnostics report first-person barrel alignment `0.0762rad`, solver/readiness verified, `hands=0.751`, and both hands readable. The raw first-person silhouette is nevertheless narrow and upright rather than a natural lower-center/right rifle hold; the paired target therefore remains visually incomplete.
- **[VERDICT]** Reject the axis-slope candidate despite its numeric gate pass. It is not acceptance evidence and does not change counts or add `EDITOR_PASS_ACCEPTED`.
- **[REVIEW]** A read-only causal review found the first-person static target center remains outside the left bind-pose arm reach at the existing `+0.05m` lateral offset, allowing the solver to clamp the hand and making the frame sensitive to the resulting tilt. This is a measured reach issue, not a reason to tune weapon rotation.
- **[NEXT OPERATION]** Test one first-person-only center adjustment from `+0.05m` to `+0.09m` body-right, keeping the zero-lateral axis, `0.14m` span, forward/vertical offsets, third-person constants, camera, scale/depth policy, animation-off default, and asset identity unchanged. The expected result is exact bilateral target reach with the zero-lateral fallback and a broader readable rifle silhouette.

### 10.8 Static center-adjusted candidate rejected by raw paired review

- **Date:** 2026-09-20.
- **Target ID:** `rifle/hold-idle/local+remote`.
- **[EVIDENCE]** The authorized `+0.09m` first-person hold-center candidate was captured without compositing or cropping as `.hoplite/inspection/static-center009-first-webgl-raw.png` and `.hoplite/inspection/static-center009-third-webgl-raw.png`; matching capture records are `.hoplite/inspection/static-center009-first-webgl-capture.json` and `.hoplite/inspection/static-center009-third-webgl-capture.json`. Both raw PNGs are `1280x720` WebGL2 captures. The browser harness records duplicate asset requests as `ERR_ABORTED` on close, but page errors and console issues are empty and the requested runtime state is present.
- **[OBSERVE]** First-person pixels show a broad, identifiable rifle and a camera-forward measured barrel (`diagnosticAlignment=0.0734rad`), but the rifle enters from the left/lower frame edge instead of reading as a deliberate lower-center/right presentation. The forward glove is visible; the support hand and its arm connection are obscured by the receiver/forearm mass. The raw frame therefore fails the independent weapon-composition, support-contact, and natural bilateral-arm gates even though `hands=0.815` and solver/readiness diagnostics report success.
- **[OBSERVE]** Third-person pixels show the complete character head-to-feet, grounded feet, and a visible across-chest rifle with connected hand placement. Its static state remains `animation=static`, `clip=t-pose`, with the same `scar_l-optimized.glb` rifle identity and verified grip diagnostics. This does not waive the failed first-person gate.
- **[VERDICT]** `REJECTED` as a paired raw-perspective result. The first-person raw gate fails independently; no `EDITOR_PASS_ACCEPTED` marker or count increment is allowed.
- **[VERIFICATION]** Focused PoseEditor tests passed `48/48`; standalone Vite build passed with `48` modules transformed; `git diff --check` passed. No new pose, camera, asset, gameplay, networking, combat, physics, evaluation, or acceptance-state mutation was made for this review.
- **[DISPOSITION]** Preserve the center-adjusted source and all fresh artifacts as rejected evidence. Do not combine this candidate with the rejected `-0.015` slope, run an offset/slope sweep, reintroduce animation, or add a compensating weapon/camera transform. The target remains `ISSUE_REQUIRES_ACTION`; accepted weapons/utilities and final product-complete weapons/utilities remain `0`.

### 10.9 Delegated minus015 clarification reconciled with primary raw review

- **Date:** 2026-09-20.
- **Target ID:** `rifle/hold-idle/local+remote`.
- **[REVIEW]** The delegated read-only review identifies the `-0.015` first-person body-right slope as the only bounded numeric candidate and states that the conditional `+0.09m` center proposal must not be combined with it. Its reported runtime comparison is `0.102611rad` for the zero-lateral baseline versus `0.0762rad` for `-0.015`, with `hands=0.751`, source body ready, and solver/composition/readiness diagnostics verified.
- **[PRIMARY RECHECK]** The primary independently reopened the preserved `-0.015` raster against the supplied first-person reference and captured the restored source again at `.hoplite/inspection/restored-minus015-first-webgl-raw.png` and `.hoplite/inspection/restored-minus015-third-webgl-raw.png`. The fresh first-person hash is `d56e2067406e0ad661bc59323c23c221ac83cb08a2865c23a6b86dc024f24500`; the fresh third-person hash is `4059b61f962b787d320d6e04361d4bb71b15503465722ab8f73cf1f89ab850c8`. Both are unmodified `1280x720` PNG captures.
- **[RAW DECISION]** The delegated numeric result is confirmed, but the first-person raw pixels remain a narrow/upright, end-on rifle presentation rather than the requested lower-center/right readable rifle. The support hand/arm relationship is not naturally legible. The raw visual gate therefore still fails; numeric readiness does not become acceptance. The third-person frame remains grounded and visibly armed, but cannot waive the local failure.
- **[SOURCE DECISION]** Restore the source to the single bounded trial: first-person center `+0.05m`, axis forward `0.999887493671163`, axis lateral `-0.015`. This removes the conditional `+0.09m` mutation without combining candidates. The restored trial is retained as rejected evidence, not selected as accepted behavior.
- **[VERIFICATION]** Focused PoseEditor tests passed `48/48`; standalone Vite build passed with `48` modules transformed; `git diff --check` passed. Fresh runtime state reports `animation=static`, `clip=t-pose`, grip errors `0/0`, muzzle error `0.0244rad`, and measured local barrel alignment `0.0762rad`. The capture harness still reports expected duplicate asset-close aborts, with no page errors or console issues.
- **[VERDICT]** `REJECTED`; `EDITOR_PASS_ACCEPTED` remains absent and all accepted/final counts remain `0`.
- **[DISPOSITION]** Preserve both the rejected `+0.09m` and `-0.015` evidence. Do not combine them, sweep either parameter, add an isolated weapon/camera correction, or reintroduce animation. A future action requires a new measured causal inventory and authorization.
