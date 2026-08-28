import * as THREE from "three/webgpu";
import { DETAILED_WEAPONS } from "../shared/weapons";
import { getWeaponPerformance } from "../shared/constants";
import { getCachedOrFetchUrl, createConfiguredGLTFLoader } from "./asset-cache";
import { WEAPON_ASSET_DETAILS } from "../shared/asset-details";
import type { WeaponId } from "../shared/weapons";
import { CAMERA_EFFECTS_CONFIG } from "./src/camera/constants";
import { getMatch } from "./MatchController";
import { applyViewModelCalibration } from "./weapons/viewmodel-calibration";

// Zero-GC pre-allocated math variables for frame loop optimization
const _pos = new THREE.Vector3();
const _rot = new THREE.Euler();
const _targetPos = new THREE.Vector3();
const _muzzleWorldPos = new THREE.Vector3();

// Weapon follow slerp tracking state (O(1) allocation)
let weaponBaseQuat = new THREE.Quaternion();
let isFirstFrame = true;


// Weapon Container Group (attached directly to the camera)
export let weaponsContainer: THREE.Group | null = null;
export let primaryGroup: THREE.Group | null = null;
export let secondaryGroup: THREE.Group | null = null;
// Legacy aliases retained for prewarm/dev consumers; slot semantics are primary/secondary.
export let rifleGroup: THREE.Group | null = null;
export let pistolGroup: THREE.Group | null = null;

// Animation stuff
export let primaryMixer: THREE.AnimationMixer | null = null;
export let secondaryMixer: THREE.AnimationMixer | null = null;
// Legacy aliases retained for prewarm/dev consumers.
export let rifleMixer: THREE.AnimationMixer | null = null;
export let pistolMixer: THREE.AnimationMixer | null = null;

const primaryActions = {} as Record<string, THREE.AnimationAction>;
const secondaryActions = {} as Record<string, THREE.AnimationAction>;
export const weaponActions = {
  primary: primaryActions,
  secondary: secondaryActions,
  // Legacy aliases retained for prewarm/dev consumers.
  rifle: primaryActions,
  pistol: secondaryActions,
};

// Global constants
export const WEAPON_SWITCH_DURATION = 0.4; // 400ms switch cooldown

export const DEV_WEAPON_OFFSETS = {
  rifle: {
    hip: new THREE.Vector3(DETAILED_WEAPONS.rifle.visualConfig.hipPosition[0], DETAILED_WEAPONS.rifle.visualConfig.hipPosition[1], DETAILED_WEAPONS.rifle.visualConfig.hipPosition[2]),
    ads: new THREE.Vector3(DETAILED_WEAPONS.rifle.visualConfig.adsPosition[0], DETAILED_WEAPONS.rifle.visualConfig.adsPosition[1], DETAILED_WEAPONS.rifle.visualConfig.adsPosition[2]),
    muzzle: new THREE.Vector3(DETAILED_WEAPONS.rifle.visualConfig.muzzleOffset[0], DETAILED_WEAPONS.rifle.visualConfig.muzzleOffset[1], DETAILED_WEAPONS.rifle.visualConfig.muzzleOffset[2]),
    adsTilt: DETAILED_WEAPONS.rifle.visualConfig.adsTilt
  },
  pistol: {
    hip: new THREE.Vector3(DETAILED_WEAPONS.pistol.visualConfig.hipPosition[0], DETAILED_WEAPONS.pistol.visualConfig.hipPosition[1], DETAILED_WEAPONS.pistol.visualConfig.hipPosition[2]),
    ads: new THREE.Vector3(DETAILED_WEAPONS.pistol.visualConfig.adsPosition[0], DETAILED_WEAPONS.pistol.visualConfig.adsPosition[1], DETAILED_WEAPONS.pistol.visualConfig.adsPosition[2]),
    muzzle: new THREE.Vector3(DETAILED_WEAPONS.pistol.visualConfig.muzzleOffset[0], DETAILED_WEAPONS.pistol.visualConfig.muzzleOffset[1], DETAILED_WEAPONS.pistol.visualConfig.muzzleOffset[2]),
    adsTilt: DETAILED_WEAPONS.pistol.visualConfig.adsTilt
  }
};
(window as any).DEV_WEAPON_OFFSETS = DEV_WEAPON_OFFSETS;

