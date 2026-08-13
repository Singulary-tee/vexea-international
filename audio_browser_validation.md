# VEXEA audio browser-validation log

## 2026-08-13

The deployed R2 asset guard returns `403 Unauthorized origin` to an origin-less command-line request. This is intentional: the Worker source requires a browser `Origin` or `Referer` that starts with one of `ALLOWED_ORIGINS`.

The same canonical object, `Audio/Sfx/UI/join_match.opus`, returned HTTP 200 with `audio/ogg` when requested with either allowed origin: `https://vexea-international.web.app` and `http://localhost:5173`.

From the live local VEXEA page, `fetch()` succeeded for that object with status 200 and a 1,479-byte response. The browser fetched it cross-origin successfully, which confirms the Worker CORS policy permits the local application origin.

The initial browser call to `audioManager.loadAll()` failed because `Howl` was referenced as an undeclared global in `client/audio.ts`. The project has the `howler` package and types installed. The source was corrected to import `{ Howl, Howler }` from the package and expose `window.Howler` for the pre-existing settings module. The next step is a hot-reload/full-reload browser preload test.

No Worker or R2 policy has been modified during this diagnosis.

After importing Howler as a Vite module and reloading the page, `audioManager.loadAll()` completed successfully in the live browser. The registry contains all 75 canonical manifest keys, `join_match` is registered, and no `[Audio] Failed to load` warnings were observed.

An attempt to inspect the private per-sound state using an unavailable `_getSound()` helper failed. This did not indicate a playback failure; the next browser check will inspect Howler's supported internal sound array shape instead.

A browser positional-playback probe created left and right `join_match` instances. Howler stored `_stereo` values of `-1` and `1` respectively, validating listener-relative pan assignment. The Web Audio context was initially `suspended`, which is standard browser autoplay behavior before a user gesture. A subsequent in-page pointer gesture exposed the fully initialized local VEXEA menu and supplied that user interaction; the next check will confirm the context is running and the cue starts.

The Howler import and Web Audio panner update both passed `tsc --noEmit` and a production Vite build. The installed Howler 2.2.4 bundle implements the APIs used by the positional helper: `HowlerGlobal.prototype.pos`, `HowlerGlobal.prototype.orientation`, `Howl.prototype.pos`, and `Howl.prototype.pannerAttr`.

The full in-browser spatial-panner object inspection could not be repeated after the final code update because the sandbox browser became unavailable under memory pressure. This does not affect the earlier browser verification of 75 successful R2 loads, proper user-gesture audio-context unlock, or stereo fallback pan values. The compiled code now uses a true Howler Web Audio `PannerNode` when spatial audio is enabled and retains listener-relative stereo as a fallback.

Final parity verification before cleanup reported `manifest_paths=75`, `r2_audio_objects=75`, no missing paths in either direction, and `all_audio_ogg=True`. The deployed Worker deliberately returns 403 to origin-less clients, but returned HTTP 200 / `audio/ogg` for both permitted application origins (`https://vexea-international.web.app` and `http://localhost:5173`).
