import * as THREE from "three/webgpu";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import type { MatchController } from "../../MatchController";
import { PLAYER_RADIUS, PLAYER_TOTAL_HEIGHT } from "../../../shared/constants";
import { resolvePlayerAnimationState } from "../../../shared/state-animation-contract";
import { fixSkinnedMeshBones } from "../../StudioPreviewManager";
import { audioManager } from "../../audio";
import {
  createRemotePlayerWeapon,
  disposeRemoteWeaponTemplates,
  hasRemoteWeaponTemplate,
} from "../../weapons_model";
import {
  chooseVerifiedGripPose,
  solveVerifiedGripPose,
  type PoseCandidate,
} from "../../weapons/pose-solver";

export function shouldShowRemotePlayerWeapon(hasPlayerModel: boolean, poseVerified: boolean): boolean {
  return !hasPlayerModel || poseVerified;
}

export function shouldReplaceRemotePlayerWeapon(
  remoteWeapon: THREE.Object3D | undefined,
  remoteWeaponType: string | undefined,
  currentWeaponType: string,
  exactTemplateAvailable: boolean,
): boolean {
  if (!remoteWeapon || remoteWeaponType !== currentWeaponType) return true;
  return exactTemplateAvailable && remoteWeapon.name === `RemoteWeapon_Fallback_${currentWeaponType}`;
}

function markSharedRemoteResources(root: THREE.Object3D): void {
  root.traverse((child: any) => {
    if (child.geometry) child.geometry.userData.vexeaSharedAsset = true;
    if (child.material) {
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        material.userData.vexeaSharedAsset = true;
      }
    }
  });
}

