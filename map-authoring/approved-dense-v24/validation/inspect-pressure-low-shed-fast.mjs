import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = '/home/ubuntu/vexea-international';
const outputDir = path.join(root, 'client/map-authoring-output/pressure-plant-captures/diagnostics');
const mode = process.argv[2] ?? 'normal';
const highlight = mode === 'highlight' || mode === 'only' || mode === 'bays';
const onlyShed = mode === 'only' || mode === 'bays';
const baysOnly = mode === 'bays';
fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 828, height: 603 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text().slice(0, 500)}`); });
page.on('pageerror', (error) => errors.push(`pageerror: ${String(error).slice(0, 500)}`));
try {
  await page.goto('http://127.0.0.1:3000/map-authoring.html?presentation=1&full=1&slice=pressure_plant&camera=pressure_midroute_player&headless=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.vexeaMapAuthoring?.scene && window.vexeaMapAuthoring?.camera), null, { timeout: 90000 });
  await page.waitForFunction(() => Boolean(window.vexeaMapAuthoring?.scene?.getObjectByName('slice_pressure_low_service_shed')), null, { timeout: 90000 });
  const report = await page.evaluate(() => {
    const api = window.vexeaMapAuthoring;
    const shed = api.scene.getObjectByName('slice_pressure_low_service_shed');
    const entries = [];
    shed.traverse((object) => {
      if (object === shed || !object.isMesh) return;
      const record = object.userData?.authoringRecord ?? {};
      const world = object.getWorldPosition(new object.position.constructor());
      let effectiveVisible = object.visible; let ancestorSuppressed = false; let parent = object.parent; while (parent) { effectiveVisible = effectiveVisible && parent.visible; if (parent.userData?.presentationSuppressed === true) ancestorSuppressed = true; parent = parent.parent; } entries.push({ name: object.name, visible: object.visible, effectiveVisible, ancestorSuppressed, role: record.role ?? null, materialFamily: record.materialFamily ?? null, world: world.toArray(), local: object.position.toArray(), parent: object.parent?.name ?? null });
    });
    const isBayRole = (role) => role?.includes('camera_dock_bay') || role?.includes('camera_west_service_bay');
    return { shedVisible: shed.visible, shedWorld: shed.getWorldPosition(new shed.position.constructor()).toArray(), meshCount: entries.length, bayEntries: entries.filter((entry) => isBayRole(entry.role)), entries: entries.slice(0, 260), errors: window.__pressureCaptureErrors ?? [] };
  });
  await page.evaluate((settings) => { const { shouldHighlight, onlyShed, baysOnly } = settings; for (const id of ['topbar', 'side-panel', 'status-panel', 'selection-reticle', 'boot-veil']) { const element = document.getElementById(id); if (element) element.style.display = 'none'; } const wrap = document.getElementById('canvas-wrap'); if (wrap) { wrap.style.position = 'fixed'; wrap.style.inset = '0'; wrap.style.width = '828px'; wrap.style.height = '603px'; } const canvas = document.getElementById('authoring-canvas'); if (canvas) { canvas.style.position = 'fixed'; canvas.style.inset = '0'; canvas.style.width = '828px'; canvas.style.height = '603px'; } const api = window.vexeaMapAuthoring; const sliceRoot = api.scene.getObjectByName('pressure_plant_slice_v1'); const shedRoot = api.scene.getObjectByName('slice_pressure_low_service_shed'); if (sliceRoot) sliceRoot.visible = true; if (shedRoot) shedRoot.visible = true; if (onlyShed) api.scene.background = null; api.camera.aspect = 828 / 603; api.camera.updateProjectionMatrix(); api.renderer.setPixelRatio(1); api.renderer.setSize(828, 603, false); if (onlyShed) { api.scene.traverse((object) => { if (object === api.scene || object === api.scene.getObjectByName('pressure_plant_slice_v1') || object === api.scene.getObjectByName('slice_pressure_low_service_shed')) return; if (object.isMesh) object.visible = false; }); } if (shouldHighlight) { const shed = api.scene.getObjectByName('slice_pressure_low_service_shed');       const isBayRole = (role) => role.includes('camera_dock_bay') || role.includes('camera_west_service_bay'); shed?.traverse((object) => { if (!object.isMesh) return; const role = object.userData?.authoringRecord?.role ?? ''; const isBay = isBayRole(role); object.visible = baysOnly ? isBay : true; const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => { material.color?.set(isBay ? 0xff1a00 : 0x4d7e83); material.map = null; material.normalMap = null; material.roughnessMap = null; material.emissive?.set(isBay ? 0x220000 : 0x001016); material.emissiveIntensity = isBay ? 0.4 : 0.12; material.transparent = false; material.opacity = 1; material.needsUpdate = true; }); }); } api.renderer.render(api.scene, api.camera); }, { shouldHighlight: highlight, onlyShed, baysOnly });
  const postIsolation = await page.evaluate(() => { const shed = window.vexeaMapAuthoring.scene.getObjectByName('slice_pressure_low_service_shed'); let visibleBays = 0; shed?.traverse((object) => { const role = object.userData?.authoringRecord?.role ?? ''; const isBay = role.includes('camera_dock_bay') || role.includes('camera_west_service_bay'); if (object.isMesh && object.visible && isBay) visibleBays += 1; }); return { shedVisible: Boolean(shed?.visible), visibleBays }; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, mode === 'bays' ? 'pressure_low_shed_bays-only-highlight.png' : mode === 'only' ? 'pressure_low_shed_only-highlight.png' : highlight ? 'pressure_low_shed_bay-highlight.png' : 'pressure_low_shed_fast.png'), fullPage: false, timeout: 90000 });
  report.postIsolation = postIsolation;
  fs.writeFileSync(path.join(outputDir, 'pressure_low_shed_fast.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
