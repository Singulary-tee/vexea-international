# Pose editor method

The standalone pose editor uses the same real player, weapon, and utility assets as gameplay without changing gameplay code.

1. Normalize the player through `normalizeGameplayPlayerModel`, then sample the canonical item animation (`rifle_idle` for the rifle catalog).
2. Solve weapon grips with `chooseVerifiedGripPose` and `resolveGripAnchors`. Keep the authored primary/support/muzzle anchors in the solver diagnostics.
3. Measure the business-end direction from the authored muzzle endpoint and compare it with a mesh probe. Rotate the held content so that measured direction follows the player/camera forward axis.
4. Keep the solved weapon or utility at the normalized player's physical scale. Center the measured grip or utility item on the camera optical axis rather than applying a screen-space offset.
5. For first person, start from the complete animated player asset, preserving the torso, shoulders, arms, hands, legs, skeleton, materials, and item attachment. Remove only head-bound triangles when the eye camera would otherwise see the head; never extract arms, discard legs, or synthesize sleeves or caps.
6. Inspect the rendered frame together with grip, clipping, projected-bounds, near-depth, authored/measured barrel agreement, and camera-alignment diagnostics. Solver success alone is not visual acceptance.

Utility orientation has two distinct sources. A `PlacementReference` is an authored node embedded in the GLB and is preferred when present. `placementFrame` is pose-editor-authored source-space metadata in `client/pose-editor-config.ts`, used only for a catalogued asset that lacks that node; it is based on the known real asset axes and is reported as `catalog-authored-frame+hand-frame`. When a fallback mesh's node origin is visibly offset from the object, a catalog entry may explicitly use `placementAnchor: "visible-bounds-center"`; this is still a source-geometry anchor, not a screen-space correction.

The utility readout reports the selected mesh as `anchor=...` and the anchor semantics as `mode=node` or `mode=visible-bounds-center`. `mode=node` uses the authored or fallback node position; the visible-bounds mode uses the selected mesh's transformed geometry center.

Review every utility visually after solving its frame. A zero-angle fallback result is necessary but not sufficient: reject sideways, inverted, floating, or implausibly scaled renders even when the numerical anchor diagnostic passes.

This method keeps the real player asset as the source of truth in both views. A first-person result is accepted only when the complete-body render, hands, held item, camera-forward barrel, and numerical diagnostics agree.
