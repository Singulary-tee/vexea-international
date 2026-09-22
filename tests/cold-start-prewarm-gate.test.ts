import { describe, expect, it } from "vitest";
import { IMAGE_MANIFEST, getImageManifestEntry } from "../client/image-manifest";
import { refreshCardImages } from "../client/screens/main-menu";

describe("Cold-Start and Animation Prewarm Permanent Gate", () => {
  describe("IMAGE_MANIFEST Integrity Gate", () => {
    it("ensures all card image keys exist in the IMAGE_MANIFEST", () => {
      const requiredCardKeys = [
        "squad_card_1.webp",
        "update_card_1.webp",
        "intel_card_1.webp",
        "leaderboard_card_1.webp",
        "promo_rifle_1.webp",
        "assault_card_1.webp",
        "demolition_card_1.webp",
        "medic_card_1.webp",
        "recon_card_1.webp",
      ];

      for (const key of requiredCardKeys) {
        const entry = getImageManifestEntry(key);
        expect(entry, `Card asset key "${key}" must be registered in IMAGE_MANIFEST`).toBeDefined();
        expect(entry?.path).toMatch(/^Images\//);
      }
    });

    it("ensures all VFX flipbook and static textures exist in the IMAGE_MANIFEST", () => {
      const vfxEntries = IMAGE_MANIFEST.filter((entry) => entry.category === "vfx");
      expect(vfxEntries.length).toBeGreaterThanOrEqual(40);

      // Verify essential flipbooks
      expect(getImageManifestEntry("cloud_01_8x8_q90.webp")).toBeDefined();
      expect(getImageManifestEntry("explosion_01_8x8_q90.webp")).toBeDefined();
      expect(getImageManifestEntry("muzzle_flash_01_5frame_q90.webp")).toBeDefined();
      expect(getImageManifestEntry("wispy_smoke_01_8x8_q90.webp")).toBeDefined();

      // Verify essential static layers and decals
      expect(getImageManifestEntry("tracer_warm_core.webp")).toBeDefined();
      expect(getImageManifestEntry("surface_decal_bullet_hole_01.webp")).toBeDefined();
    });
  });

  describe("Main-Menu Card Refresh & DOM Binding Gate", () => {
    it("updates #mm-bp-card background when refreshCardImages executes", () => {
      const cardElements: Record<string, any> = {
        "mm-updates-card": { id: "mm-updates-card", style: { backgroundImage: "" } },
        "leaderboard-card": { id: "leaderboard-card", style: { backgroundImage: "" } },
        "mm-intel-card": { id: "mm-intel-card", style: { backgroundImage: "" } },
        "mm-bp-card": { id: "mm-bp-card", style: { backgroundImage: "" } },
        "mm-store-card": { id: "mm-store-card", style: { backgroundImage: "" } },
      };

      const originalGetElementById = document.getElementById;
      document.getElementById = (id: string) => cardElements[id] || originalGetElementById(id);

      try {
        refreshCardImages();

        const bpCard = document.getElementById("mm-bp-card");
        expect(bpCard).not.toBeNull();
        expect(bpCard?.style.backgroundImage).toContain("squad_card_1.webp");

        const updatesCard = document.getElementById("mm-updates-card");
        expect(updatesCard?.style.backgroundImage).toContain("update_card_1.webp");

        const storeCard = document.getElementById("mm-store-card");
        expect(storeCard?.style.backgroundImage).toContain("promo_rifle_1.webp");
      } finally {
        document.getElementById = originalGetElementById;
      }
    });
  });
});
