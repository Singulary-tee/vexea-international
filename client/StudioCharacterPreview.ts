import * as THREE from "three/webgpu";
import { DS } from "./design-system";
import { StudioPreviewManager } from "./StudioPreviewManager";
import { IS_DEV } from "../shared/gates/production.gate";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { getCachedOrFetchUrl, createConfiguredGLTFLoader } from "./asset-cache";
import { attachScope, preloadAttachments } from "./weapons/AttachmentSystem";
import { applyScenicGripPose } from "./weapons/GripSystem";

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

  // New IK/Weapon Overrides
  wepPosX: number;
  wepPosY: number;
  wepPosZ: number;
  wepRotX: number;
  wepRotY: number;
  wepRotZ: number;

  rArmPosX: number;
  rArmPosY: number;
  rArmPosZ: number;
  rArmRotX: number;
  rArmRotY: number;
  rArmRotZ: number;

  rForeArmPosX: number;
  rForeArmPosY: number;
  rForeArmPosZ: number;
  rForeArmRotX: number;
  rForeArmRotY: number;
  rForeArmRotZ: number;

  rHandPosX: number;
  rHandPosY: number;
  rHandPosZ: number;
  rHandRotX: number;
  rHandRotY: number;
  rHandRotZ: number;

  lArmPosX: number;
  lArmPosY: number;
  lArmPosZ: number;
  lArmRotX: number;
  lArmRotY: number;
  lArmRotZ: number;

  lForeArmPosX: number;
  lForeArmPosY: number;
  lForeArmPosZ: number;
  lForeArmRotX: number;
  lForeArmRotY: number;
  lForeArmRotZ: number;

  lHandPosX: number;
  lHandPosY: number;
  lHandPosZ: number;
  lHandRotX: number;
  lHandRotY: number;
  lHandRotZ: number;
}

