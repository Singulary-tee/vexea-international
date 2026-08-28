import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = "/home/ubuntu/vexea-international";
const outputPath = process.argv[2] ?? path.join(root, "client/map-authoring-output/pressure-plant-captures/approved-dense-orbit-v2796.json");
const url = process.argv[3] ?? "http://127.0.0.1:3000/map-authoring.html?approvedDense=1&view=perspective&framing=dense_focus&slice=off&denseDetail=1&denseSky=1&denseTrees=1&denseOccupancy=1&densePiping=1&denseMaterials=1&densePbr=1&solid=1";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text().slice(0, 600)}`); });
page.on("pageerror", (error) => errors.push(`pageerror: ${String(error).slice(0, 600)}`));
const report = { url, errors, cameraBefore: null, cameraAfter: null, controlsEnabled: false, perspective: false, orbitMethodPresent: false, valid: false };
try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.vexeaMapAuthoring?.scene && window.vexeaMapAuthoring?.camera && window.vexeaMapAuthoring?.controls), null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  const result = await page.evaluate(() => {
    const api = window.vexeaMapAuthoring;
    const before = api.camera.position.toArray();
    const controls = api.controls;
    const methodPresent = typeof controls.rotateLeft === "function";
    if (methodPresent) {
      controls.rotateLeft(0.35);
      controls.update();
    }
    const after = api.camera.position.toArray();
    return { before, after, enabled: controls.enabled, perspective: !api.orthographicBlockoutMode, methodPresent };
  });
  report.cameraBefore = result.before;
  report.cameraAfter = result.after;
  report.controlsEnabled = result.enabled;
  report.perspective = result.perspective;
  report.orbitMethodPresent = result.methodPresent;
  report.cameraChanged = result.before.some((value, index) => Math.abs(value - result.after[index]) > 0.001);
  report.valid = report.controlsEnabled && report.perspective && report.orbitMethodPresent && report.cameraChanged && errors.length === 0;
} catch (error) {
  errors.push(String(error));
}
report.errors = errors;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (!report.valid) process.exitCode = 1;
