import { Howl, Howler } from 'howler';
import * as THREE from 'three';
import { getCachedOrFetchUrl } from "./asset-cache";
import { AUDIO_MANIFEST, getManifestEntry, AudioKey } from "./audio-manifest";

class AudioManager {
    private assetsLoaded = 0;
    private totalAssets = 0;
    
    // SFX Howl instances
    public sounds: Record<string, Howl> = {};
    
    // Music sequence state
    private menuMusicSequence: string[] = ['vexea_theme', 'iron_march', 'factory_ambience'];
    private currentMusicIndex = 0;
    private currentMusicHowl: Howl | null = null;
    
    // State
    private isMatchPlaying = false;
    
    // Footstep state
    private footstepTimer = 0;
    private lastFootstepVariant = 0;

    // Heartbeat state
    private heartbeatHowl: Howl | null = null;
    private heartbeatActive = false;

    // In-flight loading promises to prevent duplicate fetches
    private inFlightLoads = new Map<string, Promise<void>>();

    // Continuous spatial loops/emitters registry
    private activeEmitters = new Map<string, { howl: Howl; soundId: number; key: string; position: THREE.Vector3 }>();

    // Ambient match zone emitters
    private ambientEmitterIds: string[] = [];

    // Pre-allocated vectors to prevent GC churn in tick/render loops
    private tempPos = new THREE.Vector3();
    private tempForward = new THREE.Vector3();
    private tempUp = new THREE.Vector3();

    public updateVolumes(s: any) {
        for (const key in this.sounds) {
            if (Object.prototype.hasOwnProperty.call(this.sounds, key)) {
                const howl = this.sounds[key];
                const entry = getManifestEntry(key);
                const category = entry ? entry.category : 'sfx';
                let vol = 1.0;
                if (category === 'music') {
                    vol = s.music ? s.musicVolume : 0;
                } else if (category === 'ui') {
                    vol = s.uiSounds ? s.uiVolume : 0;
                } else if (category === 'ambient') {
                    vol = s.music ? s.musicVolume * 0.5 : 0;
                } else {
                    vol = s.sfxVolume;
                }
                howl.volume(vol);
            }
        }
    }

    private async loadEntries(entries: typeof AUDIO_MANIFEST): Promise<void> {
        const unloadedEntries = entries.filter(e => !this.sounds[e.key] && !this.inFlightLoads.has(e.key));
        
        // Also wait on any already in-flight loads for requested entries
        const existingInFlight = entries
            .filter(e => this.inFlightLoads.has(e.key))
            .map(e => this.inFlightLoads.get(e.key)!);

        if (unloadedEntries.length === 0 && existingInFlight.length === 0) return;

        this.totalAssets += unloadedEntries.length;

        const newLoadPromises = unloadedEntries.map((entry) => {
            const promise = (async () => {
                try {
                    const cachedUrl = await getCachedOrFetchUrl(entry.path, 'Sound');
                    const ext = entry.path.substring(entry.path.lastIndexOf('.') + 1);
                    const formats = ext === 'opus' ? ['opus', 'ogg'] : [ext];

                    await new Promise<void>((resolve) => {
                        const howl = new Howl({
                            src: [cachedUrl],
                            format: formats,
                            preload: true,
                            loop: entry.loop ?? false,
                            onplayerror: () => {
                                if (!entry.loop) {
                                    howl.once('unlock', () => {
                                        howl.play();
                                    });
                                }
                            },
                            onload: () => {
                                this.assetsLoaded++;
                                resolve();
                            },
                            onloaderror: (id, err) => {
                                console.warn(`[Audio] Failed to load audio: ${entry.path}`, err);
                                resolve();
                            }
                        });

                        this.sounds[entry.key] = howl;

                        const s = (window as any).vexeaSettings;
                        if (s) {
                            const category = entry.category;
                            let vol = 1.0;
                            if (category === 'music') {
                                vol = s.music ? s.musicVolume : 0;
                            } else if (category === 'ui') {
                                vol = s.uiSounds ? s.uiVolume : 0;
                            } else if (category === 'ambient') {
                                vol = s.music ? s.musicVolume * 0.5 : 0;
                            } else {
                                vol = s.sfxVolume;
                            }
                            howl.volume(vol);
                        }
                    });
                } finally {
                    this.inFlightLoads.delete(entry.key);
                }
            })();

            this.inFlightLoads.set(entry.key, promise);
            return promise;
        });

        await Promise.all([...newLoadPromises, ...existingInFlight]);
    }