const DEFAULT_CONFIGS: Record<string, TransformConfig> = {
  "Player_one-optimized.glb": {
    posX: 0.45,
    posY: -1.0,
    posZ: 0,
    rotX: 0,
    rotY: -0.35,
    rotZ: 0,
    scale: 1.0,
    keyLightIntensity: 2.2,
    rimLightIntensity: 1.5,
    ambLightIntensity: 0.8,
    wepPosX: -0.09,
    wepPosY: -0.17,
    wepPosZ: -0.47,
    wepRotX: 2.95840734641021,
    wepRotY: -0.161592653589793,
    wepRotZ: 2.04840734641021,
    rArmPosX: 0.02,
    rArmPosY: 0.05,
    rArmPosZ: 0.09,
    rArmRotX: 0.678407346410207,
    rArmRotY: -0.221592653589793,
    rArmRotZ: 0.238407346410207,
    rForeArmPosX: 0.02,
    rForeArmPosY: 0.09,
    rForeArmPosZ: 0,
    rForeArmRotX: 0.918407346410207,
    rForeArmRotY: -0.891592653589793,
    rForeArmRotZ: 0.648407346410207,
    rHandPosX: 0,
    rHandPosY: 0,
    rHandPosZ: -0.02,
    rHandRotX: 0.648407346410207,
    rHandRotY: 1.56840734641021,
    rHandRotZ: 0,
    lArmPosX: 0,
    lArmPosY: 0,
    lArmPosZ: 0,
    lArmRotX: 0.838407346410207,
    lArmRotY: 0.748407346410207,
    lArmRotZ: -0.641592653589793,
    lForeArmPosX: -0.01,
    lForeArmPosY: 0,
    lForeArmPosZ: -0.05,
    lForeArmRotX: 0.788407346410207,
    lForeArmRotY: -0.361592653589793,
    lForeArmRotZ: 0.168407346410207,
    lHandPosX: -0.7,
    lHandPosY: 0.12,
    lHandPosZ: 0,
    lHandRotX: 0.198407346410207,
    lHandRotY: -1.60159265358979,
    lHandRotZ: -0.411592653589793
  },
  "player-on_optimised.glb": {
    posX: 0.45,
    posY: -1.0,
    posZ: 0,
    rotX: 0,
    rotY: -0.35,
    rotZ: 0,
    scale: 1.0,
    keyLightIntensity: 2.2,
    rimLightIntensity: 1.5,
    ambLightIntensity: 0.8,
    wepPosX: -0.09,
    wepPosY: -0.17,
    wepPosZ: -0.47,
    wepRotX: 2.95840734641021,
    wepRotY: -0.161592653589793,
    wepRotZ: 2.04840734641021,
    rArmPosX: 0.02,
    rArmPosY: 0.05,
    rArmPosZ: 0.09,
    rArmRotX: 0.678407346410207,
    rArmRotY: -0.221592653589793,
    rArmRotZ: 0.238407346410207,
    rForeArmPosX: 0.02,
    rForeArmPosY: 0.09,
    rForeArmPosZ: 0,
    rForeArmRotX: 0.918407346410207,
    rForeArmRotY: -0.891592653589793,
    rForeArmRotZ: 0.648407346410207,
    rHandPosX: 0,
    rHandPosY: 0,
    rHandPosZ: -0.02,
    rHandRotX: 0.648407346410207,
    rHandRotY: 1.56840734641021,
    rHandRotZ: 0,
    lArmPosX: 0,
    lArmPosY: 0,
    lArmPosZ: 0,
    lArmRotX: 0.838407346410207,
    lArmRotY: 0.748407346410207,
    lArmRotZ: -0.641592653589793,
    lForeArmPosX: -0.01,
    lForeArmPosY: 0,
    lForeArmPosZ: -0.05,
    lForeArmRotX: 0.788407346410207,
    lForeArmRotY: -0.361592653589793,
    lForeArmRotZ: 0.168407346410207,
    lHandPosX: -0.7,
    lHandPosY: 0.12,
    lHandPosZ: 0,
    lHandRotX: 0.198407346410207,
    lHandRotY: -1.60159265358979,
    lHandRotZ: -0.411592653589793
  },
  "default": {
    posX: 0.45,
    posY: -1.0,
    posZ: 0,
    rotX: 0,
    rotY: -0.35,
    rotZ: 0,
    scale: 1.0,
    keyLightIntensity: 2.2,
    rimLightIntensity: 1.5,
    ambLightIntensity: 0.8,
    wepPosX: -0.09,
    wepPosY: -0.17,
    wepPosZ: -0.47,
    wepRotX: 2.95840734641021,
    wepRotY: -0.161592653589793,
    wepRotZ: 2.04840734641021,
    rArmPosX: 0.02,
    rArmPosY: 0.05,
    rArmPosZ: 0.09,
    rArmRotX: 0.678407346410207,
    rArmRotY: -0.221592653589793,
    rArmRotZ: 0.238407346410207,
    rForeArmPosX: 0.02,
    rForeArmPosY: 0.09,
    rForeArmPosZ: 0,
    rForeArmRotX: 0.918407346410207,
    rForeArmRotY: -0.891592653589793,
    rForeArmRotZ: 0.648407346410207,
    rHandPosX: 0,
    rHandPosY: 0,
    rHandPosZ: -0.02,
    rHandRotX: 0.648407346410207,
    rHandRotY: 1.56840734641021,
    rHandRotZ: 0,
    lArmPosX: 0,
    lArmPosY: 0,
    lArmPosZ: 0,
    lArmRotX: 0.838407346410207,
    lArmRotY: 0.748407346410207,
    lArmRotZ: -0.641592653589793,
    lForeArmPosX: -0.01,
    lForeArmPosY: 0,
    lForeArmPosZ: -0.05,
    lForeArmRotX: 0.788407346410207,
    lForeArmRotY: -0.361592653589793,
    lForeArmRotZ: 0.168407346410207,
    lHandPosX: -0.7,
    lHandPosY: 0.12,
    lHandPosZ: 0,
    lHandRotX: 0.198407346410207,
    lHandRotY: -1.60159265358979,
    lHandRotZ: -0.411592653589793
  }
};;

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

  // DEV PLACEMENT IS STRICTLY FOR THE MAIN_MENU SCREEN ONLY AND NOTHING ELSE.
  // IT IS COMPLETELY FORBIDDEN TO APPLY TO THE LOBBY OR OTHER MODES.
  const mode = StudioPreviewManager.getMode();
  const panelExists = document.getElementById("dev-placement-panel");
  const modelGroup = StudioPreviewManager.getActiveModelGroup();
  
  if (modelGroup && panelExists && mode === 'MAIN_MENU') {
    modelGroup.position.set(config.posX, config.posY, config.posZ);
    modelGroup.rotation.set(config.rotX, config.rotY, config.rotZ);
  }

  // Apply scale relative to base scale computed in StudioPreviewManager
  const baseScaleVal = model.userData.baseScaleVal || 1.0;
  const scaleMult = config.scale;
  const finalScale = new THREE.Vector3(
    baseScaleVal * scaleMult,
    baseScaleVal * scaleMult,
    baseScaleVal * scaleMult
  );
  model.userData.targetScale = finalScale;
  model.scale.copy(finalScale);

  // Keep model position centered inside modelGroup
  if (model.userData.centerLocalOffset) {
    const scaledOffset = model.userData.centerLocalOffset.clone().multiplyScalar(scaleMult);
    model.position.copy(scaledOffset).negate();
  } else {
    model.position.set(0, 0, 0);
  }

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

  model.userData.poseConfig = config;
  if (model.userData.activeWeapon) {
    applyScenicGripPose(model, model.userData.activeWeapon, config);
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

function computePreciseMeshBox(object: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  object.traverse((child: any) => {
    if (child.isMesh && child.visible) {
      child.updateMatrixWorld(true);
      const geom = child.geometry;
      if (geom) {
        if (!geom.boundingBox) {
          geom.computeBoundingBox();
        }
        if (geom.boundingBox) {
          const m = geom.boundingBox.clone().applyMatrix4(child.matrixWorld);
          box.union(m);
        }
      }
    }
  });
  return box;
}

/**
 * Helper to immediately load the SCAR-L and equip it with the ACOG scope in the low-ready scenic stance.
 */
async function loadAndEquipWeapon(characterModel: THREE.Group) {
  try {
    // 1. Ensure attachments are preloaded
    await preloadAttachments();

    // 2. Load the optimized SCAR-L GLB model
    const loader = createConfiguredGLTFLoader();
    const url = await getCachedOrFetchUrl("scar_l-optimized.glb", "Asset");
    const gltf = await loader.loadAsync(url);
    const weapon = SkeletonUtils.clone(gltf.scene) as THREE.Group;

    // Calculate exact bounding box of the player model to determine height
    const characterBox = computePreciseMeshBox(characterModel);
    if (characterBox.isEmpty()) {
      characterBox.setFromObject(characterModel);
    }
    const characterSize = new THREE.Vector3();
    characterBox.getSize(characterSize);
    const characterHeight = characterSize.y > 0 ? characterSize.y : 1.8;

    // Calculate exact unscaled bounding box of the weapon model using visible geometries only
    const weaponBox = computePreciseMeshBox(weapon);
    if (weaponBox.isEmpty()) {
      weaponBox.setFromObject(weapon);
    }
    const weaponSize = new THREE.Vector3();
    weaponBox.getSize(weaponSize);
    const weaponLength = Math.max(weaponSize.x, weaponSize.y, weaponSize.z) || 1.0;

    // Standard real-world rifle (0.85m) to human (1.8m) proportion: 0.85 / 1.8 = ~0.4722
    const targetWeaponLength = characterHeight * (0.85 / 1.8);
    const weaponScale = targetWeaponLength / weaponLength;

    weapon.scale.set(weaponScale, weaponScale, weaponScale);

    // Ensure any skeleton components on the weapon are properly mapped
    import("./StudioPreviewManager").then(({ fixSkinnedMeshBones }) => {
      fixSkinnedMeshBones(weapon, gltf.scene);
    }).catch(() => {});

    // 3. Attach ACOG scope automatically
    await attachScope(weapon, "ACOG");

    // 4. Store active weapon on model userData to update skeletal pose in real-time
    characterModel.userData.activeWeapon = weapon;

    // 5. Initial procedural pose alignment
    applyScenicGripPose(characterModel, weapon, currentConfig);
    console.log("[StudioCharacterPreview] Scenic Weapon (SCAR-L + ACOG) equipped successfully");
  } catch (err) {
    console.error("[StudioCharacterPreview] Failed to load and equip scenic weapon:", err);
  }
}

/**
 * Set up the model loaded hook of StudioPreviewManager
 */
StudioPreviewManager.onModelLoaded = (model: THREE.Group, glbName: string) => {
  const mode = StudioPreviewManager.getMode();
  if (mode !== 'MAIN_MENU' && mode !== 'LOBBY') {
    return;
  }
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

  // Lock turntable only on the main menu start tab viewport to keep scenic view steady
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

  // Immediately load the weapon and equip it
  loadAndEquipWeapon(model);
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

  createDevSlider("wepPosX", "WEAPON X", -2, 2, 0.01);
  createDevSlider("wepPosY", "WEAPON Y", -2, 2, 0.01);
  createDevSlider("wepPosZ", "WEAPON Z", -2, 2, 0.01);
  createDevSlider("wepRotX", "WEAPON ROT X", -Math.PI, Math.PI, 0.01);
  createDevSlider("wepRotY", "WEAPON ROT Y", -Math.PI, Math.PI, 0.01);
  createDevSlider("wepRotZ", "WEAPON ROT Z", -Math.PI, Math.PI, 0.01);

  createDevSlider("rArmPosX", "R ARM POS X", -2, 2, 0.01);
  createDevSlider("rArmPosY", "R ARM POS Y", -2, 2, 0.01);
  createDevSlider("rArmPosZ", "R ARM POS Z", -2, 2, 0.01);
  createDevSlider("rArmRotX", "R ARM ROT X", -Math.PI, Math.PI, 0.01);
  createDevSlider("rArmRotY", "R ARM ROT Y", -Math.PI, Math.PI, 0.01);
  createDevSlider("rArmRotZ", "R ARM ROT Z", -Math.PI, Math.PI, 0.01);

  createDevSlider("rForeArmPosX", "R FOREARM POS X", -2, 2, 0.01);
  createDevSlider("rForeArmPosY", "R FOREARM POS Y", -2, 2, 0.01);
  createDevSlider("rForeArmPosZ", "R FOREARM POS Z", -2, 2, 0.01);
  createDevSlider("rForeArmRotX", "R FOREARM ROT X", -Math.PI, Math.PI, 0.01);
  createDevSlider("rForeArmRotY", "R FOREARM ROT Y", -Math.PI, Math.PI, 0.01);
  createDevSlider("rForeArmRotZ", "R FOREARM ROT Z", -Math.PI, Math.PI, 0.01);

  createDevSlider("rHandPosX", "R HAND POS X", -2, 2, 0.01);
  createDevSlider("rHandPosY", "R HAND POS Y", -2, 2, 0.01);
  createDevSlider("rHandPosZ", "R HAND POS Z", -2, 2, 0.01);
  createDevSlider("rHandRotX", "R HAND ROT X", -Math.PI, Math.PI, 0.01);
  createDevSlider("rHandRotY", "R HAND ROT Y", -Math.PI, Math.PI, 0.01);
  createDevSlider("rHandRotZ", "R HAND ROT Z", -Math.PI, Math.PI, 0.01);

  createDevSlider("lArmPosX", "L ARM POS X", -2, 2, 0.01);
  createDevSlider("lArmPosY", "L ARM POS Y", -2, 2, 0.01);
  createDevSlider("lArmPosZ", "L ARM POS Z", -2, 2, 0.01);
  createDevSlider("lArmRotX", "L ARM ROT X", -Math.PI, Math.PI, 0.01);
  createDevSlider("lArmRotY", "L ARM ROT Y", -Math.PI, Math.PI, 0.01);
  createDevSlider("lArmRotZ", "L ARM ROT Z", -Math.PI, Math.PI, 0.01);

  createDevSlider("lForeArmPosX", "L FOREARM POS X", -2, 2, 0.01);
  createDevSlider("lForeArmPosY", "L FOREARM POS Y", -2, 2, 0.01);
  createDevSlider("lForeArmPosZ", "L FOREARM POS Z", -2, 2, 0.01);
  createDevSlider("lForeArmRotX", "L FOREARM ROT X", -Math.PI, Math.PI, 0.01);
  createDevSlider("lForeArmRotY", "L FOREARM ROT Y", -Math.PI, Math.PI, 0.01);
  createDevSlider("lForeArmRotZ", "L FOREARM ROT Z", -Math.PI, Math.PI, 0.01);

  createDevSlider("lHandPosX", "L HAND POS X", -2, 2, 0.01);
  createDevSlider("lHandPosY", "L HAND POS Y", -2, 2, 0.01);
  createDevSlider("lHandPosZ", "L HAND POS Z", -2, 2, 0.01);
  createDevSlider("lHandRotX", "L HAND ROT X", -Math.PI, Math.PI, 0.01);
  createDevSlider("lHandRotY", "L HAND ROT Y", -Math.PI, Math.PI, 0.01);
  createDevSlider("lHandRotZ", "L HAND ROT Z", -Math.PI, Math.PI, 0.01);

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