export enum WeaponAnimState {
    IDLE = 'idle',
    WALK = 'walk',
    SHOOT = 'shoot',
    RELOAD = 'reload',
    DRAW = 'draw',
    ADS_IDLE = 'ads_idle'
}

export interface WeaponVisualState {
  activeSlot: number;            // 1 = primary weapon, 2 = secondary weapon
  switchTimer: number;           // Decays from WEAPON_SWITCH_DURATION to 0
  pendingSlot: number;           // The semantic slot we are switching to
  recoilZ: number;             
  recoilPitch: number;         
  recoilYaw: number;           
  swayCycle: number;
  currentState: WeaponAnimState;
}

export const weaponVisualState: WeaponVisualState = {
  activeSlot: 1,
  switchTimer: 0.0,
  pendingSlot: 0,
  recoilZ: 0.0,
  recoilPitch: 0.0,
  recoilYaw: 0.0,
  swayCycle: 0.0,
  currentState: WeaponAnimState.IDLE
};

// Internal tracking for transition logic
let lastBaseState: WeaponAnimState = WeaponAnimState.IDLE;
let isWeaponReloading = false;

export async function initPlayerWeapons(scene: THREE.Scene, camera: THREE.Camera): Promise<THREE.Group> {
  isFirstFrame = true;
  weaponsContainer = new THREE.Group();
  weaponsContainer.name = "WeaponsContainer";
  scene.add(weaponsContainer);

  primaryGroup = new THREE.Group();
  primaryGroup.name = "PrimaryWeaponModel";
  weaponsContainer.add(primaryGroup);
  rifleGroup = primaryGroup;

  secondaryGroup = new THREE.Group();
  secondaryGroup.name = "SecondaryWeaponModel";
  secondaryGroup.visible = false;
  weaponsContainer.add(secondaryGroup);
  pistolGroup = secondaryGroup;

  const loader = createConfiguredGLTFLoader();
  const match = getMatch();
  const primaryWeaponId: WeaponId = match?.primaryWeaponId || 'rifle';
  const secondaryWeaponId: WeaponId = match?.secondaryWeaponId || 'pistol';
  const primaryAsset = WEAPON_ASSET_DETAILS[primaryWeaponId];
  const secondaryAsset = WEAPON_ASSET_DETAILS[secondaryWeaponId];

  // Load primary weapon slot
  const loadPrimaryPromise = (async () => {
    try {
      const url = await getCachedOrFetchUrl(primaryAsset.modelKey, "Asset");
      const gltf = await loader.loadAsync(url);
      const primaryStats = getWeaponPerformance(primaryWeaponId) || getWeaponPerformance('rifle')!;
      applyViewModelCalibration(gltf.scene, {
        viewModelQuaternion: primaryAsset.viewModelQuaternion,
        visualScale: primaryStats.visualConfig.visualScale,
      });
      primaryGroup!.add(gltf.scene);
      primaryMixer = new THREE.AnimationMixer(gltf.scene);
      rifleMixer = primaryMixer;
      
      // Map measured semantic clips to stable legacy internal action keys.
      // `shoot`/`walk`/`draw` remain the runtime state names for compatibility;
      // authored GLBs expose `fire`/`sprint`/`equip` semantic clip names.
      const primaryAnimation = primaryAsset.animation;
      const primaryClipNames = {
        idle: primaryAnimation?.clips.idle ?? primaryAsset.animations.idle,
        walk: primaryAnimation?.clips.sprint ?? primaryAsset.animations.walk,
        shoot: primaryAnimation?.clips.fire ?? primaryAsset.animations.shoot,
        reload: primaryAnimation?.clips.reload ?? primaryAsset.animations.reload,
        draw: primaryAnimation?.clips.equip ?? primaryAsset.animations.draw,
      };
      gltf.animations.forEach((clip) => {
        const name = clip.name;
        if (name === primaryClipNames.idle) primaryActions['idle'] = primaryMixer!.clipAction(clip);
        if (name === primaryClipNames.walk) primaryActions['walk'] = primaryMixer!.clipAction(clip);
        if (name === primaryClipNames.shoot) primaryActions['shoot'] = primaryMixer!.clipAction(clip);
        if (name === primaryClipNames.reload) primaryActions['reload'] = primaryMixer!.clipAction(clip);
        if (name === primaryClipNames.draw) primaryActions['draw'] = primaryMixer!.clipAction(clip);
      });

      // Try play idle
      if (primaryActions['idle']) {
         primaryActions['idle'].play();
         weaponVisualState.currentState = WeaponAnimState.IDLE;
      }

      // Smooth blending fallback back to base movement animation on action completion
      primaryMixer.addEventListener('finished', (e: any) => {
          if (e.action.loop === THREE.LoopOnce) {
              transitionToState(lastBaseState, true);
          }
      });

      // Prefer the measured authored anchor, then retain legacy name fallbacks.
      const primaryMuzzleName = primaryAsset.animation?.nodes.muzzle;
      let muzzleNode = (primaryMuzzleName ? gltf.scene.getObjectByName(primaryMuzzleName) : undefined)
        || gltf.scene.getObjectByName('Muzzle')
        || gltf.scene.getObjectByName('muzzle');
      let isProcedural = false;
      if (!muzzleNode) {
          isProcedural = true;
          let anySkinnedMesh: any = null;
          gltf.scene.traverse((c: any) => { if (c.isSkinnedMesh) anySkinnedMesh = c; });
          
          let weaponBone: any = null;
          if (anySkinnedMesh && anySkinnedMesh.skeleton) {
             weaponBone = anySkinnedMesh.skeleton.bones.find((b: any) => b.name.toLowerCase().includes('weapon') || b.name.toLowerCase().includes('gun') || b.name.toLowerCase().includes('muzzle') || b.name.toLowerCase().includes('flash'));
             if (!weaponBone) weaponBone = anySkinnedMesh.skeleton.bones.find((b: any) => b.name.toLowerCase().includes('hand'));
             if (!weaponBone) weaponBone = anySkinnedMesh.skeleton.bones[anySkinnedMesh.skeleton.bones.length - 1];
          }
          
          muzzleNode = new THREE.Object3D();
          muzzleNode.name = "DynamicMuzzle";
          if (weaponBone) {
              weaponBone.add(muzzleNode);
          } else {
              primaryGroup!.add(muzzleNode);
          }
      } else {
          const dummy = new THREE.Object3D();
          dummy.name = "DynamicMuzzle";
          muzzleNode.add(dummy);
          muzzleNode = dummy;
      }
      (primaryGroup as any).muzzleNode = muzzleNode;
      (primaryGroup as any).isProceduralMuzzle = isProcedural;
      console.log(`[WEAPONS] Primary ${primaryWeaponId} loaded, animations:`, Object.keys(primaryActions));
    } catch (e) {
      console.error(`[WEAPONS] Failed to load primary ${primaryWeaponId}:`, e);
    }
  })();

  // Load secondary weapon slot
  const loadSecondaryPromise = (async () => {
    try {
      const url = await getCachedOrFetchUrl(secondaryAsset.modelKey, "Asset");
      const gltf = await loader.loadAsync(url);
      const secondaryStats = getWeaponPerformance(secondaryWeaponId) || getWeaponPerformance('pistol')!;
      applyViewModelCalibration(gltf.scene, {
        viewModelQuaternion: secondaryAsset.viewModelQuaternion,
        visualScale: secondaryStats.visualConfig.visualScale,
      });
      secondaryGroup!.add(gltf.scene);
      secondaryMixer = new THREE.AnimationMixer(gltf.scene);
      pistolMixer = secondaryMixer;

      const secondaryAnimation = secondaryAsset.animation;
      const secondaryClipNames = {
          idle: secondaryAnimation?.clips.idle ?? secondaryAsset.animations.idle,
          walk: secondaryAnimation?.clips.sprint ?? secondaryAsset.animations.walk,
          shoot: secondaryAnimation?.clips.fire ?? secondaryAsset.animations.shoot,
          reload: secondaryAnimation?.clips.reload ?? secondaryAsset.animations.reload,
          draw: secondaryAnimation?.clips.equip ?? secondaryAsset.animations.draw,
      };
      gltf.animations.forEach((clip) => {
          const name = clip.name;
          if (name === secondaryClipNames.idle) secondaryActions['idle'] = secondaryMixer!.clipAction(clip);
          if (name === secondaryClipNames.walk) secondaryActions['walk'] = secondaryMixer!.clipAction(clip);
          if (name === secondaryClipNames.shoot) secondaryActions['shoot'] = secondaryMixer!.clipAction(clip);
          if (name === secondaryClipNames.reload) secondaryActions['reload'] = secondaryMixer!.clipAction(clip);
          if (name === secondaryClipNames.draw) secondaryActions['draw'] = secondaryMixer!.clipAction(clip);
      });

      // Try play idle
      if (secondaryActions['idle']) {
         secondaryActions['idle'].play();
      }

      // Smooth blending fallback back to base movement animation on action completion
      secondaryMixer.addEventListener('finished', (e: any) => {
          if (e.action.loop === THREE.LoopOnce) {
              transitionToState(lastBaseState, true);
          }
      });

      const secondaryMuzzleName = secondaryAsset.animation?.nodes.muzzle;
      let muzzleNode = (secondaryMuzzleName ? gltf.scene.getObjectByName(secondaryMuzzleName) : undefined)
        || gltf.scene.getObjectByName('Muzzle')
        || gltf.scene.getObjectByName('muzzle');
      let isProcedural = false;
      if (!muzzleNode) {
          isProcedural = true;
          let anySkinnedMesh: any = null;
          gltf.scene.traverse((c: any) => { if (c.isSkinnedMesh) anySkinnedMesh = c; });
          
          let weaponBone: any = null;
          if (anySkinnedMesh && anySkinnedMesh.skeleton) {
             weaponBone = anySkinnedMesh.skeleton.bones.find((b: any) => b.name.toLowerCase().includes('weapon') || b.name.toLowerCase().includes('gun') || b.name.toLowerCase().includes('muzzle') || b.name.toLowerCase().includes('flash'));
             if (!weaponBone) weaponBone = anySkinnedMesh.skeleton.bones.find((b: any) => b.name.toLowerCase().includes('hand'));
             if (!weaponBone) weaponBone = anySkinnedMesh.skeleton.bones[anySkinnedMesh.skeleton.bones.length - 1];
          }
          
          muzzleNode = new THREE.Object3D();
          muzzleNode.name = "DynamicMuzzle";
          if (weaponBone) {
              weaponBone.add(muzzleNode);
          } else {
              secondaryGroup!.add(muzzleNode);
          }
      } else {
          const dummy = new THREE.Object3D();
          dummy.name = "DynamicMuzzle";
          muzzleNode.add(dummy);
          muzzleNode = dummy;
      }
      (secondaryGroup as any).muzzleNode = muzzleNode;
      (secondaryGroup as any).isProceduralMuzzle = isProcedural;
      console.log(`[WEAPONS] Secondary ${secondaryWeaponId} loaded, animations:`, Object.keys(secondaryActions));
    } catch (e) {
      console.error(`[WEAPONS] Failed to load secondary ${secondaryWeaponId}:`, e);
    }
  })();

  await Promise.all([loadPrimaryPromise, loadSecondaryPromise]);

  return weaponsContainer;
}

