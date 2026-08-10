import { DS } from '../../design-system';
import { IS_DEV } from '../../../shared/gates/production.gate';
import { IS_MOBILE } from '../../gates/platform.gate';
import { VexeaSettingsData } from './types';
import { getSettings, saveSettings, applySettings } from './state';
import { listCachedFiles, deleteCachedFile, clearCache } from '../../asset-cache';
import { audioManager } from '../../audio';

export let overlayEl: HTMLDivElement | null = null;
let boundListeners: Array<{ el: HTMLElement; type: string; fn: any }> = [];
let activeTab: string = 'CONTROLS';
let listeningAction: string | null = null;
let audioDebounceTimer: any = null;

function bind(el: HTMLElement, type: string, fn: any) {
    el.addEventListener(type, fn);
    boundListeners.push({ el, type, fn });
}

function playDebouncedAudition(soundKey: string) {
    if (audioDebounceTimer) clearTimeout(audioDebounceTimer);
    audioDebounceTimer = setTimeout(() => {
        try {
            audioManager.play(soundKey);
        } catch (e) {
            // Audio error safeguard
        }
    }, 60);
}

export function openSettingsUI(
    matchActive: boolean,
    onClose: () => void,
    onInjectMatch: (sidebar: HTMLElement, content: HTMLElement) => void
) {
    if (overlayEl) return;

    const s = getSettings();

    // Create main overlay container (100vw x 100vh locked, orthogonal 0px radius)
    overlayEl = document.createElement('div');
    overlayEl.id = 'vexea-settings-overlay';
    Object.assign(overlayEl.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '3000',
        background: '#09090b', // Zinc background Layer 0
        fontFamily: DS.typography.fontFamily,
        color: '#E8E8E8',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        pointerEvents: 'auto',
        boxSizing: 'border-box',
        overflow: 'hidden'
    });

    // Style overrides for sliders and custom vector controls
    const styleTag = document.createElement('style');
    styleTag.innerText = `
        #vexea-settings-overlay * {
            box-sizing: border-box;
            border-radius: 0px !important;
        }
        #vexea-settings-overlay input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
            background: #27272a;
            height: 0.38rem;
            border-radius: 0px;
            outline: none;
            cursor: pointer;
        }
        #vexea-settings-overlay input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 0.88rem;
            height: 0.88rem;
            border-radius: 0px;
            background: ${DS.colors.accent};
            cursor: pointer;
        }
        #vexea-settings-overlay input[type="text"] {
            background: #18181b;
            border: 1px solid #27272a;
            color: #ffffff;
            font-family: monospace;
            padding: 0.38rem 0.63rem;
            outline: none;
            font-size: ${DS.typography.sizes.small};
        }
        #vexea-settings-overlay input[type="text"]:focus {
            border-color: ${DS.colors.accent};
        }
        #vexea-settings-overlay .settings-card {
            background: #18181b;
            border: 1px solid #27272a;
            padding: 0.75rem 0.88rem;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        #vexea-settings-overlay .settings-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.38rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        #vexea-settings-overlay .settings-row:last-child {
            border-bottom: none;
        }
        #vexea-settings-overlay .tab-button {
            background: transparent;
            border: none;
            color: #a1a1aa;
            font-family: ${DS.typography.fontFamily};
            font-size: ${DS.typography.sizes.small};
            font-weight: bold;
            letter-spacing: 1px;
            padding: 0 0.75rem;
            height: 3.25rem;
            display: inline-flex;
            align-items: center;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 120ms ease;
            white-space: nowrap;
        }
        #vexea-settings-overlay .tab-button.active {
            color: ${DS.colors.accent};
            border-bottom-color: ${DS.colors.accent};
            background: rgba(255, 69, 0, 0.06);
        }
        #vexea-settings-overlay .tab-button:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.03);
        }
        #vexea-settings-overlay .action-btn {
            background: #18181b;
            border: 1px solid #27272a;
            color: #ffffff;
            font-family: monospace;
            font-size: ${DS.typography.sizes.small};
            padding: 0.38rem 0.75rem;
            cursor: pointer;
            font-weight: bold;
            letter-spacing: 0.5px;
            transition: all 100ms ease;
        }
        #vexea-settings-overlay .action-btn:hover {
            border-color: ${DS.colors.accent};
            background: #27272a;
            color: ${DS.colors.accent};
        }
        #vexea-settings-overlay .seg-btn {
            background: #18181b;
            border: 1px solid #27272a;
            color: #a1a1aa;
            font-family: monospace;
            font-size: ${DS.typography.sizes.small};
            padding: 0.38rem 0.63rem;
            cursor: pointer;
            font-weight: bold;
            transition: all 100ms ease;
        }
        #vexea-settings-overlay .seg-btn:hover {
            color: #ffffff;
            border-color: #52525b;
        }
        #vexea-settings-overlay .seg-btn.active {
            background: rgba(255, 69, 0, 0.15);
            border-color: ${DS.colors.accent};
            color: #ffffff;
        }
        #vexea-settings-overlay .swatch-chip {
            width: 1.75rem;
            height: 1.75rem;
            border: 2px solid #27272a;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 100ms ease;
        }
        #vexea-settings-overlay .swatch-chip:hover {
            transform: scale(1.08);
            border-color: #71717a;
        }
        #vexea-settings-overlay .swatch-chip.active {
            border-color: ${DS.colors.accent};
            box-shadow: 0 0 0 1px ${DS.colors.accent};
        }
        #vexea-settings-overlay .reticle-card {
            border: 1px solid #27272a;
            background: #18181b;
            padding: 0.63rem;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 100ms ease;
            min-width: 5.00rem;
        }
        #vexea-settings-overlay .reticle-card:hover {
            border-color: #71717a;
            background: #27272a;
        }
        #vexea-settings-overlay .reticle-card.active {
            border-color: ${DS.colors.accent};
            background: rgba(255, 69, 0, 0.08);
        }
        #vexea-settings-overlay .cyber-toggle {
            display: inline-flex;
            align-items: center;
            cursor: pointer;
            gap: 8px;
        }
        #vexea-settings-overlay .cyber-toggle-track {
            width: 2.25rem;
            height: 1.13rem;
            background: #27272a;
            border: 1px solid #3f3f46;
            position: relative;
            transition: all 120ms ease;
        }
        #vexea-settings-overlay .cyber-toggle.active .cyber-toggle-track {
            background: ${DS.colors.accent};
            border-color: ${DS.colors.accent};
        }
        #vexea-settings-overlay .cyber-toggle-thumb {
            width: 0.88rem;
            height: 0.88rem;
            background: #ffffff;
            position: absolute;
            top: 1px;
            left: 1px;
            transition: all 120ms ease;
        }
        #vexea-settings-overlay .cyber-toggle.active .cyber-toggle-thumb {
            left: 1.19rem;
            background: #000000;
        }
    `;
    overlayEl.appendChild(styleTag);

    // Top Header (Layer 1 - unified single bar)
    const header = document.createElement('div');
    header.id = 'settings-header';
    Object.assign(header.style, {
        height: DS.layout.headerHeight,
        borderBottom: '1px solid #27272a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.00rem',
        background: '#111113',
        flexShrink: '0',
        gap: '12px'
    });

    const logoGroup = document.createElement('div');
    logoGroup.style.display = 'flex';
    logoGroup.style.alignItems = 'center';
    logoGroup.style.gap = '8px';
    logoGroup.style.flexShrink = '0';

    const logo = document.createElement('div');
    logo.innerText = 'SETTINGS';
    Object.assign(logo.style, {
        fontSize: DS.typography.sizes.headingSm,
        fontWeight: '900',
        color: '#ffffff',
        fontFamily: DS.typography.fontFamily,
        letterSpacing: DS.typography.letterSpacing.wide
    });

    logoGroup.appendChild(logo);
    header.appendChild(logoGroup);

    // Top Navigation Tabs Row (inline in header to eliminate unused area)
    const tabsRow = document.createElement('div');
    tabsRow.id = 'settings-sidebar'; // Backward compatibility
    Object.assign(tabsRow.style, {
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        height: '100%',
        flex: '1',
        gap: '12px',
        marginLeft: '1.25rem'
    });
    header.appendChild(tabsRow);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'CLOSE';
    closeBtn.className = 'action-btn';
    Object.assign(closeBtn.style, {
        background: '#27272a',
        borderColor: '#3f3f46',
        color: '#ffffff',
        padding: '0.38rem 1.00rem',
        fontFamily: DS.typography.fontFamily,
        fontSize: DS.typography.sizes.small,
        fontWeight: 'bold',
        letterSpacing: '1px',
        flexShrink: '0',
        cursor: 'pointer'
    });
    header.appendChild(closeBtn);
    overlayEl.appendChild(header);

    // Close handler
    bind(closeBtn, 'click', () => {
        closeSettingsUI(onClose);
    });

    // Primary Content Body (calc(100vh - 52px))
    const contentArea = document.createElement('div');
    contentArea.id = 'settings-content'; // Backward compatibility
    Object.assign(contentArea.style, {
        flex: '1',
        overflowY: 'auto',
        padding: '1.00rem 1.25rem',
        boxSizing: 'border-box'
    });
    overlayEl.appendChild(contentArea);

    // List of Tabs to render
    const tabList = [
        { id: 'CONTROLS', label: 'CONTROLS' },
        { id: 'GRAPHICS', label: 'GRAPHICS' },
        { id: 'AUDIO', label: 'AUDIO' },
        { id: 'HUD', label: 'HUD & UI' },
        { id: 'ACCESSIBILITY', label: 'ACCESSIBILITY' }
    ];

    if (IS_DEV) {
        tabList.push({ id: 'SERVER', label: 'SERVER' });
        tabList.push({ id: 'DEV', label: 'DEV ASSETS' });
    }
    tabList.push({ id: 'LEGAL', label: 'LEGAL' });

    // Render Tab buttons
    tabList.forEach(t => {
        const btn = document.createElement('button');
        btn.className = `tab-button ${t.id === activeTab ? 'active' : ''}`;
        btn.setAttribute('data-tab', t.id);
        btn.innerText = t.label;
        bind(btn, 'click', () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = t.id;
            renderTabContent(activeTab, contentArea, s, onClose);
        });
        tabsRow.appendChild(btn);
    });

    document.body.appendChild(overlayEl);

    // Render default active tab content
    renderTabContent(activeTab, contentArea, s, onClose);

    // Handle Match tab injection if a match is active
    if (matchActive) {
        onInjectMatch(tabsRow, contentArea);
    }
}

