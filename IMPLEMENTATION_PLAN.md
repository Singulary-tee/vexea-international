# TECHNICAL IMPLEMENTATION PLAN: WEAPONS, ATTACHMENTS & GRIP EXTRAPOLATION SYSTEM

This document outlines the locked technical design and architectural plan for integrating the high-performance weapons, attachments, and procedural skeletal grip extrapolation systems into the VEXEA client. 

---

## 1. Core Architectural Requirements

To align with `/ARCHITECTURE.md` and project mandates, this system is designed under the following strict engineering constraints:
1. **Zero-Allocation Execution Pipeline:** No `new` objects (`THREE.Vector3`, `THREE.Quaternion`, arrays `[]`, or objects `{}`) are allowed inside animation/render loops or the frame tick update functions. All calculations must use static pre-allocated pool variables.
2. **Framework Compliance:** Built entirely using vanilla TypeScript and direct Three.js r184 APIs. **No React is used.**
3. **No Stylistic Buzzwords or Emojis:** The code, comments, and documentation must remain grounded, technical, and professional.
4. **Authoritative Socket.io Support:** Designed around Socket.io and JSON payload synchronization in the preview environment, completely skipping any UDP binary requirements.
5. **Robust Resource Disposal:** Any toggled attachment or re-equipped model must be fully disposed of to prevent memory leaks in the Three.js WebGPU engine.

---

## 2. File & Folder Structural Design

To ensure a highly modular and non-monolithic codebase, a new dedicated module structure will be introduced inside `/client/weapons/`:

```
/client/weapons/
  ├── AttachmentSystem.ts   # Manages loading, caching, toggling, and snapping scopes to sockets
  └── GripSystem.ts         # Math engine for trigger-offset grip calculation and left/right hand bone alignment
```

### Module Breakdown:
*   **`AttachmentSystem.ts`**: Implements single-instance lazy loading of the global attachments file (`attachments-optimized.glb`). It parses the GLTF hierarchy, extracts sub-mesh components (`Holosight_512`, `sk_optic_acog_rds`, and `sm_optic_atacr18`), and caches them as immutable templates. It provides a state-driven API to toggle attachments on/off on active weapon bones, ensuring automatic mutual exclusion (e.g., equipping a Holosight automatically removes any active ACOG or ATACR scope to prevent visual overlap).
*   **`GripSystem.ts`**: Encapsulates the procedural skeletal positioning logic. It dynamically analyzes trigger vectors to calculate grip placements, and applies bone transformations to the active character models.

---

## 3. Preloading & Asset Integration Plan

The weapons and attachments must be loaded, cached, and validated across both the initial loading phases and matchmaking checkpoints.

### 3.1. Splash Screen Preloader Hook
In `/client/screens/splash.ts`, the `MODELS_TO_PRELOAD` array will be expanded to include all optimized weapon and attachment GLB files from the R2 storage tracker:

```typescript
// Location: /client/screens/splash.ts
const MODELS_TO_PRELOAD = [
  'Player_one-optimized.glb',
  'attachments-optimized.glb',
  'brn_180-optimized.glb',
  'f_90-optimized.glb',
  'hk_51-optimized.glb',
  'scar_h_mk_17-optimized.glb',
  'scar_l-optimized.glb'
];
```

### 3.2. Matchmaking Checkpoint Hook
In `/client/asset-cache.ts`, the static `MAP_1_ASSETS` array will be expanded to incorporate the weapon resources. This guarantees that if these resources are cleared from IndexedDB, the interactive "GAME ASSETS REQUIRED" download prompt modal will automatically catch them and trigger a reliable batch download before letting the player enter a match:

```typescript
// Location: /client/asset-cache.ts
export const MAP_1_ASSETS = [
  "grenade.glb",
  "attachments-optimized.glb",
  "brn_180-optimized.glb",
  "f_90-optimized.glb",
  "hk_51-optimized.glb",
  "scar_h_mk_17-optimized.glb",
  "scar_l-optimized.glb",
  ...Object.keys(ASSET_STRUCTURE),
  "concrete_fence_low-poly.glb",
  "security_camera_01_1k.gltf.glb",
  "security_camera_02_1k.gltf.glb",
  "concrete_block_low_poly.glb",
  "StreetLightPoles.glb"
];
```

---