// Module-level tracking for active clips per slot to prevent frame pops and redundant resets
export const currentActiveClipKeys: Record<number, string | null> = {
  1: null,
  2: null
};

export let lastBaseAnim = 'idle';

export function transitionToState(state: WeaponAnimState, force: boolean = false) {
    const slot = weaponVisualState.activeSlot;
    const actions = slot === 1 ? primaryActions : secondaryActions;
    
    // Find animation key (ADS_IDLE maps to IDLE frozen)
    let clipKey = state === WeaponAnimState.ADS_IDLE ? 'idle' : state.toString();
    const targetAction = actions[clipKey];
    
    // Interrupt Schema: Shoot/Reload have high priority and lock movement updates
    const currentActionKey = weaponVisualState.currentState === WeaponAnimState.ADS_IDLE ? 'idle' : weaponVisualState.currentState;
    const currentAction = actions[currentActionKey];
    
    if (!force && currentAction && currentAction.isRunning() && currentAction.loop === THREE.LoopOnce) {
        // Queue movement for after the action finishes
        if (state === WeaponAnimState.IDLE || state === WeaponAnimState.WALK || state === WeaponAnimState.ADS_IDLE) {
            lastBaseState = state;
            return;
        }
    }

    if (!force && weaponVisualState.currentState === state) return;

    // Update state even if clip is missing (e.g. pistol draw) to ensure downstream gating logic holds
    weaponVisualState.currentState = state;

    if (!targetAction) return;

    const isLooping = (state === WeaponAnimState.IDLE || state === WeaponAnimState.WALK || state === WeaponAnimState.ADS_IDLE);
    const fadeDuration = 0.15;

    targetAction.reset();
    targetAction.setLoop(isLooping ? THREE.LoopRepeat : THREE.LoopOnce, isLooping ? Infinity : 1);
    targetAction.clampWhenFinished = !isLooping;
    targetAction.enabled = true;
    targetAction.timeScale = state === WeaponAnimState.ADS_IDLE ? 0 : 1; // Freeze for ADS stability
    targetAction.fadeIn(fadeDuration);
    targetAction.play();
    
    // Crossfade: Fade out all other actions
    Object.keys(actions).forEach(key => {
        if (key !== clipKey) {
            const act = actions[key];
            if (act && act.isRunning()) {
                act.fadeOut(fadeDuration);
            }
        }
    });

    if (isLooping) {
        lastBaseState = state;
    }
}