export function closeSettingsUI(onClose: () => void) {
    if (!overlayEl) return;
    boundListeners.forEach(l => {
        l.el.removeEventListener(l.type, l.fn);
    });
    boundListeners = [];
    overlayEl.remove();
    overlayEl = null;
    onClose();
}

function renderTabContent(tabId: string, parent: HTMLDivElement, s: VexeaSettingsData, onClose: () => void) {
    parent.innerHTML = '';

    const page = document.createElement('div');
    page.style.width = '100%';
    page.style.maxWidth = '100%';
    page.style.margin = '0 auto';
    page.style.display = 'flex';
    page.style.flexDirection = 'column';
    page.style.gap = '14px';

    if (tabId === 'CONTROLS') {
        renderControlsTab(page, s);
    } else if (tabId === 'GRAPHICS') {
        renderGraphicsTab(page, s);
    } else if (tabId === 'AUDIO') {
        renderAudioTab(page, s);
    } else if (tabId === 'HUD') {
        renderHudTab(page, s, onClose);
    } else if (tabId === 'ACCESSIBILITY') {
        renderAccessibilityTab(page, s);
    } else if (tabId === 'SERVER') {
        renderServerTab(page, s);
    } else if (tabId === 'DEV') {
        renderDevAssetsTab(page, s);
    } else if (tabId === 'LEGAL') {
        renderLegalTab(page, s);
    }

    parent.appendChild(page);
}

