import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = "/home/ubuntu/vexea-international";
const outputPath = process.argv[2] ?? path.join(root, "client/map-authoring-output/pressure-plant-captures/approved-dense-blockout-structure-v2718.json");
const url = process.argv[3] ?? "http://127.0.0.1:3000/map-authoring.html?blockout=1&view=top&tags=0&xray=1&volumes=1";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${String(error).slice(0, 600)}`));
page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text().slice(0, 600)}`); });
try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.vexeaMapAuthoring?.blockoutElements && window.vexeaMapAuthoring?.scene), null, { timeout: 90000 });
  const report = await page.evaluate(() => {
    const api = window.vexeaMapAuthoring;
    const records = api.blockoutElements ?? [];
    const visibleIds = new Set();
    api.scene.traverse((object) => {
      if (!object.userData?.blockoutMesh || !object.userData?.authoringRecord) return;
      let parent = object;
      let visible = true;
      while (parent) { if (!parent.visible) visible = false; parent = parent.parent; }
      if (visible) visibleIds.add(object.userData.authoringRecord.id);
    });
    const failures = [];
    const ids = new Set();
    const requiredKinds = new Set(["BUILDING_MASS", "SURFACE_SEGMENT", "ROUTE_SEGMENT", "COVER", "TERRAIN_SEGMENT", "AIR_ACCESS", "GROUND_DEPLOYMENT", "KILL_ZONE", "CAMERA_SECTOR", "PLAYER_SPAWN"]);
    for (const record of records) {
      if (ids.has(record.id)) failures.push(`${record.id}: duplicate id`);
      ids.add(record.id);
      if (!record.tags?.includes("APPROVED_DENSE_BLOCKOUT")) failures.push(`${record.id}: missing APPROVED_DENSE_BLOCKOUT tag`);
      if (!record.name || !record.replaceWith || !record.category) failures.push(`${record.id}: missing name/category/replacement`);
      if (![record.x, record.y, record.z, record.sizeX, record.height, record.sizeZ].every(Number.isFinite)) failures.push(`${record.id}: non-finite dimensions`);
      if (record.kind === "ROUTE_SEGMENT" && record.category === "approved-dense-route" && (!record.points || record.points.length < 2)) failures.push(`${record.id}: route has no point chain`);
      if (!visibleIds.has(record.id)) failures.push(`${record.id}: no visible emitted mesh`);
    }
    for (const kind of requiredKinds) if (!records.some((record) => record.kind === kind)) failures.push(`missing required kind ${kind}`);
    const approximateOverlapPairs = [];
    const solids = records.filter((record) => ["BUILDING_MASS", "SURFACE_SEGMENT", "COVER", "TERRAIN_SEGMENT"].includes(record.kind) && record.height > 0.5);
    for (let i = 0; i < solids.length; i += 1) for (let j = i + 1; j < solids.length; j += 1) {
      const a = solids[i]; const b = solids[j];
      const overlapX = Math.min(a.x + a.sizeX / 2, b.x + b.sizeX / 2) - Math.max(a.x - a.sizeX / 2, b.x - b.sizeX / 2);
      const overlapZ = Math.min(a.z + a.sizeZ / 2, b.z + b.sizeZ / 2) - Math.max(a.z - a.sizeZ / 2, b.z - b.sizeZ / 2);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (overlapX > 2 && overlapZ > 2 && overlapY > 0.6 && a.kind === "BUILDING_MASS" && b.kind === "BUILDING_MASS") approximateOverlapPairs.push([a.id, b.id]);
    }
    return { url: window.location.href, recordCount: records.length, visibleRecordCount: visibleIds.size, kinds: [...new Set(records.map((record) => record.kind))], approximateBuildingOverlapPairs: approximateOverlapPairs, failures, orthographic: Boolean(api.orthographicBlockoutMode), controlsEnabled: Boolean(api.controls?.enabled) };
  });
  report.errors = errors;
  report.pass = report.failures.length === 0 && report.errors.length === 0 && report.orthographic && report.controlsEnabled;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, ...report }, null, 2));
  if (!report.pass) process.exitCode = 1;
} finally { await browser.close(); }
