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

export const POSE_EDITOR_ITEMS: readonly PoseEditorItem[] = [
  ...(["rifle", "pistol"] as const).map((id): PoseEditorItem => ({
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
    };
  }),
];

export function getPoseEditorItem(id: string): PoseEditorItem | undefined {
  return POSE_EDITOR_ITEMS.find((item) => item.id === id);
}