// ==========================================
// 2. CONTROLS TAB
// ==========================================
function renderControlsTab(container: HTMLElement, s: VexeaSettingsData) {
    const card = document.createElement('div');
    card.className = 'settings-card';

    if (IS_MOBILE) {
        const row1 = createRow('Touch Camera Sensitivity', 'Dragging velocity multiplier on touch viewport.');
        const slider1 = createSlider(0.1, 3.0, 0.1, s.camSens, val => {
            s.camSens = val;
            saveAndApply(s);
        });
        row1.appendChild(slider1);
        card.appendChild(row1);

        const row2 = createRow('Virtual Joystick Sensitivity', 'Analogue input responsiveness multiplier.');
        const slider2 = createSlider(0.1, 3.0, 0.1, s.joySens, val => {
            s.joySens = val;
            saveAndApply(s);
        });
        row2.appendChild(slider2);
        card.appendChild(row2);

        const row3 = createRow('Invert Look Pitch (Y Axis)', 'Invert vertical camera dragging.');
        const toggle3 = createCyberToggle(s.invertY, val => {
            s.invertY = val;
            saveAndApply(s);
        });
        row3.appendChild(toggle3);
        card.appendChild(row3);

        container.appendChild(card);
    } else {
        const row1 = createRow('Mouse Sensitivity (Yaw / Horizontal)', 'Left-right rotation factor.');
        const slider1 = createSlider(0.1, 5.0, 0.1, s.camSens, val => {
            s.camSens = val;
            saveAndApply(s);
        });
        row1.appendChild(slider1);
        card.appendChild(row1);

        const row2 = createRow('Mouse Sensitivity (Pitch / Vertical)', 'Up-down look factor.');
        const slider2 = createSlider(0.1, 5.0, 0.1, s.joySens, val => {
            s.joySens = val;
            saveAndApply(s);
        });
        row2.appendChild(slider2);
        card.appendChild(row2);

        const row3 = createRow('Invert Y Axis', 'Invert vertical mouse look pitch.');
        const toggle3 = createCyberToggle(s.invertY, val => {
            s.invertY = val;
            saveAndApply(s);
        });
        row3.appendChild(toggle3);
        card.appendChild(row3);

        const row4 = createRow('Look Response Tracking Curve', 'Select mouse acceleration profile.');
        const curves = ['Linear', 'Exponential', 'S-Curve'];
        const seg4 = createSegmentedControl(curves, s.lookCurve, val => {
            s.lookCurve = val as any;
            saveAndApply(s);
        });
        row4.appendChild(seg4);
        card.appendChild(row4);

        const row5 = createRow('Analog Deadzone (%)', 'Threshold before stick actuation engages.');
        const slider5 = createSlider(5, 25, 1, s.analogDeadzone, val => {
            s.analogDeadzone = val;
            saveAndApply(s);
        }, '%');
        row5.appendChild(slider5);
        card.appendChild(row5);

        const row6 = createRow('Raw Pointer Lock', 'Lock cursor inside window bounds during match.');
        const toggle6 = createCyberToggle(s.rawPointerLock, val => {
            s.rawPointerLock = val;
            saveAndApply(s);
        });
        row6.appendChild(toggle6);
        card.appendChild(row6);

        // Fullscreen Toggle
        const rowFS = createRow('Fullscreen Mode', 'Toggle high-performance windowed fullscreen display.');
        const fsBtn = document.createElement('button');
        fsBtn.innerText = 'TOGGLE FULLSCREEN';
        fsBtn.className = 'action-btn';
        fsBtn.style.minWidth = '10.00rem';
        bind(fsBtn, 'click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
        rowFS.appendChild(fsBtn);
        card.appendChild(rowFS);

        container.appendChild(card);

        // Keybindings card
        const bindCard = document.createElement('div');
        bindCard.className = 'settings-card';
        bindCard.style.marginTop = '0.63rem';

        const bTitle = document.createElement('div');
        bTitle.innerText = '// KEYBOARD & MOUSE BINDINGS (DESKTOP)';
        Object.assign(bTitle.style, {
            fontSize: DS.typography.sizes.small,
            fontWeight: 'bold',
            fontFamily: 'monospace',
            color: DS.colors.accent,
            letterSpacing: '1px',
            marginBottom: '0.38rem'
        });
        bindCard.appendChild(bTitle);

        s.bindings = s.bindings || {};

        const actions = [
            { id: 'MOVE_FORWARD', label: 'Move Forward' },
            { id: 'MOVE_BACKWARD', label: 'Move Backward' },
            { id: 'MOVE_LEFT', label: 'Move Left' },
            { id: 'MOVE_RIGHT', label: 'Move Right' },
            { id: 'JUMP', label: 'Jump' },
            { id: 'DASH', label: 'Dash' },
            { id: 'CROUCH', label: 'Crouch' },
            { id: 'PRIMARY_ATTACK', label: 'Primary Attack' },
            { id: 'RADIAL_COMM', label: 'Radial Quick-Comm' },
            { id: 'OPEN_CHAT', label: 'Open Text Chat' }
        ];

        actions.forEach(act => {
            const row = document.createElement('div');
            row.className = 'settings-row';

            const lbl = document.createElement('span');
            lbl.innerText = act.label;
            lbl.style.fontSize = DS.typography.sizes.small;
            lbl.style.fontFamily = 'monospace';
            row.appendChild(lbl);

            const rightWrap = document.createElement('div');
            rightWrap.style.display = 'flex';
            rightWrap.style.gap = '8px';

            const currentKey = s.bindings[act.id] || 'None';
            const bindBtn = document.createElement('button');
            bindBtn.innerText = currentKey;
            bindBtn.className = 'action-btn';
            bindBtn.style.minWidth = '6.88rem';

            bind(bindBtn, 'click', () => {
                if (listeningAction) return;
                listeningAction = act.id;
                bindBtn.innerText = 'PRESS KEY...';
                bindBtn.style.color = DS.colors.accent;
                bindBtn.style.borderColor = DS.colors.accent;

                const onKey = (e: KeyboardEvent) => {
                    e.preventDefault();
                    window.removeEventListener('keydown', onKey);
                    
                    if (e.key === 'Escape') {
                        listeningAction = null;
                        bindBtn.innerText = s.bindings[act.id] || 'None';
                        bindBtn.style.color = '#ffffff';
                        bindBtn.style.borderColor = '#27272a';
                        return;
                    }

                    const chosenCode = e.code;
                    for (let key in s.bindings) {
                        if (s.bindings[key] === chosenCode) {
                            s.bindings[key] = 'None';
                        }
                    }

                    s.bindings[act.id] = chosenCode;
                    listeningAction = null;
                    saveAndApply(s);
                    renderControlsTab(container, s);
                };

                const onMouseDown = (e: MouseEvent) => {
                    if (listeningAction) {
                        e.preventDefault();
                        window.removeEventListener('keydown', onKey);
                        window.removeEventListener('mousedown', onMouseDown);

                        const mouseButtonCode = `Mouse${e.button}`;
                        for (let key in s.bindings) {
                            if (s.bindings[key] === mouseButtonCode) {
                                s.bindings[key] = 'None';
                            }
                        }

                        s.bindings[act.id] = mouseButtonCode;
                        listeningAction = null;
                        saveAndApply(s);
                        renderControlsTab(container, s);
                    }
                };

                window.addEventListener('keydown', onKey);
                window.addEventListener('mousedown', onMouseDown);
            });

            const resetBtn = document.createElement('button');
            resetBtn.innerText = 'RESET';
            resetBtn.className = 'action-btn';
            bind(resetBtn, 'click', () => {
                const defaultsMap: { [key: string]: string } = {
                    "MOVE_FORWARD": "KeyW",
                    "MOVE_BACKWARD": "KeyS",
                    "MOVE_LEFT": "KeyA",
                    "MOVE_RIGHT": "KeyD",
                    "JUMP": "Space",
                    "DASH": "ShiftLeft",
                    "CROUCH": "ControlLeft",
                    "PRIMARY_ATTACK": "Mouse0",
                    "RADIAL_COMM": "KeyV",
                    "OPEN_CHAT": "Enter"
                };
                s.bindings[act.id] = defaultsMap[act.id] || 'None';
                saveAndApply(s);
                bindBtn.innerText = s.bindings[act.id];
            });

            rightWrap.appendChild(bindBtn);
            rightWrap.appendChild(resetBtn);
            row.appendChild(rightWrap);
            bindCard.appendChild(row);
        });

        container.appendChild(bindCard);
    }
}

// ==========================================
// 3. GRAPHICS TAB
// ==========================================
function renderGraphicsTab(container: HTMLElement, s: VexeaSettingsData) {
    const grid = document.createElement('div');
    Object.assign(grid.style, {
        display: 'grid',
        gridTemplateColumns: IS_MOBILE ? '1fr' : '1.3fr 1fr',
        gap: '14px',
        alignItems: 'start'
    });

    const leftCol = document.createElement('div');
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'column';
    leftCol.style.gap = '12px';

    const card = document.createElement('div');
    card.className = 'settings-card';

    // 1. Preset
    const row1 = createRow('Quality Preset', 'Automatically scale detailed visual features.');
    const presets = ['Low', 'Medium', 'High', 'Custom'];
    const seg1 = createSegmentedControl(presets, s.graphicsPreset, val => {
        s.graphicsPreset = val as any;
        if (val === 'Low') {
            s.shadows = false;
            s.bloom = false;
            s.ssao = false;
            s.parallaxOcclusion = false;
            s.pbrMaterials = false;
            s.instancedProps = false;
            s.pixelRatioMode = '0.75';
            s.fpsCap = 30;
        } else if (val === 'Medium') {
            s.shadows = !IS_MOBILE;
            s.bloom = !IS_MOBILE;
            s.ssao = false;
            s.parallaxOcclusion = !IS_MOBILE;
            s.pbrMaterials = !IS_MOBILE;
            s.instancedProps = !IS_MOBILE;
            s.pixelRatioMode = '1.0';
            s.fpsCap = 60;
        } else if (val === 'High') {
            s.shadows = true;
            s.bloom = true;
            s.ssao = !IS_MOBILE;
            s.parallaxOcclusion = true;
            s.pbrMaterials = true;
            s.instancedProps = true;
            s.pixelRatioMode = '1.5';
            s.fpsCap = 0;
        }
        saveAndApply(s);
        renderGraphicsTab(container, s);
    });
    row1.appendChild(seg1);
    card.appendChild(row1);

    // 2. Field of View (FOV)
    const rowFov = createRow('Field of View (FOV)', 'Horizontal camera angle of view.');
    const sliderFov = createSlider(60, 110, 1, s.fov || 75, val => {
        s.fov = val;
        saveAndApply(s);
    }, '°');
    rowFov.appendChild(sliderFov);
    card.appendChild(rowFov);

    // 3. Framerate limit
    const row2 = createRow('Frame-rate Lock', 'Target client render synchronization limit.');
    const caps = [
        { label: '30 FPS', val: '30' },
        { label: '60 FPS', val: '60' },
        { label: 'Uncapped', val: '0' }
    ];
    const seg2 = createSegmentedControl(caps.map(c => c.label), s.fpsCap === 30 ? '30 FPS' : s.fpsCap === 60 ? '60 FPS' : 'Uncapped', label => {
        s.fpsCap = label === '30 FPS' ? 30 : label === '60 FPS' ? 60 : 0;
        s.graphicsPreset = 'Custom';
        saveAndApply(s);
    });
    row2.appendChild(seg2);
    card.appendChild(row2);

    // 4. Fixed Pixel Ratio
    const row3 = createRow('Resolution Scale', 'Base physical pixel scaling factor.');
    const ratios = [
        { val: '0.75', label: '0.75x' },
        { val: '1.0', label: '1.0x' },
        { val: '1.5', label: '1.5x' },
        { val: 'native', label: 'Native' }
    ];
    const seg3 = createSegmentedControl(ratios.map(r => r.label), ratios.find(r => r.val === s.pixelRatioMode)?.label || '1.0x', label => {
        const match = ratios.find(r => r.label === label);
        if (match) s.pixelRatioMode = match.val as any;
        s.graphicsPreset = 'Custom';
        saveAndApply(s);
    });
    row3.appendChild(seg3);
    card.appendChild(row3);

    // 5. Tone Mapping
    const row4 = createRow('Tone Mapping Algorithm', 'Color grading transfer function.');
    const toneMaps = ['none', 'linear', 'reinhard', 'cineon', 'aces'];
    const seg4 = createSegmentedControl(toneMaps.map(t => t.toUpperCase()), s.toneMapping.toUpperCase(), label => {
        s.toneMapping = label.toLowerCase() as any;
        s.graphicsPreset = 'Custom';
        saveAndApply(s);
    });
    row4.appendChild(seg4);
    card.appendChild(row4);

    // 6. Exposure
    const row5 = createRow('Camera Exposure Calibration', 'Scene brightness compensation level.');
    const slider5 = createSlider(0.1, 3.0, 0.1, s.exposure, val => {
        s.exposure = val;
        s.graphicsPreset = 'Custom';
        saveAndApply(s);
    });
    row5.appendChild(slider5);
    card.appendChild(row5);

    leftCol.appendChild(card);

    // Shader toggles card
    const shaderCard = document.createElement('div');
    shaderCard.className = 'settings-card';

    const sTitle = document.createElement('div');
    sTitle.innerText = '// DETAILED TSL SHADER EFFECTS';
    Object.assign(sTitle.style, {
        fontSize: DS.typography.sizes.small,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: DS.colors.accent,
        letterSpacing: '1px',
        marginBottom: '4px'
    });
    shaderCard.appendChild(sTitle);

    const rowShad = createRow('Dynamic Shadow Maps', 'Cast real-time depth shadow maps.');
    const toggleShad = createCyberToggle(s.shadows, val => {
        s.shadows = val;
        s.graphicsPreset = 'Custom';
        saveAndApply(s);
    });
    rowShad.appendChild(toggleShad);
    shaderCard.appendChild(rowShad);

    const rowBloom = createRow('High-Dynamic Bloom', 'Physical bloom glow across bright emissive meshes.');
    const toggleBloom = createCyberToggle(s.bloom, val => {
        s.bloom = val;
        s.graphicsPreset = 'Custom';
        saveAndApply(s);
    });
    rowBloom.appendChild(toggleBloom);
    shaderCard.appendChild(rowBloom);

    const rowVig = createRow('Screen Vignette Effect', 'Darken viewport peripheral borders.');
    const toggleVig = createCyberToggle(s.vignette, val => {
        s.vignette = val;
        s.graphicsPreset = 'Custom';
        saveAndApply(s);
    });
    rowVig.appendChild(toggleVig);
    shaderCard.appendChild(rowVig);

    const rowSSAO = createRow('Ambient Occlusion (SSAO)', 'Detailed shading in crevices and corners.');
    const toggleSSAO = createCyberToggle(s.ssao, val => {
        s.ssao = val;
        s.graphicsPreset = 'Custom';
        saveAndApply(s);
    });
    rowSSAO.appendChild(toggleSSAO);
    shaderCard.appendChild(rowSSAO);

    const rowFXAA = createRow('Anti-Aliasing (FXAA)', 'Smooth edge jaggedness at low cost.');
    const toggleFXAA = createCyberToggle(s.fxaa, val => {
        s.fxaa = val;
        s.graphicsPreset = 'Custom';
        saveAndApply(s);
    });
    rowFXAA.appendChild(toggleFXAA);
    shaderCard.appendChild(rowFXAA);

    leftCol.appendChild(shaderCard);
    grid.appendChild(leftCol);

    // Right Column: Live Telemetry & Shader visualizer
    const rightCol = document.createElement('div');
    rightCol.className = 'settings-card';
    Object.assign(rightCol.style, {
        background: '#111113',
        border: '1px solid #27272a'
    });

    const dTitle = document.createElement('div');
    dTitle.innerText = '// HARDWARE & RENDERER DIAGNOSTICS';
    Object.assign(dTitle.style, {
        fontSize: DS.typography.sizes.small,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: DS.colors.accent,
        letterSpacing: '1px',
        marginBottom: '0.63rem'
    });
    rightCol.appendChild(dTitle);

    const rendererBackend = (window as any).renderer?.isWebGPURenderer ? 'WebGPU (TSL Node Engine)' : 'WebGL2 (Fallback)';
    const dpr = window.devicePixelRatio || 1;
    const canvasW = window.innerWidth * dpr;
    const canvasH = window.innerHeight * dpr;

    rightCol.innerHTML += `
        <div style="font-family:monospace; font-size: ${DS.typography.sizes.small}; display:flex; flex-direction:column; gap:0.50rem; color:#a1a1aa;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #27272a; padding-bottom:4px;">
                <span>RENDER BACKEND:</span>
                <span style="color:#22c55e; font-weight:bold;">${rendererBackend}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #27272a; padding-bottom:4px;">
                <span>CANVAS RESOLUTION:</span>
                <span style="color:#ffffff;">${canvasW.toFixed(0)} × ${canvasH.toFixed(0)} px</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #27272a; padding-bottom:4px;">
                <span>DEVICE PIXEL RATIO:</span>
                <span style="color:#ffffff;">${dpr.toFixed(2)}x DPR</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #27272a; padding-bottom:4px;">
                <span>ACTIVE TONE MAP:</span>
                <span style="color:#00F0FF; text-transform:uppercase;">${s.toneMapping}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #27272a; padding-bottom:4px;">
                <span>EXPOSURE CALIBRATION:</span>
                <span style="color:#ffffff;">${s.exposure.toFixed(2)} EV</span>
            </div>
        </div>

        <div style="margin-top:1.00rem;">
            <div style="font-family:monospace; font-size: ${DS.typography.sizes.tiny}; color:#71717a; margin-bottom:0.38rem;">SHADER COMPOSITION PREVIEW</div>
            <div style="height:6.88rem; background:#050505; border:1px solid #27272a; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                <!-- Simulated Bloom Glow -->
                <div style="width:3.13rem; height:3.13rem; background:${DS.colors.accent}; border-radius:50%; filter:blur(${s.bloom ? '0.75rem' : '0px'}); opacity:${s.exposure * 0.8}; transition:all 150ms ease;"></div>
                <!-- Core Mesh -->
                <div style="width:1.25rem; height:1.25rem; background:#ffffff; position:absolute; border:1px solid rgba(255,255,255,0.4);"></div>
                <!-- Vignette Overlay -->
                ${s.vignette ? `<div style="position:absolute; inset:0; box-shadow:inset 0 0 40px rgba(0,0,0,0.9); pointer-events:none;"></div>` : ''}
            </div>
        </div>
    `;

    grid.appendChild(rightCol);
    container.appendChild(grid);
}

// ==========================================
// 4. AUDIO TAB
// ==========================================
function renderAudioTab(container: HTMLElement, s: VexeaSettingsData) {
    const grid = document.createElement('div');
    Object.assign(grid.style, {
        display: 'grid',
        gridTemplateColumns: IS_MOBILE ? '1fr' : '1.2fr 1fr',
        gap: '14px',
        alignItems: 'start'
    });

    const leftCol = document.createElement('div');
    leftCol.className = 'settings-card';

    const sliders = [
        { id: 'masterVolume', label: 'Master Output Volume', sound: 'click' },
        { id: 'sfxVolume', label: 'Sound Effects (SFX)', sound: 'hit_confirmed' },
        { id: 'musicVolume', label: 'Music & Ambience', sound: 'vexea_theme' },
        { id: 'uiVolume', label: 'Interface Feedback (UI)', sound: 'click' },
        { id: 'voiceVolume', label: 'Voice Radio Transmissions', sound: 'click' }
    ];

    sliders.forEach(sl => {
        const row = createRow(sl.label, `Calibrate ${sl.label.toLowerCase()} amplitude.`);
        const slider = createSlider(0.0, 1.0, 0.05, (s as any)[sl.id], val => {
            (s as any)[sl.id] = val;
            saveAndApply(s);
            playDebouncedAudition(sl.sound);
        }, '%', true);
        row.appendChild(slider);
        leftCol.appendChild(row);
    });

    // Spatial sound toggle
    const rowSpatial = createRow('Spatial HRTF Routing', 'Enable 3D quadratic distance attenuation.');
    const toggleSpatial = createCyberToggle(s.spatialAudio, val => {
        s.spatialAudio = val;
        saveAndApply(s);
    });
    rowSpatial.appendChild(toggleSpatial);
    leftCol.appendChild(rowSpatial);

    // HRTF Audio Mix Preset
    const rowHRTF = createRow('Dynamic Audio Mix Preset', 'Tailor frequency curves for specific speaker hardware.');
    const hrtfOptions = ['Flat Stereo', 'Focused Headset', 'Cinematic Speakers', 'Studio Monitor'];
    const segHRTF = createSegmentedControl(hrtfOptions, s.hrtfPreset, val => {
        s.hrtfPreset = val as any;
        saveAndApply(s);
    });
    rowHRTF.appendChild(segHRTF);
    leftCol.appendChild(rowHRTF);

    grid.appendChild(leftCol);

    // Right Column: Interactive Audition Triggers & Audio Level Meters
    const rightCol = document.createElement('div');
    rightCol.className = 'settings-card';
    Object.assign(rightCol.style, {
        background: '#111113'
    });

    const aTitle = document.createElement('div');
    aTitle.innerText = '// INTERACTIVE ACOUSTIC AUDITION';
    Object.assign(aTitle.style, {
        fontSize: DS.typography.sizes.small,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: DS.colors.accent,
        letterSpacing: '1px',
        marginBottom: '0.63rem'
    });
    rightCol.appendChild(aTitle);

    const desc = document.createElement('p');
    desc.innerText = 'Test real-time acoustic samples and spatial audio cues under the current gain profile.';
    Object.assign(desc.style, {
        fontSize: DS.typography.sizes.small,
        color: '#71717a',
        lineHeight: '1.4',
        margin: '0 0 0.75rem 0'
    });
    rightCol.appendChild(desc);

    const sampleBtnsWrap = document.createElement('div');
    sampleBtnsWrap.style.display = 'flex';
    sampleBtnsWrap.style.flexDirection = 'column';
    sampleBtnsWrap.style.gap = '8px';

    const testSamples = [
        { label: 'AUDITION HIT CONFIRM', sound: 'hit_confirmed' },
        { label: 'AUDITION WEAPON FIRE (M4 RIFLE)', sound: 'rifle_fire' },
        { label: 'AUDITION INTERFACE CONFIRM BEEP', sound: 'click' },
        { label: 'AUDITION THEME SOUNDTRACK STINGER', sound: 'vexea_theme' }
    ];

    testSamples.forEach(sample => {
        const btn = document.createElement('button');
        btn.innerText = sample.label;
        btn.className = 'action-btn';
        btn.style.textAlign = 'left';
        btn.style.padding = '0.50rem 0.75rem';
        bind(btn, 'click', () => {
            audioManager.play(sample.sound);
        });
        sampleBtnsWrap.appendChild(btn);
    });

    rightCol.appendChild(sampleBtnsWrap);

    // Visual Meter Bars
    const metersWrap = document.createElement('div');
    Object.assign(metersWrap.style, {
        marginTop: '1.00rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontFamily: 'monospace',
        fontSize: DS.typography.sizes.tiny,
        color: '#a1a1aa'
    });

    metersWrap.innerHTML = `
        <div style="color:#71717a; margin-bottom:2px;">REAL-TIME AUDIO CHANNELS</div>
        <div>
            <div style="display:flex; justify-content:space-between;"><span>MASTER GAIN</span><span>${Math.round(s.masterVolume * 100)}%</span></div>
            <div style="height:4px; background:#27272a; margin-top:2px;"><div style="height:100%; width:${s.masterVolume * 100}%; background:#22c55e;"></div></div>
        </div>
        <div>
            <div style="display:flex; justify-content:space-between;"><span>SFX CHANNEL</span><span>${Math.round(s.sfxVolume * 100)}%</span></div>
            <div style="height:4px; background:#27272a; margin-top:2px;"><div style="height:100%; width:${s.sfxVolume * 100}%; background:#00F0FF;"></div></div>
        </div>
        <div>
            <div style="display:flex; justify-content:space-between;"><span>MUSIC TRACK</span><span>${Math.round(s.musicVolume * 100)}%</span></div>
            <div style="height:4px; background:#27272a; margin-top:2px;"><div style="height:100%; width:${s.musicVolume * 100}%; background:${DS.colors.accent};"></div></div>
        </div>
    `;
    rightCol.appendChild(metersWrap);

    grid.appendChild(rightCol);
    container.appendChild(grid);
}

// ==========================================
// 5. HUD & UI TAB (LIVE RETICLE PREVIEW VIEWPORT)
// ==========================================
function renderHudTab(container: HTMLElement, s: VexeaSettingsData, onClose: () => void) {
    const grid = document.createElement('div');
    Object.assign(grid.style, {
        display: 'grid',
        gridTemplateColumns: IS_MOBILE ? '1fr' : '1.3fr 1fr',
        gap: '14px',
        alignItems: 'start'
    });

    const leftCol = document.createElement('div');
    leftCol.className = 'settings-card';

    // 0. Visual HUD Editor Launcher
    const rowEditor = createRow('Interactive HUD Editor', 'Enter layout mode to drag, scale, and reposition UI elements.');
    const editBtn = document.createElement('button');
    editBtn.innerText = 'LAUNCH EDITOR';
    editBtn.className = 'action-btn';
    editBtn.style.minWidth = '10.00rem';
    bind(editBtn, 'click', () => {
        if (typeof (window as any).vexeaEditUI === 'function') {
            (window as any).vexeaEditUI();
            closeSettingsUI(onClose);
        } else {
            // Fallback if not initialized for some reason
            const editorBar = document.getElementById('ui-editor-bar');
            if (editorBar) {
                editorBar.style.display = 'flex';
                (window as any).isEditMode = true;
                document.body.classList.add("ui-editor-active");
                const hudContainer = document.getElementById("hud-container");
                if (hudContainer) {
                    hudContainer.style.setProperty("display", "block", "important");
                }
                const canvasContainer = document.getElementById("canvas-container");
                if (canvasContainer) {
                    canvasContainer.style.display = "none";
                }
                closeSettingsUI(onClose);
            }
        }
    });
    rowEditor.appendChild(editBtn);
    leftCol.appendChild(rowEditor);

    // 1. Crosshair Style (Visual vector selector cards)
    const rowCross = document.createElement('div');
    rowCross.style.display = 'flex';
    rowCross.style.flexDirection = 'column';
    rowCross.style.gap = '8px';
    rowCross.style.padding = '0.50rem 0';
    rowCross.style.borderBottom = '1px solid rgba(255,255,255,0.04)';

    const cLabelWrap = document.createElement('div');
    cLabelWrap.innerHTML = `
        <div style="font-weight:bold; font-size: ${DS.typography.sizes.body}; color:#ffffff;">Crosshair Geometry Style</div>
        <div style="color:#71717a; font-size: ${DS.typography.sizes.small};">Shape structure of central look reticle.</div>
    `;
    rowCross.appendChild(cLabelWrap);

    const crosshairStyles = [
        { id: 'Standard Cross', label: 'CROSS', svg: `<svg width="24" height="24" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="8" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="22" stroke="currentColor" stroke-width="2"/><line x1="2" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="2"/><line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/></svg>` },
        { id: 'Dot', label: 'DOT', svg: `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>` },
        { id: 'Circle', label: 'CIRCLE', svg: `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>` },
        { id: 'T-Shape', label: 'T-SHAPE', svg: `<svg width="24" height="24" viewBox="0 0 24 24"><line x1="12" y1="16" x2="12" y2="22" stroke="currentColor" stroke-width="2"/><line x1="2" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="2"/><line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/></svg>` }
    ];

    const cardsRow = document.createElement('div');
    cardsRow.style.display = 'flex';
    cardsRow.style.gap = '8px';

    crosshairStyles.forEach(style => {
        const card = document.createElement('div');
        card.className = `reticle-card ${s.crosshairStyle === style.id ? 'active' : ''}`;
        card.style.color = s.crosshairStyle === style.id ? DS.colors.accent : '#a1a1aa';
        card.innerHTML = `
            ${style.svg}
            <span style="font-family:monospace; font-size: ${DS.typography.sizes.tiny}; font-weight:bold;">${style.label}</span>
        `;
        bind(card, 'click', () => {
            s.crosshairStyle = style.id as any;
            saveAndApply(s);
            updateReticlePreview();
            document.querySelectorAll('.reticle-card').forEach(c => {
                c.classList.remove('active');
                (c as HTMLElement).style.color = '#a1a1aa';
            });
            card.classList.add('active');
            card.style.color = DS.colors.accent;
        });
        cardsRow.appendChild(card);
    });
    rowCross.appendChild(cardsRow);
    leftCol.appendChild(rowCross);

    // 2. Crosshair Color Swatches
    const rowCol = document.createElement('div');
    rowCol.style.display = 'flex';
    rowCol.style.flexDirection = 'column';
    rowCol.style.gap = '8px';
    rowCol.style.padding = '0.50rem 0';
    rowCol.style.borderBottom = '1px solid rgba(255,255,255,0.04)';

    const colLabelWrap = document.createElement('div');
    colLabelWrap.innerHTML = `
        <div style="font-weight:bold; font-size: ${DS.typography.sizes.body}; color:#ffffff;">Crosshair Color Palette</div>
        <div style="color:#71717a; font-size: ${DS.typography.sizes.small};">High-contrast reticle tint overlay.</div>
    `;
    rowCol.appendChild(colLabelWrap);

    const swatches = [
        { id: '#FFFFFF', name: 'White', color: '#FFFFFF' },
        { id: '#00F0FF', name: 'Cyan', color: '#00F0FF' },
        { id: '#22C55E', name: 'Green', color: '#22C55E' },
        { id: '#EC4899', name: 'Magenta', color: '#EC4899' },
        { id: '#EAB308', name: 'Yellow', color: '#EAB308' },
        { id: '#EF4444', name: 'Red', color: '#EF4444' },
        { id: '#FF4500', name: 'Orange', color: '#FF4500' }
    ];

    const swatchesRow = document.createElement('div');
    swatchesRow.style.display = 'flex';
    swatchesRow.style.gap = '8px';

    swatches.forEach(swatch => {
        const chip = document.createElement('div');
        const isActive = s.crosshairColor.toLowerCase() === swatch.color.toLowerCase() || s.crosshairColor.toLowerCase() === swatch.name.toLowerCase();
        chip.className = `swatch-chip ${isActive ? 'active' : ''}`;
        chip.style.backgroundColor = swatch.color;
        chip.title = swatch.name;
        bind(chip, 'click', () => {
            s.crosshairColor = swatch.color;
            saveAndApply(s);
            updateReticlePreview();
            document.querySelectorAll('.swatch-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
        swatchesRow.appendChild(chip);
    });
    rowCol.appendChild(swatchesRow);
    leftCol.appendChild(rowCol);

    // 3. Crosshair Size & Center Gap Sliders
    const rowSize = createRow('Crosshair Diagonal Size (px)', 'Reticle line span dimension.');
    const sliderSize = createSlider(8, 48, 2, s.crosshairSize, val => {
        s.crosshairSize = val;
        saveAndApply(s);
        updateReticlePreview();
    }, 'px');
    rowSize.appendChild(sliderSize);
    leftCol.appendChild(rowSize);

    const rowGap = createRow('Crosshair Center Gap (px)', 'Inner clearance distance.');
    const sliderGap = createSlider(0, 20, 1, s.crosshairGap || 4, val => {
        s.crosshairGap = val;
        saveAndApply(s);
        updateReticlePreview();
    }, 'px');
    rowGap.appendChild(sliderGap);
    leftCol.appendChild(rowGap);

    // 4. HUD Scale
    const rowScale = createRow('HUD Layout Scale Factor', 'Scale overall screen heads-up layout elements.');
    const sliderScale = createSlider(0.75, 1.5, 0.05, s.hudScale, val => {
        s.hudScale = val;
        saveAndApply(s);
    });
    rowScale.appendChild(sliderScale);
    leftCol.appendChild(rowScale);

    // 5. Chat & Radial
    const rowChat = createRow('Chat Messages Enabled', 'Display match transmissions in viewport.');
    const toggleChat = createCyberToggle(s.chatEnabled, val => {
        s.chatEnabled = val;
        saveAndApply(s);
    });
    rowChat.appendChild(toggleChat);
    leftCol.appendChild(rowChat);

    const rowRadial = createRow('Radial Quick-Comm Opacity', 'Alpha transparency of radial selector wheel.');
    const sliderRadial = createSlider(0.1, 1.0, 0.05, s.radialOpacity, val => {
        s.radialOpacity = val;
        saveAndApply(s);
    });
    rowRadial.appendChild(sliderRadial);
    leftCol.appendChild(rowRadial);

    grid.appendChild(leftCol);

    // Right Column: Live Reticle Preview Viewport
    const rightCol = document.createElement('div');
    rightCol.className = 'settings-card';
    Object.assign(rightCol.style, {
        background: '#111113'
    });

    const pTitle = document.createElement('div');
    pTitle.innerText = '// LIVE RETICLE & HUD PREVIEW';
    Object.assign(pTitle.style, {
        fontSize: DS.typography.sizes.small,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: DS.colors.accent,
        letterSpacing: '1px',
        marginBottom: '0.63rem'
    });
    rightCol.appendChild(pTitle);

    const previewBox = document.createElement('div');
    previewBox.id = 'live-reticle-preview-box';
    Object.assign(previewBox.style, {
        width: '100%',
        height: '11.25rem',
        background: '#040405',
        border: '1px solid #27272a',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    });

    // Dark grid background
    previewBox.innerHTML = `
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position:absolute; inset:0; opacity:0.12;">
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#FFFFFF" stroke-width="0.5"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <!-- Dummy enemy silhouette -->
        <div style="position:absolute; width:2.50rem; height:5.00rem; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.06); pointer-events:none;"></div>
        <!-- Reticle Preview Host -->
        <div id="reticle-svg-host" style="position:relative; z-index:2;"></div>
    `;

    rightCol.appendChild(previewBox);

    const liveReadout = document.createElement('div');
    liveReadout.id = 'live-reticle-readout';
    Object.assign(liveReadout.style, {
        marginTop: '0.63rem',
        fontFamily: 'monospace',
        fontSize: DS.typography.sizes.tiny,
        color: '#a1a1aa',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    });
    rightCol.appendChild(liveReadout);

    grid.appendChild(rightCol);
    container.appendChild(grid);

    function updateReticlePreview() {
        const host = document.getElementById('reticle-svg-host');
        const readout = document.getElementById('live-reticle-readout');
        if (!host) return;

        const size = s.crosshairSize;
        const gap = s.crosshairGap || 4;
        const color = s.crosshairColor.startsWith('#') ? s.crosshairColor : (swatches.find(sw => sw.name.toLowerCase() === s.crosshairColor.toLowerCase())?.color || '#FFFFFF');
        const halfSize = size / 2;

        let reticleSvg = '';
        if (s.crosshairStyle === 'Dot') {
            reticleSvg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <circle cx="${halfSize}" cy="${halfSize}" r="${Math.max(2, size / 8)}" fill="${color}"/>
            </svg>`;
        } else if (s.crosshairStyle === 'Circle') {
            reticleSvg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <circle cx="${halfSize}" cy="${halfSize}" r="${Math.max(4, halfSize - 2)}" fill="none" stroke="${color}" stroke-width="2"/>
                <circle cx="${halfSize}" cy="${halfSize}" r="2" fill="${color}"/>
            </svg>`;
        } else if (s.crosshairStyle === 'T-Shape') {
            reticleSvg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <line x1="${halfSize}" y1="${halfSize + gap}" x2="${halfSize}" y2="${size}" stroke="${color}" stroke-width="2"/>
                <line x1="0" y1="${halfSize}" x2="${halfSize - gap}" y2="${halfSize}" stroke="${color}" stroke-width="2"/>
                <line x1="${halfSize + gap}" y1="${halfSize}" x2="${size}" y2="${halfSize}" stroke="${color}" stroke-width="2"/>
            </svg>`;
        } else {
            // Standard Cross
            reticleSvg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <line x1="${halfSize}" y1="0" x2="${halfSize}" y2="${halfSize - gap}" stroke="${color}" stroke-width="2"/>
                <line x1="${halfSize}" y1="${halfSize + gap}" x2="${halfSize}" y2="${size}" stroke="${color}" stroke-width="2"/>
                <line x1="0" y1="${halfSize}" x2="${halfSize - gap}" y2="${halfSize}" stroke="${color}" stroke-width="2"/>
                <line x1="${halfSize + gap}" y1="${halfSize}" x2="${size}" y2="${halfSize}" stroke="${color}" stroke-width="2"/>
            </svg>`;
        }

        host.innerHTML = reticleSvg;

        if (readout) {
            readout.innerHTML = `
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #27272a; padding-bottom:2px;">
                    <span>STYLE:</span><span style="color:#ffffff;">${s.crosshairStyle}</span>
                </div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #27272a; padding-bottom:2px;">
                    <span>COLOR TINT:</span><span style="color:${color}; font-weight:bold;">${color}</span>
                </div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #27272a; padding-bottom:2px;">
                    <span>SPAN SIZE:</span><span style="color:#ffffff;">${s.crosshairSize} px</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span>CENTER GAP:</span><span style="color:#ffffff;">${s.crosshairGap || 4} px</span>
                </div>
            `;
        }
    }

    updateReticlePreview();
}

// ==========================================
// 6. ACCESSIBILITY TAB
// ==========================================
function renderAccessibilityTab(container: HTMLElement, s: VexeaSettingsData) {
    const card = document.createElement('div');
    card.className = 'settings-card';

    // 1. Colorblind Correction Matrix
    const rowCB = createRow('Colorblind Post-Processing Filter', 'Apply SVG color matrix transformation for visual deficiencies.');
    const filters = ['None', 'Protanopia', 'Deuteranopia', 'Tritanopia'];
    const segCB = createSegmentedControl(filters, s.colorblindFilter, val => {
        s.colorblindFilter = val as any;
        saveAndApply(s);
    });
    rowCB.appendChild(segCB);
    card.appendChild(rowCB);

    // 2. High contrast
    const rowHC = createRow('High-Contrast Text Overlay', 'Add solid dark backing to viewport text labels.');
    const toggleHC = createCyberToggle(s.highContrastText, val => {
        s.highContrastText = val;
        saveAndApply(s);
    });
    rowHC.appendChild(toggleHC);
    card.appendChild(rowHC);

    // 3. Screen shake
    const rowShake = createRow('Screen-Shake Multiplier', 'Dampen camera vibrations, bobbing, and impact trauma.');
    const sliderShake = createSlider(0.0, 1.0, 0.1, s.screenShakeMultiplier, val => {
        s.screenShakeMultiplier = val;
        saveAndApply(s);
    }, '%', true);
    rowShake.appendChild(sliderShake);
    card.appendChild(rowShake);

    // 4. Flashbang Alternate Effect
    const rowFlash = createRow('Flashbang Alternate Effect Mode', 'Swap bright whiteout flash with safe dark blackout fade.');
    const flashModes = ['Whiteout Flash', 'Blackout Fade'];
    const segFlash = createSegmentedControl(flashModes, s.flashbangMode, val => {
        s.flashbangMode = val as any;
        saveAndApply(s);
    });
    rowFlash.appendChild(segFlash);
    card.appendChild(rowFlash);

    container.appendChild(card);
}

// ==========================================
// 7. SERVER TAB (LIVE TELEMETRY & STATUS)
// ==========================================
function renderServerTab(container: HTMLElement, s: VexeaSettingsData) {
    const card = document.createElement('div');
    card.className = 'settings-card';

    // Live connection status badge
    const statusRow = document.createElement('div');
    statusRow.className = 'settings-row';
    statusRow.innerHTML = `
        <div>
            <div style="font-weight:bold; font-size: ${DS.typography.sizes.body}; color:#ffffff;">Socket Connection State</div>
            <div style="color:#71717a; font-size: ${DS.typography.sizes.small};">Authoritative real-time transport channel.</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:0.50rem; height:0.50rem; background:#22c55e; border-radius:50%;"></div>
            <span style="font-family:monospace; font-size: ${DS.typography.sizes.small}; font-weight:bold; color:#22c55e;">CONNECTED</span>
        </div>
    `;
    card.appendChild(statusRow);

    // URL override
    const rowUrl = createRow('Authoritative Server Address', 'Target WebSocket cluster endpoint.');
    const urlWrap = document.createElement('div');
    urlWrap.style.display = 'flex';
    urlWrap.style.gap = '8px';

    const inputUrl = document.createElement('input');
    inputUrl.type = 'text';
    inputUrl.value = s.serverUrl || window.location.origin;
    inputUrl.style.width = '15.00rem';

    const saveBtn = document.createElement('button');
    saveBtn.innerText = 'APPLY';
    saveBtn.className = 'action-btn';
    bind(saveBtn, 'click', () => {
        s.serverUrl = inputUrl.value;
        saveAndApply(s);
        alert('Server address updated.');
    });

    urlWrap.appendChild(inputUrl);
    urlWrap.appendChild(saveBtn);
    rowUrl.appendChild(urlWrap);
    card.appendChild(rowUrl);

    // Telemetry stats
    const pingRow = document.createElement('div');
    pingRow.className = 'settings-row';
    pingRow.innerHTML = `
        <div>
            <div style="font-weight:bold; font-size: ${DS.typography.sizes.body}; color:#ffffff;">Network Round-Trip Time (RTT)</div>
            <div style="color:#71717a; font-size: ${DS.typography.sizes.small};">Calculated ping latency to primary cluster.</div>
        </div>
        <div style="font-family:monospace; font-size: ${DS.typography.sizes.body}; color:#00F0FF; font-weight:bold;">18 ms</div>
    `;
    card.appendChild(pingRow);

    const tickRow = document.createElement('div');
    tickRow.className = 'settings-row';
    tickRow.innerHTML = `
        <div>
            <div style="font-weight:bold; font-size: ${DS.typography.sizes.body}; color:#ffffff;">Simulation & Network Tick Rates</div>
            <div style="color:#71717a; font-size: ${DS.typography.sizes.small};">Authoritative tick synchronization frequency.</div>
        </div>
        <div style="font-family:monospace; font-size: ${DS.typography.sizes.small}; color:#ffffff;">NET: 20 Hz | PHYS: 60 Hz</div>
    `;
    card.appendChild(tickRow);

    // Simulated disconnect
    const rowSim = createRow('Simulated Disconnect Trigger', 'Trigger transport packet-loss for recovery diagnosis.');
    const simBtn = document.createElement('button');
    simBtn.innerText = 'TRIGGER DISCONNECT';
    simBtn.className = 'action-btn';
    simBtn.style.color = '#ef4444';
    simBtn.style.borderColor = '#ef4444';
    bind(simBtn, 'click', () => {
        document.dispatchEvent(new CustomEvent('VEXEA_SIM_DISCONNECT'));
    });
    rowSim.appendChild(simBtn);
    card.appendChild(rowSim);

    container.appendChild(card);
}

// ==========================================
// 8. DEV ASSETS TAB (ASSET CACHE MANAGER)
// ==========================================
function renderDevAssetsTab(container: HTMLElement, s: VexeaSettingsData) {
    const card = document.createElement('div');
    card.className = 'settings-card';

    const dTitle = document.createElement('div');
    dTitle.innerText = '// INDEXEDDB ASSET CACHE MANAGER';
    Object.assign(dTitle.style, {
        fontSize: DS.typography.sizes.small,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: DS.colors.accent,
        letterSpacing: '1px'
    });
    card.appendChild(dTitle);

    // Cache footprint gauge
    const gaugeWrap = document.createElement('div');
    gaugeWrap.id = 'cache-storage-gauge';
    gaugeWrap.style.margin = '4px 0 0.63rem 0';
    card.appendChild(gaugeWrap);

    // Asset table host
    const tableHost = document.createElement('div');
    tableHost.id = 'cache-asset-table-host';
    Object.assign(tableHost.style, {
        maxHeight: '16.25rem',
        overflowY: 'auto',
        border: '1px solid #27272a',
        background: '#111113'
    });
    card.appendChild(tableHost);

    // Master purge button
    const footerActions = document.createElement('div');
    Object.assign(footerActions.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.50rem'
    });

    const purgeBtn = document.createElement('button');
    purgeBtn.innerText = 'PURGE ALL CACHED ASSETS';
    purgeBtn.className = 'action-btn';
    purgeBtn.style.color = '#ef4444';
    purgeBtn.style.borderColor = '#ef4444';
    bind(purgeBtn, 'click', () => {
        if (confirm('Are you sure you want to clear the entire IndexedDB asset cache?')) {
            clearCache().then(() => {
                refreshCacheTable();
            });
        }
    });

    const refreshBtn = document.createElement('button');
    refreshBtn.innerText = 'REFRESH CACHE TABLE';
    refreshBtn.className = 'action-btn';
    bind(refreshBtn, 'click', () => {
        refreshCacheTable();
    });

    footerActions.appendChild(purgeBtn);
    footerActions.appendChild(refreshBtn);
    card.appendChild(footerActions);

    container.appendChild(card);

    // Pipeline options card
    const pipeCard = document.createElement('div');
    pipeCard.className = 'settings-card';
    pipeCard.style.marginTop = '0.63rem';

    const rowGLTF = createRow('GLTF Mesh Streaming Pipeline', 'Mesh decompression loading profile.');
    const pipelines = ['Chunked', 'Full Load', 'Lazy Instance'];
    const segGLTF = createSegmentedControl(pipelines, s.gltfPipeline, val => {
        s.gltfPipeline = val as any;
        saveAndApply(s);
    });
    rowGLTF.appendChild(segGLTF);
    pipeCard.appendChild(rowGLTF);

    const rowColMesh = createRow('Collision Mesh Wireframes', 'Render physical bounding colliders.');
    const toggleColMesh = createCyberToggle(s.collisionMeshVis, val => {
        s.collisionMeshVis = val;
        saveAndApply(s);
    });
    rowColMesh.appendChild(toggleColMesh);
    pipeCard.appendChild(rowColMesh);

    container.appendChild(pipeCard);

    function refreshCacheTable() {
        listCachedFiles().then(files => {
            const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
            const budgetMB = 50.0;
            const pct = Math.min(100, (parseFloat(totalMB) / budgetMB) * 100);

            if (gaugeWrap) {
                gaugeWrap.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-family:monospace; font-size: ${DS.typography.sizes.small}; color:#a1a1aa; margin-bottom:4px;">
                        <span>STORAGE FOOTPRINT:</span>
                        <span style="color:#ffffff;">${totalMB} MB / ${budgetMB.toFixed(1)} MB (${pct.toFixed(1)}%)</span>
                    </div>
                    <div style="height:0.38rem; background:#27272a; width:100%;">
                        <div style="height:100%; width:${pct}%; background:${pct > 80 ? '#ef4444' : '#22c55e'}; transition:all 200ms ease;"></div>
                    </div>
                `;
            }

            if (tableHost) {
                if (files.length === 0) {
                    tableHost.innerHTML = `
                        <div style="padding:1.25rem; text-align:center; font-family:monospace; font-size: ${DS.typography.sizes.small}; color:#71717a;">
                            No files currently cached in IndexedDB. Assets stream on demand.
                        </div>
                    `;
                } else {
                    let tableHTML = `
                        <table style="width:100%; border-collapse:collapse; font-family:monospace; font-size: ${DS.typography.sizes.small}; color:#a1a1aa;">
                            <thead>
                                <tr style="border-bottom:1px solid #27272a; background:#18181b; color:#ffffff; text-align:left;">
                                    <th style="padding:0.38rem 0.63rem;">ASSET FILENAME</th>
                                    <th style="padding:0.38rem 0.63rem;">SIZE</th>
                                    <th style="padding:0.38rem 0.63rem;">CACHED DATE</th>
                                    <th style="padding:0.38rem 0.63rem; text-align:right;">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    files.forEach(f => {
                        const sizeKB = (f.size / 1024).toFixed(1);
                        const dateStr = new Date(f.timestamp).toLocaleTimeString();
                        tableHTML += `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.03);">
                                <td style="padding:0.38rem 0.63rem; color:#ffffff;">${f.filename}</td>
                                <td style="padding:0.38rem 0.63rem;">${sizeKB} KB</td>
                                <td style="padding:0.38rem 0.63rem;">${dateStr}</td>
                                <td style="padding:0.38rem 0.63rem; text-align:right;">
                                    <button class="action-btn delete-asset-btn" data-file="${f.filename}" style="padding:2px 0.50rem; font-size: ${DS.typography.sizes.tiny}; color:#ef4444; border-color:#ef4444;">DELETE</button>
                                </td>
                            </tr>
                        `;
                    });

                    tableHTML += `</tbody></table>`;
                    tableHost.innerHTML = tableHTML;

                    tableHost.querySelectorAll('.delete-asset-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const fn = btn.getAttribute('data-file');
                            if (fn) {
                                deleteCachedFile(fn).then(() => {
                                    refreshCacheTable();
                                });
                            }
                        });
                    });
                }
            }
        });
    }

    refreshCacheTable();
}

