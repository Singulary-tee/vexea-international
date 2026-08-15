import { DS } from "../design-system";
import { AUDIO_MANIFEST, AudioManifestEntry } from "../audio-manifest";
import { audioManager } from "../audio";
import { IS_DEV } from "../../shared/gates/production.gate";
import * as screenManager from "./screen-manager";

let devAudioScreenEl: HTMLElement | null = null;
let currentPlayingKey: string | null = null;
let currentHowlInstance: any = null;
let activeCategoryFilter: string = "ALL";
let searchQuery: string = "";

/**
 * Stops any currently playing audio in the dev audio screen
 * and updates UI buttons accordingly.
 */
export function stopDevAudio(): void {
  if (currentHowlInstance) {
    try {
      currentHowlInstance.stop();
      currentHowlInstance.off("end");
    } catch (e) {
      console.warn("[DevAudio] Error stopping howl instance:", e);
    }
    currentHowlInstance = null;
  }

  if (currentPlayingKey) {
    const prevKey = currentPlayingKey;
    currentPlayingKey = null;
    updateSampleCardState(prevKey);
  }
}

/**
 * Helper to update the button and status UI for a specific audio sample card.
 */
function updateSampleCardState(key: string): void {
  if (!devAudioScreenEl) return;
  const cardEl = devAudioScreenEl.querySelector(`[data-sample-key="${key}"]`);
  if (!cardEl) return;

  const playBtn = cardEl.querySelector(".dev-audio-play-btn") as HTMLElement;
  const statusEl = cardEl.querySelector(".dev-audio-status") as HTMLElement;

  const isPlaying = currentPlayingKey === key;

  if (playBtn) {
    playBtn.textContent = isPlaying ? "STOP" : "PLAY";
    playBtn.style.background = isPlaying ? "#FF3333" : DS.colors.accent;
    playBtn.style.color = isPlaying ? "#FFFFFF" : DS.colors.background;
  }

  if (statusEl) {
    statusEl.textContent = isPlaying ? "PLAYING" : "READY";
    statusEl.style.color = isPlaying ? "#00FF66" : "rgba(255, 255, 255, 0.4)";
  }
}

/**
 * Plays a specific audio sample by key.
 * Handles stopping previous audio (Condition 3) and handling sample end (Condition 1).
 */
async function playSample(entry: AudioManifestEntry): Promise<void> {
  const targetKey = entry.key;

  // Condition 2 / Condition 3: If playing same sample, stop it
  if (currentPlayingKey === targetKey) {
    stopDevAudio();
    return;
  }

  // Condition 3: If playing a different sample, stop previous first
  if (currentPlayingKey) {
    stopDevAudio();
  }

  // Ensure audio entry is loaded in audioManager
  if (!audioManager.sounds[targetKey]) {
    const statusEl = devAudioScreenEl?.querySelector(`[data-sample-key="${targetKey}"] .dev-audio-status`) as HTMLElement;
    if (statusEl) {
      statusEl.textContent = "LOADING...";
      statusEl.style.color = "#FFCC00";
    }
    try {
      await (audioManager as any).loadEntries([entry]);
    } catch (err) {
      console.error(`[DevAudio] Failed to load sound ${targetKey}:`, err);
      if (statusEl) {
        statusEl.textContent = "ERROR";
        statusEl.style.color = "#FF3333";
      }
      return;
    }
  }

  const howl = audioManager.sounds[targetKey];
  if (!howl) {
    console.warn(`[DevAudio] Howl instance for ${targetKey} not found after load.`);
    return;
  }

  currentPlayingKey = targetKey;
  currentHowlInstance = howl;
  updateSampleCardState(targetKey);

  // Set up end callback (Condition 1: Sample ends)
  howl.once("end", () => {
    if (currentPlayingKey === targetKey) {
      currentHowlInstance = null;
      currentPlayingKey = null;
      updateSampleCardState(targetKey);
    }
  });

  // Force rate and volume for clear auditioning
  howl.rate(1.0);
  const s = (window as any).vexeaSettings;
  if (s) {
    howl.volume(1.0);
  }

  try {
    howl.play();
  } catch (err) {
    console.error(`[DevAudio] Error playing sample ${targetKey}:`, err);
    stopDevAudio();
  }
}

