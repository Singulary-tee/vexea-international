import * as THREE from 'three';
import { Howl, Howler } from 'howler';
import { getCachedOrFetchUrl } from './asset-cache';
import { AUDIO_MANIFEST, AudioCategory, AudioKey, getAudioEntry } from './audio-manifest';

const SOUND_CATEGORIES: Record<string, AudioCategory> = Object.fromEntries(
    AUDIO_MANIFEST.map((entry) => [entry.key, entry.category])
);

const _listenerForward = new THREE.Vector3();
const _listenerRight = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);

type FootstepSurface = 'gravel' | 'ground' | 'hard' | 'metal' | 'wood';

class AudioManager {
    private assetsLoaded = 0;
    private totalAssets = 0;

    public sounds: Record<string, Howl> = {};

    private menuMusicSequence: AudioKey[] = ['vexea_theme', 'iron_march', 'factory_ambience'];
    private currentMusicIndex = 0;
    private currentMusicHowl: Howl | null = null;

    private isMatchPlaying = false;
    private activeFootstepKey: string | null = null;
    private footstepSurface: FootstepSurface = 'hard';
    private footstepVariants: Record<string, number> = {};

    private volumeFor(category: AudioCategory, settings: any): number {
        if (!settings) return 1;
        if (category === 'music') return settings.music ? settings.musicVolume : 0;
        if (category === 'ui') return settings.uiSounds ? settings.uiVolume : 0;
        return settings.sfxVolume;
    }

    private applyVolume(key: string, howl: Howl): void {
        const settings = (window as any).vexeaSettings;
        howl.volume(this.volumeFor(SOUND_CATEGORIES[key] || 'sfx', settings));
    }

    public updateVolumes(s: any) {
        for (const key in this.sounds) {
            if (Object.prototype.hasOwnProperty.call(this.sounds, key)) {
                this.sounds[key].volume(this.volumeFor(SOUND_CATEGORIES[key] || 'sfx', s));
            }
        }
    }

    public async loadAll(): Promise<void> {
        this.totalAssets = AUDIO_MANIFEST.length;
        this.assetsLoaded = 0;

        const loadPromises = AUDIO_MANIFEST.map(async (entry) => {
            const cachedUrl = await getCachedOrFetchUrl(entry.path, 'Sound');
            let settled = false;
            const settle = () => {
                if (!settled) {
                    settled = true;
                    this.assetsLoaded++;
                }
            };

            return new Promise<void>((resolve) => {
                const howl = new Howl({
                    src: [cachedUrl],
                    // R2 stores the canonical files as Opus in an Ogg-compatible container.
                    format: ['opus', 'ogg'],
                    preload: true,
                    loop: Boolean('loop' in entry && entry.loop),
                    onplayerror: function() {
                        howl.once('unlock', function() {
                            howl.play();
                        });
                    },
                    onload: () => {
                        settle();
                        resolve();
                    },
                    onloaderror: (_id, err) => {
                        settle();
                        console.warn(`[Audio] Failed to load ${entry.key} from ${entry.path}`, err);
                        resolve();
                    }
                });
                this.sounds[entry.key] = howl;
                this.applyVolume(entry.key, howl);
            });
        });

        await Promise.all(loadPromises);
    }

