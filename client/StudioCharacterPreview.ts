import * as THREE from "three/webgpu";
import { DS } from "./design-system";
import { StudioPreviewManager } from "./StudioPreviewManager";
import { IS_DEV } from "../shared/gates/production.gate";

export interface TransformConfig {
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
  keyLightIntensity: number;
  rimLightIntensity: number;
  ambLightIntensity: number;
}

const DEFAULT_CONFIGS: Record<string, TransformConfig> = {
  "Player_one-optimized.glb": {
    posX: -0.43,
    posY: -1.35,
    posZ: 0.69,
    rotX: -0.001592653589793,
    rotY: 2.09840734641021,
    rotZ: 0,
    scale: 1.35,
    keyLightIntensity: 0,
    rimLightIntensity: 1.9,
    ambLightIntensity: 0.2
  },
  "player-on_optimised.glb": {
    posX: -0.43,
    posY: -1.35,
    posZ: 0.69,
    rotX: -0.001592653589793,
    rotY: 2.09840734641021,
    rotZ: 0,
    scale: 1.35,
    keyLightIntensity: 0,
    rimLightIntensity: 1.9,
    ambLightIntensity: 0.2
  },
  "default": {
    posX: -0.43,
    posY: -1.35,
    posZ: 0.69,
    rotX: -0.001592653589793,
    rotY: 2.09840734641021,
    rotZ: 0,
    scale: 1.35,
    keyLightIntensity: 0,
    rimLightIntensity: 1.9,
    ambLightIntensity: 0.2
  }
};

let activeModel: THREE.Group | null = null;
let activeGlbName = "";
let currentConfig: TransformConfig = { ...DEFAULT_CONFIGS["default"] };

// Active DOM element references for live updates
let panelContainer: HTMLDivElement | null = null;
let inputElements: Record<string, HTMLInputElement> = {};
let valueLabels: Record<string, HTMLSpanElement> = {};

/**
 * Applies the given configuration parameters to the active 3D model and scene lighting
 */
function applyConfigToScene(model: THREE.Group, config: TransformConfig) {
  if (!model) return;

  // Set position
  model.position.set(config.posX, config.posY, config.posZ);

  // Set rotation
  model.rotation.set(config.rotX, config.rotY, config.rotZ);

  // Apply scale relative to base scale computed in StudioPreviewManager
  const baseScaleVal = model.userData.baseScaleVal || 1.0;
  const finalScale = new THREE.Vector3(
    baseScaleVal * config.scale,
    baseScaleVal * config.scale,
    baseScaleVal * config.scale
  );
  model.userData.targetScale = finalScale;
  model.scale.copy(finalScale);

  // Apply light adjustments
  const keyLight = StudioPreviewManager.getKeyLight();
  if (keyLight) {
    keyLight.intensity = config.keyLightIntensity;
  }

  const rimLight = StudioPreviewManager.getRimLight();
  if (rimLight) {
    rimLight.intensity = config.rimLightIntensity;
  }

  const ambLight = StudioPreviewManager.getAmbientLight();
  if (ambLight) {
    ambLight.intensity = config.ambLightIntensity;
  }
}

/**
 * Updates the slider values and displays in the UI panel when config changes or a new model is loaded
 */
function updatePanelFields(config: TransformConfig) {
  currentConfig = { ...config };
  
  for (const key in config) {
    const k = key as keyof TransformConfig;
    if (inputElements[k]) {
      inputElements[k].value = String(config[k]);
    }
    if (valueLabels[k]) {
      valueLabels[k].textContent = Number(config[k]).toFixed(2);
    }
  }
}

/**
 * Set up the model loaded hook of StudioPreviewManager
 */
StudioPreviewManager.onModelLoaded = (model: THREE.Group, glbName: string) => {
  const isCharacter = glbName.toLowerCase().includes('player') || 
                      glbName.toLowerCase().includes('character') || 
                      glbName.toLowerCase().includes('humanoid') ||
                      glbName.toLowerCase().includes('bpre');
  
  if (!isCharacter) {
    // Dev placement panel is strictly for character model preview, not armory weapons
    return;
  }

  activeModel = model;
  activeGlbName = glbName;

  // Lock turntable only on the main menu start tab viewport
  if (StudioPreviewManager.getMode() === 'MAIN_MENU') {
    StudioPreviewManager.setTurntableEnabled(false);
  } else {
    StudioPreviewManager.setTurntableEnabled(true);
  }

  // Update active turntable state button class if panel is open
  updateTurntableButtonUI();

  // Use hand-tuned default config for deterministic spawn position
  const config: TransformConfig = { ...(DEFAULT_CONFIGS[glbName] || DEFAULT_CONFIGS["default"]) };

  updatePanelFields(config);
  applyConfigToScene(model, config);
};