/**
 * Renders or updates the sample list items based on active category filter and search query.
 */
function renderSampleList(containerEl: HTMLElement): void {
  containerEl.innerHTML = "";

  // Dynamically filter existing audio from AUDIO_MANIFEST
  const filtered = AUDIO_MANIFEST.filter((entry) => {
    const matchesCategory =
      activeCategoryFilter === "ALL" ||
      entry.category.toUpperCase() === activeCategoryFilter;

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      entry.key.toLowerCase().includes(q) ||
      entry.path.toLowerCase().includes(q) ||
      entry.category.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    const emptyEl = document.createElement("div");
    Object.assign(emptyEl.style, {
      padding: "2.0rem",
      textAlign: "center",
      color: "rgba(255, 255, 255, 0.4)",
      fontFamily: DS.typography.fontFamily,
      fontSize: "0.88rem",
      letterSpacing: "1px"
    });
    emptyEl.textContent = "NO AUDIO SAMPLES MATCH CURRENT FILTER";
    containerEl.appendChild(emptyEl);
    return;
  }

  filtered.forEach((entry) => {
    const card = document.createElement("div");
    card.setAttribute("data-sample-key", entry.key);
    Object.assign(card.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.63rem 0.88rem",
      backgroundColor: "rgba(20, 20, 20, 0.8)",
      border: `1px solid rgba(255, 255, 255, 0.08)`,
      borderRadius: "0px",
      gap: "0.75rem",
      transition: "background-color 0.15s ease, border-color 0.15s ease"
    });

    card.addEventListener("mouseenter", () => {
      card.style.backgroundColor = "rgba(35, 35, 35, 0.9)";
      card.style.borderColor = "rgba(255, 255, 255, 0.2)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.backgroundColor = "rgba(20, 20, 20, 0.8)";
      card.style.borderColor = "rgba(255, 255, 255, 0.08)";
    });

    // Left info column: Key Name, Path, Meta tags
    const infoCol = document.createElement("div");
    Object.assign(infoCol.style, {
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      flex: "1",
      minWidth: "0"
    });

    const keyTitle = document.createElement("div");
    keyTitle.textContent = entry.key;
    Object.assign(keyTitle.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: "0.94rem",
      fontWeight: "bold",
      color: "#FFFFFF",
      letterSpacing: "0.5px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    });

    const subInfo = document.createElement("div");
    Object.assign(subInfo.style, {
      display: "flex",
      alignItems: "center",
      gap: "0.50rem",
      fontSize: "0.69rem",
      fontFamily: DS.typography.fontFamily,
      color: "rgba(255, 255, 255, 0.5)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    });

    const pathSpan = document.createElement("span");
    pathSpan.textContent = entry.path;
    pathSpan.style.textOverflow = "ellipsis";
    pathSpan.style.overflow = "hidden";

    const catBadge = document.createElement("span");
    catBadge.textContent = entry.category.toUpperCase();
    Object.assign(catBadge.style, {
      background: "rgba(255, 255, 255, 0.1)",
      color: DS.colors.accent,
      padding: "1px 4px",
      fontSize: "0.63rem",
      fontWeight: "bold",
      letterSpacing: "0.5px",
      flexShrink: "0"
    });

    subInfo.appendChild(catBadge);

    if (entry.loop) {
      const loopBadge = document.createElement("span");
      loopBadge.textContent = "LOOP";
      Object.assign(loopBadge.style, {
        background: "rgba(0, 200, 255, 0.2)",
        color: "#00CCFF",
        padding: "1px 4px",
        fontSize: "0.63rem",
        fontWeight: "bold",
        letterSpacing: "0.5px",
        flexShrink: "0"
      });
      subInfo.appendChild(loopBadge);
    }

    subInfo.appendChild(pathSpan);
    infoCol.appendChild(keyTitle);
    infoCol.appendChild(subInfo);

    // Right action column: Status + Play/Stop button
    const actionCol = document.createElement("div");
    Object.assign(actionCol.style, {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      flexShrink: "0"
    });

    const isPlaying = currentPlayingKey === entry.key;

    const statusEl = document.createElement("div");
    statusEl.className = "dev-audio-status";
    statusEl.textContent = isPlaying ? "PLAYING" : "READY";
    Object.assign(statusEl.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: "0.69rem",
      fontWeight: "bold",
      color: isPlaying ? "#00FF66" : "rgba(255, 255, 255, 0.4)",
      letterSpacing: "1px",
      minWidth: "4.0rem",
      textAlign: "right"
    });

    const playBtn = document.createElement("button");
    playBtn.className = "dev-audio-play-btn";
    playBtn.textContent = isPlaying ? "STOP" : "PLAY";
    Object.assign(playBtn.style, {
      padding: "0.38rem 0.88rem",
      fontFamily: DS.typography.fontFamily,
      fontSize: "0.75rem",
      fontWeight: "bold",
      letterSpacing: "1px",
      border: "none",
      borderRadius: "0px",
      cursor: "pointer",
      background: isPlaying ? "#FF3333" : DS.colors.accent,
      color: isPlaying ? "#FFFFFF" : DS.colors.background,
      transition: "background 0.15s ease"
    });

    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      playSample(entry);
    });

    actionCol.appendChild(statusEl);
    actionCol.appendChild(playBtn);

    card.appendChild(infoCol);
    card.appendChild(actionCol);
    containerEl.appendChild(card);
  });
}

