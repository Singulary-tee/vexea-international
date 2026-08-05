import * as THREE from "three/webgpu";

// Preallocated scratch vectors to achieve completely zero-allocation updates inside the render loop
const tempPTrigger = new THREE.Vector3();
const tempPEnd = new THREE.Vector3();
const tempPMuzzle = new THREE.Vector3();
const tempPScope = new THREE.Vector3();
const tempVTrigger = new THREE.Vector3();
const tempDForward = new THREE.Vector3();
const tempDUp = new THREE.Vector3();
const tempPHook = new THREE.Vector3();
const tempPGripRight = new THREE.Vector3();
const tempLocalGrip = new THREE.Vector3();

// Additional preallocated matrix/quaternion/vector scratch elements for matrix-based weapon snapping
const tempWorldGrip = new THREE.Vector3();
const tempLocalGripVec = new THREE.Vector3();
const tempLocalPos = new THREE.Vector3();
const tempLocalQuat = new THREE.Quaternion();
const tempLocalScale = new THREE.Vector3();
const tempLocalRot = new THREE.Euler();
const tempLocalOffsetMatrix = new THREE.Matrix4();
const tempTargetWorldMatrix = new THREE.Matrix4();
const tempCharacterWorldInverse = new THREE.Matrix4();
const tempWeaponLocalMatrix = new THREE.Matrix4();

// Per-frame zero-GC two-point orientation constraint scratch structures
const posLeftHand = new THREE.Vector3();
const posRightHand = new THREE.Vector3();
const dirForward = new THREE.Vector3();
const upRef = new THREE.Vector3();
const rightAxis = new THREE.Vector3();
const orthogonalUp = new THREE.Vector3();
const rotMatrix = new THREE.Matrix4();
const targetQuat = new THREE.Quaternion();
const offsetRotQuat = new THREE.Quaternion();
const offsetEuler = new THREE.Euler();
const lastValidQuat = new THREE.Quaternion();
let hasLastValidQuat = false;

const offsetVec = new THREE.Vector3();
const finalWorldPos = new THREE.Vector3();
const scaleVec = new THREE.Vector3(0.015, 0.015, 0.015);
const worldMat = new THREE.Matrix4();
const invCharMat = new THREE.Matrix4();
const localMat = new THREE.Matrix4();

// Helper to search child bones by case-insensitive name matching
function findBoneContaining(parent: THREE.Object3D, substring: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  const lower = substring.toLowerCase();
  parent.traverse((child) => {
    if (!found && child.name.toLowerCase().includes(lower)) {
      found = child;
    }
  });
  return found;
}

/**
 * Extrapolates the right hand grip center procedurally using the weapon's trigger structure.
 */
export function calculateRightGripWorld(weapon: THREE.Object3D, targetOut: THREE.Vector3): void {
  const triggerNode = findBoneContaining(weapon, "tag_trigger") && !findBoneContaining(weapon, "tag_trigger_end")
    ? findBoneContaining(weapon, "tag_trigger")
    : null;
  const triggerEndNode = findBoneContaining(weapon, "tag_trigger_end");
  const muzzleNode = findBoneContaining(weapon, "tag_muzzle");
  const scopeNode = findBoneContaining(weapon, "exps3_socket") || findBoneContaining(weapon, "sdr_socket");

  // Fetch world positions or use default local offsets mapped to world coordinates if bones are missing
  if (triggerNode) {
    triggerNode.getWorldPosition(tempPTrigger);
  } else {
    tempPTrigger.set(0, -0.05, -0.08).applyMatrix4(weapon.matrixWorld);
  }

  if (triggerEndNode) {
    triggerEndNode.getWorldPosition(tempPEnd);
  } else {
    tempPEnd.set(0, -0.07, -0.08).applyMatrix4(weapon.matrixWorld);
  }

  if (muzzleNode) {
    muzzleNode.getWorldPosition(tempPMuzzle);
  } else {
    tempPMuzzle.set(0, 0, -0.4).applyMatrix4(weapon.matrixWorld);
  }

  if (scopeNode) {
    scopeNode.getWorldPosition(tempPScope);
  } else {
    tempPScope.set(0, 0.08, -0.05).applyMatrix4(weapon.matrixWorld);
  }

  // Calculate trigger structural distance (depth)
  tempVTrigger.subVectors(tempPEnd, tempPTrigger);
  const d = Math.max(0.01, tempVTrigger.length());

  // Establish weapon direction axes
  tempDForward.subVectors(tempPMuzzle, tempPTrigger).normalize();
  tempDUp.subVectors(tempPScope, tempPTrigger).normalize();

  // Index hook location: moving downward from trigger end along the upward axis
  tempPHook.copy(tempPEnd).addScaledVector(tempDUp, -d);

  // Extrapolate right hand palm center along the handle slope
  tempPGripRight.copy(tempPHook)
    .addScaledVector(tempDForward, -1.6 * d)
    .addScaledVector(tempDUp, -1.3 * d);

  targetOut.copy(tempPGripRight);
}

