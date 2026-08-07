import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudioPreviewManager } from "../client/StudioPreviewManager";
import { createSkeletonBox, createSkeletonText } from "../client/design-system";

describe("StudioPreviewManager & Screen Timing Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize StudioPreviewManager with required capabilities", () => {
    expect(StudioPreviewManager).toBeDefined();
    expect(typeof StudioPreviewManager.waitForReady).toBe("function");
  });

  it("should resolve waitForReady when no load is active or after load completes", async () => {
    const readyPromise = StudioPreviewManager.waitForReady();
    await expect(readyPromise).resolves.toBeUndefined();
  });

  it("should create tactical skeleton DOM elements when document is available", () => {
    // Mock document if running in node environment without jsdom
    if (typeof document === "undefined") {
      const mockElement: any = {
        className: "",
        style: {},
        textContent: "",
        appendChild: (child: any) => {}
      };
      (global as any).document = {
        createElement: () => ({ ...mockElement })
      };
    }

    const box = createSkeletonBox("200px", "100px", "TEST SYNC");
    expect(box).toBeDefined();
    if (box) {
      expect(box.className).toContain("vexea-skeleton-box");
      expect(box.style.width).toBe("200px");
      expect(box.style.height).toBe("100px");
    }

    const text = createSkeletonText("150px", "18px");
    expect(text).toBeDefined();
    if (text) {
      expect(text.className).toContain("vexea-skeleton-text");
      expect(text.style.width).toBe("150px");
      expect(text.style.height).toBe("18px");
    }
  });
});
