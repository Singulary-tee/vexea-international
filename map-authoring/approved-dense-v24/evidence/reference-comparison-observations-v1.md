# Locked-angle reference comparison observations

The approved reference-only target is composition/material guidance, not runtime geometry or a camera workaround. At its fixed angle it presents a wet, dark asphalt lane occupying the foreground with continuous puddle and roughness variation; a clearly separated concrete curb and sidewalk with a planted strip; an explicit long storm-drain grate at the right edge; a readable chainlink boundary with posts and gates; a central wood/metal practical light mast; multiple grounded service boxes and bollards; several coherent loading docks with doors, canopies, steps, and rails; a compact utility tank and supported pipes; a restrained tree/vegetation mass with soil; and a deep layered industrial background with clear building breaks.

The retained authored capture has improved sourced facade, road maps, one grounded tree, a retained service light tower, a supported process catwalk, service bays, fence, forklift, carts, and broad Road012A variation. Its remaining visible gap is not a lack of tiny props: the foreground asphalt still dominates as a sparse dark field; the route edge does not read as a continuous sidewalk/curb/planted/drain system; the main visible plant frontage has weaker facade breakup and fewer readable functional doors/occupancy cues; the authored tree is too isolated; and the background industrial depth is less layered and less weathered than the target.

The next macro should therefore be a large, coherent route-edge/facade occupancy system that combines visible sidewalk/planted strip/drainage continuity with a grounded utility/light/fence/door relationship, while avoiding another isolated small prop, hidden gantry, or artificial overlay patch. All placements must be projection-tested and must preserve the frozen VEXEA gameplay and locked camera contracts.


## Close-crop diagnosis after loading-bay candidate

The enlarged central-right crop shows the authored process catwalk and newly added loading-bay elements only as thin overlapping midground frames, rails, pipes, and small warm lights. They do not read as a clear row of player-scale loading doors because the dominant screen plane is a separate broad tan/olive panel wall behind them. The current additions are therefore being authored on the wrong visual ownership plane for the locked view: they create a shallow foreground scaffold in front of a largely blank backdrop rather than transforming the backdrop itself. This explains why technically valid, grounded modules have not moved the image toward the target.

The next scene-wide correction must target the dominant visible wall/forecourt relationship directly. It should create a readable facade mass at the same depth as that wall, with a continuous row of large openings/doors, substantial canopies and thresholds, and a connected near-ground sidewalk/curb/fence line. It must first be projection-checked against the actual wall plane and existing occluders; otherwise another correctly modeled but visually buried module is not a meaningful iteration.


## Low-shed forecourt crop finding

The enlarged crop confirms that the dominant left/center wall is the low service shed's west side panel: a long near-blank green vertical plane. The existing rear-facing hero dock and the newer west-wall loading-bay candidate sit outside this visible plane or behind the near side-wall occlusion, so they cannot transform the dominant image even when their geometry counts increase. The correct next owner is the low shed west side itself (`addPressurePlantLowServiceShed`), using its existing side-bay datum rather than adding another independent facade group.


## Low-shed left-band crop diagnosis

The original left-band crop shows the projected west-side service-bay location is not reading as a door in the image; the visible wall is dominated by two dark horizontal window bands with a large empty center. The isolated sourced tree interrupts the lower-right of that wall but does not establish a coherent planted edge. This is the clearest screen-level root: the current low-shed west facade is a long blank side elevation with windows, while all service details are either too far left/right, too low, or hidden by the foreground route edge. Any next pass must replace the middle of this actual side elevation with a clearly readable large service opening and attached occupation, not add another freestanding utility object.


## v2112 amplified-diff finding

The amplified candidate-versus-v2026 difference is nearly black across the frame. The only changed region is a small tree-shaped cluster at screen `(242,248)`–`(281,333)`, not the projected low-shed side wall or its expected three-bay row. Runtime enumeration reported the side-bay descendants as `visible: true` at the expected world x/z coordinates, so the remaining failure is not a missing import or visibility toggle; it is occlusion/depth ordering or an incorrect identification of which visible wall pixels belong to the low-shed side. This closes the loop on the low-shed side-bay hypothesis and rules out more duplicate facade overlays as the next move.


## Runtime highlight diagnosis