// Helper to align a bone's +Y axis (standard for Mixamo) along a world direction vector
function alignBoneToVector(bone: THREE.Object3D, vectorWorld: THREE.Vector3) {
  const targetLocal = vectorWorld.clone().normalize();
  if (bone.parent) {
    const parentWorldInverse = new THREE.Matrix4().copy(bone.parent.matrixWorld).invert();
    targetLocal.transformDirection(parentWorldInverse).normalize();
  }
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetLocal);
  bone.quaternion.copy(q);
  bone.updateMatrixWorld(true);
}

/**
 * Procedurally aligns the weapon using a per-frame two-point orientation constraint.
 * The weapon is anchored to the left hand (arm_left_hand) at its foregrip/neck,
 * and oriented towards the right hand (arm_right_hand) at its trigger area.
 * Keeps weapon parented to character root to ensure zero GC and WebGPU matrix stability.
 */
export function applyScenicGripPose(character: THREE.Object3D, weapon: THREE.Object3D, config?: any): void {
  const rightHand = findBoneContaining(character, "arm_right_hand") || findBoneContaining(character, "RightHand");
  const leftHand = findBoneContaining(character, "arm_left_hand") || findBoneContaining(character, "LeftHand");
  if (!leftHand || !rightHand) return;

  // Mount weapon directly under character root so hierarchy stays stable
  if (weapon.parent !== character) {
    character.add(weapon);
  }

  // Preserve the mathematically calculated scale of the weapon
  scaleVec.copy(weapon.scale);

  // Clear previous bone rotations to get clean matrices
  const rightTop = findBoneContaining(character, "arm_right_top") || findBoneContaining(character, "RightArm");
  const rightBot = findBoneContaining(character, "arm_right_bot") || findBoneContaining(character, "RightForeArm");
  const leftTop = findBoneContaining(character, "arm_left_top") || findBoneContaining(character, "LeftArm");
  const leftBot = findBoneContaining(character, "arm_left_bot") || findBoneContaining(character, "LeftForeArm");
  const bodyTop = findBoneContaining(character, "body_top2") || findBoneContaining(character, "Spine2");
  
  // Apply rotations and positions from config if available (Studio Preview sliders)
  if (rightTop) {
    rightTop.rotation.set(config?.rArmRotX || 0, config?.rArmRotY || 0, config?.rArmRotZ || 0, "XYZ");
    if (config && 'rArmPosX' in config && rightTop.userData.origPos) {
      rightTop.position.set(rightTop.userData.origPos.x + config.rArmPosX, rightTop.userData.origPos.y + config.rArmPosY, rightTop.userData.origPos.z + config.rArmPosZ);
    } else if (rightTop && !rightTop.userData.origPos) {
      rightTop.userData.origPos = rightTop.position.clone();
    }
  }
  if (rightBot) {
    rightBot.rotation.set(config?.rForeArmRotX || 0, config?.rForeArmRotY || 0, config?.rForeArmRotZ || 0, "XYZ");
    if (config && 'rForeArmPosX' in config && rightBot.userData.origPos) {
      rightBot.position.set(rightBot.userData.origPos.x + config.rForeArmPosX, rightBot.userData.origPos.y + config.rForeArmPosY, rightBot.userData.origPos.z + config.rForeArmPosZ);
    } else if (rightBot && !rightBot.userData.origPos) {
      rightBot.userData.origPos = rightBot.position.clone();
    }
  }
  if (rightHand) {
    rightHand.rotation.set(config?.rHandRotX || 0, config?.rHandRotY || 0, config?.rHandRotZ || 0, "XYZ");
    if (config && 'rHandPosX' in config && rightHand.userData.origPos) {
      rightHand.position.set(rightHand.userData.origPos.x + config.rHandPosX, rightHand.userData.origPos.y + config.rHandPosY, rightHand.userData.origPos.z + config.rHandPosZ);
    } else if (rightHand && !rightHand.userData.origPos) {
      rightHand.userData.origPos = rightHand.position.clone();
    }
  }
  if (leftTop) {
    leftTop.rotation.set(config?.lArmRotX || 0, config?.lArmRotY || 0, config?.lArmRotZ || 0, "XYZ");
    if (config && 'lArmPosX' in config && leftTop.userData.origPos) {
      leftTop.position.set(leftTop.userData.origPos.x + config.lArmPosX, leftTop.userData.origPos.y + config.lArmPosY, leftTop.userData.origPos.z + config.lArmPosZ);
    } else if (leftTop && !leftTop.userData.origPos) {
      leftTop.userData.origPos = leftTop.position.clone();
    }
  }
  if (leftBot) {
    leftBot.rotation.set(config?.lForeArmRotX || 0, config?.lForeArmRotY || 0, config?.lForeArmRotZ || 0, "XYZ");
    if (config && 'lForeArmPosX' in config && leftBot.userData.origPos) {
      leftBot.position.set(leftBot.userData.origPos.x + config.lForeArmPosX, leftBot.userData.origPos.y + config.lForeArmPosY, leftBot.userData.origPos.z + config.lForeArmPosZ);
    } else if (leftBot && !leftBot.userData.origPos) {
      leftBot.userData.origPos = leftBot.position.clone();
    }
  }
  if (leftHand) {
    leftHand.rotation.set(config?.lHandRotX || 0, config?.lHandRotY || 0, config?.lHandRotZ || 0, "XYZ");
    if (config && 'lHandPosX' in config && leftHand.userData.origPos) {
      leftHand.position.set(leftHand.userData.origPos.x + config.lHandPosX, leftHand.userData.origPos.y + config.lHandPosY, leftHand.userData.origPos.z + config.lHandPosZ);
    } else if (leftHand && !leftHand.userData.origPos) {
      leftHand.userData.origPos = leftHand.position.clone();
    }
  }
  if (bodyTop) bodyTop.rotation.set(0, 0, 0);

  // Update character matrices so bone world positions are exact for this frame
  character.updateMatrixWorld(true);

  // 1. Get left hand world position (anchor point for foregrip)
  leftHand.getWorldPosition(posLeftHand);

  // 2. Get right hand world position (reference point for trigger area)
  rightHand.getWorldPosition(posRightHand);

  // 3. Direction vector from left hand to right hand defines the weapon orientation axis
  dirForward.subVectors(posRightHand, posLeftHand);
  const dist = dirForward.length();

  // 4. Degenerate case check: epsilon = 0.01 (1cm in standard model units)
  const EPSILON = 0.01;
  if (dist < EPSILON) {
    if (hasLastValidQuat) {
      targetQuat.copy(lastValidQuat);
    } else {
      targetQuat.identity();
    }
  } else {
    dirForward.multiplyScalar(1 / dist); // Normalize forward direction

    // 5. Stable up-reference: character's global world up vector (0, 1, 0)
    upRef.set(0, 1, 0).transformDirection(character.matrixWorld).normalize();

    // Calculate orthogonal right axis
    rightAxis.crossVectors(upRef, dirForward);
    if (rightAxis.lengthSq() < 0.0001) {
      // Degenerate parallel alignment fallback
      upRef.set(0, 0, 1).transformDirection(character.matrixWorld).normalize();
      rightAxis.crossVectors(upRef, dirForward);
    }
    rightAxis.normalize();

    // Calculate orthogonal up vector
    orthogonalUp.crossVectors(dirForward, rightAxis).normalize();

    // Construct rotation matrix from basis: [Right, OrthogonalUp, Forward]
    rotMatrix.makeBasis(rightAxis, orthogonalUp, dirForward);
    targetQuat.setFromRotationMatrix(rotMatrix);

    // Cache last valid orientation
    lastValidQuat.copy(targetQuat);
    hasLastValidQuat = true;
  }

  // Fine-tuning rotation offset (applied on top of two-point base constraint)
  if (config && (config.wepRotX || config.wepRotY || config.wepRotZ)) {
    offsetEuler.set(config.wepRotX || 0, config.wepRotY || 0, config.wepRotZ || 0, "YXZ");
    offsetRotQuat.setFromEuler(offsetEuler);
    targetQuat.multiply(offsetRotQuat);
  }

  // 6. Set weapon position to left hand world position + fine tuning local offset
  finalWorldPos.copy(posLeftHand);
  if (config && (config.wepPosX || config.wepPosY || config.wepPosZ)) {
    offsetVec.set(config.wepPosX || 0, config.wepPosY || 0, config.wepPosZ || 0);
    offsetVec.applyQuaternion(targetQuat);
    finalWorldPos.add(offsetVec);
  }

  // 7. Apply position, rotation, and scale to weapon relative to character local space
  invCharMat.copy(character.matrixWorld).invert();
  worldMat.compose(finalWorldPos, targetQuat, scaleVec);
  localMat.multiplyMatrices(invCharMat, worldMat);
  localMat.decompose(weapon.position, weapon.quaternion, weapon.scale);
}