## 4. 3D Studio Preview Upgrade (Armory & Store)

Currently, the `StudioPreviewManager.ts` maps all weapon types (rifles, lmgs, shotguns, snipers) to a single fallback model `smg_fps_animations.glb`. This mapping will be removed to allow displaying the high-fidelity optimized weapons.

### 4.1. Real Model Mapping
We will update `/client/StudioPreviewManager.ts` to map the respective loadout weapon keys directly to their high-performance assets:

```typescript
// Location: /client/StudioPreviewManager.ts
private async buildShowcaseModel(itemKey: string, skinId: string): Promise<void> {
  let glbName = "";
  if (itemKey.endsWith(".glb")) {
    glbName = itemKey;
  } else if (itemKey === 'rifle' || itemKey === 'scar_l') {
    glbName = "scar_l-optimized.glb";
  } else if (itemKey === 'brn_180') {
    glbName = "brn_180-optimized.glb";
  } else if (itemKey === 'f_90') {
    glbName = "f_90-optimized.glb";
  } else if (itemKey === 'hk_51') {
    glbName = "hk_51-optimized.glb";
  } else if (itemKey === 'scar_h_mk_17') {
    glbName = "scar_h_mk_17-optimized.glb";
  } else if (itemKey === 'pistol' || itemKey === 'viper_pistol') {
    glbName = "animated_pistol.glb";
  } else if (itemKey === 'grenade' || itemKey === 'frag_grenade') {
    glbName = "grenade.glb";
  } else {
    glbName = itemKey || "Player_one-optimized.glb";
  }
...
```

### 4.2. Armory Attachment Showcase
When a weapon model loads in the Armory or Store preview scenes, the `AttachmentSystem` will be invoked to attach a matching scope onto the weapon's top rail automatically (e.g., equipping `Holosight_512` to `EXPS3_Socket_0225` on SCAR-L). This demonstrates full visual completeness during inspections.

---

## 5. Attachment Mutual Exclusion Engine

The `AttachmentSystem` handles loading, cloning, and mounting sub-assets to weapon bones.

### 5.1. GLB Hierarchy Mapping
Based on `/glb_nodes_report.txt`, the sub-trees in `attachments-optimized.glb` map as follows:
*   **Holosight Model**: Root node `Holosight_512` (containing meshes `Sketchfab_Scene_Holosight_512_001_Optic_Picture_M_Inst_HOLO1_0`, etc.)
*   **ACOG Scope Model**: Root node `sk_optic_acog_rds` (containing meshes `Sketchfab_Scene_sk_optic_acog_rds_001_M_Reversion_0`, etc.)
*   **ATACR Scope Model**: Root node `sm_optic_atacr18` (containing meshes `Sketchfab_Scene_sm_optic_atacr18_001_MI_Optic_ATACR_0`, etc.)

The socket bones on the weapon models (e.g., `scar_l-optimized.glb`) map to:
*   `EXPS3_Socket_0225` -> Mounts `Holosight_512`
*   `sdr_socket_0237` -> Mounts `sk_optic_acog_rds` (SDR/ACOG Rail)
*   `atac_Socket_0238` -> Mounts `sm_optic_atacr18` (ATACR Sniper/Long-Range Rail)

### 5.2. Mount Algorithm
1. Parse and extract the sub-mesh templates from `attachments-optimized.glb`.
2. To attach a scope, look up the target socket bone on the weapon using `.getObjectByName()`.
3. If an existing scope is already attached, traverse and safely dispose of its geometries and materials, then remove the child from the parent bone.
4. Clone the new scope template using `SkeletonUtils.clone()`.
5. Attach the cloned scope group directly as a child of the socket bone:
   `socketBone.add(scopeClone)`.
   Because the scope is nested under the socket bone, it automatically inherits correct coordinate space positioning and orientations.

---

## 6. Procedural Skeletal Grip Extrapolation Engine

To equip `scar_l-optimized.glb` onto the character model `Player_one-optimized.glb`, the hands must align with the weapon. The left grip position is supplied by the `combat_grip_0233` bone on the gun, but the right hand grip has no bone in SCAR-L and must be procedurally extrapolated.

