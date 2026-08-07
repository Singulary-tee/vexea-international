import { VexeaSettingsData, DEFAULT_SETTINGS } from './types';

export const getSettings = (): VexeaSettingsData => {
    let saved = localStorage.getItem('vexea_settings');
    if (saved) {
        try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch (e) {
            return { ...DEFAULT_SETTINGS };
        }
    }
    return { ...DEFAULT_SETTINGS };
};

export const saveSettings = (s: VexeaSettingsData) => {
    localStorage.setItem('vexea_settings', JSON.stringify(s));
};

export function applySettings(s: VexeaSettingsData) {
    const W = window as any;
    W.vexeaSettings = s;
    
    // 1. Three.js Camera FOV
    if (W.camera) {
        W.camera.fov = s.fov;
        W.camera.updateProjectionMatrix();
    }
    
    // 2. Three.js Renderer Resolution, Exposure, Shadows
    if (W.renderer) {
        if (!s.dynamicResolutionEnabled) {
            let targetRatio = 1.0;
            if (s.pixelRatioMode === '0.75') {
                targetRatio = 0.75;
            } else if (s.pixelRatioMode === '1.0') {
                targetRatio = 1.0;
            } else if (s.pixelRatioMode === '1.5') {
                targetRatio = Math.min(window.devicePixelRatio, 1.5);
            } else if (s.pixelRatioMode === 'native') {
                targetRatio = window.devicePixelRatio;
            } else {
                targetRatio = s.graphicsPreset === 'Low' ? 0.75 : Math.min(window.devicePixelRatio, 1.5);
            }
            W.renderer.setPixelRatio(targetRatio);
        }

        // Apply Tone Mapping & Exposure
        let tm = 0; // THREE.NoToneMapping
        if (s.toneMapping === 'linear') tm = 1; // THREE.LinearToneMapping
        else if (s.toneMapping === 'reinhard') tm = 2; // THREE.ReinhardToneMapping
        else if (s.toneMapping === 'cineon') tm = 3; // THREE.CineonToneMapping
        else if (s.toneMapping === 'aces') tm = 4; // THREE.ACESFilmicToneMapping
        W.renderer.toneMapping = tm;
        W.renderer.toneMappingExposure = s.exposure;

        // Apply Shadow Map settings
        W.renderer.shadowMap.enabled = s.shadows;
    }

    // 3. Apply TSL graphics uniforms (Three.js Shaders)
    const uniforms = W.vexGraphicsUniforms;
    if (uniforms) {
        if (uniforms.bloomEnabled) uniforms.bloomEnabled.value = s.bloom ? 1.0 : 0.0;
        if (uniforms.bloomStrength) uniforms.bloomStrength.value = s.bloomStrength;
        if (uniforms.bloomRadius) uniforms.bloomRadius.value = s.bloomRadius;
        if (uniforms.bloomThreshold) uniforms.bloomThreshold.value = s.bloomThreshold;
        if (uniforms.vignetteEnabled) uniforms.vignetteEnabled.value = s.vignette ? 1.0 : 0.0;
        if (uniforms.vignetteIntensity) uniforms.vignetteIntensity.value = s.vignetteIntensity;
        if (uniforms.chromaticAberrationEnabled) uniforms.chromaticAberrationEnabled.value = s.chromaticAberration ? 1.0 : 0.0;
        if (uniforms.chromaticAberrationIntensity) uniforms.chromaticAberrationIntensity.value = s.chromaticAberrationIntensity;
        if (uniforms.ssaoEnabled) uniforms.ssaoEnabled.value = s.ssao ? 1.0 : 0.0;
        if (uniforms.pomScale) uniforms.pomScale.value = s.parallaxOcclusion ? 0.025 : 0.0;
        if (uniforms.pbrNormalScale) uniforms.pbrNormalScale.value = s.pbrMaterials ? 1.0 : 0.0;
        if (uniforms.pbrDetailsEnabled) uniforms.pbrDetailsEnabled.value = s.pbrMaterials ? 1.0 : 0.0;
        if (uniforms.instancedPropsEnabled) uniforms.instancedPropsEnabled.value = s.instancedProps ? 1.0 : 0.0;
    }

    // Trigger prop visibility or custom rendering updates
    document.dispatchEvent(new CustomEvent("VEXEA_GRAPHICS_CHANGED", { detail: s }));
    document.dispatchEvent(new CustomEvent("VEXEA_SETTINGS_CHANGED", { detail: s }));
    
    // FXAA
    if (W.fxaaPass) {
        W.fxaaPass.enabled = s.fxaa;
        if (W.fxaaPass.material?.uniforms?.resolution?.value) {
            W.fxaaPass.material.resolution = W.fxaaPass.material.resolution || W.fxaaPass.material.uniforms.resolution.value;
            W.fxaaPass.material.resolution.set(1 / (window.innerWidth * window.devicePixelRatio), 1 / (window.innerHeight * window.devicePixelRatio));
        }
    }

    // 4. Audio Volumes via Howler
    const Howler = (window as any).Howler;
    if (Howler) {
        Howler.volume(s.masterVolume);
        
        // Music & UI toggle
        const bgM = W.bgMusicHowl || W.musicHowl || W.bgm;
        if (bgM) bgM.mute(!s.music);
        
        const uiM = W.uiSoundHowl || W.uiHowl || W.uiAudio;
        if (uiM && typeof uiM.mute === 'function') uiM.mute(!s.uiSounds);
        if (Array.isArray(W.uiHowls)) {
            W.uiHowls.forEach((h: any) => h.mute(!s.uiSounds));
        }
    }
    if (W.audioManager && typeof W.audioManager.updateVolumes === 'function') {
        W.audioManager.updateVolumes(s);
    }
    if (W.audioListener) {
        W.audioListener.setMasterVolume(s.masterVolume);
    }

    // 5. Spatial Audio Mix
    function updatePanner(node: any) {
        if (node && node.panner) {
            node.panner.panningModel = s.spatialAudio ? 'HRTF' : 'equalpower';
        }
    }
    if (W.activeGroundDrones) {
        for (let entry of W.activeGroundDrones.values()) {
            if (entry.audio) updatePanner(entry.audio);
        }
    }
    if (W.activeAirDrones) {
        for (let entry of W.activeAirDrones.values()) {
            if (entry.audio) updatePanner(entry.audio);
        }
    }

    // 6. UI & Accessibility Scaling
    const hud = document.getElementById("hud-container");
    if (hud) hud.style.transform = `scale(${s.hudScale})`;
    
    const crosshair = document.getElementById("center-crosshair");
    if (crosshair) {
        crosshair.style.color = s.crosshairColor;
        const svg = crosshair.querySelector('svg');
        if (svg) {
            svg.style.width = s.crosshairSize + 'px';
            svg.style.height = s.crosshairSize + 'px';
            svg.style.stroke = s.crosshairColor;
        } else {
            crosshair.style.width = s.crosshairSize + 'px';
            crosshair.style.height = s.crosshairSize + 'px';
        }
    }

    // 7. Colorblind SVG Post-Processing Filters
    const cbFilter = s.colorblindFilter;
    let svgCb = document.getElementById('vexea-cb-svg-defs');
    if (!svgCb) {
        svgCb = document.createElement('div');
        svgCb.id = 'vexea-cb-svg-defs';
        svgCb.style.position = 'absolute';
        svgCb.style.width = '0';
        svgCb.style.height = '0';
        svgCb.style.overflow = 'hidden';
        svgCb.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="cb-protanopia">
                        <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0   0.558, 0.442, 0, 0, 0   0, 0.242, 0.758, 0, 0   0, 0, 0, 1, 0"/>
                    </filter>
                    <filter id="cb-deuteranopia">
                        <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0   0.7, 0.3, 0, 0, 0   0, 0.3, 0.7, 0, 0   0, 0, 0, 1, 0"/>
                    </filter>
                    <filter id="cb-tritanopia">
                        <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0   0, 0.433, 0.567, 0, 0   0, 0.475, 0.525, 0, 0   0, 0, 0, 1, 0"/>
                    </filter>
                </defs>
            </svg>
        `;
        document.body.appendChild(svgCb);
    }

    const vexeaView = document.getElementById('canvas-container') || document.getElementById('vexea-view') || document.body;
    if (vexeaView) {
        if (cbFilter === 'Protanopia') {
            vexeaView.style.filter = 'url(#cb-protanopia)';
        } else if (cbFilter === 'Deuteranopia') {
            vexeaView.style.filter = 'url(#cb-deuteranopia)';
        } else if (cbFilter === 'Tritanopia') {
            vexeaView.style.filter = 'url(#cb-tritanopia)';
        } else {
            vexeaView.style.filter = 'none';
        }
    }

    // 8. High Contrast Text Overlay
    if (s.highContrastText) {
        document.body.classList.add('vexea-high-contrast');
    } else {
        document.body.classList.remove('vexea-high-contrast');
    }
}
