import * as THREE from "three/webgpu";
import {
  PLAYER_BODY_FORWARD,
  PLAYER_EYE_FORWARD_OFFSET,
} from "../src/systems/player-visual-calibration";

export type PlayerHoldFrame = "rifle-body-forward";

const _bodyForward = new THREE.Vector3();
const _bodyRight = new THREE.Vector3();
const _bodyUp = new THREE.Vector3();
const _shoulderMidpoint = new THREE.Vector3();
const _holdCenter = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _leftTarget = new THREE.Vector3();
const _rightTarget = new THREE.Vector3();
const _leftShoulder = new THREE.Vector3();
const _rightShoulder = new THREE.Vector3();
const _leftElbow = new THREE.Vector3();
const _rightElbow = new THREE.Vector3();
const _leftHand = new THREE.Vector3();
const _rightHand = new THREE.Vector3();
const _eyeAnchor = new THREE.Vector3();

interface ArmChain {
  shoulder: THREE.Object3D;
  elbow: THREE.Object3D;
  hand: THREE.Object3D;
  side: -1 | 1;
}

interface ArmLengths {
  upper: number;
  lower: number;
  minimum: number;
  maximum: number;
}

interface HoldTargets {
  center: THREE.Vector3;
  halfSpan: number;
  direction: THREE.Vector3;
}

const RIFLE_HOLD_LATERAL_SLOPE = -0.015;

function normalizedName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findNamed(root: THREE.Object3D, names: readonly string[]): THREE.Object3D | null {
  for (const name of names) {
    const exact = root.getObjectByName(name);
    if (exact) return exact;
    const wanted = normalizedName(name);
    let found: THREE.Object3D | null = null;
    root.traverse((child) => {
      if (!found) {
        const childName = normalizedName(child.name);
        if (childName === wanted || childName.endsWith(wanted)) found = child;
      }
    });
    if (found) return found;
  }
  return null;
}

function findArm(root: THREE.Object3D, side: "Left" | "Right", sign: -1 | 1): ArmChain | null {
  const lowerSide = side.toLowerCase();
  const shoulder = findNamed(root, [
    `mixamorig:${side}Arm`,
    `${side}Arm`,
    `arm_${lowerSide}_arm`,
    `mixamorig:${side}Shoulder`,
    `${side}Shoulder`,
    `arm_${lowerSide}_top`,
  ]);
  const elbow = findNamed(root, [
    `mixamorig:${side}ForeArm`,
    `${side}ForeArm`,
    `arm_${lowerSide}_bot`,
    `arm_${lowerSide}_fore_arm`,
  ]);
  const hand = findNamed(root, [
    `mixamorig:${side}Hand`,
    `${side}Hand`,
    `arm_${lowerSide}_hand`,
  ]);
  if (!shoulder || !elbow || !hand || elbow.parent !== shoulder || hand.parent !== elbow) return null;
  return { shoulder, elbow, hand, side: sign };
}

function worldPosition(object: THREE.Object3D, target: THREE.Vector3): THREE.Vector3 {
  return object.getWorldPosition(target);
}

function getArmLengths(arm: ArmChain, shoulder: THREE.Vector3, elbow: THREE.Vector3, hand: THREE.Vector3): ArmLengths {
  const upper = shoulder.distanceTo(elbow);
  const lower = elbow.distanceTo(hand);
  return {
    upper,
    lower,
    minimum: Math.abs(upper - lower) + 1e-4,
    maximum: Math.max(1e-4, upper + lower - 1e-4),
  };
}

function isReachable(target: THREE.Vector3, shoulder: THREE.Vector3, lengths: ArmLengths): boolean {
  const distance = target.distanceTo(shoulder);
  return distance >= lengths.minimum && distance <= lengths.maximum;
}

function setWorldQuaternion(object: THREE.Object3D, worldQuaternion: THREE.Quaternion): void {
  if (!object.parent) {
    object.quaternion.copy(worldQuaternion);
    return;
  }
  const parentQuaternion = new THREE.Quaternion();
  object.parent.getWorldQuaternion(parentQuaternion);
  object.quaternion.copy(parentQuaternion.invert().multiply(worldQuaternion));
}