    public async loadMenuAudio(): Promise<void> {
        const menuEntries = AUDIO_MANIFEST.filter(e => e.category === 'ui' || e.category === 'music');
        await this.loadEntries(menuEntries);
    }

    public async loadGameplayAudio(): Promise<void> {
        const gameplayEntries = AUDIO_MANIFEST.filter(e => e.category !== 'ui' && e.category !== 'music');
        await this.loadEntries(gameplayEntries);
    }

    public async loadAll(): Promise<void> {
        await this.loadEntries(AUDIO_MANIFEST);
    }
    
    public play(name: string) {
        const sound = this.sounds[name];
        if (sound) {
            const entry = getManifestEntry(name);
            const category = entry ? entry.category : 'sfx';
            if (category === 'sfx' || category === 'ui') {
                const pitch = 0.93 + Math.random() * 0.14; // Range 0.93 to 1.07
                sound.rate(pitch);
            } else {
                sound.rate(1.0);
            }
            sound.play();
        } else {
            console.warn(`[Audio] Sound ${name} not found`);
        }
    }

    public updateListener(camera: THREE.Camera): void {
        camera.getWorldPosition(this.tempPos);

        this.tempForward.set(0, 0, -1);
        this.tempForward.applyQuaternion(camera.quaternion).normalize();

        this.tempUp.set(0, 1, 0);
        this.tempUp.applyQuaternion(camera.quaternion).normalize();

        // Update listener position & orientation
        Howler.pos(this.tempPos.x, this.tempPos.y, this.tempPos.z);
        Howler.orientation(this.tempForward.x, this.tempForward.y, this.tempForward.z, this.tempUp.x, this.tempUp.y, this.tempUp.z);
    }

    public playPositional(
        key: string,
        sourceOrX: THREE.Vector3 | number,
        optionsOrY?: any,
        z?: number,
        listenerX?: number,
        listenerY?: number,
        listenerZ?: number,
        maxDistance = 120
    ): number | null {
        const sound = this.sounds[key];
        if (!sound) {
            console.warn(`[Audio] Positional sound ${key} not found`);
            return null;
        }

        const s = (window as any).vexeaSettings || { sfxVolume: 1.0, spatialAudio: true };
        const entry = getManifestEntry(key);
        const category = entry ? entry.category : 'sfx';
        let baseVol = 1.0;
        if (category === 'music') {
            baseVol = s.music ? s.musicVolume : 0;
        } else if (category === 'ui') {
            baseVol = s.uiSounds ? s.uiVolume : 0;
        } else if (category === 'ambient') {
            baseVol = s.music ? s.musicVolume * 0.5 : 0;
        } else {
            baseVol = s.sfxVolume;
        }

        if (baseVol <= 0) return null;

        if (category === 'sfx' || category === 'ui') {
            const pitch = 0.93 + Math.random() * 0.14;
            sound.rate(pitch);
        } else {
            sound.rate(1.0);
        }

        const soundId = sound.play();
        if (soundId === undefined) return null;

        if (sourceOrX instanceof THREE.Vector3) {
            const source = sourceOrX;
            const options = optionsOrY;

            if (s.spatialAudio !== false) {
                sound.pos(source.x, source.y, source.z, soundId);
                sound.pannerAttr({
                    panningModel: 'HRTF',
                    refDistance: options?.refDistance ?? 1,
                    maxDistance: options?.maxDistance ?? 120,
                    rolloffFactor: options?.rolloffFactor ?? 1,
                    distanceModel: 'inverse'
                }, soundId);
                sound.volume(baseVol, soundId);
            } else {
                sound.volume(baseVol, soundId);
            }
        } else {
            const sourceX = sourceOrX;
            const sourceY = optionsOrY as number;
            const sourceZ = z as number;

            if (s.spatialAudio !== false && listenerX !== undefined && listenerY !== undefined && listenerZ !== undefined) {
                sound.pos(sourceX, sourceY, sourceZ, soundId);
                sound.pannerAttr({
                    panningModel: 'HRTF',
                    refDistance: 1,
                    maxDistance: maxDistance,
                    rolloffFactor: 1,
                    distanceModel: 'inverse'
                }, soundId);
                sound.volume(baseVol, soundId);
            } else {
                sound.volume(baseVol, soundId);
            }
        }

        return soundId;
    }

