# VEXEA — Agent Session Handoff
Generated: 2026-08-26 | Surface: Cline CLI v3.0.58 (codespace /workspaces/vexea-international)
Purpose: Full context transfer to a future agent instance (e.g., Telegram connector session).
FIRST ACTION FOR NEW AGENT: read this entire file before doing anything else.

## 1. Project Identity

- VEXEA International — browser-based PvE drone survival shooter.
- Stack: Vanilla TypeScript client (NO UI framework; React forbidden). Three.js r184 rendered exclusively via WebGPU + TSL (`THREE.WebGLRenderer` forbidden; fallback = WebGPURenderer with forceWebGL:true). Rapier WASM physics in `client/physics.worker.ts`. Node server (tsx dev → esbuild CJS prod), geckos.io (WebRTC/UDP) + socket.io dual transport. Firebase auth/Firestore. Shared binary snapshot protocol in `shared/` (8-byte header, 32-byte drone structs).
- Server-authoritative everything: hitscan, static collision, drone AI. Client Rapier only does player kinematic character controller + static map geometry. Drones are NEVER simulated client-side.
- Zero-GC hot paths mandated. 50MB asset budget. GLBs Draco+KTX2 compressed, hosted on Cloudflare R2.
- Commands: `npm run dev` (tsx server), `lint` = `tsc --noEmit`, `test` = `vitest run`, `build` = vite + esbuild.

## 2. Completed Work This Session (do not redo)

### Bug investigated
Player_one-optimized.glb character model: (a) random positions in main menu/lobby, (b) gun intermittently invisible, (c) textures intermittently failing, (d) suspected duplicate renderers.

### Root causes found (verified with file:line evidence)
1. STALE FRAMING: mode framing lived only inside `StudioPreviewManager.buildShowcaseModel()`, but `attachTo()` skipped rebuild when item+skin already loaded → MAIN_MENU<->LOBBY transitions kept whichever pose loaded first.
2. LOBBY CONTAINER FIGHT: `screen-manager.ts showLobby()` attached canvas to `#lobby-3d-backdrop` while `lobby.ts` also attached it to `middleSpacer` in a rAF (fired first) → canvas re-parented mid-render, aspect recomputed from wrong container.
3. ORPHANED WEAPON EQUIP: `loadAndEquipWeaponAlways()` was fire-and-forget; concurrent attachTo/detach could parent the SCAR-L onto a removed model; errors swallowed.
4. SILENT TEXTURE FALLBACK: `createConfiguredGLTFLoader()` URL modifier substituted a transparent 1x1 PNG for any texture missing from `blobUrlMap` with zero logging → meshes invisibly vanished depending on cache timing.
5. DUPLICATE RENDERERS: NON-ISSUE in production — one renderer exists (`main.ts`, window.renderer); "duplication" was the single canvas re-parenting between containers. Only real second renderer is dev-only (`dev-entities.ts localRenderer`).
6. RULED OUT: `studio_placement_*` localStorage configs (write-only dead code, never read).
