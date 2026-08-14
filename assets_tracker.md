# VEXEA Assets & Sounds Tracker

> [!WARNING]
> **CRITICAL REPOSITORY RULE (DISCLAIMER):**
> This Asset Tracker was explicitly created and added to the workspace to **strictly forbid** the direct uploading of massive `.glb` files, textures, audio, or other heavy binary assets to this git repository. Large media files **do not belong in this codebase repository**.
> All heavy assets MUST be hosted remotely (such as in external release packages or a CDN) and dynamically retrieved by the client loading sequence, rather than being committed to the git repository. Under no circumstances should AI coding assistants upload or generate large GLB or binary assets in the workspace.

This document tracks all the 3D models, textures, environment maps, and audio assets for **VEXEA**, separating them by category and noting their preservation and remote loading state.

## 1. 3D Models & Game Assets (`/` Root & Image)

The following assets have been completely cleaned out of the direct workspace files to stay strictly under the 50MB storage and client memory budget. They are pulled dynamically during the loading sequence from GitHub Releases or from high-performance local IndexedDB storage.

| Asset Name | Category | Origin / Source | Relocation Target |
| :--- | :--- | :--- | :--- |
| `StreetLightPoles.glb` | Model | Root Directory | `Asset` Release Package |
| `StreetLightPoles.bin` | Model | Root Directory | `Asset` Release Package |
| `grenade.glb` | Model | Root Directory (Grenade Prop) | `Asset` Release Package |
| `concrete_block_low_poly.glb` | Model | Root Directory | `Asset` Release Package |
| `concrete_fence_low-poly.glb` | Model | Root Directory | `Asset` Release Package |
| `double-arm_BaseColor.jpg` | Texture | Root Directory | `Asset` Release Package |
| `double-arm_Emission.jpg` | Texture | Root Directory | `Asset` Release Package |
| `double-arm_Metalness.jpg` | Texture | Root Directory | `Asset` Release Package |
| `double-arm_Normal.jpg` | Texture | Root Directory | `Asset` Release Package |
| `double-arm_Roughness.jpg` | Texture | Root Directory | `Asset` Release Package |
| `double-arm_Transmission.jpg` | Texture | Root Directory | `Asset` Release Package |
| `single_arm_BaseColor.jpg` | Texture | Root Directory | `Asset` Release Package |
| `single_arm_Emission.jpg` | Texture | Root Directory | `Asset` Release Package |
| `single_arm_Metalness.jpg` | Texture | Root Directory | `Asset` Release Package |
| `single_arm_Normal.jpg` | Texture | Root Directory | `Asset` Release Package |
| `single_arm_Roughness.jpg` | Texture | Root Directory | `Asset` Release Package |
| `single_arm_Transmission.jpg` | Texture | Root Directory | `Asset` Release Package |
| `Tiles106_1K-JPG_AmbientOcclusion.jpg` | Texture | Root Directory | `Asset` Release Package |
| `Tiles106_1K-JPG_Color.jpg` | Texture | Root Directory | `Asset` Release Package |
| `Tiles106_1K-JPG_Displacement.jpg` | Texture | Root Directory | `Asset` Release Package |
| `Tiles106_1K-JPG_NormalDX.jpg` | Texture | Root Directory | `Asset` Release Package |
| `Tiles106_1K-JPG_NormalGL.jpg` | Texture | Root Directory | `Asset` Release Package |
| `Tiles106_1K-JPG_Roughness.jpg` | Texture | Root Directory | `Asset` Release Package |
| `qwantani_dusk_2_puresky_4k.hdr` | Env Map | Root Directory | `Asset` Release Package |
| `T_AntennaTower_D.png` | Texture | Reference Image Only | `Asset` Release Package |
| `T_AntennaTower_N.png` | Texture | Reference Image Only | `Asset` Release Package |
| `T_AntennaTower_S.png` | Texture | Reference Image Only | `Asset` Release Package |
| `Ground067_1K-JPG_AmbientOcclusion.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `Ground067_1K-JPG_Color.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `Ground067_1K-JPG_Displacement.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `Ground067_1K-JPG_NormalDX.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `Ground067_1K-JPG_NormalGL.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `Ground067_1K-JPG_Roughness.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `VB100.BX_DOOR_2.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `VB100.DX_2_DOOR_1.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `VB100.DX_2_DOOR_5.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `VB100.DX_Case_1.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `VB100.DX_Case_2.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `VB100.DX_Case_3.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `VB100.DX_Case_5.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `VB100.DX_DOOR_1.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `VB100.DX_DOOR_3.jpg` | Texture | Reference Image Only | `Asset` Release Package |
| `animated_pistol.glb` | Model | Reference Image Only | `Asset` Release Package |
| `industrial_asset_pack_free.glb` | Model | Reference Image Only | `Asset` Release Package |
| `low_poly_rusty_metal_drum.glb` | Model | Reference Image Only | `Asset` Release Package |
| `model.bin` | Binary | Reference Image Only | `Asset` Release Package |
| `small_warehouse.glb` | Model | Reference Image Only | `Asset` Release Package |
| `smg_fps_animations.glb` | Model | Reference Image Only | `Asset` Release Package |
| `tree_animate.glb` | Model | Reference Image Only | `Asset` Release Package |
| `warehouse_building.glb` | Model | Reference Image Only | `Asset` Release Package |