    public startEmitter(entityId: string, key: string, source: THREE.Vector3, options?: any): void {
        this.stopEmitter(entityId);

        const sound = this.sounds[key];
        if (!sound) {
            console.warn(`[Audio] Emitter sound ${key} not found`);
            return;
        }

        const s = (window as any).vexeaSettings || { sfxVolume: 1.0, spatialAudio: true };
        const entry = getManifestEntry(key);
        const category = entry ? entry.category : 'sfx';
        let baseVol = 1.0;
        if (category === 'music') {
            baseVol = s.music ? s.musicVolume : 0;
        } else if (category === 'ui') {
            baseVol = s.uiSounds ? s.uiVolume : 0;
        } else if (category === 'ambient') {
            baseVol = s.music ? s.musicVolume * 0.5 : 0;
        } else {
            baseVol = s.sfxVolume;
        }

        if (baseVol <= 0) return;

        const shouldLoop = options?.loop !== false;
        sound.loop(shouldLoop);

        const soundId = sound.play();
        if (soundId === undefined) return;

        sound.volume(baseVol, soundId);

        if (s.spatialAudio !== false) {
            sound.pos(source.x, source.y, source.z, soundId);
            sound.pannerAttr({
                panningModel: 'HRTF',
                refDistance: options?.refDistance ?? 1,
                maxDistance: options?.maxDistance ?? 120,
                rolloffFactor: options?.rolloffFactor ?? 1,
                distanceModel: 'inverse'
            }, soundId);
        }

        const posCopy = new THREE.Vector3().copy(source);
        this.activeEmitters.set(entityId, {
            howl: sound,
            soundId,
            key: key,
            position: posCopy
        });
    }

    public updateEmitter(entityId: string, source: THREE.Vector3): void {
        const emitter = this.activeEmitters.get(entityId);
        if (emitter) {
            emitter.position.copy(source);
            const s = (window as any).vexeaSettings || { spatialAudio: true };
            if (s.spatialAudio !== false) {
                emitter.howl.pos(source.x, source.y, source.z, emitter.soundId);
            }
        }
    }

    public stopEmitter(entityId: string): void {
        const emitter = this.activeEmitters.get(entityId);
        if (emitter) {
            emitter.howl.stop(emitter.soundId);
            this.activeEmitters.delete(entityId);
        }
    }
    
