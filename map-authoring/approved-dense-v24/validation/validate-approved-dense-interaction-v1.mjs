import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = "/home/ubuntu/vexea-international";
const outputPath = process.argv[2] ?? path.join(root, "client/map-authoring-output/pressure-plant-captures/approved-dense-interaction-v2794.json");
const url = process.argv[3] ?? "http://127.0.0.1:3000/map-authoring.html?approvedDense=1&view=perspective&framing=dense_focus&slice=off&denseDetail=1&denseSky=1&denseTrees=1&denseOccupancy=1&densePiping=1&denseMaterials=1&densePbr=1&solid=1";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text().slice(0, 600)}`); });
page.on("pageerror", (error) => errors.push(`pageerror: ${String(error).slice(0, 600)}`));
const report = { url, errors, cameraBefore: null, cameraAfter: null, controlsEnabled: false, perspective: false, valid: false };
try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.vexeaMapAuthoring?.scene && window.vexeaMapAuthoring?.camera && window.vexeaMapAuthoring?.controls), null, { timeout: 90000 });
  await page.waitForTimeout(1200);
  const before = await page.evaluate(() => {
    for (const selector of ["#topbar", "#side-panel", "#status-panel", "#selection-reticle", "#boot-veil"]) {
      const element = document.querySelector(selector);
      if (element instanceof HTMLElement) element.style.display = "none";
    }
    const canvas = document.getElementById("authoring-canvas");
    return { camera: window.vexeaMapAuthoring.camera.position.toArray(), controlsEnabled: window.vexeaMapAuthoring.controls.enabled, perspective: !window.vexeaMapAuthoring.orthographicBlockoutMode, canvas: canvas ? { left: canvas.getBoundingClientRect().left, top: canvas.getBoundingClientRect().top, width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height } : null };
  });
  if (!before.canvas) throw new Error("authoring canvas is missing");
  const dragX = before.canvas.left + before.canvas.width * 0.5;
  const dragY = before.canvas.top + before.canvas.height * 0.5;
  await page.mouse.move(dragX, dragY);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(dragX + 180, dragY - 75, { steps: 12 });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ camera: window.vexeaMapAuthoring.camera.position.toArray(), controlsEnabled: window.vexeaMapAuthoring.controls.enabled, perspective: !window.vexeaMapAuthoring.orthographicBlockoutMode }));
  report.cameraBefore = before.camera;
  report.cameraAfter = after.camera;
  report.canvas = before.canvas;
  report.controlsEnabled = before.controlsEnabled && after.controlsEnabled;
  report.perspective = before.perspective && after.perspective;
  report.cameraChanged = before.camera.some((value, index) => Math.abs(value - after.camera[index]) > 0.001);
  report.valid = report.controlsEnabled && report.perspective && report.cameraChanged && errors.length === 0;
} catch (error) {
  errors.push(String(error));
}
report.errors = errors;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;
await browser.close();
