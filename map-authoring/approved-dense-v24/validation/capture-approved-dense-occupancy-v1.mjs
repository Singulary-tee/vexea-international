import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = "/home/ubuntu/vexea-international";
const outputPath = process.argv[2] ?? path.join(root, "client/map-authoring-output/pressure-plant-captures/approved-dense-occupancy-v2747.png");
const url = process.argv[3] ?? "http://127.0.0.1:3000/map-authoring.html?approvedDense=1&view=perspective&slice=off&denseDetail=1&denseSky=1&denseTrees=1&denseOccupancy=1&solid=1";
const required = ["APPROVED_DENSE_OCCUPANCY:OK", "HDRI_PURE_SKY_OVERCAST:OK"];
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text().slice(0, 600)}`); });
page.on("pageerror", (error) => errors.push(`pageerror: ${String(error).slice(0, 600)}`));
const startedAt = new Date().toISOString();
try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.vexeaMapAuthoring?.scene && window.vexeaMapAuthoring?.camera), null, { timeout: 90000 });
  await page.waitForFunction((items) => items.every((item) => (window.vexeaMapAuthoring?.environmentDiagnostics ?? []).some((diag) => diag.startsWith(item))), required, { timeout: 420000, polling: 500 });
  await page.waitForFunction(() => Boolean(window.vexeaMapAuthoring?.scene?.getObjectByName("approved_dense_visual_facade_depth")), null, { timeout: 90000 });
  await page.waitForTimeout(1000);
  const meta = await page.evaluate(() => {
    for (const id of ["topbar", "side-panel", "status-panel", "selection-reticle", "boot-veil"]) { const element = document.getElementById(id); if (element) element.style.display = "none"; }
    const wrap = document.getElementById("canvas-wrap"); if (wrap) { wrap.style.position = "fixed"; wrap.style.inset = "0"; wrap.style.width = "1280px"; wrap.style.height = "820px"; }
    const canvas = document.getElementById("authoring-canvas"); if (canvas) { canvas.style.position = "fixed"; canvas.style.inset = "0"; canvas.style.width = "1280px"; canvas.style.height = "820px"; }
    const api = window.vexeaMapAuthoring;
    const dense = api.scene.getObjectByName("approved_dense_visual_facade_depth");
    api.renderer?.setPixelRatio(1);
    api.renderer?.setSize(1280, 820, false);
    if (api.camera) { api.camera.aspect = 1280 / 820; api.camera.updateProjectionMatrix(); }
    api.controls?.update();
    if (api.renderer && api.scene && api.camera) api.renderer.render(api.scene, api.camera);
    return { diagnostics: api.environmentDiagnostics ?? [], denseChildren: dense?.children.length ?? 0, rootChildren: api.scene.children.length, canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null, renderer: api.renderer?.constructor?.name ?? null };
  });
  await page.waitForTimeout(1000);
  await page.locator("#authoring-canvas").screenshot({ path: outputPath, animations: "disabled", timeout: 120000 });
  const report = await page.evaluate((captured) => {
    const api = window.vexeaMapAuthoring; const canvas = document.getElementById("authoring-canvas");
    return { url: window.location.href, camera: api.camera.position.toArray(), target: api.controls?.target?.toArray() ?? null, orthographic: Boolean(api.orthographicBlockoutMode), diagnostics: api.environmentDiagnostics ?? [], canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null, denseChildren: captured.denseChildren, rootChildren: captured.rootChildren, renderer: captured.renderer, readiness: api.readinessSnapshot?.() ?? null, errors: window.__pressureCaptureErrors ?? [] };
  }, meta);
  report.startedAt = startedAt; report.generatedAt = new Date().toISOString(); report.captureErrors = errors; report.valid = required.every((item) => report.diagnostics.some((diag) => diag.startsWith(item))) && errors.length === 0;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath.replace(/\.png$/i, ".json"), `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify(report, null, 2));
} catch (error) { errors.push(String(error)); console.error(JSON.stringify({ outputPath, url, errors }, null, 2)); process.exitCode = 1; } finally { await browser.close(); }