/**
 * Updates the styling of the Turntable Toggle button in the dev UI
 */
function updateTurntableButtonUI() {
  const btn = document.getElementById("dev-turntable-toggle-btn");
  if (btn) {
    const enabled = StudioPreviewManager.isTurntableEnabled();
    btn.textContent = `TURNTABLE: ${enabled ? 'ACTIVE' : 'LOCKED'}`;
    btn.style.color = enabled ? DS.colors.success : DS.colors.textMuted;
    btn.style.borderColor = enabled ? DS.colors.success : 'rgba(255, 255, 255, 0.1)';
  }
}

/**
 * Injects the gated Dev Placement Button and Floating Controls Panel into the target container
 */
export function initStudioCharacterPreview(): void {
  if (!IS_DEV) return;

  const container = StudioPreviewManager.getContainerEl();
  if (!container) return;

  // Clean up any stale elements from previous containers to prevent double-injection bugs across tabs
  const staleBtn = document.getElementById("dev-placement-trigger-btn");
  if (staleBtn) {
    staleBtn.remove();
  }
  const stalePanel = document.getElementById("dev-placement-panel");
  if (stalePanel) {
    stalePanel.remove();
    panelContainer = null;
    inputElements = {};
    valueLabels = {};
  }
}

/**
 * Opens or closes the full Dev Placement Adjustments Panel
 */