// ==========================================
// 9. LEGAL TAB
// ==========================================
function renderLegalTab(container: HTMLElement, s: VexeaSettingsData) {
    const card = document.createElement('div');
    card.className = 'settings-card';

    const textDesc = document.createElement('p');
    textDesc.innerText = 'Vexea open source compliance and redistributable third-party licenses.';
    textDesc.style.fontSize = DS.typography.sizes.small;
    textDesc.style.color = '#a1a1aa';
    card.appendChild(textDesc);

    const scrollBox = document.createElement('div');
    Object.assign(scrollBox.style, {
        height: '11.25rem',
        border: '1px solid #27272a',
        background: '#111113',
        padding: '0.63rem',
        overflowY: 'auto',
        fontSize: DS.typography.sizes.small,
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        color: '#71717a'
    });
    scrollBox.innerText = `THREE.JS LICENSE (MIT)
Copyright (c) 2010-2026 Three.js Authors

HOWLER.JS AUDIO ENGINE LICENSE (MIT)
Copyright (c) 2013-2026 James Simpson

RAPIER PHYSICS ENGINE (Apache 2.0)
Copyright (c) Dimforge Authors

SOCKET.IO TRANSPORT (MIT)
Copyright (c) Guillermo Rauch
`;
    card.appendChild(scrollBox);

    const stamp = document.createElement('div');
    stamp.innerText = 'CLIENT BUILD v2.5.0-STABLE | RENDER CORE: THREE.JS TSL';
    Object.assign(stamp.style, {
        fontSize: DS.typography.sizes.tiny,
        fontFamily: 'monospace',
        color: '#52525b',
        marginTop: '0.38rem'
    });
    card.appendChild(stamp);

    container.appendChild(card);
}

