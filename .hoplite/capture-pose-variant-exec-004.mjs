import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const query = process.argv[2] || 'item=rifle&view=first&backend=webgl';
const output = process.argv[3] || '.hoplite/artifacts/pose-editor-capture.png';
const viewport = { width: 1280, height: 720 };
const args = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--enable-webgl',
];

function snapshotReady(snapshot) {
  return Boolean(
    snapshot.readout
      && snapshot.state
      && snapshot.state.item
      && snapshot.state.view
      && snapshot.state.backend,
  );
}

async function readSnapshot(page) {
  return page.evaluate(() => {
    const state = window.__poseEditorState || null;
    return {
      readout: document.querySelector('#pose-readout')?.textContent?.trim() || '',
      status: document.querySelector('#pose-status')?.textContent?.trim() || '',
      state: state ? {
        item: state.item || null,
        view: state.view || null,
        backend: state.backend || null,
        modelKey: state.modelKey || null,
        result: Boolean(state.result),
      } : null,
    };
  });
}

async function readRenderPresence(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#pose-canvas');
    const canvasRect = canvas?.getBoundingClientRect();
    const canvasStyle = canvas ? getComputedStyle(canvas) : null;
    const canvasVisible = Boolean(
      canvas
        && canvasRect
        && canvasRect.width > 0
        && canvasRect.height > 0
        && canvasStyle?.display !== 'none'
        && canvasStyle?.visibility !== 'hidden'
        && Number(canvasStyle?.opacity || 1) > 0,
    );
    const svg = document.querySelector('svg[aria-label="Rendered player and held item pose"]');
    const svgRect = svg?.getBoundingClientRect();
    const svgStyle = svg ? getComputedStyle(svg) : null;
    const renderedSvg = Boolean(
      svg
        && svgRect
        && svgRect.width > 0
        && svgRect.height > 0
        && svgStyle?.display !== 'none'
        && svgStyle?.visibility !== 'hidden'
        && Number(svgStyle?.opacity || 1) > 0
        && svg.childElementCount > 0
        && svg.querySelector('path, line, circle, polygon, polyline'),
    );
    return {
      canvasVisible,
      canvas: canvas ? {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        rectWidth: canvasRect?.width || 0,
        rectHeight: canvasRect?.height || 0,
      } : null,
      renderedSvg,
      renderedSvgChildCount: svg?.childElementCount || 0,
      renderPresent: canvasVisible || renderedSvg,
    };
  });
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
  const glbResponses = [];
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
  page.on('response', async (response) => {
    if (!/\.glb(?:\?|$)/i.test(response.url())) return;
    glbResponses.push({
      url: response.url(),
      status: response.status(),
      contentType: response.headers()['content-type'] || '',
    });
  });

  let navigationError = null;
  let snapshot = { readout: '', status: '', state: null };
  let stateWaitTimedOut = false;
  let renderPresence = null;
  let renderPresenceError = null;
  let screenshotTaken = false;
  let screenshotError = null;
  const startedAt = Date.now();

  try {
    await mkdir(dirname(output), { recursive: true });
    try {
      await page.goto(`http://127.0.0.1:3000/pose-editor.html?${query}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    } catch (error) {
      navigationError = error instanceof Error ? error.stack || error.message : String(error);
    }

    const waitDeadline = Date.now() + 30000;
    while (Date.now() < waitDeadline) {
      try {
        snapshot = await readSnapshot(page);
      } catch (error) {
        navigationError ||= error instanceof Error ? error.stack || error.message : String(error);
      }
      if (snapshotReady(snapshot)) break;
      await page.waitForTimeout(100);
    }
    stateWaitTimedOut = !snapshotReady(snapshot);

    try {
      renderPresence = await readRenderPresence(page);
    } catch (error) {
      renderPresenceError = error instanceof Error ? error.stack || error.message : String(error);
    }

    try {
      await page.screenshot({ path: output, fullPage: false });
      screenshotTaken = true;
    } catch (error) {
      screenshotError = error instanceof Error ? error.stack || error.message : String(error);
    }

    await page.waitForTimeout(250);
    const finalSnapshot = await readSnapshot(page).catch(() => snapshot);
    const finalRenderPresence = await readRenderPresence(page).catch(() => renderPresence);
    const result = {
      query,
      expected: { item: expectedItem, view: expectedView },
      output,
      ready: Boolean(
        screenshotTaken
          && snapshotReady(finalSnapshot)
          && finalRenderPresence?.renderPresent
          && finalSnapshot.state?.item === expectedItem
          && finalSnapshot.state?.view === expectedView,
      ),
      screenshotTaken,
      screenshotMode: 'page.screenshot(fullPage:false)',
      stateWaitTimedOut,
      elapsedMs: Date.now() - startedAt,
      activeRenderer: finalSnapshot.state?.backend || null,
      readout: finalSnapshot.readout,
      status: finalSnapshot.status,
      state: finalSnapshot.state,
      renderPresence: finalRenderPresence,
      navigationError,
      renderPresenceError,
      screenshotError,
      pageErrors,
      consoleIssues,
      requestFailures,
      glbResponses,
      url: page.url(),
    };
    console.log(JSON.stringify(result, null, 2));
    if (!result.ready) process.exitCode = 1;
  } catch (error) {
    let fallbackScreenshotError = null;
    try {
      await page.screenshot({ path: output, fullPage: false });
      screenshotTaken = true;
    } catch (screenshotFailure) {
      fallbackScreenshotError = screenshotFailure instanceof Error
        ? screenshotFailure.stack || screenshotFailure.message
        : String(screenshotFailure);
    }
    console.log(JSON.stringify({
      query,
      output,
      ready: false,
      screenshotTaken,
      screenshotMode: 'page.screenshot(fullPage:false)',
      activeRenderer: snapshot.state?.backend || null,
      readout: snapshot.readout,
      status: snapshot.status,
      state: snapshot.state,
      renderPresence,
      navigationError,
      renderPresenceError,
      screenshotError: screenshotError || fallbackScreenshotError,
      error: error instanceof Error ? error.stack || error.message : String(error),
      pageErrors,
      consoleIssues,
      requestFailures,
      glbResponses,
      url: page.url(),
    }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

await main();
