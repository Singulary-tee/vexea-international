import { UTILITY_ASSET_DETAILS, WEAPON_ASSET_DETAILS } from "../shared/asset-details";
import type { UtilityId } from "../shared/utilities";
import type { WeaponId } from "../shared/weapons";

export type PoseEditorItemId = WeaponId | UtilityId;
export type PoseEditorItemCategory = "weapon" | "utility";

export interface PoseEditorItem {
  id: PoseEditorItemId;
  label: string;
  category: PoseEditorItemCategory;
  modelKey: string;
  /** Physical target length used only for one-hand utility normalization. */
  targetLength?: number;
  /** Source-space frame authored for assets that do not carry a placement node. */
  placementFrame?: PoseEditorPlacementFrame;
  /** Use the visible mesh center when the asset's node origin is not a usable grip point. */
  placementAnchor?: "visible-bounds-center";
}

export interface PoseEditorPlacementFrame {
  forward: readonly [number, number, number];
  up: readonly [number, number, number];
}

const UTILITY_TARGET_LENGTHS: Record<UtilityId, number> = {
  Grenade: 0.11,
  Flashbang: 0.18,
  "Med Kit": 0.3,
  "Revive Tool": 0.25,
  Radio: 0.28,
  "Signal Jammer": 0.4,
  "Proximity Mine": 0.35,
  C4: 0.3,
};

const UTILITY_PLACEMENT_FRAMES: Record<UtilityId, PoseEditorPlacementFrame> = {
  Grenade: { forward: [0, 0, 1], up: [0, 1, 0] },
  Flashbang: { forward: [0, 0, 1], up: [0, 1, 0] },
  "Med Kit": { forward: [0, 0, 1], up: [0, 1, 0] },
  "Revive Tool": { forward: [1, 0, 0], up: [0, 1, 0] },
  Radio: { forward: [0, 0, 1], up: [0, 1, 0] },
  "Signal Jammer": { forward: [0, 0, 1], up: [0, 1, 0] },
  "Proximity Mine": { forward: [0, 0, 1], up: [0, 1, 0] },
  C4: { forward: [0, 0, 1], up: [0, 1, 0] },
};

export const POSE_EDITOR_ITEMS: readonly PoseEditorItem[] = [
  ...(Object.keys(WEAPON_ASSET_DETAILS) as WeaponId[]).map((id): PoseEditorItem => ({
    id,
    label: id.toUpperCase(),
    category: "weapon",
    modelKey: WEAPON_ASSET_DETAILS[id].modelKey,
  })),
  ...Object.keys(UTILITY_ASSET_DETAILS).map((id) => {
    const utilityId = id as UtilityId;
    return {
      id: utilityId,
      label: utilityId.toUpperCase(),
      category: "utility" as const,
      modelKey: UTILITY_ASSET_DETAILS[utilityId].modelKey,
      targetLength: UTILITY_TARGET_LENGTHS[utilityId],
      placementFrame: UTILITY_PLACEMENT_FRAMES[utilityId],
      ...(utilityId === "Signal Jammer" ? { placementAnchor: "visible-bounds-center" as const } : {}),
    };
  }),
];

export function getPoseEditorItem(id: string): PoseEditorItem | undefined {
  return POSE_EDITOR_ITEMS.find((item) => item.id === id);
}