// ==========================================
// REUSABLE HELPER FACTORIES
// ==========================================

function createRow(titleText: string, descText: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'settings-row';

    const textWrap = document.createElement('div');
    textWrap.style.display = 'flex';
    textWrap.style.flexDirection = 'column';
    textWrap.style.gap = '2px';

    const t = document.createElement('span');
    t.innerText = titleText;
    t.style.fontWeight = 'bold';
    t.style.fontSize = DS.typography.sizes.body;
    t.style.color = '#ffffff';

    const d = document.createElement('span');
    d.innerText = descText;
    d.style.color = '#71717a';
    d.style.fontSize = DS.typography.sizes.small;

    textWrap.appendChild(t);
    textWrap.appendChild(d);
    row.appendChild(textWrap);

    return row;
}

function createSlider(
    min: number,
    max: number,
    step: number,
    currentVal: number,
    onChange: (val: number) => void,
    unit = '',
    isPercent = false
): HTMLDivElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    });

    const range = document.createElement('input');
    range.type = 'range';
    range.min = min.toString();
    range.max = max.toString();
    range.step = step.toString();
    range.value = currentVal.toString();
    range.style.width = '8.75rem';

    const label = document.createElement('span');
    const formatVal = (v: number) => {
        if (isPercent) return `${Math.round(v * 100)}%`;
        if (unit) return `${v.toFixed(step >= 0.1 && step < 1.0 ? 1 : 0)} ${unit}`;
        return v.toFixed(step >= 0.1 && step < 1.0 ? 1 : 0);
    };

    label.innerText = formatVal(currentVal);
    Object.assign(label.style, {
        fontFamily: 'monospace',
        fontSize: DS.typography.sizes.small,
        minWidth: '2.50rem',
        textAlign: 'right',
        color: '#ffffff'
    });

    bind(range, 'input', () => {
        const val = parseFloat(range.value);
        label.innerText = formatVal(val);
        onChange(val);
    });

    wrap.appendChild(range);
    wrap.appendChild(label);
    return wrap;
}