export function resetWeaponAnimations() {
    [primaryMixer, secondaryMixer].forEach(m => m?.stopAllAction());
    weaponVisualState.currentState = WeaponAnimState.IDLE;
    lastBaseState = WeaponAnimState.IDLE;
    transitionToState(WeaponAnimState.IDLE, true);
    isWeaponReloading = false;
}

export function applyWeaponRecoil(upForce: number, sideForce: number): void {
  weaponVisualState.recoilZ = Math.min(0.2, weaponVisualState.recoilZ + 0.12);
  weaponVisualState.recoilPitch = Math.min(0.35, weaponVisualState.recoilPitch + upForce * 3.5);
  weaponVisualState.recoilYaw += (Math.random() - 0.5) * sideForce * 3.0;

  // High-priority interrupt - but cannot interrupt a reload in progress
  if (!isWeaponReloading) {
      transitionToState(WeaponAnimState.SHOOT, true);
  }
}

export function switchActiveWeaponModel(slot: number): void {
  if (weaponVisualState.activeSlot === slot) return;
  weaponVisualState.pendingSlot = slot;
  weaponVisualState.switchTimer = WEAPON_SWITCH_DURATION;
}

export function isSwitchingWeapon(): boolean {
  return weaponVisualState.switchTimer > 0;
}