A non-authoring runtime highlight cloned the existing `low_shed_camera_west_service_bay_rolling_door` and recolored it red. The clone was confirmed `visible: true` under a visible parent at world `(81.56, 2.78, 44)` and appeared only as a narrow red vertical sliver at the tree/facade overlap in the diagnostic frame. A second clone moved ten metres toward the camera to world `(71.64, 2.78, 44)` left the useful frame entirely. This demonstrates that the x-facing west-side bay is a thin projected sliver, not the broad wall plane visible in the evidence image; widening or repeating that side-bay cannot solve the dominant composition. The correct scene-wide target is the large plant-shell/sourced-facade mass behind the low shed, whose visible broad panel field must be changed through its actual exposed face or by placing a real-depth attached facade assembly on that shell plane.


## Low-shed closure ownership test

A runtime diagnostic cloned the complete `low_shed_left_closure` and recolored it red. The clone was confirmed at world `(82.2, 3.75, 44)` with a visible parent, but the red result again appeared only as a narrow strip immediately behind the tree. Therefore the broad blank tan/green wall that dominates the left/center frame is not the low-shed left closure. The apparent facade must belong to the overlapping plant-shell/sourced-facade composition behind it. This is the first direct ownership test that rules out the low-shed wall as the dominant screen plane; further low-shed edits would be tunnel vision and are being stopped.

## Hybrid facade parent probe

The presentation-bootstrap runtime exposed `slice_plant_facade_module_datum` at world translation `(216, 6.04, 65)` with 21 children and the `hybrid_facade_closure` role. This is a plausible broad-wall owner, but the first diagnostic clone was co-planar and the saved image did not render an unambiguous red overlay. It is therefore recorded as a candidate parent only; no ownership conclusion is drawn from that first overlay.

## Confirmed dominant wall owner

The in-place non-authoring recolor probe is decisive: recoloring `slice_plant_facade_module_datum` red covers the broad left/center wall field and the long upper background facade across the locked player frame. The runtime object is at world translation `(216, 6.04, 65)`, has 21 children, and carries the `hybrid_facade_closure` role. The earlier low-shed-west-side interpretation is superseded; the low shed contributes only the nearer narrow side mass and tree overlap. The next construction pass must modify this hybrid facade module in place, with its actual front/side/ground interfaces, rather than adding another detached root-level bay band.

### v2219 full-quality owner A/B — low-service shed

A same-session full-quality diagnostic waited for `asset_pressure_plant_camera_background_facade` to load, captured the locked 828×603 frame with `slice_pressure_low_service_shed` visible, then hid that complete 182-child owner and captured again. The visible and hidden frames are visually identical across the dominant green/tan wall and ground regions. Hiding the low shed does not remove or alter the broad wall. The full-quality runtime monitor established that the source facade arrives asynchronously at approximately 80 seconds, so earlier lightweight (`full=0`) hide/highlight probes made before that arrival are not sufficient to attribute the final canonical wall.

### v2216–v2219 owner-audit correction

The full-quality runtime monitor found that the asynchronous source groups arrive after the initial lightweight scene: `asset_pressure_plant_camera_background_facade` is added under `pressure_plant_slice_v1` at approximately 80 seconds with 192 children. A same-session full-quality A/B hide test of that asset also produced no visible change in the dominant broad wall. The asset’s measured child bounds are small modular pieces concentrated near world `(68–82, 0–8, 44–46)`, not a wall-sized plane. Therefore the earlier `slice_plant_facade_module_datum` ownership note is not yet authoritative; the broad wall remains unresolved and must be diagnosed against the actual full-quality rendered state before authoring the bounded pass.

### v2220 full-quality owner A/B — volumetric shell

A same-session full-quality diagnostic waited for the asynchronous camera-background facade, captured the frame with `slice_plant_volumetric_shell` visible, then hid the complete 567-child shell and captured again. The saved frames were visually identical. However, the full-quality runtime reports approximately 1 measured FPS and long frame times, so a visibility change may not have been presented before the screenshot. This result is therefore recorded as diagnostic only, not a final ownership verdict; subsequent probes must force or verify a fresh renderer frame after each visibility/material change.

### v2222 forced-render A/B — camera-background facade