function projectBendDirection(
  targetDirection: THREE.Vector3,
  preferred: THREE.Vector3,
  fallback: THREE.Vector3,
  target: THREE.Vector3,
): boolean {
  target.copy(preferred).addScaledVector(targetDirection, -preferred.dot(targetDirection));
  if (target.lengthSq() < 1e-8) {
    target.copy(fallback).addScaledVector(targetDirection, -fallback.dot(targetDirection));
  }
  if (target.lengthSq() < 1e-8) return false;
  target.normalize();
  return true;
}

function solveArm(
  arm: ArmChain,
  target: THREE.Vector3,
  bodyRight: THREE.Vector3,
  bodyUp: THREE.Vector3,
): boolean {
  const shoulder = worldPosition(arm.shoulder, _leftShoulder);
  const elbow = worldPosition(arm.elbow, _leftElbow);
  const hand = worldPosition(arm.hand, _leftHand);
  const lengths = getArmLengths(arm, shoulder, elbow, hand);
  if (lengths.maximum <= lengths.minimum) return false;

  const direction = target.clone().sub(shoulder);
  const distance = direction.length();
  if (distance < 1e-8) return false;
  direction.multiplyScalar(1 / distance);
  const clampedDistance = THREE.MathUtils.clamp(distance, lengths.minimum, lengths.maximum);
  const targetPoint = shoulder.clone().addScaledVector(direction, clampedDistance);
  const bend = new THREE.Vector3();
  const preferred = bodyRight.clone().multiplyScalar(arm.side);
  if (!projectBendDirection(direction, preferred, bodyUp, bend)) return false;

  const along = (lengths.upper ** 2 - lengths.lower ** 2 + clampedDistance ** 2) / (2 * clampedDistance);
  const height = Math.sqrt(Math.max(0, lengths.upper ** 2 - along ** 2));
  const elbowTarget = shoulder.clone()
    .addScaledVector(direction, along)
    .addScaledVector(bend, height);

  const currentUpper = elbow.sub(shoulder).normalize();
  const desiredUpper = elbowTarget.clone().sub(shoulder).normalize();
  const upperQuaternion = new THREE.Quaternion();
  arm.shoulder.getWorldQuaternion(upperQuaternion);
  upperQuaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(currentUpper, desiredUpper));
  setWorldQuaternion(arm.shoulder, upperQuaternion);
  arm.shoulder.updateMatrixWorld(true);

  const solvedElbow = worldPosition(arm.elbow, _rightElbow);
  const currentLower = worldPosition(arm.hand, _rightHand).sub(solvedElbow).normalize();
  const desiredLower = targetPoint.clone().sub(solvedElbow).normalize();
  if (currentLower.lengthSq() < 1e-8 || desiredLower.lengthSq() < 1e-8) return false;
  const lowerQuaternion = new THREE.Quaternion();
  arm.elbow.getWorldQuaternion(lowerQuaternion);
  lowerQuaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(currentLower, desiredLower));
  setWorldQuaternion(arm.elbow, lowerQuaternion);
  arm.elbow.updateMatrixWorld(true);
  return true;
}

