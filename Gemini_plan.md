completed a thorough analysis of the Sentry reports, tracing the exact root causes in the codebase. Here is the concrete, file-by-file evidence and the detailed implementation plans for each issue. No code files have been modified.
Plan 1: Fix N+1 HTTP Client Spans on Page Load (Issue ID: 7654543796)
🔍 Root Cause & Evidence
Sentry's automatic browserTracingIntegration instruments all browser XMLHttpRequests and fetch requests, recording them as client spans. When preloading and loading local assets via blob: object URLs, browser file fetches are triggered for these local URLs. Sentry intercepts these local blob: URL fetches, recording dozens of redundant client span records (N+1) on initial page load.
Exact Code Evidence (from /client/sentry.ts lines 66–79):
code
TypeScript
Sentry.init({
    dsn,
    // Tracing
    tracesSampleRate,
    tracePropagationTargets: ["localhost", /^https:\/\/[^/]+\/api/],
    // Profiling
    profileSessionSampleRate: enableProfiling ? 1.0 : 0,
    profilesSampleRate: enableProfiling ? 1.0 : 0,
    // Replays
    replaysSessionSampleRate: enableReplay ? 0.1 : 0,
    replaysOnErrorSampleRate: enableReplay ? 1.0 : 0,
    environment: (import.meta as any).env?.MODE || "development",
    release: (import.meta as any).env?.VITE_RELEASE || "vexea@0.1.0",
    integrations,
📋 Action Plan
Add a custom beforeBreadcrumb handler inside Sentry.init to filter out any network breadcrumbs referencing local blob: URLs:
code
TypeScript
beforeBreadcrumb(breadcrumb) {
  if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
    if (breadcrumb.data && typeof breadcrumb.data.url === "string" && breadcrumb.data.url.startsWith("blob:")) {
      return null; // Ignore local blob fetches
    }
  }
  return breadcrumb;
}
Refine the tracePropagationTargets array to strictly enforce that tracing is applied only to actual back-end APIs.
Plan 2: Suppress Benign Vite Dev Server WebSocket Failures (Issue ID: 7651208332 / 7651242662)
🔍 Root Cause & Evidence
In our sandboxed preview frame, Vite's Hot Module Replacement (HMR) WebSocket attempts to connect to the dev server port, which is blocked or disabled. This raises benign console connection warnings. Because Sentry is configured to catch all console errors, these are sent as exceptions.
Exact Code Evidence (from /client/sentry.ts lines 43–46):
code
TypeScript
const integrations: any[] = [
    Sentry.captureConsoleIntegration({
      levels: ["error"],
    }),
📋 Action Plan
Inject the standard ignoreErrors option directly into Sentry.init inside /client/sentry.ts to filter out these known WebSocket warnings:
code
TypeScript
ignoreErrors: [
  "failed to connect to websocket",
  "WebSocket closed without opened.",
  "[vite] failed to connect to websocket"
],
Plan 3: Fix THREE.GLTFLoader Embedded/KTX2 Texture Loading Failures (Issue ID: 7651238115)
🔍 Root Cause & Evidence
There are two distinct root causes contributing to the "Couldn't load texture" failures for our optimized GLB weapon models (like scar_l-optimized.glb):
Pseudo-Blob Relative Path Resolution:
When loading a GLB model from a cache-derived blob: URL, GLTFLoader resolves any sub-resources (like external textures) relative to that base URL. This constructs pseudo-blob URLs like blob:https://.../textures/weapons_dif.png.
Our custom URL modifier immediately short-circuits any URL starting with "blob:", returning it unchanged instead of parsing the actual filename and mapping it to the cached texture URL in blobUrlMap.
Exact Code Evidence (from /client/asset-cache.ts lines 718–724):
code
TypeScript
manager.setURLModifier((url: string) => {
    let resolvedUrl = existingModifier ? existingModifier(url) : url;

    // Direct blob: object URLs (e.g. textures extracted from embedded GLB buffers) are passed directly
    if (resolvedUrl.startsWith("blob:")) {
      return resolvedUrl;
    }
KTX2 Transcoder Hardware Detection Race Condition:
Our optimized models use KTX2/Basis texture compression. To load them, KTX2Loader must run detectSupport(renderer). However, createConfiguredGLTFLoader() is called in StudioCharacterPreview.ts with no renderer argument. It looks up (window as any).renderer, but because the asynchronous await renderer.init() in main.ts is still executing, (window as any).renderer is undefined. KTX2 hardware support detection is bypassed, leading to loading failure.
Exact Code Evidence (from /client/StudioCharacterPreview.ts line 351):
code
TypeScript
// 2. Load the optimized SCAR-L GLB model
    const loader = createConfiguredGLTFLoader();
Exact Code Evidence (from /client/main.ts lines 801–808):
code
TypeScript
renderer = new THREE.WebGPURenderer({
      canvas: canvasElement,
      antialias: true,
      powerPreference: "high-performance",
    });
    await renderer.init();
    (window as any).renderer = renderer;
📋 Action Plan
Refine URL Modifier Short-Circuit:
Modify the resolvedUrl.startsWith("blob:") check in /client/asset-cache.ts so it does not short-circuit if the URL represents a relative texture lookup (i.e. contains an image file extension). This allows it to fall through to extract the filename and fetch the correct cached texture from blobUrlMap:
code
TypeScript
if (resolvedUrl.startsWith("blob:")) {
  const lower = resolvedUrl.toLowerCase();
  const isRelativeTextureLookup = lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".ktx2") || lower.endsWith(".dds") || lower.endsWith(".tga");
  if (!isRelativeTextureLookup) {
    return resolvedUrl;
  }
}
Fix Renderer Initialization Race:
In /client/main.ts, assign the (window as any).renderer = renderer reference synchronously before yielding to await renderer.init() so that concurrent preloading systems can immediately access the renderer instance.
Pass Active Renderer to GLTF Factory:
In /client/StudioCharacterPreview.ts (line 351), explicitly locate and pass the renderer instance to createConfiguredGLTFLoader:
code
TypeScript
const activeRenderer = (window as any).renderer || (window as any).W?.renderer;
const loader = createConfiguredGLTFLoader(undefined, activeRenderer);
Please let me know if you approve this set of plans, and I will begin the implementation directly.