A full-quality same-session probe waited for `asset_pressure_plant_camera_background_facade` (192 children), captured it visible, then hid it and explicitly invoked the exposed `WebGPURenderer` with the locked camera at aspect `1.373134328358209` and canvas `828×603` before the second capture. The visible and hidden frames remained visually identical across the broad green/tan wall, service interfaces, and ground. The source asset is therefore not the dominant wall owner in the current rendered state; its small modular children are not responsible for the broad blank plane. This is diagnostic evidence only and does not change the formal `REVISE` status.

### v2229 forced-render A/B — hybrid facade datum correction

A full-quality same-session probe waited for the asynchronous camera-background facade, captured `slice_plant_facade_module_datum` visible, then hid its complete 21-child parent and explicitly invoked the exposed `WebGPURenderer` with the locked camera at aspect `1.373134328358209` and canvas `828×603`. The visible and hidden frames were visually identical across the broad wall and route. The earlier v-in-place recolor note is therefore not reliable as ownership evidence; no substantive authoring pass should target this datum until a fresh, frame-verified owner test identifies the actual rendered source.

### v2235 corrected-canvas A/B — hybrid facade datum closed

The full-quality same-session A/B probe explicitly set the renderer drawing buffer and client canvas to `828×603`, restored camera aspect `1.373134328358209`, and forced a WebGPURenderer refresh before each screenshot. Hiding `slice_plant_facade_module_datum` (21 children, world translation `(216, 6.04, 65)`) still produced a visually identical frame. This closes the earlier hybrid-facade ownership hypothesis under the actual locked evidence canvas; no construction pass should target this datum as the broad wall owner.

### v2237 corrected-canvas A/B — OpenCV context ruled out

The corrected owner probe found `pressure_plant_opencv_context` already `visible: false` with 22 children. Explicitly hiding it again after forcing the renderer at `828×603` produced no change in the locked frame. Its duplicated image-building children cannot own the currently visible wall.

### v2246 corrected-canvas A/B — rear industrial depth

With the full-quality page and verified `828×603` renderer buffer, hiding `pressure_plant_rear_industrial_depth` (31 children) removed the left black tank, pipe canopy, and orange/white rear building silhouettes, but the broad green left wall and long tan upper wall remained unchanged. This group is a real screen-visible occupancy owner, but not the dominant blank wall owner. The corrected target remains to be identified before any owner-level facade edit.

### v2251–v2255 sourced-only vegetation and surface material correction

The active pressure-plant fallback paths were audited and corrected. The procedural trunk, branches, spherical canopy, cone-grass tufts, and procedural welding-cart fallback are no longer instantiated by the pressure-plant assembly. The semantic tree and grass-verge soil owners remain, while the Poly Haven `tree_small_02` close/far LOD and sourced Poly Haven cart/forklift loaders remain responsible for complex silhouettes. Two CC0 Poly Haven 2K PBR families were added locally: `dirt_floor` for compacted/greasy service soil and `park_dirt` for damp planted beds. The existing Road012A asphalt maps now use lower repetition, distinct wet/repair/sheen roughness families, and reduced clearcoat so the foreground does not read as a uniform rubber plane. Focused pressure lint passed after these edits. No canonical visual acceptance is claimed by this source/material change alone.

### v2264 corrected-canvas A/B — pressure-slice root confirmed

With the full-quality page, explicit `828×603` renderer buffer, locked camera aspect `1.373134328358209`, and forced refresh, hiding `pressure_plant_slice_v1` changed the entire scene from the authored green/tan plant frontage and dark route to the overcast industrial HDRI courtyard. Therefore the visible wall and road are controlled by the pressure-slice root, not a CSS/image overlay. The root had 26 children before asynchronous source arrival and 28 after it. Individual tests of low shed, hybrid facade datum, source background facade, rear depth, and hidden OpenCV context did not explain the wall, so the next owner step is a direct-child inventory taken after all post-load children exist; no further guessed facade edit is permitted.

### External PBR provenance used in v2251