export function getMuzzleWorldPosition(outVec: THREE.Vector3, camera: THREE.Camera): void {
  if (weaponsContainer) {
    weaponsContainer.updateMatrixWorld(true);
  }
  const activeMesh = weaponVisualState.activeSlot === 1 ? primaryGroup : secondaryGroup;
  if (activeMesh && (activeMesh as any).muzzleNode) {
    (activeMesh as any).muzzleNode.updateMatrixWorld(true);
    
    // Get the base animated world position from the model's muzzle or bone
    (activeMesh as any).muzzleNode.getWorldPosition(outVec);
    
    // ONLY apply the camera-space offset if this is a procedurally created dynamic muzzle fallback.
    // Authored gltf muzzle nodes are already placed perfectly at the tip.
    if ((activeMesh as any).isProceduralMuzzle) {
      const activeWeaponId = getMatch()?.getActiveWeaponId() || (weaponVisualState.activeSlot === 1 ? 'rifle' : 'pistol');
      const activeStats = getWeaponPerformance(activeWeaponId) || getWeaponPerformance('rifle')!;
      const muzzleOffset = activeStats.visualConfig.muzzleOffset;
      
      // Transform view-space offset to world space using pre-allocated vector
      _muzzleWorldPos.set(muzzleOffset[0], muzzleOffset[1], muzzleOffset[2]).applyQuaternion(camera.quaternion);
      outVec.add(_muzzleWorldPos);
    }
  } else {
    outVec.copy(camera.position);
    _muzzleWorldPos.set(0, 0, -0.5).applyQuaternion(camera.quaternion);
    outVec.add(_muzzleWorldPos);
  }
}