### 6.1. Math Formulas for Offset Extrapolation
To locate the right hand grip position, the trigger nodes are used as reference bounds:
*   Let $P_{\text{trigger}}$ be the global position of the trigger start node `tag_trigger_0223`.
*   Let $P_{\text{end}}$ be the global position of the trigger end node `tag_trigger_end_0421`.
*   The trigger vector is $V_{\text{trigger}} = P_{\text{end}} - P_{\text{trigger}}$.
*   The length of the trigger structure is:
    $$d = \|V_{\text{trigger}}\|$$

To establish the weapon orientation:
*   **Forward Direction Vector ($D_{\text{forward}}$)**: Derived from the trigger point pointing toward the muzzle bone `tag_muzzle_0222`:
    $$D_{\text{forward}} = \text{normalize}(P_{\text{muzzle}} - P_{\text{trigger}})$$
*   **Upward Direction Vector ($D_{\text{up}}$)**: Derived pointing from the trigger bone toward the top-rail scope socket bone `EXPS3_Socket_0225`:
    $$D_{\text{up}} = \text{normalize}(P_{\text{scope\_socket}} - P_{\text{trigger}})$$

Using these axes, the extrapolation proceeds in two steps:
1.  **Index Hook Location ($P_{\text{hook}}$)**: Formed by moving downwards by distance $d$ from the trigger center:
    $$P_{\text{hook}} = P_{\text{end}} - d \cdot D_{\text{up}}$$
2.  **Right Grip Palm Center ($P_{\text{grip\_right}}$)**: Extrapolated by projecting backwards along the handle slope (backwards from $P_{\text{hook}}$):
    $$P_{\text{grip\_right}} = P_{\text{hook}} - c_{\text{grip}} \cdot d \cdot D_{\text{forward}} - c_{\text{drop}} \cdot d \cdot D_{\text{up}}$$
    *(where $c_{\text{grip}} \approx 1.5$ and $c_{\text{drop}} \approx 1.2$ are calibrated coefficients matching the grip scale).*

### 6.2. Left & Right Hand Alignment Implementation
1.  **Right Hand Fitting**:
    *   The weapon model is added as a child of the player's right hand bone: `arm_right_hand` (index 10).
    *   To align the hand with the right grip, the weapon's local transform relative to `arm_right_hand` is offset so that the hand joint meets $P_{\text{grip\_right}}$.
2.  **Left Hand Fitting**:
    *   The player's left hand bone `arm_left_hand` (index 32) must meet the weapon's physical grip bone `combat_grip_0233` (index 60) or `foregrip_socket_0232` (index 58).
    *   We project the left hand position toward the target left grip position by adjusting the local rotations of the left shoulder (`arm_left_top`) and elbow (`arm_left_bot`) bones, establishing a clean, aligned holding stance.

---

## 7. Studio Character Preview Integration Strategy

In `/client/StudioCharacterPreview.ts`, when the main character model `Player_one-optimized.glb` is initialized, we immediately trigger the loading of the weapon and attachment assets (`scar_l-optimized.glb` and `attachments-optimized.glb`), bypassing any delay related to main menu transitions. 

### 7.1. Scenic Stance: Weapon Lowered (Low-Ready Pose)
Rather than a high-ready aiming or active combat pose, the character is set up in a relaxed "weapon-lowered" stance suitable for environmental scenery (as viewed from behind/side angles in the start menu):
*   **Weapon Mount**: The `scar_l-optimized.glb` model is equipped directly to the right hand bone (`arm_right_hand`).
*   **ACOG Scope Integration**: The ACOG scope (`sk_optic_acog_rds`) is pre-equipped and attached onto the weapon's `sdr_socket_0237` rail socket automatically, ensuring it is always visible.
*   **Procedural Lowered Hand Pose**: 
    *   The right arm is rotated downwards and slightly outwards, pointing the rifle muzzle diagonally down towards the ground at a relaxed angle (~45 to 60 degrees down-forward) near the right hip/side.
    *   The left arm rests naturally in a relaxed posture, or lightly supports the lower front receiver/grip of the weapon in a non-aggressive stance.
*   **No Unsolicited Player UI**: There are no interactive UI menus or checkboxes exposed to end-players for toggling weapons or attachments. 
*   **Developer Fine-Tuning Module**: A hotkey-gated or strictly conditional developer UI placement/inspection menu is supported internally for real-time skeletal translation/rotation adjustments to fine-tune the lowered pose, but is fully compiled out or hidden for public builds.