/**
 * Initializes the Dev Audio Screen DOM element if not already present.
 */
export function initDevAudio(): void {
  if (devAudioScreenEl) return;

  devAudioScreenEl = document.createElement("div");
  devAudioScreenEl.id = "dev-audio-screen";
  devAudioScreenEl.setAttribute("data-ui-surface", "true");
  devAudioScreenEl.classList.add("ui-surface");

  Object.assign(devAudioScreenEl.style, {
    position: "fixed",
    inset: "0",
    zIndex: "950",
    display: "none",
    backgroundColor: "rgba(10, 10, 10, 0.96)",
    color: "#FFFFFF",
    opacity: "0",
    transition: `opacity ${DS.transitions.panel}`,
    flexDirection: "column",
    overflow: "hidden"
  });

  // Header Bar
  const headerBar = document.createElement("div");
  Object.assign(headerBar.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 1.25rem",
    backgroundColor: "rgba(15, 15, 15, 0.95)",
    borderBottom: `1px solid ${DS.colors.accent}`,
    flexShrink: "0"
  });

  const headerTitleBox = document.createElement("div");
  Object.assign(headerTitleBox.style, {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem"
  });

  const titleText = document.createElement("div");
  titleText.textContent = "DEV AUDIO INSPECTOR";
  Object.assign(titleText.style, {
    fontFamily: DS.typography.fontFamilyWordmark,
    fontSize: "1.25rem",
    fontWeight: "bold",
    color: DS.colors.accent,
    letterSpacing: "2px"
  });

  const countBadge = document.createElement("div");
  countBadge.id = "dev-audio-count-badge";
  countBadge.textContent = `${AUDIO_MANIFEST.length} SAMPLES`;
  Object.assign(countBadge.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: "0.69rem",
    fontWeight: "bold",
    color: "#FFFFFF",
    background: "rgba(255, 255, 255, 0.12)",
    padding: "2px 8px",
    letterSpacing: "1px"
  });

  headerTitleBox.appendChild(titleText);
  headerTitleBox.appendChild(countBadge);

  const headerControls = document.createElement("div");
  Object.assign(headerControls.style, {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem"
  });

  const stopAllBtn = document.createElement("button");
  stopAllBtn.textContent = "STOP ALL AUDIO";
  Object.assign(stopAllBtn.style, {
    padding: "0.38rem 0.88rem",
    fontFamily: DS.typography.fontFamily,
    fontSize: "0.75rem",
    fontWeight: "bold",
    letterSpacing: "1px",
    border: `1px solid rgba(255, 50, 50, 0.6)`,
    background: "rgba(255, 0, 0, 0.15)",
    color: "#FF6666",
    cursor: "pointer"
  });
  stopAllBtn.addEventListener("click", () => stopDevAudio());

  const backBtn = document.createElement("button");
  backBtn.textContent = "BACK TO MENU";
  Object.assign(backBtn.style, {
    padding: "0.38rem 1.0rem",
    fontFamily: DS.typography.fontFamily,
    fontSize: "0.75rem",
    fontWeight: "bold",
    letterSpacing: "1px",
    border: "none",
    background: DS.colors.accent,
    color: DS.colors.background,
    cursor: "pointer"
  });
  backBtn.addEventListener("click", () => {
    stopDevAudio(); // Condition 4: Leaving dev audio screen stops audio
    screenManager.showMainMenu();
  });

  headerControls.appendChild(stopAllBtn);
  headerControls.appendChild(backBtn);

  headerBar.appendChild(headerTitleBox);
  headerBar.appendChild(headerControls);
  devAudioScreenEl.appendChild(headerBar);

  // Filter & Search Toolbar
  const toolbar = document.createElement("div");
  Object.assign(toolbar.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "0.75rem",
    padding: "0.63rem 1.25rem",
    backgroundColor: "rgba(18, 18, 18, 0.9)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    flexShrink: "0"
  });

  // Category Filter Tabs
  const categoryTabsContainer = document.createElement("div");
  Object.assign(categoryTabsContainer.style, {
    display: "flex",
    alignItems: "center",
    gap: "0.38rem"
  });

  const categories = ["ALL", "SFX", "UI", "MUSIC", "AMBIENT"];
  categories.forEach((cat) => {
    const tabBtn = document.createElement("button");
    tabBtn.textContent = cat;
    tabBtn.setAttribute("data-cat", cat);
    Object.assign(tabBtn.style, {
      padding: "0.25rem 0.63rem",
      fontFamily: DS.typography.fontFamily,
      fontSize: "0.69rem",
      fontWeight: "bold",
      letterSpacing: "1px",
      border: cat === activeCategoryFilter ? `1px solid ${DS.colors.accent}` : "1px solid rgba(255, 255, 255, 0.12)",
      background: cat === activeCategoryFilter ? DS.colors.accent : "transparent",
      color: cat === activeCategoryFilter ? DS.colors.background : "rgba(255, 255, 255, 0.7)",
      cursor: "pointer",
      transition: "all 0.15s ease"
    });

    tabBtn.addEventListener("click", () => {
      activeCategoryFilter = cat;
      categoryTabsContainer.querySelectorAll("button").forEach((btn) => {
        const bCat = btn.getAttribute("data-cat");
        const isActive = bCat === activeCategoryFilter;
        btn.style.background = isActive ? DS.colors.accent : "transparent";
        btn.style.color = isActive ? DS.colors.background : "rgba(255, 255, 255, 0.7)";
        btn.style.borderColor = isActive ? DS.colors.accent : "rgba(255, 255, 255, 0.12)";
      });
      renderSampleList(listContainer);
    });

    categoryTabsContainer.appendChild(tabBtn);
  });

  // Search Input Box
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "SEARCH AUDIO SAMPLES...";
  Object.assign(searchInput.style, {
    padding: "0.31rem 0.63rem",
    fontFamily: DS.typography.fontFamily,
    fontSize: "0.75rem",
    color: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "0px",
    width: "16.0rem",
    outline: "none"
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderSampleList(listContainer);
  });

  toolbar.appendChild(categoryTabsContainer);
  toolbar.appendChild(searchInput);
  devAudioScreenEl.appendChild(toolbar);

  // Scrollable Audio List Container
  const listContainer = document.createElement("div");
  listContainer.id = "dev-audio-list";
  Object.assign(listContainer.style, {
    flex: "1",
    overflowY: "auto",
    padding: "0.88rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.50rem"
  });

  renderSampleList(listContainer);
  devAudioScreenEl.appendChild(listContainer);

  document.body.appendChild(devAudioScreenEl);
}

/**
 * Activates and prepares the Dev Audio screen.
 */
export function activateDevAudio(): void {
  initDevAudio();
  if (devAudioScreenEl) {
    const listContainer = devAudioScreenEl.querySelector("#dev-audio-list") as HTMLElement;
    if (listContainer) {
      renderSampleList(listContainer);
    }
  }
}
