import * as THREE from "three/webgpu";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { MatchController } from "../../MatchController";
import { PLAYER_RADIUS, PLAYER_TOTAL_HEIGHT } from "../../../shared/constants";
import { resolvePlayerAnimationState } from "../../../shared/state-animation-contract";
import { fixSkinnedMeshBones } from "../../StudioPreviewManager";
import { audioManager } from "../../audio";
import { applyScenicGripPose } from "../../weapons/GripSystem";
import { createRemotePlayerWeapon } from "../../weapons_model";

export class RemotePlayerSystem {
  private match: MatchController;
  private remotePlayerFootsteps = new Map<string, { lastPos: THREE.Vector3; timer: number; variant: number }>();

  constructor(match: MatchController) {
    this.match = match;
  }

  public init() {}

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

      if (!group) {
        if (activePlayerModel) {
          group = SkeletonUtils.clone(activePlayerModel) as THREE.Group;

          // Rebind cloned skinned mesh elements to cloned bone instances
          fixSkinnedMeshBones(group, activePlayerModel);

          // Disable expensive SkinnedMesh raycasting
          group.traverse((child: any) => {
            if (child.isSkinnedMesh) {
              child.raycast = () => {}; // no-op: skip CPU vertex skinning
            }
          });

          // Add invisible collision box for hit detection
          // Player origin at feet; translate so box covers full height
          const hitBoxGeom = new THREE.BoxGeometry(PLAYER_RADIUS * 2, PLAYER_TOTAL_HEIGHT, PLAYER_RADIUS * 2);
          hitBoxGeom.translate(0, PLAYER_TOTAL_HEIGHT / 2, 0);
          const hitBox = new THREE.Mesh(hitBoxGeom, new THREE.MeshBasicMaterial());
          hitBox.visible = false;
          hitBox.name = "PlayerHitBox";
          group.add(hitBox);

          group.name = "RemotePlayer";
          match.scene.add(group);
          match.remotePlayersMeshes.set(id, group);

          mixer = new THREE.AnimationMixer(group);
          match.remotePlayerMixers.set(id, mixer);

          if (activePlayerModel.animations && activePlayerModel.animations.length > 0) {
            const idleClip = activePlayerModel.animations.find((a: any) => a.name.toLowerCase().includes("idle")) || activePlayerModel.animations[0];
            const act = mixer.clipAction(idleClip);
            act.play();
            (group as any)._currentAction = act;
            (group as any)._currentClipName = idleClip.name;
          }
        } else {
          const geom = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
          const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
          group = new THREE.Mesh(geom, mat) as unknown as THREE.Group;
          group.name = "RemotePlayerFallback";
          match.scene.add(group);
          match.remotePlayersMeshes.set(id, group);
        }
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
                (group as any)._currentClipName = targetClipName;
              }
            }
          }
        }

        // Attach and constrain 3rd-person weapon model using procedural GripSystem (ARCH-14)
        const currentWeaponType = data.weapon || "rifle";
        let remoteWeaponMesh = (group as any)._remoteWeaponMesh as THREE.Group | undefined;
        const remoteWeaponType = (group as any)._remoteWeaponType;

        if (!remoteWeaponMesh || remoteWeaponType !== currentWeaponType) {
          if (remoteWeaponMesh) {
            group.remove(remoteWeaponMesh);
          }
          remoteWeaponMesh = createRemotePlayerWeapon(currentWeaponType);
          if (remoteWeaponMesh) {
            group.add(remoteWeaponMesh);
            (group as any)._remoteWeaponMesh = remoteWeaponMesh;
            (group as any)._remoteWeaponType = currentWeaponType;
          }
        }

        if (remoteWeaponMesh && activePlayerModel) {
          applyScenicGripPose(group, remoteWeaponMesh);
        }
      }

      if (mixer) {
        mixer.update(dt);
      }
    });

    // Cleanup stale remote players
    for (const [id, group] of match.remotePlayersMeshes.entries()) {
      if (!match.remotePlayersTargetData.has(id)) {
        this.remotePlayerFootsteps.delete(id);
        match.scene.remove(group);
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
  }
}
