import { describe, expect, it } from "vitest";
import { POSE_EDITOR_ITEMS, getPoseEditorItem } from "../client/pose-editor-config";

const weaponIds = ["rifle", "pistol"] as const;
const utilityIds = ["Grenade", "Flashbang", "Med Kit", "Revive Tool", "Radio", "Signal Jammer", "Proximity Mine", "C4"] as const;

describe("pose editor catalog", () => {
  it("exposes real weapon and utility assets as deterministic editor items", () => {
    expect(POSE_EDITOR_ITEMS.map((item) => item.id)).toEqual([...weaponIds, ...utilityIds]);
    expect(new Set(POSE_EDITOR_ITEMS.map((item) => item.modelKey)).size).toBe(POSE_EDITOR_ITEMS.length);
    for (const id of [...weaponIds, ...utilityIds]) {
      const item = getPoseEditorItem(id);
      expect(item.modelKey).toMatch(/-optimized\.glb$/);
      expect(item.category).toMatch(/^(weapon|utility)$/);
    }
  });

  it("rejects unknown query selections instead of silently choosing an asset", () => {
    expect(getPoseEditorItem("unknown")).toBeUndefined();
  });
});
