import { getAssetUrl } from "./asset-cache";
import { DS } from "./design-system";
import { StudioPreviewManager } from "./StudioPreviewManager";
import { hideAll, showMainMenu } from "./screens/screen-manager";

export const initUIEditor = () => {
    const settingsModal = document.getElementById("settings-modal");
    const hudContainer = document.getElementById("hud-container");
    
    if (!hudContainer) return;

    let isEditing = false;
    let selectedElement: HTMLElement | null = null;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    interface ElementState {
        leftPx: number;
        topPx: number;
        scale: number;
        widthPx?: number;
        heightPx?: number;
    }
    const elementStates = new Map<HTMLElement, ElementState>();
    
    // Grid alignment and snapping variables
    let gridSnapSize = 5;
    let gridOffsetX = 0;
    let gridOffsetY = 0;
    let showVisualGrid = true;

    // Reference Image variables
    let refOpacity = 1.0;
    let refScale = 100;
    let refOffsetX = 0;
    let refOffsetY = 0;

    const getGridSnap = (val: number, snap = 5, offset = 0) => {
        if (snap <= 1) return val;
        return Math.round((val - offset) / snap) * snap + offset;
    };
    
    // Floating UI Editor Window
    const editorBar = document.createElement("div");
    editorBar.id = "ui-editor-bar";
    editorBar.style.position = "absolute";
    editorBar.style.top = "5%";
    editorBar.style.left = "5%";
    editorBar.style.width = "clamp(17.50rem, 30vw, 22.50rem)";
    editorBar.style.maxHeight = "90vh";
    editorBar.style.background = `linear-gradient(135deg, ${DS.utils.rgba(DS.colors.background, 0.95)} 0%, ${DS.utils.rgba(DS.colors.background, 0.8)} 100%)`;
    editorBar.style.backdropFilter = DS.glass.blur;
    editorBar.style.color = DS.colors.textPrimary;
    editorBar.style.display = "none";
    editorBar.style.flexDirection = "column";
    editorBar.style.padding = DS.spacing.xl;
    editorBar.style.zIndex = "100000";
    editorBar.style.border = `1px solid ${DS.colors.border}`;
    editorBar.style.borderRadius = DS.borders.radius.none;
    editorBar.style.pointerEvents = "auto";
    editorBar.style.cursor = "grab";
    editorBar.style.boxShadow = `0 10px 40px ${DS.utils.rgba('#000000', 0.9)}`;
    editorBar.style.userSelect = "none";
    editorBar.style.overflowY = "auto";
    editorBar.style.scrollbarWidth = "thin";
    editorBar.style.scrollbarColor = `${DS.colors.success} ${DS.colors.surface}`;

    const dragHandle = document.createElement("div");
    dragHandle.style.height = "0.50rem";
    dragHandle.style.width = "2.50rem";
    dragHandle.style.margin = "0 auto 1.00rem auto";
    dragHandle.style.background = DS.utils.rgba(DS.colors.textSecondary, 0.3);
    dragHandle.style.borderRadius = "4px";
    dragHandle.style.cursor = "grab";
    dragHandle.id = "editor-drag-handle";
    editorBar.appendChild(dragHandle);

    const blockEvents = ["pointerdown", "pointerup", "pointermove", "mousedown", "mouseup", "mousemove", "click", "touchstart", "touchend", "touchmove"];
    blockEvents.forEach(evt => {
        editorBar.addEventListener(evt, (e) => {
            e.stopPropagation();
        });
    });

    const contentWrapper = document.createElement("div");
    contentWrapper.style.display = "flex";
    contentWrapper.style.flexDirection = "column";
    contentWrapper.style.overflowY = "auto";
    contentWrapper.style.paddingRight = "4px"; // Space for scrollbar
    contentWrapper.innerHTML = `
        <div id="editor-selected" style="margin-bottom: ${DS.spacing.lg}; text-align: center; pointer-events: none; font-family: ${DS.typography.fontFamilyMono}; font-size: ${DS.typography.tiny}; color: ${DS.colors.textSecondary}; background: ${DS.utils.rgba(DS.colors.surface, 0.8)}; padding: ${DS.spacing.md}; border-radius: ${DS.borders.radius.none}; border-left: 2px solid ${DS.colors.success};">Selected: None</div>
        
        <!-- Tab Headers -->
        <div style="display: flex; background: ${DS.colors.surface}; padding: ${DS.spacing.xs}; border-radius: ${DS.borders.radius.none}; margin-bottom: ${DS.spacing.lg}; gap: ${DS.spacing.xs}; border: 1px solid ${DS.colors.border};">
            <button id="tab-element" style="flex: 1; padding: ${DS.spacing.md}; background: ${DS.colors.success}; color: black; border: none; font-size: ${DS.typography.tiny}; cursor: pointer; font-weight: ${DS.typography.weightBold}; border-radius: ${DS.borders.radius.none}; transition: all ${DS.motion.fast}; font-family: ${DS.typography.fontFamilyMono};">ELEMENT</button>
            <button id="tab-grid" style="flex: 1; padding: ${DS.spacing.md}; background: transparent; color: ${DS.colors.textSecondary}; border: none; font-size: ${DS.typography.tiny}; cursor: pointer; font-weight: ${DS.typography.weightBold}; border-radius: ${DS.borders.radius.none}; transition: all ${DS.motion.fast}; font-family: ${DS.typography.fontFamilyMono};">GRID & REF</button>
        </div>

        <!-- Panel 1: Element Properties -->
        <div id="panel-element" style="display: flex; flex-direction: column; gap: ${DS.spacing.md}; font-family: ${DS.typography.fontFamilyMono}; font-size: ${DS.typography.tiny};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">SLIDER STEP:</span>
                <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                    <input type="range" id="editor-step" min="0.1" max="10" step="0.1" value="1" style="width: 5.00rem; accent-color: ${DS.colors.success};">
                    <input type="number" id="editor-step-num" min="0.1" max="10" step="0.1" value="1.0" style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.success}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                </div>
            </div>

            <!-- Position Controls -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">LEFT (VW):</span>
                <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                    <input type="range" id="editor-left" min="0" max="100" step="0.1" value="0" disabled style="width: 5.00rem; accent-color: ${DS.colors.success}; opacity: 0.5;">
                    <input type="number" id="editor-left-num" min="-50" max="150" step="0.1" value="0" disabled style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">TOP (VH):</span>
                <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                    <input type="range" id="editor-top" min="0" max="100" step="0.1" value="0" disabled style="width: 5.00rem; accent-color: ${DS.colors.success}; opacity: 0.5;">
                    <input type="number" id="editor-top-num" min="-50" max="150" step="0.1" value="0" disabled style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                </div>
            </div>

            <div id="editor-size-wrap" style="display: flex; flex-direction: column; gap: ${DS.spacing.md}; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: ${DS.colors.textSecondary};">SCALE:</span>
                    <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                        <input type="range" id="editor-scale" min="0.1" max="5" step="0.05" value="1" disabled style="width: 5.00rem; accent-color: ${DS.colors.success}; opacity: 0.5;">
                        <input type="number" id="editor-scale-num" min="0.1" max="5" step="0.01" value="1.00" disabled style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                    </div>
                </div>
            </div>

            <div id="editor-dim-wrap" style="display: flex; flex-direction: column; gap: ${DS.spacing.md}; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: ${DS.colors.textSecondary};">WIDTH (VW):</span>
                    <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                        <input type="range" id="editor-width" min="0.1" max="100" step="0.1" value="10" disabled style="width: 5.00rem; accent-color: ${DS.colors.success}; opacity: 0.5;">
                        <input type="number" id="editor-width-num" min="0.1" max="100" step="0.1" value="10" disabled style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: ${DS.colors.textSecondary};">HEIGHT (VH):</span>
                    <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                        <input type="range" id="editor-height" min="0.1" max="100" step="0.1" value="10" disabled style="width: 5.00rem; accent-color: ${DS.colors.success}; opacity: 0.5;">
                        <input type="number" id="editor-height-num" min="0.1" max="100" step="0.1" value="10" disabled style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                    </div>
                </div>
            </div>
        </div>

        <!-- Panel 2: Grid & Reference Properties -->
        <div id="panel-grid" style="display: none; flex-direction: column; gap: ${DS.spacing.md}; font-family: ${DS.typography.fontFamilyMono}; font-size: ${DS.typography.tiny};">
            <!-- Grid Snap Size -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">GRID SNAP (PX):</span>
                <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                    <input type="range" id="grid-snap" min="1" max="100" step="1" value="5" style="width: 5.00rem; accent-color: ${DS.colors.success};">
                    <input type="number" id="grid-snap-num" min="1" max="100" step="1" value="5" style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                </div>
            </div>

            <!-- Grid Offset X -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">GRID OFFSET X:</span>
                <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                    <input type="range" id="grid-offset-x" min="-100" max="100" step="1" value="0" style="width: 5.00rem; accent-color: ${DS.colors.success};">
                    <input type="number" id="grid-offset-x-num" min="-100" max="100" step="1" value="0" style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                </div>
            </div>

            <!-- Grid Offset Y -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">GRID OFFSET Y:</span>
                <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                    <input type="range" id="grid-offset-y" min="-100" max="100" step="1" value="0" style="width: 5.00rem; accent-color: ${DS.colors.success};">
                    <input type="number" id="grid-offset-y-num" min="-100" max="100" step="1" value="0" style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                </div>
            </div>

            <!-- Show Grid Checkbox -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">SHOW VISUAL GRID:</span>
                <input type="checkbox" id="show-grid-checkbox" checked style="cursor: pointer; width: 0.88rem; height: 0.88rem; accent-color: ${DS.colors.success};">
            </div>

            <!-- Divider -->
            <div style="border-top: 1px solid ${DS.colors.border}; margin: ${DS.spacing.sm} 0;"></div>

            <!-- Ref Opacity -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">REF OPACITY:</span>
                <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                    <input type="range" id="ref-opacity" min="0" max="1" step="0.05" value="1" style="width: 5.00rem; accent-color: ${DS.colors.success};">
                    <input type="number" id="ref-opacity-num" min="0" max="1" step="0.01" value="1.00" style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                </div>
            </div>

            <!-- Ref Scale -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">REF SCALE (%):</span>
                <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                    <input type="range" id="ref-scale" min="10" max="300" step="1" value="100" style="width: 5.00rem; accent-color: ${DS.colors.success};">
                    <input type="number" id="ref-scale-num" min="10" max="300" step="1" value="100" style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                </div>
            </div>

            <!-- Ref Offset X -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">REF OFFSET X (PX):</span>
                <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                    <input type="range" id="ref-offset-x" min="-1000" max="1000" step="1" value="0" style="width: 5.00rem; accent-color: ${DS.colors.success};">
                    <input type="number" id="ref-offset-x-num" min="-2000" max="2000" step="1" value="0" style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                </div>
            </div>

            <!-- Ref Offset Y -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${DS.colors.textSecondary};">REF OFFSET Y (PX):</span>
                <div style="display: flex; align-items: center; gap: ${DS.spacing.md};">
                    <input type="range" id="ref-offset-y" min="-1000" max="1000" step="1" value="0" style="width: 5.00rem; accent-color: ${DS.colors.success};">
                    <input type="number" id="ref-offset-y-num" min="-2000" max="2000" step="1" value="0" style="width: 3.44rem; background: ${DS.colors.surface}; color: ${DS.colors.textPrimary}; border: 1px solid ${DS.colors.border}; border-radius: ${DS.borders.radius.none}; padding: ${DS.spacing.sm} ${DS.spacing.md}; font-size: ${DS.typography.tiny}; text-align: right; font-family: ${DS.typography.fontFamilyMono};">
                </div>
            </div>
        </div>

        <div style="display: flex; gap: ${DS.spacing.md}; margin-top: ${DS.spacing.xl};">
            <button id="editor-save" style="flex: 1; padding: ${DS.spacing.md}; background: ${DS.colors.success}; color: black; border: none; font-weight: ${DS.typography.weightBold}; cursor: pointer; border-radius: ${DS.borders.radius.none}; font-family: ${DS.typography.fontFamilyMono}; font-size: ${DS.typography.tiny}; text-transform: uppercase;">Save Local</button>
            <button id="editor-export" style="flex: 1; padding: ${DS.spacing.md}; background: ${DS.colors.info}; color: white; border: none; font-weight: ${DS.typography.weightBold}; cursor: pointer; border-radius: ${DS.borders.radius.none}; font-family: ${DS.typography.fontFamilyMono}; font-size: ${DS.typography.tiny}; text-transform: uppercase;">Export JSON</button>
        </div>
        <div style="display: flex; gap: ${DS.spacing.md}; margin-top: ${DS.spacing.md};">
            <button id="editor-reset" style="flex: 1; padding: ${DS.spacing.md}; background: ${DS.colors.danger}; color: white; border: none; font-weight: ${DS.typography.weightBold}; cursor: pointer; border-radius: ${DS.borders.radius.none}; font-family: ${DS.typography.fontFamilyMono}; font-size: ${DS.typography.tiny}; text-transform: uppercase;">Reset Default</button>
            <button id="editor-close" style="flex: 1; padding: ${DS.spacing.md}; background: ${DS.colors.surface}; color: white; border: 1px solid ${DS.colors.border}; cursor: pointer; border-radius: ${DS.borders.radius.none}; font-family: ${DS.typography.fontFamilyMono}; font-size: ${DS.typography.tiny}; text-transform: uppercase;">Close</button>
        </div>`;
    editorBar.appendChild(contentWrapper);
    hudContainer.appendChild(editorBar);

    const FRIENDLY_NAMES: Record<string, string> = {
        'btn-match-status': 'Match Status',
        'hud-timer-container': 'Round Timer',
        'minimap-container': 'Minimap',
        'minimap-label': 'Minimap Location',
        'btn-settings': 'Settings Button',
        'btn-mic': 'Microphone Button',
        'btn-chat': 'Chat Button',
        'joystick-boundary': 'Movement Stick',
        'btn-sprint': 'Sprint Button',
        'btn-fire-left': 'Fire (Left)',
        'health-bar': 'Health Bar',
        'health-plus-sq-wrap': 'Health Icon',
        'weapon-selector': 'Weapon HUD Container',
        'btn-walkie': 'Utility 1 (Walkie)',
        'btn-helmet': 'Utility 2 (Helmet)',
        'weapon-slots-wrap': 'Weapon Slots',
        'btn-medkit': 'Medkit Button',
        'medkit-arrow': 'Medkit Selector Arrow',
        'btn-fire-right': 'Fire (Right)',
        'btn-ads': 'Aim (ADS)',
        'btn-reload': 'Reload Button',
        'btn-jump': 'Jump Button',
        'btn-crouch': 'Crouch Button',
        'btn-dash': 'Dash Button',
        'auto-label': 'Fire Mode Label',
        'compass-placeholder': 'Compass Bar',
        'center-crosshair': 'Crosshair'
    };

    const circularIds = new Set([
        "btn-match-status", "joystick-boundary", "btn-sprint", "btn-fire-left", "btn-fire-right", 
        "btn-ads", "btn-reload", "btn-jump", "btn-dash", "btn-crouch", 
        "btn-walkie", "btn-helmet", "btn-medkit"
    ]);

    // Draggable logic for the editor bar
    let editorDrag = false;
    let edStartX = 0, edStartY = 0;
    let edStartLeft = 0, edStartTop = 0;
    
    editorBar.addEventListener('pointerdown', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('button') || target.closest('input')) return;
        
        editorDrag = true;
        editorBar.style.cursor = "grabbing";
        if (dragHandle) dragHandle.style.background = DS.colors.success;
        
        const rect = editorBar.getBoundingClientRect();
        edStartX = e.clientX;
        edStartY = e.clientY;
        edStartLeft = rect.left;
        edStartTop = rect.top;
        
        e.preventDefault();
        e.stopPropagation();
    });

    window.addEventListener('pointermove', (e) => {
        if (!editorDrag) return;
        
        const dx = e.clientX - edStartX;
        const dy = e.clientY - edStartY;
        
        let newLeft = edStartLeft + dx;
        let newTop = edStartTop + dy;
        
        // Clamp to viewport
        const rect = editorBar.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));
        
        editorBar.style.left = `${newLeft}px`;
        editorBar.style.top = `${newTop}px`;
        editorBar.style.right = "auto";
        editorBar.style.bottom = "auto";
    });

    window.addEventListener('pointerup', () => {
        editorDrag = false;
        editorBar.style.cursor = "grab";
        if (dragHandle) dragHandle.style.background = DS.utils.rgba(DS.colors.textSecondary, 0.3);
    });

    // Create Background Reference Image
    const bgImage = document.createElement('div');
    bgImage.id = "editor-bg-image";
    bgImage.style.position = "fixed";
    bgImage.style.inset = "0";
    bgImage.style.zIndex = "-1";
    bgImage.style.backgroundRepeat = "no-repeat";
    bgImage.style.backgroundSize = "cover";
    bgImage.style.backgroundPosition = "center";
    bgImage.style.display = "none";
    bgImage.style.pointerEvents = "none";
    
    hudContainer.prepend(bgImage);

    // Create Visual Grid Overlay
    const gridOverlay = document.createElement("div");
    gridOverlay.id = "editor-grid-overlay";
    gridOverlay.style.position = "fixed";
    gridOverlay.style.inset = "0";
    gridOverlay.style.zIndex = "1"; // Above background, below HUD controls
    gridOverlay.style.pointerEvents = "none";
    gridOverlay.style.display = "none";
    hudContainer.appendChild(gridOverlay);

    const updateVisualGrid = () => {
        if (showVisualGrid && gridSnapSize >= 4) {
            gridOverlay.style.display = "block";
            const opacity = gridSnapSize < 10 ? 0.04 : 0.1;
            gridOverlay.style.backgroundImage = `
                linear-gradient(to right, ${DS.utils.rgba(DS.colors.text, opacity)} 1px, transparent 1px),
                linear-gradient(to bottom, ${DS.utils.rgba(DS.colors.text, opacity)} 1px, transparent 1px)
            `;
            gridOverlay.style.backgroundSize = `${gridSnapSize}px ${gridSnapSize}px`;
            gridOverlay.style.backgroundPosition = `${gridOffsetX}px ${gridOffsetY}px`;
        } else {
            gridOverlay.style.display = "none";
        }
    };

    const updateRefImage = () => {
        bgImage.style.opacity = refOpacity.toString();
        bgImage.style.backgroundSize = `${refScale}%`;
        bgImage.style.backgroundPosition = `calc(50% + ${refOffsetX}px) calc(50% + ${refOffsetY}px)`;
    };

    const editableIds = [
        "btn-match-status",
        "hud-timer-container",
        "minimap-container",
        "minimap-label",
        "btn-settings",
        "btn-mic",
        "btn-chat",
        "joystick-boundary",
        "btn-sprint",
        "btn-fire-left",
        "weapon-slots-wrap",
        "btn-walkie",
        "btn-helmet",
        "btn-medkit",
        "medkit-arrow",
        "compass-placeholder",
        "auto-label",
        "health-bar",
        "health-plus-sq-wrap",
        "btn-fire-right",
        "btn-ads",
        "btn-reload",
        "btn-jump",
        "btn-dash",
        "btn-crouch",
        "hud-chat-log"
    ];

    let elementsToEdit = editableIds.map(id => document.getElementById(id)).filter(el => el !== null) as HTMLElement[];

    const closeEditorBtn = editorBar.querySelector("#editor-close") as HTMLButtonElement;
    const selectedLabel = editorBar.querySelector("#editor-selected") as HTMLElement;
    
    // Tab Selectors
    const tabElement = editorBar.querySelector("#tab-element") as HTMLButtonElement;
    const tabGrid = editorBar.querySelector("#tab-grid") as HTMLButtonElement;
    const panelElement = editorBar.querySelector("#panel-element") as HTMLElement;
    const panelGrid = editorBar.querySelector("#panel-grid") as HTMLElement;

    tabElement.addEventListener("click", () => {
        tabElement.style.background = "#22c55e";
        tabElement.style.color = "black";
        tabGrid.style.background = "transparent";
        tabGrid.style.color = "#888";
        panelElement.style.display = "flex";
        panelGrid.style.display = "none";
    });

    tabGrid.addEventListener("click", () => {
        tabGrid.style.background = "#22c55e";
        tabGrid.style.color = "black";
        tabElement.style.background = "transparent";
        tabElement.style.color = "#888";
        panelGrid.style.display = "flex";
        panelElement.style.display = "none";
    });

    // Element Panel Inputs
    const scaleSlider = editorBar.querySelector("#editor-scale") as HTMLInputElement;
    const scaleNum = editorBar.querySelector("#editor-scale-num") as HTMLInputElement;
    const widthSlider = editorBar.querySelector("#editor-width") as HTMLInputElement;
    const widthNum = editorBar.querySelector("#editor-width-num") as HTMLInputElement;
    const heightSlider = editorBar.querySelector("#editor-height") as HTMLInputElement;
    const heightNum = editorBar.querySelector("#editor-height-num") as HTMLInputElement;
    
    const leftSlider = editorBar.querySelector("#editor-left") as HTMLInputElement;
    const leftNum = editorBar.querySelector("#editor-left-num") as HTMLInputElement;
    const topSlider = editorBar.querySelector("#editor-top") as HTMLInputElement;
    const topNum = editorBar.querySelector("#editor-top-num") as HTMLInputElement;

    const stepSlider = editorBar.querySelector("#editor-step") as HTMLInputElement;
    const stepNum = editorBar.querySelector("#editor-step-num") as HTMLInputElement;

    const sizeWrap = editorBar.querySelector("#editor-size-wrap") as HTMLElement;
    const dimWrap = editorBar.querySelector("#editor-dim-wrap") as HTMLElement;
    
    // Grid & Ref Panel Inputs
    const gridSnapSlider = editorBar.querySelector("#grid-snap") as HTMLInputElement;
    const gridSnapNum = editorBar.querySelector("#grid-snap-num") as HTMLInputElement;
    const gridOffsetXSlider = editorBar.querySelector("#grid-offset-x") as HTMLInputElement;
    const gridOffsetXNum = editorBar.querySelector("#grid-offset-x-num") as HTMLInputElement;
    const gridOffsetYSlider = editorBar.querySelector("#grid-offset-y") as HTMLInputElement;
    const gridOffsetYNum = editorBar.querySelector("#grid-offset-y-num") as HTMLInputElement;
    const showGridCheckbox = editorBar.querySelector("#show-grid-checkbox") as HTMLInputElement;

    const refOpacitySlider = editorBar.querySelector("#ref-opacity") as HTMLInputElement;
    const refOpacityNum = editorBar.querySelector("#ref-opacity-num") as HTMLInputElement;
    const refScaleSlider = editorBar.querySelector("#ref-scale") as HTMLInputElement;
    const refScaleNum = editorBar.querySelector("#ref-scale-num") as HTMLInputElement;
    const refOffsetXSlider = editorBar.querySelector("#ref-offset-x") as HTMLInputElement;
    const refOffsetXNum = editorBar.querySelector("#ref-offset-x-num") as HTMLInputElement;
    const refOffsetYSlider = editorBar.querySelector("#ref-offset-y") as HTMLInputElement;
    const refOffsetYNum = editorBar.querySelector("#ref-offset-y-num") as HTMLInputElement;

    const exportBtn = editorBar.querySelector("#editor-export") as HTMLButtonElement;
    const saveBtn = editorBar.querySelector("#editor-save") as HTMLButtonElement;
    const resetBtn = editorBar.querySelector("#editor-reset") as HTMLButtonElement;

    // Helper for Bidirectional Slider-Number sync
    const bindSliderAndNumber = (
        slider: HTMLInputElement,
        numInput: HTMLInputElement,
        onChange: (val: number) => void,
        decimalPlaces = 0
    ) => {
        slider.addEventListener("input", (e: any) => {
            const val = parseFloat(e.target.value);
            numInput.value = val.toFixed(decimalPlaces);
            onChange(val);
        });
        numInput.addEventListener("input", (e: any) => {
            let val = parseFloat(e.target.value);
            if (isNaN(val)) return;
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            if (val < min) val = min;
            if (val > max) val = max;
            slider.value = val.toString();
            onChange(val);
        });
    };

    // Load from local storage or fallback to default preferred layout
    let savedConfigRaw = localStorage.getItem("hud_layout");
    if (!savedConfigRaw) {
        // User's default preferred layout
        const defaultLayout = {
  "squad-container": {
    "left": "0.54vw",
    "top": "0.75vh",
    "scale": 1.2
  },
  "hud-timer-container": {
    "left": "15.57vw",
    "top": "2.59vh",
    "scale": 1,
    "width": "5.74vw",
    "height": "1.89vh"
  },
  "minimap-container": {
    "left": "30.87vw",
    "top": "1.85vh",
    "scale": 1,
    "width": "4.42vw",
    "height": "8.06vh"
  },
  "minimap-label": {
    "left": "30.95vw",
    "top": "10.19vh",
    "scale": 1
  },
  "btn-settings": {
    "left": "29.34vw",
    "top": "1.20vh",
    "scale": 1,
    "width": "1.49vw",
    "height": "3.15vh"
  },
  "btn-mic": {
    "left": "29.34vw",
    "top": "6.85vh",
    "scale": 1,
    "width": "1.49vw",
    "height": "3.15vh"
  },
  "btn-chat": {
    "left": "29.34vw",
    "top": "3.98vh",
    "scale": 1,
    "width": "1.49vw",
    "height": "3.15vh"
  },
  "joystick-boundary": {
    "left": "4.20vw",
    "top": "21.67vh",
    "scale": 0.6
  },
  "btn-sprint": {
    "left": "7.14vw",
    "top": "16.56vh",
    "scale": 1
  },
  "btn-fire-left": {
    "left": "1.49vw",
    "top": "14.81vh",
    "scale": 1.2
  },
  "weapon-slots-wrap": {
    "left": "16.53vw",
    "top": "28.15vh",
    "scale": 1,
    "width": "7.72vw",
    "height": "2.59vh"
  },
  "btn-walkie": {
    "left": "12.94vw",
    "top": "26.11vh",
    "scale": 1.22
  },
  "btn-helmet": {
    "left": "15.04vw",
    "top": "28.33vh",
    "scale": 0.58,
    "width": "2.80vw",
    "height": "5.93vh"
  },
  "btn-medkit": {
    "left": "25.27vw",
    "top": "29.07vh",
    "scale": 0.6
  },
  "medkit-arrow": {
    "left": "25.58vw",
    "top": "27.78vh",
    "scale": 1,
    "width": "1.05vw",
    "height": "2.22vh"
  },
  "compass-placeholder": {
    "left": "14.87vw",
    "top": "1.11vh",
    "scale": 1,
    "width": "7.21vw",
    "height": "3.31vh"
  },
  "auto-label": {
    "left": "17.58vw",
    "top": "26.67vh",
    "scale": 1,
    "width": "2.65vw"
  },
  "health-bar": {
    "left": "14.60vw",
    "top": "32.59vh",
    "scale": 0.8,
    "width": "10.06vw",
    "height": "0.93vh"
  },
  "health-plus-sq-wrap": {
    "left": "13.29vw",
    "top": "31.30vh",
    "scale": 2.9,
    "width": "1.33vw",
    "height": "3.29vh"
  },
  "btn-fire-right": {
    "left": "30.78vw",
    "top": "21.48vh",
    "scale": 0.6
  },
  "btn-ads": {
    "left": "32.53vw",
    "top": "17.22vh",
    "scale": 0.62
  },
  "btn-reload": {
    "left": "28.86vw",
    "top": "25.37vh",
    "scale": 0.95
  },
  "btn-jump": {
    "left": "29.47vw",
    "top": "30.19vh",
    "scale": 0.6
  },
  "btn-crouch": {
    "left": "31.48vw",
    "top": "29.26vh",
    "scale": 0.85
  }
};
        savedConfigRaw = JSON.stringify(defaultLayout);
    }

    if (savedConfigRaw) {
        try {
            const config = JSON.parse(savedConfigRaw);
            elementsToEdit.forEach(el => {
                if (config[el.id]) {
                    const saved = config[el.id];
                    el.style.setProperty('position', 'absolute', 'important');
                    el.style.setProperty('left', saved.left, 'important');
                    el.style.setProperty('top', saved.top, 'important');
                    el.style.setProperty('right', 'auto', 'important');
                    el.style.setProperty('bottom', 'auto', 'important');
                    el.style.setProperty('margin', '0', 'important');
                    
                    let w = el.getBoundingClientRect().width;
                    let h = el.getBoundingClientRect().height;
                    
                    if (circularIds.has(el.id)) {
                        el.style.setProperty('transform', `scale(${saved.scale})`, 'important');
                        el.style.setProperty('transform-origin', 'top left', 'important');
                    } else {
                        if (saved.width) {
                            el.style.setProperty('width', saved.width, 'important');
                            el.style.setProperty('min-width', saved.width, 'important');
                            w = parseFloat(saved.width);
                        }
                        if (saved.height) {
                            el.style.setProperty('height', saved.height, 'important');
                            el.style.setProperty('min-height', saved.height, 'important');
                            h = parseFloat(saved.height);
                        }
                        el.style.setProperty('transform', 'none', 'important');
                    }

                    const parsePosPx = (val: string | number | undefined, isWidthHeight: boolean, isVertical: boolean): number => {
                        if (val === undefined) return 0;
                        if (typeof val === 'number') return val;
                        const num = parseFloat(val) || 0;
                        if (val.endsWith('vw')) return (num / 100) * window.innerWidth;
                        if (val.endsWith('vh')) return (num / 100) * window.innerHeight;
                        if (val.endsWith('%')) return (num / 100) * (isVertical ? window.innerHeight : window.innerWidth);
                        return num;
                    };

                    elementStates.set(el, { 
                        leftPx: parsePosPx(saved.left, false, false), 
                        topPx: parsePosPx(saved.top, false, true), 
                        scale: saved.scale || 1,
                        widthPx: w,
                        heightPx: h
                    });
                }
            });
        } catch (err) {}
    }

    const isOverlappingAny = (el: HTMLElement, x: number, y: number, w: number, h: number): boolean => {
        const rect1 = { left: x, top: y, right: x + w, bottom: y + h };
        for (const other of elementsToEdit) {
            if (other === el || other.style.display === 'none') continue;
            const otherState = elementStates.get(other);
            if (!otherState) continue;
            const otherW = otherState.widthPx || other.getBoundingClientRect().width;
            const otherH = otherState.heightPx || other.getBoundingClientRect().height;
            const rect2 = {
                left: otherState.leftPx,
                top: otherState.topPx,
                right: otherState.leftPx + otherW,
                bottom: otherState.topPx + otherH
            };
            
            // Check if they overlap
            if (rect1.left < rect2.right && rect1.right > rect2.left &&
                rect1.top < rect2.bottom && rect1.bottom > rect2.top) {
                return true;
            }
        }
        return false;
    };

    const onPointerDown = (e: PointerEvent) => {
        if (!isEditing) return;
        const target = e.currentTarget as HTMLElement;
        e.preventDefault();
        e.stopPropagation();

        selectedElement = target;
        const friendly = FRIENDLY_NAMES[target.id] || target.id;
        selectedLabel.innerText = `Selected: ${friendly}`;
        
        const state = elementStates.get(target);
        if (state) {
            leftSlider.disabled = false;
            leftNum.disabled = false;
            topSlider.disabled = false;
            topNum.disabled = false;

            const leftVw = (state.leftPx / window.innerWidth) * 100;
            const topVh = (state.topPx / window.innerHeight) * 100;

            leftSlider.value = leftVw.toString();
            leftNum.value = leftVw.toFixed(2);
            topSlider.value = topVh.toString();
            topNum.value = topVh.toFixed(2);

            if (circularIds.has(target.id)) {
                if (sizeWrap) sizeWrap.style.display = "flex";
                if (dimWrap) dimWrap.style.display = "none";
                scaleSlider.disabled = false;
                scaleNum.disabled = false;
                widthSlider.disabled = true;
                widthNum.disabled = true;
                heightSlider.disabled = true;
                heightNum.disabled = true;

                scaleSlider.value = state.scale.toString();
                scaleNum.value = state.scale.toFixed(2);
            } else {
                if (sizeWrap) sizeWrap.style.display = "none";
                if (dimWrap) dimWrap.style.display = "flex";
                scaleSlider.disabled = true;
                scaleNum.disabled = true;
                widthSlider.disabled = false;
                widthNum.disabled = false;
                heightSlider.disabled = false;
                heightNum.disabled = false;

                const widthVw = state.widthPx ? (state.widthPx / window.innerWidth) * 100 : 10;
                const heightVh = state.heightPx ? (state.heightPx / window.innerHeight) * 100 : 10;

                widthSlider.value = widthVw.toString();
                widthNum.value = widthVw.toFixed(2);
                heightSlider.value = heightVh.toString();
                heightNum.value = heightVh.toFixed(2);
            }
        }

        // Highlight
        elementsToEdit.forEach(el => el.style.outline = "none");
        target.style.outline = "2px dashed #22c55e";

        startX = e.clientX;
        startY = e.clientY;
        if (state) {
            startLeft = state.leftPx;
            startTop = state.topPx;
        }

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
    };

    const onPointerMove = (e: PointerEvent) => {
        if (!isEditing || !selectedElement) return;
        e.preventDefault();
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        const state = elementStates.get(selectedElement);
        if (state) {
            let targetLeftPx = startLeft + dx;
            let targetTopPx = startTop + dy;

            // Bounds constraint to prevent off-screen positioning
            const w = state.widthPx || selectedElement.getBoundingClientRect().width;
            const h = state.heightPx || selectedElement.getBoundingClientRect().height;

            targetLeftPx = Math.max(0, Math.min(targetLeftPx, window.innerWidth - w));
            targetTopPx = Math.max(0, Math.min(targetTopPx, window.innerHeight - h));

            state.leftPx = getGridSnap(targetLeftPx, gridSnapSize, gridOffsetX);
            state.topPx = getGridSnap(targetTopPx, gridSnapSize, gridOffsetY);

            const leftVw = (state.leftPx / window.innerWidth) * 100;
            const topVh = (state.topPx / window.innerHeight) * 100;

            selectedElement.style.setProperty('left', `${leftVw.toFixed(2)}vw`, 'important');
            selectedElement.style.setProperty('top', `${topVh.toFixed(2)}vh`, 'important');

            // Enforce real-time zero-overlapping visual indicator
            const isOverlapping = isOverlappingAny(selectedElement, state.leftPx, state.topPx, w, h);
            if (isOverlapping) {
                selectedElement.style.outline = "2px dashed #ef4444";
            } else {
                selectedElement.style.outline = "2px dashed #22c55e";
            }

            // Synchronize control panel input values live!
            leftSlider.value = leftVw.toString();
            leftNum.value = leftVw.toFixed(2);
            topSlider.value = topVh.toString();
            topNum.value = topVh.toFixed(2);
        }
    };

    const onPointerUp = (e: PointerEvent) => {
        if (!isEditing || !selectedElement) return;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
    };

    // Bind slider step controller
    bindSliderAndNumber(stepSlider, stepNum, (val) => {
        scaleSlider.step = (val / 10).toString();
        scaleNum.step = (val / 10).toString();
        widthSlider.step = val.toString();
        widthNum.step = val.toString();
        heightSlider.step = val.toString();
        heightNum.step = val.toString();
        leftSlider.step = val.toString();
        leftNum.step = val.toString();
        topSlider.step = val.toString();
        topNum.step = val.toString();
    }, 1);

    // Bind element position & properties controllers
    bindSliderAndNumber(leftSlider, leftNum, (val) => {
        if (!selectedElement) return;
        const state = elementStates.get(selectedElement);
        if (state) {
            state.leftPx = (val / 100) * window.innerWidth;
            selectedElement.style.setProperty('left', `${val.toFixed(2)}vw`, 'important');

            // Highlight with outline if it overlaps
            const w = state.widthPx || selectedElement.getBoundingClientRect().width;
            const h = state.heightPx || selectedElement.getBoundingClientRect().height;
            const isOverlapping = isOverlappingAny(selectedElement, state.leftPx, state.topPx, w, h);
            selectedElement.style.outline = isOverlapping ? "2px dashed #ef4444" : "2px dashed #22c55e";
        }
    }, 2);

    bindSliderAndNumber(topSlider, topNum, (val) => {
        if (!selectedElement) return;
        const state = elementStates.get(selectedElement);
        if (state) {
            state.topPx = (val / 100) * window.innerHeight;
            selectedElement.style.setProperty('top', `${val.toFixed(2)}vh`, 'important');

            // Highlight with outline if it overlaps
            const w = state.widthPx || selectedElement.getBoundingClientRect().width;
            const h = state.heightPx || selectedElement.getBoundingClientRect().height;
            const isOverlapping = isOverlappingAny(selectedElement, state.leftPx, state.topPx, w, h);
            selectedElement.style.outline = isOverlapping ? "2px dashed #ef4444" : "2px dashed #22c55e";
        }
    }, 2);

    bindSliderAndNumber(scaleSlider, scaleNum, (val) => {
        if (!selectedElement) return;
        const state = elementStates.get(selectedElement);
        if (state && circularIds.has(selectedElement.id)) {
            state.scale = val;
            selectedElement.style.setProperty('transform', `scale(${val})`, 'important');
            selectedElement.style.setProperty('transform-origin', 'top left', 'important');
        }
    }, 2);

    bindSliderAndNumber(widthSlider, widthNum, (val) => {
        if (!selectedElement) return;
        const state = elementStates.get(selectedElement);
        if (state && !circularIds.has(selectedElement.id)) {
            state.widthPx = (val / 100) * window.innerWidth;
            selectedElement.style.setProperty('width', `${val.toFixed(2)}vw`, 'important');
            selectedElement.style.setProperty('min-width', `${val.toFixed(2)}vw`, 'important');

            // Highlight with outline if it overlaps
            const h = state.heightPx || selectedElement.getBoundingClientRect().height;
            const isOverlapping = isOverlappingAny(selectedElement, state.leftPx, state.topPx, state.widthPx, h);
            selectedElement.style.outline = isOverlapping ? "2px dashed #ef4444" : "2px dashed #22c55e";
        }
    }, 2);

    bindSliderAndNumber(heightSlider, heightNum, (val) => {
        if (!selectedElement) return;
        const state = elementStates.get(selectedElement);
        if (state && !circularIds.has(selectedElement.id)) {
            state.heightPx = (val / 100) * window.innerHeight;
            selectedElement.style.setProperty('height', `${val.toFixed(2)}vh`, 'important');
            selectedElement.style.setProperty('min-height', `${val.toFixed(2)}vh`, 'important');

            // Highlight with outline if it overlaps
            const w = state.widthPx || selectedElement.getBoundingClientRect().width;
            const isOverlapping = isOverlappingAny(selectedElement, state.leftPx, state.topPx, w, state.heightPx);
            selectedElement.style.outline = isOverlapping ? "2px dashed #ef4444" : "2px dashed #22c55e";
        }
    }, 2);

    // Bind Grid Controllers
    bindSliderAndNumber(gridSnapSlider, gridSnapNum, (val) => {
        gridSnapSize = val;
        updateVisualGrid();
    }, 0);

    bindSliderAndNumber(gridOffsetXSlider, gridOffsetXNum, (val) => {
        gridOffsetX = val;
        updateVisualGrid();
    }, 0);

    bindSliderAndNumber(gridOffsetYSlider, gridOffsetYNum, (val) => {
        gridOffsetY = val;
        updateVisualGrid();
    }, 0);

    showGridCheckbox.addEventListener("change", (e: any) => {
        showVisualGrid = e.target.checked;
        updateVisualGrid();
    });

    // Bind Reference Image Controllers
    bindSliderAndNumber(refOpacitySlider, refOpacityNum, (val) => {
        refOpacity = val;
        updateRefImage();
    }, 2);

    bindSliderAndNumber(refScaleSlider, refScaleNum, (val) => {
        refScale = val;
        updateRefImage();
    }, 0);

    bindSliderAndNumber(refOffsetXSlider, refOffsetXNum, (val) => {
        refOffsetX = val;
        updateRefImage();
    }, 0);

    bindSliderAndNumber(refOffsetYSlider, refOffsetYNum, (val) => {
        refOffsetY = val;
        updateRefImage();
    }, 0);

    (window as any).vexeaEditUI = () => {
        hideAll();
        StudioPreviewManager.detach();
    	const s = (window as any).vexeaSettings || {};
        const refImg = s.referenceImage || getAssetUrl("file_00000000cdd071f48495d22753c89fa1.webp");
        bgImage.style.backgroundImage = `url('${refImg}')`;
        hudContainer.style.setProperty("display", "block", "important");
        if (settingsModal) settingsModal.style.display = "none";
        isEditing = true;
        editorBar.style.display = "flex";
        bgImage.style.display = "block";
        (window as any).isEditMode = true; // Flag for main.ts 
        document.body.classList.add("ui-editor-active");
        
        const canvasContainer = document.getElementById("canvas-container");
        if (canvasContainer) {
            canvasContainer.style.display = "none";
        }
        
        // Rebuild editable elements dynamically to register those created during gameplay
        elementsToEdit = editableIds.map(id => document.getElementById(id)).filter(el => el !== null) as HTMLElement[];

        // Show/refresh grid and ref image according to saved inputs
        showVisualGrid = showGridCheckbox.checked;
        updateVisualGrid();
        updateRefImage();

        elementsToEdit.forEach(el => {
            if (!elementStates.has(el)) {
                // Initialize clean pixel positions the first time we enter edit mode
                const rect = el.getBoundingClientRect();
                const parentRect = hudContainer.getBoundingClientRect();
                const left = rect.left - parentRect.left;
                const top = rect.top - parentRect.top;

                el.style.setProperty('position', 'absolute', 'important');
                el.style.setProperty('left', `${left}px`, 'important');
                el.style.setProperty('top', `${top}px`, 'important');
                el.style.setProperty('right', 'auto', 'important');
                el.style.setProperty('bottom', 'auto', 'important');
                el.style.setProperty('margin', '0', 'important');
                
                if (circularIds.has(el.id)) {
                    el.style.setProperty('transform', 'scale(1)', 'important');
                    el.style.setProperty('transform-origin', 'top left', 'important');
                } else {
                    el.style.setProperty('transform', 'none', 'important');
                }
                
                elementStates.set(el, { 
                    leftPx: left, 
                    topPx: top, 
                    scale: 1,
                    widthPx: rect.width,
                    heightPx: rect.height
                });
            }

            el.addEventListener("pointerdown", onPointerDown as any);
            el.style.setProperty('pointer-events', 'auto', 'important');
            el.style.cursor = "move";
            el.style.outline = `1px solid ${DS.utils.rgba(DS.colors.text, 0.3)}`;
            if (el.id === "btn-sprint") {
                el.style.setProperty('display', 'flex', 'important');
            }
        });
    };

    closeEditorBtn.addEventListener("click", () => {
        isEditing = false;
        editorBar.style.display = "none";
        bgImage.style.display = "none";
        gridOverlay.style.display = "none";
        selectedElement = null;
        selectedLabel.innerText = "Selected: None";
        
        leftSlider.disabled = true; leftNum.disabled = true;
        topSlider.disabled = true; topNum.disabled = true;
        scaleSlider.disabled = true; scaleNum.disabled = true;
        widthSlider.disabled = true; widthNum.disabled = true;
        heightSlider.disabled = true; heightNum.disabled = true;
        (window as any).isEditMode = false;
        document.body.classList.remove("ui-editor-active");

        // Hide HUD container if not in active match
        if ((window as any).gameState !== "ACTIVE_MATCH") {
            hudContainer.style.setProperty("display", "none", "important");
            showMainMenu();
        }

        const canvasContainer = document.getElementById("canvas-container");
        if (canvasContainer) {
            canvasContainer.style.display = "";
        }

        elementsToEdit.forEach(el => {
            el.removeEventListener("pointerdown", onPointerDown as any);
            el.style.cursor = "";
            el.style.outline = "none";
            if (el.id === "btn-sprint") {
                el.style.setProperty('display', 'none', 'important');
            }
        });
    });

    const buildLayoutConfig = () => {
        const config: Record<string, any> = {};
        elementsToEdit.forEach(el => {
            const state = elementStates.get(el);
            let leftVal = el.style.left;
            let topVal = el.style.top;
            let widthVal = state && state.widthPx ? `${state.widthPx}px` : undefined;
            let heightVal = state && state.heightPx ? `${state.heightPx}px` : undefined;

            if (state) {
                leftVal = `${((state.leftPx / window.innerWidth) * 100).toFixed(2)}vw`;
                topVal = `${((state.topPx / window.innerHeight) * 100).toFixed(2)}vh`;

                if (state.widthPx && !circularIds.has(el.id)) {
                    widthVal = `${((state.widthPx / window.innerWidth) * 100).toFixed(2)}vw`;
                }
                if (state.heightPx && !circularIds.has(el.id)) {
                    heightVal = `${((state.heightPx / window.innerHeight) * 100).toFixed(2)}vh`;
                }
            }

            config[el.id] = {
                left: leftVal,
                top: topVal,
                scale: state ? state.scale : 1,
                width: widthVal,
                height: heightVal
            };
        });
        return config;
    };

    exportBtn.addEventListener("click", () => {
        const config = buildLayoutConfig();
        const configStr = JSON.stringify(config, null, 2);
        localStorage.setItem("hud_layout_default", configStr); // Make exported config the new default
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(configStr);
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "hud_layout.json");
        dlAnchorElem.click();
    });

    saveBtn.addEventListener("click", () => {
        const config = buildLayoutConfig();
        localStorage.setItem("hud_layout", JSON.stringify(config));
        
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "SAVED!";
        saveBtn.style.background = "#ffffff";
        saveBtn.style.color = "#000000";
        setTimeout(() => {
            saveBtn.innerText = originalText;
            saveBtn.style.background = "#22c55e";
            saveBtn.style.color = "black";
        }, 1500);
    });

    resetBtn.addEventListener("click", () => {
        localStorage.removeItem("hud_layout_default");
        localStorage.removeItem("hud_layout");
        location.reload();
    });

    window.addEventListener('resize', () => {
        if (!isEditing) return;
        elementsToEdit.forEach(el => {
            const state = elementStates.get(el);
            if (state) {
                const rect = el.getBoundingClientRect();
                const parentRect = hudContainer.getBoundingClientRect();
                state.leftPx = rect.left - parentRect.left;
                state.topPx = rect.top - parentRect.top;
                state.widthPx = rect.width;
                state.heightPx = rect.height;
            }
        });
    });
};
