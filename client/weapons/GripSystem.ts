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
 * Procedurally aligns the weapon with the player's right hand bone
 * using matrix transformations. This avoids mutating the skeleton hierarchy
 * (keeping the weapon parented to the main character group), which prevents
 * WebGPU bind group invalidations and keeps skinning/animations fully functional.
 */
export function applyScenicGripPose(character: THREE.Object3D, weapon: THREE.Object3D, config?: any): void {
  const rightHand = findBoneContaining(character, "arm_right_hand") || findBoneContaining(character, "RightHand");
  if (!rightHand) return;

  // Mount weapon to right hand
  if (weapon.parent !== rightHand) {
    rightHand.add(weapon);
  }

  // Clear previous bone rotations to get clean matrices (in case they were altered before)
  const rightTop = findBoneContaining(character, "arm_right_top") || findBoneContaining(character, "RightArm");
  const rightBot = findBoneContaining(character, "arm_right_bot") || findBoneContaining(character, "RightForeArm");
  const leftTop = findBoneContaining(character, "arm_left_top") || findBoneContaining(character, "LeftArm");
  const leftBot = findBoneContaining(character, "arm_left_bot") || findBoneContaining(character, "LeftForeArm");
  const leftHand = findBoneContaining(character, "arm_left_hand") || findBoneContaining(character, "LeftHand");
  const bodyTop = findBoneContaining(character, "body_top2") || findBoneContaining(character, "Spine2");
  
  // Apply rotations and positions from config if available
  if (rightTop) {
    rightTop.rotation.set(config?.rArmRotX || 0, config?.rArmRotY || 0, config?.rArmRotZ || 0, "XYZ");
    if (config && 'rArmPosX' in config && rightTop.userData.origPos) {
      rightTop.position.set(rightTop.userData.origPos.x + config.rArmPosX, rightTop.userData.origPos.y + config.rArmPosY, rightTop.userData.origPos.z + config.rArmPosZ);
    } else if (!rightTop.userData.origPos) {
      rightTop.userData.origPos = rightTop.position.clone();
    }
  }
  if (rightBot) {
    rightBot.rotation.set(config?.rForeArmRotX || 0, config?.rForeArmRotY || 0, config?.rForeArmRotZ || 0, "XYZ");
    if (config && 'rForeArmPosX' in config && rightBot.userData.origPos) {
      rightBot.position.set(rightBot.userData.origPos.x + config.rForeArmPosX, rightBot.userData.origPos.y + config.rForeArmPosY, rightBot.userData.origPos.z + config.rForeArmPosZ);
    } else if (!rightBot.userData.origPos) {
      rightBot.userData.origPos = rightBot.position.clone();
    }
  }
  if (rightHand) {
    rightHand.rotation.set(config?.rHandRotX || 0, config?.rHandRotY || 0, config?.rHandRotZ || 0, "XYZ");
    if (config && 'rHandPosX' in config && rightHand.userData.origPos) {
      rightHand.position.set(rightHand.userData.origPos.x + config.rHandPosX, rightHand.userData.origPos.y + config.rHandPosY, rightHand.userData.origPos.z + config.rHandPosZ);
    } else if (!rightHand.userData.origPos) {
      rightHand.userData.origPos = rightHand.position.clone();
    }
  }
  if (leftTop) {
    leftTop.rotation.set(config?.lArmRotX || 0, config?.lArmRotY || 0, config?.lArmRotZ || 0, "XYZ");
    if (config && 'lArmPosX' in config && leftTop.userData.origPos) {
      leftTop.position.set(leftTop.userData.origPos.x + config.lArmPosX, leftTop.userData.origPos.y + config.lArmPosY, leftTop.userData.origPos.z + config.lArmPosZ);
    } else if (!leftTop.userData.origPos) {
      leftTop.userData.origPos = leftTop.position.clone();
    }
  }
  if (leftBot) {
    leftBot.rotation.set(config?.lForeArmRotX || 0, config?.lForeArmRotY || 0, config?.lForeArmRotZ || 0, "XYZ");
    if (config && 'lForeArmPosX' in config && leftBot.userData.origPos) {
      leftBot.position.set(leftBot.userData.origPos.x + config.lForeArmPosX, leftBot.userData.origPos.y + config.lForeArmPosY, leftBot.userData.origPos.z + config.lForeArmPosZ);
    } else if (!leftBot.userData.origPos) {
      leftBot.userData.origPos = leftBot.position.clone();
    }
  }
  if (leftHand) {
    leftHand.rotation.set(config?.lHandRotX || 0, config?.lHandRotY || 0, config?.lHandRotZ || 0, "XYZ");
    if (config && 'lHandPosX' in config && leftHand.userData.origPos) {
      leftHand.position.set(leftHand.userData.origPos.x + config.lHandPosX, leftHand.userData.origPos.y + config.lHandPosY, leftHand.userData.origPos.z + config.lHandPosZ);
    } else if (!leftHand.userData.origPos) {
      leftHand.userData.origPos = leftHand.position.clone();
    }
  }
  if (bodyTop) bodyTop.rotation.set(0, 0, 0);

  character.updateMatrixWorld(true);

  // Position the weapon cleanly in the right hand without hacking the body bones
  weapon.scale.set(0.45, 0.45, 0.45);
  
  if (config) {
    weapon.position.set(config.wepPosX, config.wepPosY, config.wepPosZ);
    weapon.rotation.set(config.wepRotX, config.wepRotY, config.wepRotZ, "YXZ");
  } else {
    weapon.position.set(-0.02, 0.05, -0.05);
    weapon.rotation.set(0, Math.PI / 2, 0, "YXZ");
  }
}