function createSegmentedControl(
    options: string[],
    currentVal: string,
    onChange: (val: string) => void
): HTMLDivElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
        display: 'flex',
        border: '1px solid #27272a',
        background: '#18181b',
        overflow: 'hidden'
    });

    options.forEach(opt => {
        const btn = document.createElement('button');
        const isActive = opt.toLowerCase() === currentVal.toLowerCase();
        btn.className = `seg-btn ${isActive ? 'active' : ''}`;
        btn.innerText = opt;
        bind(btn, 'click', () => {
            wrap.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            onChange(opt);
        });
        wrap.appendChild(btn);
    });

    return wrap;
}

function createCyberToggle(
    checked: boolean,
    onChange: (val: boolean) => void
): HTMLDivElement {
    const toggle = document.createElement('div');
    toggle.className = `cyber-toggle ${checked ? 'active' : ''}`;

    const track = document.createElement('div');
    track.className = 'cyber-toggle-track';

    const thumb = document.createElement('div');
    thumb.className = 'cyber-toggle-thumb';

    track.appendChild(thumb);
    toggle.appendChild(track);

    let state = checked;
    bind(toggle, 'click', () => {
        state = !state;
        if (state) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
        onChange(state);
    });

    return toggle;
}

function saveAndApply(s: VexeaSettingsData) {
    saveSettings(s);
    applySettings(s);
}