    public setMatchState(inMatch: boolean) {
        this.isMatchPlaying = inMatch;
        if (inMatch) {
            this.stopMenuMusic();
        } else {
            if (this.currentMusicHowl && this.currentMusicHowl.playing()) {
                // Keep playing
            } else {
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
        
        this.currentMusicHowl = this.sounds[nextTrackName];
        if (this.currentMusicHowl) {
            this.currentMusicHowl.play();
            this.currentMusicHowl.once('end', () => {
                this.playNextMenuMusic();
            });
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
        if (activeWeapon === 1) {
            this.play('rifle_fire');
        } else if (activeWeapon === 2) {
            this.play('pistol_fire');
        } else {
            this.play('smg_fire');
        }
    }

    public playWeaponReload(activeWeapon: number) {
        this.stopWeaponReload();
        if (activeWeapon === 1) {
            this.play('rifle_reload');
        } else if (activeWeapon === 2) {
            this.play('pistol_reload');
        } else {
            this.play('reload');
        }
    }
    
    public stopWeaponReload() {
        this.stop('reload');
        this.stop('pistol_reload');
        this.stop('rifle_reload');
    }

    public stop(key: string) {
        if (this.sounds[key]) {
            this.sounds[key].stop();
        }
    }

    public getFootstepKey(isRunning: boolean, surface = 'ground'): string {
        this.lastFootstepVariant = 1 - this.lastFootstepVariant;
        const stepNum = this.lastFootstepVariant === 0 ? '01' : '02';
        const prefix = isRunning ? 'run' : 'walk';

        // Handlers for single-variant assets in manifest (run_concrete_02, walk_concrete_01)
        if (surface === 'concrete') {
            return isRunning ? 'run_concrete_02' : 'walk_concrete_01';
        }

        const candidate = `${prefix}_${surface}_${stepNum}`;
        if (this.sounds[candidate]) return candidate;

        // Fallback to ground or hard
        const fallbackGround = `${prefix}_ground_${stepNum}`;
        if (this.sounds[fallbackGround]) return fallbackGround;

        const fallbackHard = `${prefix}_hard_${stepNum}`;
        if (this.sounds[fallbackHard]) return fallbackHard;

        return `${prefix}_hard_01`;
    }

    public updateFootsteps(dt: number, speed: number, position: THREE.Vector3, isGrounded: boolean, surface = 'ground') {
        if (!isGrounded || speed < 0.1) {
            this.footstepTimer = 0;
            return;
        }

        const isRunning = speed > 6.0;
        const interval = isRunning ? 0.33 : 0.52;

        this.footstepTimer += dt;
        if (this.footstepTimer >= interval) {
            this.footstepTimer = 0;
            const soundKey = this.getFootstepKey(isRunning, surface);
            this.playPositional(soundKey, position);
        }
    }

    public playJump(position?: THREE.Vector3) {
        if (position) {
            this.playPositional('jump_01', position);
        } else {
            this.play('jump_01');
        }
    }

    public playJumpLand(position?: THREE.Vector3) {
        const variants = ['jump_land_01', 'jump_land_02', 'jump_land_03'];
        const key = variants[Math.floor(Math.random() * variants.length)];
        if (position) {
            this.playPositional(key, position);
        } else {
            this.play(key);
        }
    }

    public setHeartbeat(active: boolean) {
        if (this.heartbeatActive === active) return;
        this.heartbeatActive = active;

        if (active) {
            const sound = this.sounds['heart_beat_loop'];
            if (sound) {
                sound.loop(true);
                const s = (window as any).vexeaSettings;
                const vol = s ? s.sfxVolume : 1.0;
                sound.volume(vol);
                sound.play();
                this.heartbeatHowl = sound;
            }
        } else {
            if (this.heartbeatHowl) {
                this.heartbeatHowl.stop();
                this.heartbeatHowl = null;
            } else {
                this.stop('heart_beat_loop');
            }
        }
    }

    public playDryFire() {
        this.play('dry_fire');
    }

    public playShotgunPump(position?: THREE.Vector3) {
        if (position) {
            this.playPositional('shotgun_pump', position);
        } else {
            this.play('shotgun_pump');
        }
    }

    public startMatchAmbience(zones?: Array<{ id: string; bounds?: { xMin: number; xMax: number; zMin: number; zMax: number } }>) {
        this.stopMatchAmbience();

        // Standard spatial ambient bed locations (facility 01 map bounds 0..768)
        const defaultZonePositions: Array<{ id: string; soundKey: string; pos: THREE.Vector3 }> = [
            { id: 'ambient_spawn', soundKey: 'air_traffic', pos: new THREE.Vector3(64, 0, 704) },
            { id: 'ambient_warehouse', soundKey: 'warehouse_drone_distant', pos: new THREE.Vector3(144, 0, 240) },
            { id: 'ambient_plant', soundKey: 'industrial_hum', pos: new THREE.Vector3(528, 0, 448) },
            { id: 'ambient_core', soundKey: 'computer_room', pos: new THREE.Vector3(384, 0, 384) }
        ];

        if (zones && zones.length > 0) {
            zones.forEach(z => {
                let soundKey = '';
                if (z.id.includes('warehouse')) soundKey = 'warehouse_drone_distant';
                else if (z.id.includes('plant')) soundKey = 'industrial_hum';
                else if (z.id.includes('core') || z.id.includes('tunnel') || z.id.includes('datacenter')) soundKey = 'computer_room';
                else if (z.id.includes('spawn') || z.id.includes('courtyard')) soundKey = 'air_traffic';

                if (soundKey && z.bounds) {
                    const cx = (z.bounds.xMin + z.bounds.xMax) / 2;
                    const cz = (z.bounds.zMin + z.bounds.zMax) / 2;
                    const emitterId = `match_ambient_${z.id}`;
                    this.ambientEmitterIds.push(emitterId);
                    this.startEmitter(emitterId, soundKey, new THREE.Vector3(cx, 0, cz), {
                        loop: true,
                        refDistance: 25,
                        maxDistance: 250
                    });
                }
            });
        } else {
            defaultZonePositions.forEach(dz => {
                this.ambientEmitterIds.push(dz.id);
                this.startEmitter(dz.id, dz.soundKey, dz.pos, {
                    loop: true,
                    refDistance: 25,
                    maxDistance: 250
                });
            });
        }
    }

    public stopMatchAmbience() {
        this.ambientEmitterIds.forEach(id => {
            this.stopEmitter(id);
        });
        this.ambientEmitterIds = [];
    }
}

export const audioManager = new AudioManager();
(window as any).audioManager = audioManager;
