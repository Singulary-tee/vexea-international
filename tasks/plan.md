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
