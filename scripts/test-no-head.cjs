const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  console.log("[Test] Launching Chromium...");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.includes("Visual") ||
      text.includes("Head") ||
      text.includes("head") ||
      text.includes("Player_one") ||
      text.includes("MATCH") ||
      text.includes("Orchestrator") ||
      text.includes("Renderer") ||
      text.includes("Error") ||
      text.includes("error")
    ) {
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${text}`);
    }
  });

  page.on("pageerror", (err) => console.log("[PAGE ERROR]", err));

  console.log("[Test] Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });

  console.log("[Test] Waiting for page initial setup (3s)...");
  await page.waitForTimeout(3000);

  // Check state of splash and screen manager
  console.log("[Test] Triggering match start via custom event...");
  const startResult = await page.evaluate(async () => {
    try {
      const w = window;
      // Start match with ASSAULT and dev map
      w.dispatchEvent(
        new CustomEvent("start-match", {
          detail: {
            mode: "STANDARD",
            class: "ASSAULT",
            solo: true,
            map: { id: "map_0_dev" },
            isDevQuickStart: true,
          },
        })
      );
      return { triggered: true };
    } catch (e) {
      return { triggered: false, error: String(e) };
    }
  });
  console.log("[Test] Start result:", startResult);

  // Wait for match and playerModel to load
  console.log("[Test] Waiting for match and playerModel to load (up to 20s)...");
  let loaded = false;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500);
    const status = await page.evaluate(() => {
      const w = window;
      const match = typeof w.getMatch === "function" ? w.getMatch() : null;
      const localPlayerVisual = match?.localPlayerVisual;
      const hasModel = !!localPlayerVisual?.characterModel;
      const meshesCount = localPlayerVisual?.characterModel?.children?.length || 0;
      const canvas = document.querySelector("#canvas-container canvas");
      const canvasVisible =
        canvas && window.getComputedStyle(canvas).display !== "none";
      return {
        hasMatch: !!match,
        hasVisual: !!localPlayerVisual,
        hasModel,
        meshesCount,
        canvasVisible: !!canvasVisible,
        canvasWidth: canvas?.width,
        canvasHeight: canvas?.height,
      };
    });

    if (i % 4 === 0) {
      console.log(`[Test] Status check at ${(i * 0.5).toFixed(1)}s:`, JSON.stringify(status));
    }

    if (status.hasModel) {
      console.log("[Test] Model loaded successfully! Status:", JSON.stringify(status));
      loaded = true;
      break;
    }
  }

  // Let it render frames for 3 seconds
  console.log("[Test] Waiting for frames to render (3s)...");
  await page.waitForTimeout(3000);

  // Inspect the local player visual details
  const visualDetails = await page.evaluate(() => {
    const w = window;
    const match = typeof w.getMatch === "function" ? w.getMatch() : null;
    const visual = match?.localPlayerVisual;
    if (!visual || !visual.characterModel) {
      return { found: false };
    }

    const model = visual.characterModel;
    const bones = [];
    const meshes = [];

    model.traverse((child) => {
      if (child.isBone) {
        bones.push({
          name: child.name,
          scale: { x: child.scale.x, y: child.scale.y, z: child.scale.z },
          pos: { x: child.position.x, y: child.position.y, z: child.position.z },
        });
      }
      if (child.isMesh) {
        meshes.push({
          name: child.name,
          visible: child.visible,
          isSkinned: !!child.isSkinnedMesh,
        });
      }
    });

    const headBones = bones.filter(b => 
      /head|neck|jaw|face|ear|eye|skull|helmet/i.test(b.name)
    );

    return {
      found: true,
      modelVisible: model.visible,
      modelPos: { x: model.position.x, y: model.position.y, z: model.position.z },
      modelRot: { x: model.rotation.x, y: model.rotation.y, z: model.rotation.z },
      totalBones: bones.length,
      headBones,
      meshes,
      cameraPos: match.camera ? { x: match.camera.position.x, y: match.camera.position.y, z: match.camera.position.z } : null,
      cameraRot: match.camera ? { x: match.camera.rotation.x, y: match.camera.rotation.y, z: match.camera.rotation.z } : null,
    };
  });

  console.log("[Test] Visual Details:", JSON.stringify(visualDetails, null, 2));

  // Take screenshot
  const screenshotPath = path.join(process.cwd(), "proof_no_blocking_head.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[Test] Screenshot saved to ${screenshotPath}`);

  // Check screenshot file size
  const stats = fs.statSync(screenshotPath);
  console.log(`[Test] Screenshot size: ${stats.size} bytes`);

  await browser.close();
  console.log("[Test] Finished successfully.");
})().catch((e) => {
  console.error("[Test] Fatal error:", e);
  process.exit(1);
});
