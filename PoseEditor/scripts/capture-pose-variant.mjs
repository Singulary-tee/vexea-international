import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const query = process.argv[2] || 'item=rifle&view=first&backend=webgl';
const output = process.argv[3] || '.hoplite/artifacts/pose-editor-capture.png';
const viewport = { width: 1280, height: 720 };
const args = [
  '--use-gl=egl',
  '--disable-gpu-sandbox',
  '--disable-dev-shm-usage',
  '--no-sandbox',
];

function loadedSnapshot(snapshot, expectedItem, expectedView) {
  return Boolean(
    snapshot.readout
      && /^asset=.+$/m.test(snapshot.readout)
      && /^player=.+$/m.test(snapshot.readout)
      && new RegExp(`^view=${expectedView} backend=(webgpu|webgl2)$`, 'm').test(snapshot.readout)
      && /^pose=(VERIFIED|REJECTED|ALIGNED)(?:\s|$)/m.test(snapshot.readout)
      && snapshot.state?.item === expectedItem
      && snapshot.state?.view === expectedView
      && typeof snapshot.state.modelKey === 'string'
      && snapshot.state.modelKey.endsWith('.glb')
      && snapshot.state.result
      && snapshot.status
      && !/^(Loading|Pose load failed|Initializing)/i.test(snapshot.status),
  );
}

async function readSnapshot(page) {
  return page.evaluate(() => ({
    readout: document.querySelector('#pose-readout')?.textContent?.trim() || '',
    status: document.querySelector('#pose-status')?.textContent?.trim() || '',
    state: window.__poseEditorState || null,
  }));
}

async function analyzeCanvas(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const background = data.length >= 3 ? [data[0], data[1], data[2]] : [0, 0, 0];
  let minChannel = 255;
  let maxChannel = 0;
  let contentPixels = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    minChannel = Math.min(minChannel, red, green, blue);
    maxChannel = Math.max(maxChannel, red, green, blue);
    if (Math.max(
      Math.abs(red - background[0]),
      Math.abs(green - background[1]),
      Math.abs(blue - background[2]),
    ) > 8) contentPixels += 1;
  }
  const contentFraction = pixelCount > 0 ? contentPixels / pixelCount : 0;
  return {
    width: info.width,
    height: info.height,
    background,
    contentFraction,
    channelRange: maxChannel - minChannel,
    nonBlank: pixelCount > 0 && contentFraction >= 0.01 && maxChannel - minChannel >= 16,
  };
}

async function main() {
  const params = new URLSearchParams(query);
  const expectedItem = params.get('item') || 'rifle';
  const expectedView = params.get('view') === 'first' ? 'first' : 'third';
  const browser = await chromium.launch({ headless: true, args });
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  const consoleIssues = [];
  const requestFailures = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' || /device\s+lost|webgl.*lost|context.*lost/i.test(text)) {
      consoleIssues.push({ type: message.type(), text });
    }
  });
  page.on('requestfailed', (request) => requestFailures.push({
    url: request.url(),
    failure: request.failure()?.errorText || 'unknown request failure',
  }));

  try {
    await mkdir(dirname(output), { recursive: true });
    await page.goto(`http://127.0.0.1:3000/pose-editor.html?${query}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    let snapshot = await readSnapshot(page);
    for (let attempt = 0; attempt < 240 && !loadedSnapshot(snapshot, expectedItem, expectedView); attempt += 1) {
      await page.waitForTimeout(100);
      snapshot = await readSnapshot(page);
    }
    snapshot = await readSnapshot(page);

    const canvas = page.locator('#pose-canvas');
    const dimensions = await canvas.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        width: element.width,
        height: element.height,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        rectWidth: rect.width,
        rectHeight: rect.height,
      };
    });

    await page.evaluate(() => {
      for (const selector of ['#pose-readout', '#pose-loading']) {
        const element = document.querySelector(selector);
        if (element) element.style.visibility = 'hidden';
      }
    });
    const canvasBuffer = await canvas.screenshot();
    const canvasPixels = await analyzeCanvas(canvasBuffer);
    await page.evaluate(() => {
      for (const selector of ['#pose-readout', '#pose-loading']) {
        const element = document.querySelector(selector);
        if (element) element.style.visibility = '';
      }
    });
    await page.screenshot({ path: output, fullPage: false });

    const dimensionMatch = canvasPixels.width === Math.round(dimensions.rectWidth)
      && canvasPixels.height === Math.round(dimensions.rectHeight);
    const validation = {
      readout: loadedSnapshot(snapshot, expectedItem, expectedView),
      state: Boolean(snapshot.state?.item && snapshot.state?.modelKey && snapshot.state?.result),
      canvasDimensions: Boolean(
        dimensions.width > 0
          && dimensions.height > 0
          && dimensions.clientWidth > 0
          && dimensions.clientHeight > 0
          && dimensionMatch,
      ),
      canvasContent: canvasPixels.nonBlank,
      noPageErrors: pageErrors.length === 0,
      noConsoleIssues: consoleIssues.length === 0,
      noRequestFailures: requestFailures.length === 0,
    };
    const ready = Object.values(validation).every(Boolean);
    console.log(JSON.stringify({
      query,
      output,
      ready,
      validation,
      canvas: { dimensions, pixels: canvasPixels },
      readout: snapshot.readout,
      status: snapshot.status,
      state: snapshot.state ? {
        item: snapshot.state.item,
        view: snapshot.state.view,
        backend: snapshot.state.backend,
        modelKey: snapshot.state.modelKey,
      } : null,
      pageErrors,
      consoleIssues,
      requestFailures,
      url: page.url(),
    }, null, 2));
    if (!ready) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({
      query,
      output,
      ready: false,
      error: error instanceof Error ? error.stack || error.message : String(error),
      pageErrors,
      consoleIssues,
      requestFailures,
      url: page.url(),
    }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

await main();