export function toggleDevPanel() {
  if (panelContainer) {
    panelContainer.remove();
    panelContainer = null;
    inputElements = {};
    valueLabels = {};
    return;
  }

  const container = document.getElementById("main-menu-screen") || document.body;
  if (!container) return;

  if (!activeModel) {
    const modelGrp = StudioPreviewManager.getActiveModelGroup();
    if (modelGrp && modelGrp.children.length > 0) {
      activeModel = modelGrp.children[0] as THREE.Group;
    }
  }
  if (!activeGlbName) {
    activeGlbName = "Player_one-optimized.glb";
  }

  panelContainer = document.createElement("div");
  panelContainer.id = "dev-placement-panel";
  Object.assign(panelContainer.style, {
    position: "fixed",
    top: "60px",
    right: "20px",
    width: "320px",
    maxHeight: "calc(100vh - 80px)",
    overflowY: "auto",
    zIndex: "99999",
    background: "rgba(8, 8, 12, 0.98)", // Smoky dark background compliance
    border: `1px solid ${DS.colors.dev}`,
    borderRadius: "0px", // Strict 0px compliance
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    color: DS.colors.textPrimary,
    fontFamily: DS.typography.fontFamilySecondary,
    boxSizing: "border-box",
    pointerEvents: "auto",
    boxShadow: "0 0 20px rgba(0,0,0,0.8), 0 0 10px rgba(255, 0, 100, 0.3)"
  });

  // Panel Title Row (Draggable Handle)
  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `1px solid rgba(255, 0, 100, 0.2)`,
    paddingBottom: "6px",
    cursor: "move",
    userSelect: "none"
  });

  const title = document.createElement("div");
  title.textContent = "STUDIO PREVIEW DEVELOPER CONTROLS";
  Object.assign(title.style, {
    fontSize: "12px",
    fontWeight: "bold",
    color: DS.colors.dev,
    letterSpacing: "1px"
  });
  header.appendChild(title);

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    cursor: "pointer",
    fontSize: "14px",
    color: DS.colors.textMuted
  });
  closeBtn.addEventListener("click", () => {
    toggleDevPanel();
  });
  header.appendChild(closeBtn);
  panelContainer.appendChild(header);

  // Drag functionality for moving panel
  let isPanelDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  const onPointerDown = (e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target === closeBtn || closeBtn.contains(target)) return;

    isPanelDragging = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartX = clientX;
    dragStartY = clientY;

    if (panelContainer) {
      const rect = panelContainer.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
    }
  };

  const onPointerMove = (e: MouseEvent | TouchEvent) => {
    if (!isPanelDragging || !panelContainer) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragStartX;
    const dy = clientY - dragStartY;

    panelContainer.style.left = `${initialLeft + dx}px`;
    panelContainer.style.top = `${initialTop + dy}px`;
    panelContainer.style.right = "auto";
  };

  const onPointerUp = () => {
    isPanelDragging = false;
  };

  header.addEventListener("mousedown", onPointerDown);
  header.addEventListener("touchstart", onPointerDown, { passive: true });
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("touchmove", onPointerMove, { passive: true });
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("touchend", onPointerUp);

  // Model Info & Quick Toggles Row
  const quickRow = document.createElement("div");
  Object.assign(quickRow.style, {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  });

  const turntableBtn = document.createElement("button");
  turntableBtn.id = "dev-turntable-toggle-btn";
  Object.assign(turntableBtn.style, {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "0px",
    fontFamily: DS.typography.fontFamily,
    fontSize: "10px",
    fontWeight: "bold",
    padding: "4px 8px",
    cursor: "pointer",
    textAlign: "center"
  });
  turntableBtn.addEventListener("click", () => {
    const currentVal = StudioPreviewManager.isTurntableEnabled();
    StudioPreviewManager.setTurntableEnabled(!currentVal);
    updateTurntableButtonUI();
  });
  quickRow.appendChild(turntableBtn);
  panelContainer.appendChild(quickRow);

  // Preset Angle Selector
  const presetsTitle = document.createElement("div");
  presetsTitle.textContent = "ROTATION PRESETS:";
  Object.assign(presetsTitle.style, { fontSize: "10px", color: DS.colors.textMuted, marginTop: "4px" });
  panelContainer.appendChild(presetsTitle);

  const presetGroup = document.createElement("div");
  Object.assign(presetGroup.style, {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "4px"
  });

  const presets = [
    { label: "FRONT (0°)", val: 0.0 },
    { label: "BACK (180°)", val: Math.PI },
    { label: "20° BACK-LEFT", val: Math.PI - (20 * Math.PI / 180) } // Exact request requirement
  ];

  presets.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = p.label;
    Object.assign(btn.style, {
      background: "rgba(255, 255, 255, 0.02)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "0px",
      color: DS.colors.textPrimary,
      fontFamily: DS.typography.fontFamily,
      fontSize: "9px",
      fontWeight: "bold",
      padding: "4px",
      cursor: "pointer"
    });
    btn.addEventListener("click", () => {
      currentConfig.rotY = p.val;
      updatePanelFields(currentConfig);
      if (activeModel) {
        applyConfigToScene(activeModel, currentConfig);
      }
    });
    presetGroup.appendChild(btn);
  });
  panelContainer.appendChild(presetGroup);

  // Divider
  const divLine = document.createElement("div");
  Object.assign(divLine.style, { height: "1px", background: "rgba(255,255,255,0.05)", margin: "4px 0" });
  panelContainer.appendChild(divLine);

  // Create Sliders Group
  const slidersContainer = document.createElement("div");
  Object.assign(slidersContainer.style, {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  });

  // Slider descriptors helper
  const createDevSlider = (field: keyof TransformConfig, labelText: string, min: number, max: number, step: number) => {
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      flexDirection: "column",
      gap: "2px"
    });

    const infoRow = document.createElement("div");
    Object.assign(infoRow.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    });

    const lbl = document.createElement("span");
    lbl.textContent = labelText;
    Object.assign(lbl.style, {
      fontSize: "10px",
      color: DS.colors.textMuted,
      fontWeight: "bold"
    });

    const valDisplay = document.createElement("span");
    valDisplay.textContent = Number(currentConfig[field]).toFixed(2);
    Object.assign(valDisplay.style, {
      fontSize: "10px",
      color: DS.colors.dev,
      fontFamily: DS.typography.fontFamilyMono
    });

    infoRow.appendChild(lbl);
    infoRow.appendChild(valDisplay);
    row.appendChild(infoRow);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(currentConfig[field]);
    Object.assign(slider.style, {
      width: "100%",
      background: "rgba(255, 255, 255, 0.05)",
      outline: "none",
      height: "4px",
      borderRadius: "0px",
      cursor: "pointer",
      webkitAppearance: "none"
    });
    slider.className = "dev-range-slider";

    slider.addEventListener("input", (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      currentConfig[field] = val;
      valDisplay.textContent = val.toFixed(2);
      if (activeModel) {
        applyConfigToScene(activeModel, currentConfig);
      }
    });

    row.appendChild(slider);
    slidersContainer.appendChild(row);

    // Save references for panel updates
    inputElements[field] = slider;
    valueLabels[field] = valDisplay;
  };

  // Add the placement sliders
  createDevSlider("posX", "POSITION X", -5, 5, 0.01);
  createDevSlider("posY", "POSITION Y", -5, 5, 0.01);
  createDevSlider("posZ", "POSITION Z", -5, 5, 0.01);
  
  createDevSlider("rotX", "ROTATION X (PITCH)", -Math.PI, Math.PI, 0.01);
  createDevSlider("rotY", "ROTATION Y (YAW)", -Math.PI, Math.PI, 0.01);
  createDevSlider("rotZ", "ROTATION Z (ROLL)", -Math.PI, Math.PI, 0.01);
  
  createDevSlider("scale", "RESIZE SCALE MULTIPLIER", 0.1, 5.0, 0.05);

  createDevSlider("keyLightIntensity", "KEY LIGHT INTENSITY", 0.0, 10.0, 0.1);
  createDevSlider("rimLightIntensity", "RIM LIGHT INTENSITY", 0.0, 10.0, 0.1);
  createDevSlider("ambLightIntensity", "AMBIENT LIGHT INTENSITY", 0.0, 5.0, 0.1);

  panelContainer.appendChild(slidersContainer);

  // Control Buttons Row (Save, Reset, Copy JSON)
  const controlsRow = document.createElement("div");
  Object.assign(controlsRow.style, {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
    paddingTop: "8px",
    marginTop: "4px"
  });

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "PERSIST & SAVE PLACEMENT";
  Object.assign(saveBtn.style, {
    background: "rgba(255, 69, 0, 0.1)",
    color: DS.colors.accent,
    border: `1px solid ${DS.colors.accent}`,
    borderRadius: "0px",
    fontFamily: DS.typography.fontFamily,
    fontSize: "10px",
    fontWeight: "bold",
    padding: "6px",
    cursor: "pointer"
  });
  saveBtn.addEventListener("click", () => {
    if (activeGlbName) {
      localStorage.setItem("studio_placement_" + activeGlbName, JSON.stringify(currentConfig));
      saveBtn.textContent = "CONFIG PERSISTED!";
      setTimeout(() => {
        saveBtn.textContent = "PERSIST & SAVE PLACEMENT";
      }, 1500);
    }
  });
  controlsRow.appendChild(saveBtn);

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "COPY JSON CONFIG TO CLIPBOARD";
  Object.assign(copyBtn.style, {
    background: "rgba(255, 255, 255, 0.02)",
    color: DS.colors.textPrimary,
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "0px",
    fontFamily: DS.typography.fontFamily,
    fontSize: "10px",
    fontWeight: "bold",
    padding: "6px",
    cursor: "pointer"
  });
  copyBtn.addEventListener("click", () => {
    const snippet = `"${activeGlbName}": ${JSON.stringify(currentConfig, null, 2)}`;
    navigator.clipboard.writeText(snippet).then(() => {
      copyBtn.textContent = "COPIED TO CLIPBOARD!";
      setTimeout(() => {
        copyBtn.textContent = "COPY JSON CONFIG TO CLIPBOARD";
      }, 1500);
    }).catch(err => {
      console.error("Failed to copy configuration: ", err);
    });
  });
  controlsRow.appendChild(copyBtn);

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "RESET TO FALLBACK DEFAULTS";
  Object.assign(resetBtn.style, {
    background: "transparent",
    color: DS.colors.textMuted,
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "0px",
    fontFamily: DS.typography.fontFamily,
    fontSize: "9px",
    fontWeight: "bold",
    padding: "4px",
    cursor: "pointer"
  });
  resetBtn.addEventListener("click", () => {
    if (activeGlbName) {
      localStorage.removeItem("studio_placement_" + activeGlbName);
      const fallback = { ...(DEFAULT_CONFIGS[activeGlbName] || DEFAULT_CONFIGS["default"]) };
      updatePanelFields(fallback);
      if (activeModel) {
        applyConfigToScene(activeModel, fallback);
      }
      resetBtn.textContent = "RESET COMPLETED!";
      setTimeout(() => {
        resetBtn.textContent = "RESET TO FALLBACK DEFAULTS";
      }, 1500);
    }
  });
  controlsRow.appendChild(resetBtn);

  panelContainer.appendChild(controlsRow);
  container.appendChild(panelContainer);

  // Refresh active field values
  updatePanelFields(currentConfig);
  updateTurntableButtonUI();
}

// Automatically bind when the page is loaded
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    if (IS_DEV) {
      initStudioCharacterPreview();
    }
  });
}