export function disposeOwnedRemoteResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((child: any) => {
    if (!child.userData?.remoteOwned) return;
    if (child.geometry) geometries.add(child.geometry);
    if (child.material) {
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        materials.add(material);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export class RemotePlayerSystem {
  private match: MatchController;
  private remotePlayerFootsteps = new Map<string, { lastPos: THREE.Vector3; timer: number; variant: number }>();

  constructor(match: MatchController) {
    this.match = match;
  }

  public init() {}

  private createRemotePlayerVisual(activePlayerModel: THREE.Object3D | null): {
    group: THREE.Group;
    mixer?: THREE.AnimationMixer;
  } {
    if (activePlayerModel) {
      const group = SkeletonUtils.clone(activePlayerModel) as THREE.Group;
      markSharedRemoteResources(group);

      // Rebind cloned skinned mesh elements to cloned bone instances
      fixSkinnedMeshBones(group, activePlayerModel);

      // Disable expensive SkinnedMesh raycasting
      group.traverse((child: any) => {
        if (child.isSkinnedMesh) child.raycast = () => {};
      });

      // Add invisible collision box for hit detection
      const hitBoxGeom = new THREE.BoxGeometry(PLAYER_RADIUS * 2, PLAYER_TOTAL_HEIGHT, PLAYER_RADIUS * 2);
      hitBoxGeom.translate(0, PLAYER_TOTAL_HEIGHT / 2, 0);
      const hitBox = new THREE.Mesh(hitBoxGeom, new THREE.MeshBasicMaterial());
      hitBox.visible = false;
      hitBox.name = "PlayerHitBox";
      hitBox.userData.remoteOwned = true;
      group.add(hitBox);

      group.name = "RemotePlayer";
      const mixer = new THREE.AnimationMixer(group);
      const animations = (activePlayerModel as any).animations as THREE.AnimationClip[] | undefined;
      if (animations && animations.length > 0) {
        const idleClip = animations.find((clip) => clip.name.toLowerCase().includes("idle")) || animations[0];
        const action = mixer.clipAction(idleClip);
        action.play();
        (group as any)._currentAction = action;
        (group as any)._currentClipName = idleClip.name;
      }
      return { group, mixer };
    }

    const group = new THREE.Group();
    group.name = "RemotePlayerFallback";
    group.userData.remotePlayerFallback = true;
    const fallback = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.2, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
    );
    fallback.userData.remoteOwned = true;
    group.add(fallback);
    return { group };
  }

  public step(dt: number) {
    this.update(dt);
  }

  public update(dt: number) {
    const match = this.match;
    if (!match || !match.remotePlayersTargetData) return;

    const activePlayerModel = match.context?.playerModel || (window as any).playerModel;

    match.remotePlayersTargetData.forEach((data, id) => {
      let group = match.remotePlayersMeshes.get(id);
      let mixer = match.remotePlayerMixers.get(id);

      if (!group || (activePlayerModel && group.userData.remotePlayerFallback)) {
        const previousGroup = group;
        const previousPosition = previousGroup?.position.clone();
        const previousQuaternion = previousGroup?.quaternion.clone();
        const previousScale = previousGroup?.scale.clone();
        if (previousGroup) {
          match.scene.remove(previousGroup);
          disposeOwnedRemoteResources(previousGroup);
        }

        const visual = this.createRemotePlayerVisual(activePlayerModel || null);
        group = visual.group;
        mixer = visual.mixer;
        if (previousPosition) group.position.copy(previousPosition);
        if (previousQuaternion) group.quaternion.copy(previousQuaternion);
        if (previousScale) group.scale.copy(previousScale);
        match.scene.add(group);
        match.remotePlayersMeshes.set(id, group);
        if (mixer) match.remotePlayerMixers.set(id, mixer);
        else match.remotePlayerMixers.delete(id);
      }

      if (group) {
        let rpState = this.remotePlayerFootsteps.get(id);
        if (!rpState) {
          rpState = { lastPos: new THREE.Vector3().copy(group.position), timer: 0, variant: 0 };
          this.remotePlayerFootsteps.set(id, rpState);
        }
        const movedDist = group.position.distanceTo(rpState.lastPos);
        rpState.lastPos.copy(group.position);
        const speed = dt > 0 ? movedDist / dt : 0;

        if (speed > 0.1) {
          const isRunning = speed > 6.0;
          const interval = isRunning ? 0.33 : 0.52;
          rpState.timer += dt;
          if (rpState.timer >= interval) {
            rpState.timer = 0;
            rpState.variant = 1 - rpState.variant;
            const stepNum = rpState.variant === 0 ? "01" : "02";
            const prefix = isRunning ? "run" : "walk";
            const soundKey = `${prefix}_ground_${stepNum}`;
            audioManager.playPositional(soundKey, group.position);
          }
        } else {
          rpState.timer = 0;
        }

        group.position.lerp(data.pos, 0.15);
        group.rotation.y += (data.yaw - group.rotation.y) * 0.15;

        // Resolve and transition remote player animation state from shared contract (ARCH-15)
        if (mixer && activePlayerModel?.animations) {
          const animOutput = resolvePlayerAnimationState({
            isAlive: data.isAlive,
            isFiring: data.isFiring,
            isReloading: data.isReloading,
            speed,
            weapon: data.weapon,
          });

          if (animOutput.kind === "clip") {
            const targetClipName = animOutput.clipName;
            const currentClipName = (group as any)._currentClipName;
            if (currentClipName !== targetClipName) {
              const newClip = activePlayerModel.animations.find((a: any) => a.name === targetClipName) || activePlayerModel.animations[0];
              if (newClip) {
                const prevAction = (group as any)._currentAction;
                const newAction = mixer.clipAction(newClip);
                newAction.reset();
                if (animOutput.speed !== undefined) newAction.setEffectiveTimeScale(animOutput.speed);
                if (animOutput.loop === false) {
                  newAction.setLoop(THREE.LoopOnce, 1);
                  newAction.clampWhenFinished = !!animOutput.clampWhenFinished;
                } else {
                  newAction.setLoop(THREE.LoopRepeat, Infinity);
                }
                if (prevAction && prevAction !== newAction) {
                  newAction.crossFadeFrom(prevAction, animOutput.crossFadeDuration ?? 0.2, true);
                }
                newAction.play();
                (group as any)._currentAction = newAction;
                (group as any)._currentClipName = newClip.name;
              }
            }
          }
        }

        // Apply the verified held-item pose after animation updates so sockets follow the current frame.
        if (mixer) {
          mixer.update(dt);
        }

        // Attach the canonical third-person weapon model and solve its two-hand pose.
        const currentWeaponType = data.weapon || "rifle";
        let remoteWeaponMesh = (group as any)._remoteWeaponMesh as THREE.Group | undefined;
        const remoteWeaponType = (group as any)._remoteWeaponType;

        if (shouldReplaceRemotePlayerWeapon(
          remoteWeaponMesh,
          remoteWeaponType,
          currentWeaponType,
          hasRemoteWeaponTemplate(currentWeaponType),
        )) {
          if (remoteWeaponMesh) {
            group.remove(remoteWeaponMesh);
            disposeOwnedRemoteResources(remoteWeaponMesh);
          }
          remoteWeaponMesh = createRemotePlayerWeapon(currentWeaponType);
          if (remoteWeaponMesh) {
            group.add(remoteWeaponMesh);
            remoteWeaponMesh.visible = false;
            (group as any)._remoteWeaponMesh = remoteWeaponMesh;
            (group as any)._remoteWeaponType = currentWeaponType;
            (group as any)._verifiedGripCandidate = undefined;
            (group as any)._verifiedPoseContext = undefined;
            (group as any)._verifiedPoseDiagnostics = undefined;
          } else {
            (group as any)._remoteWeaponMesh = undefined;
            (group as any)._remoteWeaponType = undefined;
            (group as any)._verifiedGripCandidate = undefined;
            (group as any)._verifiedPoseContext = undefined;
            (group as any)._verifiedPoseDiagnostics = undefined;
          }
        }

        if (remoteWeaponMesh) {
          if (activePlayerModel) {
            const poseContext = `${currentWeaponType}:${(group as any)._currentClipName || "unanimated"}`;
            const candidate = (group as any)._verifiedGripCandidate as PoseCandidate | undefined;
            const candidateContext = (group as any)._verifiedPoseContext as string | undefined;
            let diagnostics;
            if (candidate && candidateContext === poseContext) {
              diagnostics = solveVerifiedGripPose(group, remoteWeaponMesh, {
                weaponId: currentWeaponType,
                poseContext,
                forwardPitch: candidate.forwardPitch,
                diagnostics: true,
              });
            } else {
              const pose = chooseVerifiedGripPose(group, remoteWeaponMesh, undefined, {
                weaponId: currentWeaponType,
                poseContext,
                diagnostics: true,
              });
              diagnostics = pose.diagnostics;
              if (diagnostics.verified) {
                (group as any)._verifiedGripCandidate = pose.selected;
                (group as any)._verifiedPoseContext = poseContext;
              } else {
                (group as any)._verifiedGripCandidate = undefined;
                (group as any)._verifiedPoseContext = undefined;
              }
            }
            (group as any)._verifiedPoseDiagnostics = diagnostics;
            if (!shouldShowRemotePlayerWeapon(true, diagnostics.verified)) {
              (group as any)._verifiedGripCandidate = undefined;
              (group as any)._verifiedPoseContext = undefined;
            }
            remoteWeaponMesh.visible = shouldShowRemotePlayerWeapon(true, diagnostics.verified);
          } else {
            (group as any)._verifiedGripCandidate = undefined;
            (group as any)._verifiedPoseContext = undefined;
            (group as any)._verifiedPoseDiagnostics = undefined;
            remoteWeaponMesh.visible = shouldShowRemotePlayerWeapon(false, false);
          }
        }
      }
    });

    // Cleanup stale remote players
    for (const [id, group] of match.remotePlayersMeshes.entries()) {
      if (!match.remotePlayersTargetData.has(id)) {
        this.remotePlayerFootsteps.delete(id);
        match.scene.remove(group);
        disposeOwnedRemoteResources(group);
        match.remotePlayersMeshes.delete(id);
        const mixer = match.remotePlayerMixers.get(id);
        if (mixer) {
          mixer.stopAllAction();
          match.remotePlayerMixers.delete(id);
        }
      }
    }
  }

  public destroy() {
    this.remotePlayerFootsteps.clear();
    disposeRemoteWeaponTemplates();
  }
}