export function setWeaponReloading(val: boolean) {
  if (isWeaponReloading !== val) {
    isWeaponReloading = val;
    if (val) {
        transitionToState(WeaponAnimState.RELOAD);
    }
  }
}

export function updateWeaponsContainer(
  dt: number,
  camera: THREE.Camera,
  isADS: boolean,
  currentAdsLerp: number,
  isMoving: boolean = false
): void {
  if (!weaponsContainer || !primaryGroup || !secondaryGroup) return;

  const slot = weaponVisualState.activeSlot;
  
  // Downstream Gating: Only update the mixer of the active weapon
  if (slot === 1 && primaryMixer) primaryMixer.update(dt);
  if (slot === 2 && secondaryMixer) secondaryMixer.update(dt);

  const actions = slot === 1 ? primaryActions : secondaryActions;

  // Schema-driven state determination
  if (weaponVisualState.currentState !== WeaponAnimState.SHOOT && weaponVisualState.currentState !== WeaponAnimState.RELOAD) {
      let desired = WeaponAnimState.IDLE;
      if (isADS) {
          desired = WeaponAnimState.ADS_IDLE; // Dead still
      } else if (isMoving) {
          desired = WeaponAnimState.WALK;
      }
      transitionToState(desired);
  }

  // Handle Sprint speed scaling on the WALK animation (RUN animation is forbidden)
  const walkAction = actions[WeaponAnimState.WALK];
  if (walkAction) {
     const isSprinting = isMoving && !isADS; 
     walkAction.timeScale = isSprinting ? 1.5 : 1.0;
  }

  // Switch logic
  if (weaponVisualState.switchTimer > 0) {
    const prevTimer = weaponVisualState.switchTimer;
    weaponVisualState.switchTimer = Math.max(0, weaponVisualState.switchTimer - dt);

    if (prevTimer > WEAPON_SWITCH_DURATION * 0.5 && weaponVisualState.switchTimer <= WEAPON_SWITCH_DURATION * 0.5) {
      weaponVisualState.activeSlot = weaponVisualState.pendingSlot;
      primaryGroup.visible = (weaponVisualState.activeSlot === 1);
      secondaryGroup.visible = (weaponVisualState.activeSlot === 2);
      transitionToState(WeaponAnimState.DRAW, true);
    }
  }

  const activeSlot = weaponVisualState.activeSlot;
  const activeWeaponId = getMatch()?.getActiveWeaponId() || (activeSlot === 1 ? 'rifle' : 'pistol');
  const stats = getWeaponPerformance(activeWeaponId) || getWeaponPerformance('rifle')!;

  const recoverySpeed = stats.recoilRecoveryRate * 1.5;
  weaponVisualState.recoilZ = Math.max(0.0, weaponVisualState.recoilZ - dt * recoverySpeed);
  weaponVisualState.recoilPitch = Math.max(0.0, weaponVisualState.recoilPitch - dt * recoverySpeed);
  weaponVisualState.recoilYaw -= Math.sign(weaponVisualState.recoilYaw) * Math.min(Math.abs(weaponVisualState.recoilYaw), dt * recoverySpeed);


  weaponVisualState.swayCycle += dt * stats.swaySpeed;
  // Procedural sway is disabled during ADS to prevent weapon flailing as requested
  const swayIntensity = (1.0 - currentAdsLerp) * stats.swayAmplitude * 2.0; 
  const swayX = Math.sin(weaponVisualState.swayCycle) * swayIntensity;
  const swayY = Math.cos(weaponVisualState.swayCycle * 2.0) * swayIntensity * 0.5;

  let switchYOffset = 0.0;
  if (weaponVisualState.switchTimer > 0) {
    const progress = weaponVisualState.switchTimer / WEAPON_SWITCH_DURATION; 
    switchYOffset = -0.4 * Math.sin(progress * Math.PI);
  }

  // Hip / ADS alignments.
  const hipX = stats.visualConfig.hipPosition[0];
  const hipY = stats.visualConfig.hipPosition[1];
  const hipZ = stats.visualConfig.hipPosition[2];

  const adsX = stats.visualConfig.adsPosition[0];
  const adsY = stats.visualConfig.adsPosition[1];
  const adsZ = stats.visualConfig.adsPosition[2];

  const baseTargetX = hipX + (adsX - hipX) * currentAdsLerp;
  const baseTargetY = hipY + (adsY - hipY) * currentAdsLerp;
  const baseTargetZ = hipZ + (adsZ - hipZ) * currentAdsLerp;

  let pullBackZ = 0.0;
  const match = getMatch();
  if (match && match.cameraEffects) {
    pullBackZ = match.cameraEffects.runPullBack;
  }

  const finalX = baseTargetX + swayX + (weaponVisualState.recoilYaw * 0.05);
  const finalY = baseTargetY + switchYOffset + (weaponVisualState.recoilPitch * 0.12);
  const finalZ = baseTargetZ - weaponVisualState.recoilZ - pullBackZ; 

  weaponsContainer.position.copy(camera.position);
  
  // Implement Weapon Follow slerp lag with non-linear snapping drag
  if (isFirstFrame) {
    weaponBaseQuat.copy(camera.quaternion);
    isFirstFrame = false;
  } else {
    const config = CAMERA_EFFECTS_CONFIG.WEAPON_FOLLOW;
    // Calculate angular difference
    const angle = weaponBaseQuat.angleTo(camera.quaternion);
    // Non-linear lag multiplier: follow speed gets slower as the angle gets larger (harder snap)
    const angleFactor = Math.max(config.MIN_FOLLOW_SPEED_MULT, Math.exp(-angle * config.LAG_FACTOR));
    const currentSpeed = config.BASE_SPEED * angleFactor;
    
    // Mathematically correct frame-rate independent exponential decay slerp interpolant
    const t = 1.0 - Math.exp(-currentSpeed * dt);
    weaponBaseQuat.slerp(camera.quaternion, t);
  }
  
  weaponsContainer.quaternion.copy(weaponBaseQuat);

  // Apply recoil rotation relative to the camera
  weaponsContainer.rotateX(weaponVisualState.recoilPitch + (swayY * 1.5));
  weaponsContainer.rotateY(-weaponVisualState.recoilYaw + (swayX * 1.5));
  
  // Apply sway roll and ADS corrective tilt
  const adsTilt = stats.visualConfig.adsTilt || 0;
  weaponsContainer.rotateZ((-swayX * 4.0) + (adsTilt * currentAdsLerp));
  
  // Model files are facing +Z instead of -Z, so spin them 180 on Y
  weaponsContainer.rotateY(Math.PI);

  // Apply translational offsets (X and Z inverted because we just spun 180 degrees)
  weaponsContainer.translateX(-finalX);
  weaponsContainer.translateY(finalY + swayY);
  weaponsContainer.translateZ(-finalZ + swayX);
}
