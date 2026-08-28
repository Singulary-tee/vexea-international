# VEXEA Approved-Dense Map Authoring Delivery

**Delivery state:** The repository now contains a query-gated approved-dense full-map authoring mode built from the reconstructed `dense-approved-blockout.ts` catalog, with the frozen VEXEA gameplay semantics kept separate from presentation-only details. This is the actual checked state at delivery. It is **not** the exact historical image-first pipeline requested by the user: `image-derived-catalog.ts`, `build-image-first-blockout.py`, the original full-map validators, the clean v2 semantic/heightmap images, and `image-first-blockout-geometry.json` were absent from the recovered workspace, and the dense catalog is explicitly a reconstruction based on preserved v1 image references and the user-provided blockout-stage instructions.

## Local inspection URL

```text
http://127.0.0.1:3000/map-authoring.html?approvedDense=1&view=perspective&framing=dense_focus&slice=off&denseDetail=1&denseSky=1&denseTrees=1&denseOccupancy=1&densePiping=1&denseTerrain=1&denseLights=1&denseForecourt=1&denseEdge=1&denseMaterials=1&densePbr=1&solid=1
```

The inspection URL is perspective and orbitable. The final orbit regression passed with controls enabled, `rotateLeft` present, camera movement observed, and no page/console errors. The current exposed proxy domain is not usable without an allowed-host change: it returns Vite’s existing `Blocked request` response. No proxy, origin, connector, or allowed-host configuration was changed.

## Implemented approved-dense presentation pass

The active dense mode hides the legacy generic site presentation and uses the reconstructed 93-record campus catalog in its own query-gated scene path. It includes segmented surfaces, named multi-zone building masses, routes, deliberate covers, raised plant/core roles, open-sky/UAV records, deployment and kill-zone records, camera-sector and player-spawn records, sloped presentation terrain ridges, water edge, and orthographic tagged authoring controls. A presentation-only facade owner adds rounded wall bodies, grounded plinths, roof caps, loading-door recesses, lintels, jambs, rooftop service units, parapet rails, and low-cost instanced industrial window grids.

The dense presentation also contains a shared low-memory ground material pass using the existing [AmbientCG Road012A](https://ambientcg.com/view?id=Road012) asphalt maps and Poly Haven dirt-floor maps; a bounds-normalized Poly Haven modular pipe rack on the pressure-yard hardstand; a grounded Poly Haven Tree Small 02 vegetation pass; four bounds-normalized sourced service assets; and a grounded curb/drain/loading-apron hierarchy. The four occupancy assets are a Sketchfab warehouse forklift under **CC-BY-4.0** attribution and Poly Haven portable generator, portable welding cart, and industrial storage cart under **CC0**. The optional chain-link fence cue was tested and excluded because the recovered local glTF omitted its referenced textures and binary payload.

The active environment is the Poly Haven [Kloofendal Overcast Pure Sky](https://polyhaven.com/a/kloofendal_overcast_puresky), a sky-only overcast HDRI selected for incoming-rain atmosphere. The local 1K HDR SHA-256 is `5f98aa01d43a49cd899299751a978b3e5559a76300198b5dd2d9c68ecc4ad130`.

## Validation evidence

| Gate | Result |
|---|---|
| TypeScript focused lint | Passed with `npm run lint:pressure-fast`. |
| Dense structural gate | `approved-dense-blockout-structure-v2905.json` passed: 93 catalog records, 93/93 visible, all required kinds, orthographic authoring true, controls enabled, no page errors. Two approximate building AABB pairs remain as intentional host/tower attachments for review: processing hall/service tower and utility stack/switchgear 03. |
| Sourced occupancy gate | `approved-dense-occupancy-final-v2905.json` passed: all four assets within `dense_surface_pressure_yard`, bottom-contacted, pairwise non-overlapping, no route-clearance reviews. |
| Locked pressure fast regression | Final v2905 run passed: `shedVisible:true`, `visibleBays:94`, `errors:[]`. The frozen `pressure_midroute_player` camera contract was not changed. |
| Orbit regression | `approved-dense-orbit-current-v2915.json` passed on the exact retained local URL after the final presentation edits: perspective controls enabled, API orbit method present, camera changed from `[78.01108870195142,3.0957576675372884,179.97930108969067]` to `[60.634055432069204,3.0957576675372893,166.3022959958461]`, no page/console errors. Mobile/touch interaction remains unaccepted. |
| Final close capture | `approved-dense-final-tree-near-verge-v2911.png/.json`: valid, no capture errors, lower player-eye-height dense focus with beveled wet-service forecourt, neutral industrial cover, functional loading-bay markings, five-part loading canopy, active overcast/PBR/tree/occupancy/piping/edge/terrain/service-light diagnostics; the scaled sourced occupancy, supported pipe rack, and warm practicals are readable in the service yard. The additional sourced tree is grounded but remains occluded in this close frame and is not claimed as visible focal evidence. |
| Final overview capture | `approved-dense-final-overview-v2913.png/.json`: valid, no capture errors, full-campus perspective overview after the latest near-verge tree and neutral-cover corrections, with the beveled wet-service forecourt, loading canopy, and retained overcast/PBR/tree/occupancy/piping/edge/terrain/service-light diagnostics. |
| Runtime timing diagnostic | Close focus 199.3 ms average fast-path diagnostic; overview 224.3 ms; final structural/occupancy/pressure regressions were previously green; the current post-relocation OrbitControls regression is also green, and both final captures remain valid with no errors. These are sandbox/WebGL authoring diagnostics, not mobile acceptance or a performance guarantee. |

## Explicit limitations

The final focus camera approaches from approximately `(78,2.1,180)` toward `(108,1.1,124)`; the frozen `pressure_midroute_player` camera remains unchanged. The final screenshots still show a reconstructed dense blockout foundation rather than an AAA-complete game environment. Broad simple masses, sparse background occupancy, limited facade variation, and incomplete route-edge/industrial dressing remain visible. The approved image-first source set and original full-map traversal validators were not recovered, so this delivery cannot claim exact pipeline restoration or full traversal/contact/overlap acceptance. Ox Alpha was not available for a final adversarial acceptance review, and no critic approval is claimed. The evidence, ledgers, and snapshot preserve these limitations rather than masking them with fog, framing, or hidden geometry.

## Recovery snapshot

`recovery-snapshots/pressure-plant-authoring-v24.tar.gz` contains the final checked authoring source, reconstructed dense catalog, validators, interaction/orbit scripts, latest evidence pairs, active HDRI, preserved v1 reference images, and append-only ledgers. The final v24 snapshot SHA-256 is `bfbe4a8582db39abcc547a50a774a119773b56c5a4793983a712ce3f8fbe3b91`.
