import { IS_DEV } from "../../../shared/gates/production.gate";
import { IS_MOBILE } from "../../gates/platform.gate";

export interface VexeaSettingsData {
    // Gameplay & General
    serverRegion: 'Auto' | 'US-East' | 'Europe-West' | 'Asia-East';
    netInterpolation: number; // 50 to 200 ms
    language: 'English' | 'Spanish' | 'French' | 'German' | 'Japanese';
    telemetry: boolean;

    // Inputs & Controls
    joySens: number;
    camSens: number;
    invertY: boolean;
    invertX: boolean;
    lookCurve: 'Linear' | 'Exponential' | 'S-Curve';
    analogDeadzone: number; // 5 to 25
    rawPointerLock: boolean;
    bindings: { [key: string]: string }; // Custom Keyboard Bindings for Desktop

    // Graphics & Video
    graphicsPreset: 'Low' | 'Medium' | 'High' | 'Custom';
    fpsCap: number; // 30, 60 or 0 (uncapped)
    fxaa: boolean;
    dynamicResolutionEnabled: boolean;
    pixelRatioMode: '0.75' | '1.0' | '1.5' | 'native';
    shadows: boolean;
    ssao: boolean;
    bloom: boolean;
    bloomStrength: number;
    bloomRadius: number;
    bloomThreshold: number;
    vignette: boolean;
    vignetteIntensity: number;
    chromaticAberration: boolean;
    chromaticAberrationIntensity: number;
    toneMapping: 'none' | 'linear' | 'reinhard' | 'cineon' | 'aces';
    exposure: number;
    parallaxOcclusion: boolean;
    pbrMaterials: boolean;
    instancedProps: boolean;
    particleCount: number;
    lodLow: number;
    lodBillboard: number;
    fov: number;
    rendererType: 'auto' | 'webgpu' | 'webgl';
    fullscreen: boolean;
    serverUrl: string;
    flashLight: boolean;

    // Audio & Sound
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    uiVolume: number;
    voiceVolume: number;
    spatialAudio: boolean;
    hrtfPreset: 'Flat Stereo' | 'Focused Headset' | 'Cinematic Speakers' | 'Studio Monitor';
    music: boolean;
    uiSounds: boolean;

    // User Interface & HUD
    crosshairStyle: 'Standard Cross' | 'Dot' | 'Circle' | 'T-Shape';
    crosshairColor: string;
    crosshairSize: number;
    crosshairGap: number;
    hudScale: number;
    chatEnabled: boolean;
    chatFontSize: number;
    radialOpacity: number;
    radialSelectionDeadzone: number;

    // Accessibility
    highContrastText: boolean;
    colorblindFilter: 'None' | 'Protanopia' | 'Deuteranopia' | 'Tritanopia';
    screenShakeMultiplier: number; // 0 to 1
    flashbangMode: 'Whiteout Flash' | 'Blackout Fade';
    textToSpeech: boolean;

    // Dev Settings (only when IS_DEV is true)
    gltfPipeline: 'Chunked' | 'Full Load' | 'Lazy Instance';
    collisionMeshVis: boolean;
}

export const DEFAULT_SETTINGS: VexeaSettingsData = {
    // Gameplay & General
    serverRegion: 'Auto',
    netInterpolation: 100,
    language: 'English',
    telemetry: true,

    // Inputs & Controls
    joySens: 1.0,
    camSens: 1.0,
    invertY: false,
    invertX: false,
    lookCurve: 'Linear',
    analogDeadzone: 10,
    rawPointerLock: true,
    bindings: {
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
    },

    // Graphics & Video
    graphicsPreset: IS_MOBILE ? 'Low' : 'Medium',
    fpsCap: IS_MOBILE ? 30 : 60,
    fxaa: false,
    dynamicResolutionEnabled: true,
    pixelRatioMode: IS_MOBILE ? '0.75' : '1.5',
    shadows: !IS_MOBILE,
    ssao: false,
    bloom: !IS_MOBILE,
    bloomStrength: 1.0,
    bloomRadius: 0.5,
    bloomThreshold: 0.5,
    vignette: true,
    vignetteIntensity: 0.5,
    chromaticAberration: false,
    chromaticAberrationIntensity: 0.005,
    toneMapping: 'aces',
    exposure: 1.0,
    parallaxOcclusion: !IS_MOBILE,
    pbrMaterials: !IS_MOBILE,
    instancedProps: !IS_MOBILE,
    particleCount: IS_MOBILE ? 20 : 50,
    lodLow: IS_MOBILE ? 15 : 30,
    lodBillboard: IS_MOBILE ? 30 : 60,
    fov: 75,
    rendererType: 'auto',
    fullscreen: false,
    serverUrl: "",
    flashLight: !IS_MOBILE,

    // Audio & Sound
    masterVolume: 1.0,
    musicVolume: 0.7,
    sfxVolume: 1.0,
    uiVolume: 0.8,
    voiceVolume: 0.8,
    spatialAudio: true,
    hrtfPreset: 'Focused Headset',
    music: true,
    uiSounds: true,

    // User Interface & HUD
    crosshairStyle: 'Standard Cross',
    crosshairColor: 'white',
    crosshairSize: 20,
    crosshairGap: 4,
    hudScale: 1.0,
    chatEnabled: true,
    chatFontSize: 12,
    radialOpacity: 0.9,
    radialSelectionDeadzone: 20,

    // Accessibility
    highContrastText: false,
    colorblindFilter: 'None',
    screenShakeMultiplier: 1.0,
    flashbangMode: 'Whiteout Flash',
    textToSpeech: false,

    // Dev Settings
    gltfPipeline: 'Full Load',
    collisionMeshVis: false
};