The ground correction uses the following CC0 sources: Poly Haven [Dirt Floor](https://polyhaven.com/a/dirt_floor), whose 2K JPG maps are served from `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/dirt_floor/`; and Poly Haven [Park Dirt](https://polyhaven.com/a/park_dirt), whose 2K JPG maps are served from `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/park_dirt/`. Dirt Floor is assigned to compacted/greasy service soil, while Park Dirt is assigned to damp planted beds. Existing asphalt remains sourced from ambientCG Road012A at the local project path `client/public/assets/materials/ambientcg/road012a/`.

### v2272 corrected-canvas A/B — low shed is not the broad wall owner

The full-quality forced-render A/B at `828×603` confirms that hiding `slice_pressure_low_service_shed` removes the central low service mass and exposes the rear service occupancy, but the broad green wall spanning the left edge remains. The low shed is therefore a real secondary owner, not the dominant blank wall. The remaining wall audit must target the visible source/background facade or another direct root child, not add more low-shed bays.

### v2275 post-load forced-render A/B — source facade ruled out

After waiting for `asset_pressure_plant_camera_background_facade` to contain all 192 children, the visible and hidden frames were both rendered through the explicit `828×603` WebGPURenderer path. The frames are visually identical: hiding the sourced background facade has no screen contribution in the locked view. The broad left green wall is therefore not this source asset. The active visual owner remains within the procedural pressure-slice geometry, most plausibly a shell/frontage child or a duplicated legacy frontage within the root; no new detached facade should be added.

### v2279 all-child saturated ownership render

The corrected all-child forced-red diagnostic assigned independent saturated colors to all 28 direct children in the locked `828×603` view. It resolves the composition problem without another serial probe: the broad left orange field is direct child `slice_plant_apron_slab` (`#ff7a20`), the long upper pale-green field is `slice_plant_volumetric_shell` (`#00e676`), the central pink service mass is `slice_pressure_low_service_shed` (`#e91e63`), and the foreground/route fields are split among the asphalt lane and camera route hierarchy. The apron slab is therefore the primary ground-plane owner creating the misleading large field; the shell is the background facade/depth owner. The next correction must modify these two existing owners together—apron edge/ground transition plus shell facade/material/depth—rather than adding another detached building.


### v2299 provisional critic result

The requested Ox Alpha endpoint returned HTTP 404 and explicitly stated that the Stealth Ox Alpha testing model is unavailable, so no Ox Alpha verdict exists. The permitted provisional `z-ai/glm-5.3-flash` review returned HTTP 200 but exhausted its reasoning budget before producing a normal content field; its visible analysis nevertheless preferred Image 2/reference and identified the same major gaps: missing readable curb/sidewalk/drain hierarchy, insufficient asphalt/concrete/dirt separation, sparse occupancy, weak loading interfaces, ambiguous contact/scale, and absent visible sourced vegetation/vehicles in the captured frame. This is diagnostic only and cannot accept or promote the scene. Formal state remains REVISE.

### 2026-08-27 / v2335 — Prepared sourced tree GLTFLoader verification
The source-derived tree distance asset was served through the existing Vite public path and loaded successfully with the project’s actual Three.js `GLTFLoader`: `/assets/models/polyhaven/tree_small_02_lod/served_512/tree_small_02_distance_lod_012_512.gltf`. Browser validation reported `loaded: true`, `meshes: 3`, and `triangles: 637294`. The unnormalized source bounds were min `[-1.3089934587478638, -0.02410384640097618, -1.3822987079620361]`, max `[1.6077065467834473, 4.532637119293213, 2.9096498489379883]`, size `[2.916700005531311, 4.556740965694189, 4.291948556900024]`; the asset therefore has a sane positive volume and a near-zero lower contact datum. The original Poly Haven tree aliases and shared BIN remain retained; the prepared runtime variant is source-derived via glTF-Transform with 0.12 geometry target and 512 px textures. This validates loading and bounds only; it is not a visual acceptance or performance claim.

### 2026-08-27 / v2342 — First complete full-source fixed-angle visual review
The v2342 candidate is the first capture in this pass with all required diagnostics present: PBR, overcast HDRI, facade, welding cart, storage cart, forklift, prepared sourced tree, piping, and generator all report `OK`; the locked camera and `828×603` canvas remain exact; `treeLoaded` is true; and browser errors are empty. Visually, the sourced Poly Haven tree is now present and grounded at the west route edge, confirming that the prepared asset is visible in the evidence frame. The scene-level image remains diagnostic rather than accepted: the foreground is still dominated by a broad dark road field, the connected sidewalk/curb/drain/soil grammar is not yet visually dominant, and the new west shell frontage is not clearly legible as a coherent three-bay service interface from this camera. The current candidate must therefore be compared numerically and sent to blind critic diagnosis; no quality-floor acceptance or map-wide completion is claimed.

### 2026-08-27 / v2342 — Full-source candidate and blind comparison result
The first tree-ready candidate retained the fixed `pressure_midroute_player` camera (`FOV 58`, position `[47.99545995262643, 2.6000000000000036, 86.00270656670348]`, target `[100, 2.6, 55]`) and true `828×603` canvas. All required sourced diagnostics report `OK`, including the source-derived Poly Haven tree, and the browser error list is empty. The paired image SHA-256 is `5424fe4f70708fa6f6374c737bea23b8b743b24b3551bb5471a09bf4823c3529`; comparison against the preserved baseline SHA-256 `f0e8f1e514b3771559866787fd6578b9c945dc1e7070728bfdc9546e1035acf2` yields mean absolute channel difference `3.390517220659985`, with threshold-8 and threshold-32 changed-pixel fractions `0.11013170860672483` and `0.03434518230105511`. Visual review confirms the sourced tree appears, but the broad dark foreground, incomplete route-edge hierarchy, and weakly legible shell frontage remain scene-level gaps.

The anonymous `openai/o3` comparison returned HTTP 200 and response SHA-256 `5e77526aae743b6df40c282532b99ca4774bdae243ed1fb700862ad02a7b1dfc`; it selected Image 2/reference as stronger. Its concrete diagnosis repeats the highest-order gaps: sparse and shallow industrial composition, single-plane facade reading, repetitive dark asphalt, discontinuous curb/sidewalk/drain, under-scaled or hovering-looking tree, barrier intersections, sparse lighting, and weak player-scale cover/readability. Because Ox Alpha is retired and returned 404 in the prior attempt, this o3 result is preserved as provisional diagnosis only. Formal visual state remains `REVISE`.

### 2026-08-27 / v2354 — Reference reinspection after integrated service-sequence move
The retained user reference remains available at `pressure_plant_locked_angle_expansion_target-reference-only.png` (`2176×1632`). Its fixed-angle composition is a dense wet industrial service court: a broad dark asphalt foreground with visible nonrepeating puddle/seam variation; continuous concrete sidewalk, curb and long storm-drain grate; a readable chainlink fence with planted soil and rocks; a substantial pole light; utility boxes and supported conduits; three clearly recessed roll-up loading bays with canopies, steps and safety posts; a compact tank and pipe run; and grounded vehicle/machinery occupancy. The v2353 candidate retains the correct fixed camera but still reads as a sparse dark yard with a thin single tree, weakly legible occupancy, and incomplete facade/service-edge integration. This reference remains composition/material guidance only and is not imported or traced as runtime geometry.

### 2026-08-27 / v2367 — Integrated occupancy and clerestory review
The v2367 fixed-angle candidate remains full-source and camera-valid with an empty browser error list. Compared with v2353, it visibly adds a second sourced Poly Haven tree in the center-right service court and two projected shell-side clerestory openings above the relocated service row. The service court now has more depth cues, but the source forklift/cart/generator silhouettes remain small and partially occluded by the midground frame/barriers; the broad asphalt foreground remains visually dominant; and the facade still does not read with the target’s continuous, dense loading-court composition. No obvious new floating object or catastrophic overlap is visible in this frame. This is measurable progress in sourced occupancy and shell breakup, but formal visual state remains `REVISE`.

### 2026-08-27 / v2367 — Final integrated candidate and critic retry
The full-source v2367 frame retains the locked `pressure_midroute_player` camera and exact `828×603` canvas. It includes the source-derived prepared tree runtime, an additional shared prepared tree clone, projection-checked shell bays and clerestory openings, and projection-checked source occupancy positions for forklift, welding cart, storage cart, and generator; all required asset diagnostics report `OK`. Exact candidate SHA-256 is `df0300823dd42a24b73d46cfe5d46d2c56f08c10e5db6c086dd3f081274a7dad`, baseline SHA-256 is `f0e8f1e514b3771559866787fd6578b9c945dc1e7070728bfdc9546e1035acf2`, and pixel metrics are mean absolute channel difference `4.419902633905085`, threshold-8 change `0.1366136307191899`, threshold-32 change `0.04461789282252185`. The fixed-angle image shows measurable tree and clerestory additions, but the service assets remain partially occluded and the target’s dense connected loading-court hierarchy is not yet achieved.

The v2367 anonymous critic packet records an initial HTTP 402 budget failure at 1800 tokens and a successful 1400-token retry with response SHA-256 `344e0f91fb0d970294b55c9007c9fe06c5a4edfbc62961b7c1f4ce69d1eae6c1`. The retry selected Image 2/reference as stronger and repeated the root gaps: sparse/blank industrial composition, shallow loading facade depth, insufficient asphalt/concrete/soil differentiation, discontinuous curb/drain logic, underscaled or floating-looking trees, missing vehicle scale anchors, unsupported utility grammar, and weak PvE cover/readability. The retry is preserved as provisional diagnosis only; the historical Ox Alpha endpoint remains retired and provides no verdict. Formal visual state remains `REVISE`.

### 2026-08-27 / v2385 — Grounded forklift and fence review
The full-source v2385 candidate retains the locked camera, empty browser errors, and all required sourced diagnostics. The projection-checked forklift relocation makes an orange sourced forklift legible behind the tree/fence edge as a grounded scale anchor; the darker chainlink now reads more clearly as a route boundary; the two sourced trees and shell clerestories remain visible; and no new obvious float or collision appears. The frame is still materially behind the supplied target: the service facade is too sparse and shallow, the foreground asphalt dominates without enough nonrepeating wet breakup, the sidewalk/curb/drain relationship is not strongly legible, and loading-bay occupancy and utility supports remain underdeveloped. Formal visual state remains `REVISE`.

### 2026-08-27 / v2385 — Final candidate comparison and critic state
The v2385 full-source candidate retains the exact locked `pressure_midroute_player` camera (`FOV 58`, position `[47.99545995262643, 2.6000000000000036, 86.00270656670348]`, target `[100, 2.6, 55]`) and `828×603` canvas. It includes the prepared sourced tree runtime and clone, three projection-checked shell bays, two clerestories, source occupancy in the service sequence, and a darker canonical chainlink boundary. Candidate SHA-256 is `0c6923ed8c628b86e2275f564aea97ee88d60867fdf3990a86f0b637c4085361`; baseline SHA-256 is `f0e8f1e514b3771559866787fd6578b9c945dc1e7070728bfdc9546e1035acf2`; mean absolute channel difference is `4.642231675759688`, threshold-8 change `0.14148861169194285`, and threshold-32 change `0.04834723323799681`. All required full-source diagnostics pass and browser errors are empty.

The v2385 anonymous critic packet returned HTTP 200 with response SHA-256 `be99d34d27e7ae3abd27e6ea04797a4515360dbf72b878bd3b7540b83151ac61`; it selected Image 2/reference as stronger. It acknowledges the forklift as a scale anchor but still identifies sparse composition, insufficient facade depth, dark repetitive asphalt, weak curb/sidewalk/drain hierarchy, underscaled vegetation, sparse utility supports, and limited cover/readability. This result remains provisional; the retired Ox Alpha endpoint supplies no acceptance verdict. Formal state is `REVISE`.

### 2026-08-27 / v2399 — Screen-invisible background clone validation
The default `cameraBackgroundFacade` suppression was validated with a full-source v2399 capture. The candidate retained `FOV 58`, the locked camera/target, true `828×603` canvas, all required sourced diagnostics `OK`, `treeLoaded: true`, and an empty browser error list. Its PNG SHA-256 is `0c6923ed8c628b86e2275f564aea97ee88d60867fdf3990a86f0b637c4085361`, exactly matching v2385; `cmp` reports the files byte-identical. This confirms the 175k-triangle camera-background-facade clone is visually screen-invisible in the locked pressure frame and can remain opt-in without changing visible composition. The source asset and provenance remain retained. This is a runtime ownership/perf-side validation only; the scene’s formal visual state remains `REVISE`.

### 2026-08-27 / v2419–v2430 — Ground and utility-spine inspection
The v2419 full-source frame validates the integrated right-return sidewalk/curb/drain code path but the fixed camera does not make the grade cutouts visually prominent; no new obvious float or overlap is visible. The v2425 and v2430 frames validate the existing sourced process-pipe asset and its measured 0.92 module scale, but the utility spine remains a secondary, partially occluded structure near the right shell edge rather than a strong target-like service interface. The scene still has the same high-order deficits recorded by the critic: sparse occupancy, weakly legible loading interfaces, excessive dark asphalt foreground, and insufficiently readable curb/drain/material hierarchy. These are diagnostic observations only; formal state remains `REVISE`.

### 2026-08-27 / v2450–v2464 — Low-shed bay ownership proof
The full-source v2450 frame still reads as a sparse industrial court. A fast ownership audit found all three `low_shed_forecourt_camera_dock_bay_*` opening/interior/door/rib/frame families visible under `slice_pressure_low_service_shed`, with the visual parent at world `(108,44)` and the bay center around `(105.24,3.05,61.52)` for bay 1. The saturated highlight render confirms the bay geometry is in the scene and reaches the fixed frame; it is not absent or hidden by the global visibility gate. The remaining issue is presentation legibility: the bays are partially occluded/low-contrast against the shed and surrounding foreground hierarchy, so the next correction must improve contrast and depth at this existing owner rather than add another detached facade.

## v2501 fixed-angle comparison note — 2026-08-27

The integrated low-shed owner correction was fully captured under the unchanged locked camera. Saturated diagnostics established that the three-bay row is present and projects into frame; the full candidate then showed only a small screen-level delta versus v2472, confirming that the row remains subordinate to the long industrial mass at this angle. The correction improved structural intent—parked shutters, recessed voids, thresholds, and a trench-drain interface—but did not close the target gap in occupancy, wet-surface variation, curb/sidewalk/drain continuity, facade depth, or PvE landmark readability. The blind o3 comparison again preferred the supplied target (Image 2) and returned `REVISE`; it is not an Ox Alpha acceptance. Keep the ordinary v2385 canonical files unchanged and do not expand beyond the slice.

## v2539 fixed-angle comparison note — 2026-08-27

The ray-guided owner correction compacted the low-shed utility hall that was masking the west-face bays. v2539 shows an actual recessed service-bay rhythm and a more believable low-shed silhouette; the pixel delta versus v2529 is materially larger than the preceding bay-only edits. The authored frame still loses to the supplied target on industrial density, continuous curb/sidewalk/drain hierarchy, ground-material separation, wet asphalt variation, and integrated utility/cover readability. Treat v2539 as a meaningful `REVISE` candidate, not a promotion or acceptance.

## v2539 blind comparison diagnosis — 2026-08-27

A fresh anonymous o3 comparison of v2539 against the fixed target again selected the target/reference. It specifically confirms that the new recessed west-side service-bay rhythm is not enough to close the visual gap: the authored frame remains weak on density, ground-material separation, continuous curb/sidewalk/drain hierarchy, functional utility clusters, vertical cover/landmarks, and player-scale contour. Treat the two o3 priority notes—edge asphalt roughness variation and a small number of taller vertical elements—as subordinate to the existing owner-level ground and service-court correction. This is provisional diagnosis; retired Ox Alpha authority remains unavailable.

## v2573 fixed-angle comparison note — 2026-08-27

The v2573 source-valid candidate preserves the v2539 low-shed improvement and adds the existing ground-owner sign/soil/wet-court pass. Screen-level change versus v2559 is small; the frame still loses to the target on occupancy density, distinct material hierarchy, continuous curb/sidewalk/drain legibility, and functional vertical landmarks. Keep formal state `REVISE`; do not promote or expand map-wide.

## v2583 shell-owner correction note — 2026-08-27

A ray-validated owner edit split the active volumetric shell west closure around its three existing service-bay spans. The fast locked frame now has a real dark recessed elevation and structural returns where the blank wall previously stood. This is a meaningful direction but not acceptance: the doors/frames need stronger value and the target still wins on ground hierarchy, occupancy, and weathered depth. Keep `REVISE` and do not expand map-wide.

## v2595 shell-bay depth checkpoint — 2026-08-27

The active volumetric shell west closure is now segmented around its existing side-bay spans, with door/interior planes behind the wall line. This corrects a real depth/occlusion error but does not yet clear the target: fixed-angle bay legibility, foreground ground hierarchy, and occupancy remain below the reference. Keep formal state `REVISE`.

## v2601 critic availability note — 2026-08-27

No new blind critic verdict is available for v2601: OpenRouter returned HTTP `402` because the two-image request exceeded the remaining prompt-token allowance even after reducing max output tokens. Preserve the failure/no-verdict state; do not substitute it with an acceptance judgment. Existing provisional diagnosis and formal `REVISE` state remain in force.

## v2616 process-gallery note — 2026-08-27

The shell-owner process gallery is a valid local depth/occupancy improvement, adding supported pipe tiers and a grounded end riser in the fixed screen band. It is not sufficient to clear the reference because the scene still reads sparse and the foreground asphalt/curb/soil hierarchy remains weaker. Keep `REVISE`; do not expand map-wide.

## v2630 sourced-occupancy note — 2026-08-27

The relocated Poly Haven welding/storage carts form a valid local occupancy improvement beside the sourced forklift, but they remain secondary at the locked angle and do not resolve the target gap. Preserve source-only vehicle policy, keep `REVISE`, and do not promote or expand map-wide.

## v2630 comparison note — 2026-08-27

The v2630 full-source frame preserves the shell openings/process gallery and adds the two relocated sourced carts beside the existing forklift. The pixel delta versus v2616 is small, matching a modest occupancy change; this does not clear the target’s stronger depth, ground hierarchy, wet-surface variation, or density. Keep `REVISE` and no promotion.

## v2635 cover-material note — 2026-08-27

The semantic cover owner now uses the established weathered concrete PBR route, improving its material credibility without changing its frozen tactical role or dimensions. This is a local material correction, not acceptance; retain `REVISE`.

## v2644 cover-PBR comparison note — 2026-08-27

The cover material is now integrated with the existing mapped concrete treatment and remains tied to the frozen tactical record. The correction improves material credibility but does not satisfy the target’s broader composition and occupancy requirements. Retain `REVISE` and no expansion.

## v2644 comparison note — 2026-08-27

Routing the existing semantic cover through weathered concrete PBR produces a clear local screen delta and removes the flat white barrier treatment. It does not resolve the broader reference gap in loading-frontage richness, ground hierarchy, density, or overall composition. Keep `REVISE`; do not expand map-wide.

## v2655 service-apron note — 2026-08-27

The connected curb-to-court transition is now a segmented mapped-concrete hardstand rather than an unarticulated dark strip. It improves material separation locally but does not clear the target’s broader ground hierarchy or density requirements. Keep `REVISE`; do not promote.

## v2664 comparison note — 2026-08-27

The curb-to-service-court transition now has a segmented, lighter mapped-concrete hardstand with construction joints and a toe edge. The full-source delta is meaningful locally, but the target still wins on scene-wide occupancy, facade depth, ground hierarchy, and composition. Keep `REVISE`; do not expand map-wide.

## v11 snapshot note — 2026-08-27

The current post-v2664 source/evidence state is preserved in immutable v11 with critical-file checksum verification. This protects the latest integrated shell, ground, cover, sourced-occupancy, and process-gallery work while the locked slice remains under `REVISE`; no map-wide expansion is authorized.

## v2680 service-light note — 2026-08-27

The shell-bay service-light addition is structurally valid but screen-level effect is negligible in the locked overcast presentation. Do not count it as a visual advance; retain `REVISE` and continue prioritizing readable facade/ground/occupancy changes.

## v2680 negative comparison note — 2026-08-27

The shell-bay recessed service-light pass is visually inert at the locked overcast angle, as proven by byte-identical v2664/v2680 captures. Do not use it as evidence of advancement; prioritize screen-visible facade depth, ground hierarchy, and occupancy corrections. Keep `REVISE`.

## v12 snapshot note — 2026-08-27

The post-v2680 source and evidence state is preserved in immutable v12 with critical-file checksum verification. The snapshot retains the meaningful shell process-gallery, recessed service frontage, sourced occupancy, mapped cover PBR, segmented service apron, and the explicitly negative service-light result. No acceptance or map-wide expansion is authorized while the locked slice remains `REVISE`.