---

## 2. PBR Environmental Textures (`/client/public/textures/`)

The full high-fidelity PBR textures folder has been removed from on-disk storage to lighten the bundle size, dynamically compiled into blobs and cached instantly via IndexedDB in the client browser's memory sandbox.

| Folder / Group | Filename | Category | Direct CDN Source |
| :--- | :--- | :--- | :--- |
| `asphalt_02` | `asphalt_02.bin` | Binary | `Asset` Release Package |
| `asphalt_02` | `asphalt_02_arm_1k.jpg` | Texture | `Asset` Release Package |
| `asphalt_02` | `asphalt_02_diff_1k.jpg` | Texture | `Asset` Release Package |
| `asphalt_02` | `asphalt_02_nor_gl_1k.jpg` | Texture | `Asset` Release Package |
| `concrete_tiles_02` | `concrete_tiles_02.bin` | Binary | `Asset` Release Package |
| `concrete_tiles_02` | `concrete_tiles_02_arm_1k.jpg` | Texture | `Asset` Release Package |
| `concrete_tiles_02` | `concrete_tiles_02_diff_1k.jpg` | Texture | `Asset` Release Package |
| `concrete_tiles_02` | `concrete_tiles_02_nor_gl_1k.jpg` | Texture | `Asset` Release Package |
| `red_brick_03` | `red_brick_03.bin` | Binary | `Asset` Release Package |
| `red_brick_03` | `red_brick_03_arm_1k.jpg` | Texture | `Asset` Release Package |
| `red_brick_03` | `red_brick_03_diff_1k.jpg` | Texture | `Asset` Release Package |
| `red_brick_03` | `red_brick_03_nor_gl_1k.jpg` | Texture | `Asset` Release Package |
| `rocks_ground_01` | `rocks_ground_01.bin` | Binary | `Asset` Release Package |
| `rocks_ground_01` | `rocks_ground_01_arm_1k.jpg` | Texture | `Asset` Release Package |
| `rocks_ground_01` | `rocks_ground_01_diff_1k.jpg` | Texture | `Asset` Release Package |
| `rocks_ground_01` | `rocks_ground_01_nor_gl_1k.jpg` | Texture | `Asset` Release Package |
| `rocky_trail` | `rocky_trail.bin` | Binary | `Asset` Release Package |
| `rocky_trail` | `rocky_trail_arm_1k.jpg` | Texture | `Asset` Release Package |
| `rocky_trail` | `rocky_trail_diff_1k.jpg` | Texture | `Asset` Release Package |
| `rocky_trail` | `rocky_trail_nor_gl_1k.jpg` | Texture | `Asset` Release Package |

---

## 3. R2 Media Sourcing Notice

> [!NOTE]
> All images, videos, and sound assets have been completely purged from GitHub Releases and direct codebase tracking. They are 100% sourced from Cloudflare R2 and tracked in `r2_assets_tracker.json` and `r2_assets_tracker.md`.