    public play(name: string) {
        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Audio ${name} not found`);
            return;
        }

        const category = SOUND_CATEGORIES[name] || 'sfx';
        sound.rate(category === 'music' ? 1.0 : 0.93 + Math.random() * 0.14);
        sound.play();
    }

    /**
     * Plays a sound with distance attenuation and listener-relative stereo pan.
     * Howler's stereo pan is derived from the active camera's right vector, so
     * rotating the listener changes left/right placement instead of using fixed
     * world-axis panning.
     */
    public playPositional(
        name: string,
        sourceX: number,
        sourceY: number,
        sourceZ: number,
        listenerX: number,
        listenerY: number,
        listenerZ: number,
        maxDistance = 120
    ): number | null {
        const sound = this.sounds[name];
        if (!sound) return null;

        const settings = (window as any).vexeaSettings;
        const category = SOUND_CATEGORIES[name] || 'sfx';
        const baseVol = this.volumeFor(category, settings);
        if (baseVol <= 0) return null;

        const dx = sourceX - listenerX;
        const dy = sourceY - listenerY;
        const dz = sourceZ - listenerZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (settings?.spatialAudio !== false) {
            const maxDistSq = maxDistance * maxDistance;
            if (distSq >= maxDistSq) return null;
        }

        let effectiveVol = baseVol;
        if (!settings || settings.spatialAudio !== false) {
            const dist = Math.sqrt(distSq);
            const factor = Math.max(0, 1 - dist / maxDistance);
            effectiveVol = baseVol * factor * factor;
        }
        if (effectiveVol <= 0.001) return null;

        const camera = (window as any).camera;
        let pan = 0;
        if (camera?.getWorldDirection) {
            camera.getWorldDirection(_listenerForward).normalize();
            _listenerRight.crossVectors(_listenerForward, _worldUp).normalize();
            const length = Math.sqrt(distSq);
            if (length > 0.001) {
                pan = THREE.MathUtils.clamp(
                    (dx * _listenerRight.x + dy * _listenerRight.y + dz * _listenerRight.z) / length,
                    -1,
                    1
                );
            }
        } else if (distSq > 0.001) {
            pan = THREE.MathUtils.clamp(dx / Math.sqrt(distSq), -1, 1);
        }

        sound.rate(category === 'music' ? 1.0 : 0.93 + Math.random() * 0.14);
        const soundId = sound.play();
        const spatialHowler = Howler as any;
        const useWebAudioPanner = settings?.spatialAudio !== false
            && typeof (sound as any).pos === 'function'
            && typeof spatialHowler.pos === 'function';

        if (useWebAudioPanner) {
            // Keep the global listener aligned to the active Three.js camera and
            // let the Web Audio PannerNode calculate direction and attenuation.
            spatialHowler.pos(listenerX, listenerY, listenerZ);
            if (camera?.getWorldDirection && typeof spatialHowler.orientation === 'function') {
                camera.getWorldDirection(_listenerForward).normalize();
                spatialHowler.orientation(
                    _listenerForward.x,
                    _listenerForward.y,
                    _listenerForward.z,
                    _worldUp.x,
                    _worldUp.y,
                    _worldUp.z
                );
            }
            (sound as any).pannerAttr({
                panningModel: 'HRTF',
                distanceModel: 'linear',
                refDistance: 1,
                maxDistance,
                rolloffFactor: 1,
            }, soundId);
            (sound as any).pos(sourceX, sourceY, sourceZ, soundId);
            sound.volume(baseVol, soundId);
        } else {
            // Fallback for environments without the Howler spatial plugin.
            sound.volume(effectiveVol, soundId);
            sound.stereo(pan, soundId);
        }
        return soundId;
    }

    public setMatchState(inMatch: boolean) {
        this.isMatchPlaying = inMatch;
        if (inMatch) {
            this.stopMenuMusic();
        } else {
            this.stopActiveFootstep();
            if (!this.currentMusicHowl || !this.currentMusicHowl.playing()) {
                this.playNextMenuMusic();
            }
        }
    }

    public playNextMenuMusic() {
        if (this.isMatchPlaying) return;

        if (this.currentMusicHowl) {
            this.currentMusicHowl.stop();
            this.currentMusicHowl.off('end');
        }

        const nextTrackName = this.menuMusicSequence[this.currentMusicIndex];
        this.currentMusicIndex = (this.currentMusicIndex + 1) % this.menuMusicSequence.length;

        this.currentMusicHowl = this.sounds[nextTrackName] || null;
        if (this.currentMusicHowl) {
            this.currentMusicHowl.play();
            this.currentMusicHowl.once('end', () => this.playNextMenuMusic());
        }
    }

    public stopMenuMusic() {
        if (this.currentMusicHowl) {
            this.currentMusicHowl.stop();
            this.currentMusicHowl.off('end');
            this.currentMusicHowl = null;
        }
    }

    public playWeaponFire(activeWeapon: number) {
        this.play(activeWeapon === 1 ? 'rifle_fire' : 'pistol_fire');
    }

    public playWeaponReload(_activeWeapon: number) {
        this.stop('reload');
        this.play('reload');
    }

    public stopWeaponReload() {
        this.stop('reload');
    }

    public playEmptyClick() {
        this.play('empty_click');
    }

    private droneFireKey(droneType: number): AudioKey {
        // DroneType: rotary shooter 0, bomber 1, recon 2, fixed-wing 3,
        // wheeled 4, robot dog 5, humanoid 6. Quadruped shares humanoid fire.
        return droneType === 4
            ? 'ugv_turret_fire'
            : droneType === 6 || droneType === 5
            ? 'humanoid_gun_fire'
            : 'quadcopter_rifle_fire';
    }

    public playDroneFire(droneType: number) {
        this.play(this.droneFireKey(droneType));
    }

    public playDroneFirePositional(
        droneType: number,
        sourceX: number,
        sourceY: number,
        sourceZ: number,
        listenerX: number,
        listenerY: number,
        listenerZ: number,
        maxDistance = 150
    ) {
        return this.playPositional(
            this.droneFireKey(droneType),
            sourceX,
            sourceY,
            sourceZ,
            listenerX,
            listenerY,
            listenerZ,
            maxDistance
        );
    }

    public playDroneDeath() {
        this.play('bomber_explosion');
    }

    public playDroneDeathPositional(
        sourceX: number,
        sourceY: number,
        sourceZ: number,
        listenerX: number,
        listenerY: number,
        listenerZ: number,
        maxDistance = 150
    ) {
        return this.playPositional('bomber_explosion', sourceX, sourceY, sourceZ, listenerX, listenerY, listenerZ, maxDistance);
    }

    public setFootstepSurface(surface: FootstepSurface) {
        this.footstepSurface = surface;
    }

    private nextFootstepKey(isRunning: boolean): string {
        const base = `${isRunning ? 'run' : 'walk'}_${this.footstepSurface}`;
        const next = (this.footstepVariants[base] || 0) % 2 + 1;
        this.footstepVariants[base] = next;
        return `${base}_0${next}`;
    }

    private stopActiveFootstep() {
        if (this.activeFootstepKey) {
            this.sounds[this.activeFootstepKey]?.stop();
            this.activeFootstepKey = null;
        }
    }

    public updateFootsteps(_dt: number, speed: number, _position: THREE.Vector3, isGrounded: boolean) {
        if (!isGrounded || speed < 0.1) {
            this.stopActiveFootstep();
            return;
        }

        const isRunning = speed > 6.0;
        const base = `${isRunning ? 'run' : 'walk'}_${this.footstepSurface}`;
        const activeBase = this.activeFootstepKey?.replace(/_\d\d$/, '');
        const targetKey = activeBase === base && this.activeFootstepKey
            ? this.activeFootstepKey
            : this.nextFootstepKey(isRunning);

        if (this.activeFootstepKey !== targetKey) {
            this.stopActiveFootstep();
            this.activeFootstepKey = targetKey;
        }

        const targetSound = this.sounds[targetKey];
        if (targetSound && !targetSound.playing()) {
            targetSound.rate(0.95 + Math.random() * 0.1);
            targetSound.play();
        }
    }

    public stop(key: string) {
        this.sounds[key]?.stop();
    }

    public getAudioPath(key: string): string | undefined {
        return getAudioEntry(key)?.path;
    }
}

export const audioManager = new AudioManager();
(window as any).audioManager = audioManager;
// Preserve the existing settings module's global controller expectation while
// loading Howler through Vite rather than relying on a missing CDN global.
(window as any).Howler = Howler;
