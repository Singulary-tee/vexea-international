# VEXEA Approved-Dense Map Authoring Bundle v24

This folder is the current recovered VEXEA Three.js map-authoring bundle. It contains the reconstructed dense campus map catalog, the editor source used to render it, the validation harnesses, final evidence, and a lightweight asset manifest. It intentionally does **not** contain HDRI binaries, GLB/GLTF payloads, binary buffers, or PBR texture files. Those files are sourced locally from the provider pages listed in `assets/asset-manifest.json`.

## Repository integration

The editor is authored for the repository’s Vite configuration, whose web root is `client`. The original working-tree entrypoint was `client/map-authoring.html`, with source under `client/src/map-authoring/`; the same source is preserved here under `editor/` for review and archival packaging. To run the editor directly from a refreshed checkout, place the editor entrypoint at `client/map-authoring.html`, place `editor/src-map-authoring/` at `client/src/map-authoring/`, and obtain the payloads described by the manifest under `client/public/assets/`. The source expects the runtime asset prefix `/assets/`.

The recovered workspace did not contain the historical approved image-first artifacts or a separate `authoring.css` file even though the HTML entrypoint references `/src/map-authoring/authoring.css`. This bundle therefore preserves the actual recovered editor source rather than inventing a replacement stylesheet or claiming an exact historical restoration.

## Contents

| Path | Purpose |
|---|---|
| `editor/map-authoring.html` | Current map-authoring HTML entrypoint. |
| `editor/src-map-authoring/` | Complete current map-authoring TypeScript source, including the reconstructed dense catalog and pressure-slice presentation helpers. |
| `assets/asset-manifest.json` | Provider URLs, licenses, expected filenames/runtime paths, placements, and verified local HDRI hash. No payloads are embedded. |
| `validation/` | Current structural, occupancy, OrbitControls, locked-pressure, interaction, and capture scripts. |
| `evidence/` | Final captures, paired diagnostics, validation JSON, delivery note, and append-only ledgers. |

## Asset acquisition policy

Do not commit downloaded binaries to this branch. Download or restore each active asset from the provider URL in the manifest into the expected local runtime path, then run the validation scripts. The forklift is Sketchfab **CC-BY-4.0** and requires attribution in downstream distribution. The Poly Haven and AmbientCG assets listed here are CC0 according to their provider records.

The current dense catalog is a reconstruction and not the missing exact image-first catalog. The final evidence also records that the scene is not AAA-complete, that mobile/touch and final Ox Alpha acceptance were not obtained, and that two intentional structural attachment pairs remain review items.

## Lightweight package check

The branch package should remain free of large payloads. A simple review check is:

```bash
find map-authoring/approved-dense-v24/assets -type f \\
  \( -name '*.hdr' -o -name '*.glb' -o -name '*.gltf' -o -name '*.bin' -o -name '*.jpg' -o -name '*.png' -o -name '*.webp' -o -name '*.ktx2' \) -print
```

The command should return no files. The small PNG evidence captures are intentionally stored under `evidence/`; runtime asset payloads remain excluded.

## Final checked evidence

The final evidence reports focused TypeScript lint passed; reconstructed dense structural visibility passed at 93/93 records; sourced occupancy passed with no failures, overlaps, or route-clearance reviews; OrbitControls passed with a changed camera and no page/console errors; and the frozen pressure diagnostic reported `shedVisible:true`, `visibleBays:94`, and `errors:[]`. The two intentional approximate building AABB pairs are documented in the structural report and are not represented as fully cleared narrowphase contacts.