function findHoldTargets(
  left: ArmChain,
  right: ArmChain,
  bodyForward: THREE.Vector3,
  bodyRight: THREE.Vector3,
  bodyUp: THREE.Vector3,
  minimumForward: number,
  authoredShoulderSpan = Infinity,
): HoldTargets | null {
  worldPosition(left.shoulder, _leftShoulder);
  worldPosition(right.shoulder, _rightShoulder);
  worldPosition(left.elbow, _leftElbow);
  worldPosition(right.elbow, _rightElbow);
  worldPosition(left.hand, _leftHand);
  worldPosition(right.hand, _rightHand);
  const currentSpan = _leftHand.distanceTo(_rightHand);
  const shoulderSpan = _leftShoulder.distanceTo(_rightShoulder);
  const authoredHoldSpan = Math.min(shoulderSpan, authoredShoulderSpan);
  const holdSpan = Number.isFinite(authoredHoldSpan) && authoredHoldSpan >= 1e-4
    ? authoredHoldSpan
    : currentSpan;
  if (!Number.isFinite(holdSpan) || holdSpan < 1e-4) return null;

  const leftLengths = getArmLengths(left, _leftShoulder, _leftElbow, _leftHand);
  const rightLengths = getArmLengths(right, _rightShoulder, _rightElbow, _rightHand);
  if (leftLengths.maximum <= leftLengths.minimum || rightLengths.maximum <= rightLengths.minimum) return null;

  const holdDirection = bodyForward.clone()
    .addScaledVector(bodyRight, RIFLE_HOLD_LATERAL_SLOPE)
    .normalize();
  const forwardComponent = holdDirection.dot(bodyForward);

  _holdCenter.copy(_leftHand).add(_rightHand).multiplyScalar(0.5);
  _shoulderMidpoint.copy(_leftShoulder).add(_rightShoulder).multiplyScalar(0.5);
  _offset.copy(_holdCenter).sub(_shoulderMidpoint);
  const currentForwardOffset = _offset.dot(bodyForward);
  const authoredRightOffset = _offset.dot(bodyRight);
  const rightHalfOffset = Number.isFinite(authoredShoulderSpan)
    ? -authoredShoulderSpan * 0.5
    : authoredRightOffset;
  const currentRightOffset = Math.min(authoredRightOffset, rightHalfOffset);
  const authoredLift = Math.max(0, _offset.dot(bodyUp));
  // Keep lowered clips on the shoulder plane while preserving an authored raised hold.
  _holdCenter.copy(_shoulderMidpoint)
    .addScaledVector(bodyForward, currentForwardOffset)
    .addScaledVector(bodyRight, currentRightOffset)
    .addScaledVector(bodyUp, authoredLift);
  const maxShift = Math.max(0.5, leftLengths.maximum, rightLengths.maximum, currentSpan * 2);
  const bendCenter = new THREE.Vector3();
  const leftTarget = new THREE.Vector3();
  const rightTarget = new THREE.Vector3();
  const requestedCenter = _holdCenter.clone();
  const lateralDelta = currentRightOffset - authoredRightOffset;
  const lateralSteps = Math.min(8, Math.max(1, Math.ceil(Math.abs(lateralDelta) / 0.02)));

  for (let lateralStep = 0; lateralStep <= lateralSteps; lateralStep += 1) {
    const lateralBlend = lateralStep / lateralSteps;
    _holdCenter.copy(requestedCenter)
      .addScaledVector(bodyRight, -lateralDelta * lateralBlend);
    const halfSpan = holdSpan * 0.5;
    for (const forwardFloor of [minimumForward]) {
      for (let shiftStep = 0; shiftStep <= 48; shiftStep += 1) {
        const normalizedShift = shiftStep / 48;
        const shift = normalizedShift * maxShift;
        for (const signedShift of shiftStep === 0 ? [0] : [-shift, shift]) {
          bendCenter.copy(_holdCenter).addScaledVector(bodyForward, signedShift);
          leftTarget.copy(bendCenter).addScaledVector(holdDirection, halfSpan);
          rightTarget.copy(bendCenter).addScaledVector(holdDirection, -halfSpan);
          if (bendCenter.dot(bodyForward) - halfSpan * forwardComponent < forwardFloor) continue;
          if (isReachable(leftTarget, _leftShoulder, leftLengths)
            && isReachable(rightTarget, _rightShoulder, rightLengths)) {
            return { center: bendCenter.clone(), halfSpan, direction: holdDirection.clone() };
          }
        }
      }
    }
  }

  _holdCenter.copy(requestedCenter);

  for (const forwardFloor of [minimumForward]) {
    for (let spanStep = 0; spanStep <= 32; spanStep += 1) {
        const halfSpan = holdSpan * 0.5 * (1 - spanStep / 32);
      for (let lateralStep = 0; lateralStep <= lateralSteps; lateralStep += 1) {
        const lateralBlend = lateralStep / lateralSteps;
        _holdCenter.copy(requestedCenter)
          .addScaledVector(bodyRight, -lateralDelta * lateralBlend);
        for (let shiftStep = 0; shiftStep <= 48; shiftStep += 1) {
          const normalizedShift = shiftStep / 48;
          const shift = normalizedShift * maxShift;
          for (const signedShift of shiftStep === 0 ? [0] : [-shift, shift]) {
            bendCenter.copy(_holdCenter).addScaledVector(bodyForward, signedShift);
            leftTarget.copy(bendCenter).addScaledVector(holdDirection, halfSpan);
            rightTarget.copy(bendCenter).addScaledVector(holdDirection, -halfSpan);
            if (bendCenter.dot(bodyForward) - halfSpan * forwardComponent < forwardFloor) continue;
            if (isReachable(leftTarget, _leftShoulder, leftLengths)
              && isReachable(rightTarget, _rightShoulder, rightLengths)) {
              return { center: bendCenter.clone(), halfSpan, direction: holdDirection.clone() };
            }
          }
        }
      }
    }
  }

  // Keep the original midpoint as the last safe fallback; solveArm clamps the rare unreachable side.
  bendCenter.copy(_holdCenter);
  return { center: bendCenter, halfSpan: holdSpan * 0.5, direction: holdDirection };
}

export function getPlayerHoldFrame(
  weaponId: string | undefined,
  clipName: string | null | undefined,
): PlayerHoldFrame | undefined {
  if (weaponId !== "rifle") return undefined;
  if (clipName === "rifle_idle" || clipName === "rifle_aim_idle") return "rifle-body-forward";
  return undefined;
}

export function applyPlayerHoldFrame(
  character: THREE.Object3D,
  holdFrame?: PlayerHoldFrame,
): boolean {
  if (!holdFrame) return true;

  const left = findArm(character, "Left", -1);
  const right = findArm(character, "Right", 1);
  if (!left || !right) return false;
  character.updateMatrixWorld(true);

  _bodyForward.set(PLAYER_BODY_FORWARD.x, PLAYER_BODY_FORWARD.y, PLAYER_BODY_FORWARD.z)
    .transformDirection(character.matrixWorld)
    .normalize();
  _bodyUp.set(0, 1, 0).transformDirection(character.matrixWorld).normalize();
  _bodyRight.crossVectors(_bodyUp, _bodyForward).normalize();
  if (_bodyForward.lengthSq() < 1e-8 || _bodyUp.lengthSq() < 1e-8 || _bodyRight.lengthSq() < 1e-8) return false;

  const head = findNamed(character, [
    "mixamorig:Head",
    "mixamorigHead",
    "Head",
  ]);
  const minimumForward = head
    ? worldPosition(head, _eyeAnchor).dot(_bodyForward) + PLAYER_EYE_FORWARD_OFFSET * 2.5
    : -Infinity;
  const authoredLeftShoulder = findNamed(character, [
    "mixamorig:LeftShoulder",
    "mixamorigLeftShoulder",
    "LeftShoulder",
  ]);
  const authoredRightShoulder = findNamed(character, [
    "mixamorig:RightShoulder",
    "mixamorigRightShoulder",
    "RightShoulder",
  ]);
  const authoredShoulderSpan = authoredLeftShoulder && authoredRightShoulder
    ? worldPosition(authoredLeftShoulder, _leftShoulder)
      .distanceTo(worldPosition(authoredRightShoulder, _rightShoulder))
    : Infinity;
  const targets = findHoldTargets(
    left,
    right,
    _bodyForward,
    _bodyRight,
    _bodyUp,
    minimumForward,
    authoredShoulderSpan,
  );
  if (!targets) return false;
  _leftTarget.copy(targets.center).addScaledVector(targets.direction, targets.halfSpan);
  _rightTarget.copy(targets.center).addScaledVector(targets.direction, -targets.halfSpan);
  return solveArm(left, _leftTarget, _bodyRight, _bodyUp)
    && solveArm(right, _rightTarget, _bodyRight, _bodyUp);
}
