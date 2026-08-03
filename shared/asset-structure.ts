export interface GLBNodeMetadata {
  index: number;
  name: string;
  depth: number;
  parentIndex: number | null;
  parentName: string;
  hasMesh: boolean;
  meshIndex: number;
  meshName: string | null;
  bbox: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
  } | null;
  skinIndex?: number;
}

export interface GLBAnimationMetadata {
  index: number;
  name: string;
  minTime: number;
  maxTime: number;
}

export interface GLBSkinMetadata {
  name?: string;
  inverseBindMatrices?: number;
  joints: number[];
}

export interface GLBMetadata {
  fileName?: string;
  label: string;
  materialsCount: number;
  texturesCount: number;
  imagesCount: number;
  animations: GLBAnimationMetadata[];
  nodes: GLBNodeMetadata[];
  skins?: GLBSkinMetadata[];
}

export const ASSET_STRUCTURE: Record<string, GLBMetadata> = {
  "Player_one-optimized.glb": {
    "label": "Player character model",
    "materialsCount": 2,
    "texturesCount": 5,
    "imagesCount": 5,
    "animations": [
      {
        "index": 0,
        "name": "Fullreos_RESET",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 1,
        "name": "Fullreos_rig_rig_jump_end",
        "minTime": 0,
        "maxTime": 0.6333333253860474
      },
      {
        "index": 2,
        "name": "Fullreos_rig_rig_jump_fall",
        "minTime": 0,
        "maxTime": 1.0333333015441895
      },
      {
        "index": 3,
        "name": "Fullreos_rig_rig_jump_start",
        "minTime": 0,
        "maxTime": 0.3333333432674408
      },
      {
        "index": 4,
        "name": "Fullreos_rig_rig_run",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 5,
        "name": "Fullreos_rig_rig_walk",
        "minTime": 0,
        "maxTime": 1.0333333015441895
      },
      {
        "index": 6,
        "name": "Fullreos_rig|rig|idle",
        "minTime": 0,
        "maxTime": 5.400000095367432
      },
      {
        "index": 7,
        "name": "Fullreos_rig|rig|jump",
        "minTime": 0,
        "maxTime": 0.9333333373069763
      }
    ],
    "nodes": [
      { "index": 0, "name": "Aphase1basebody_idle", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "rig", "depth": 1, "parentIndex": 0, "parentName": "Aphase1basebody_idle", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 2, "name": "root", "depth": 2, "parentIndex": 1, "parentName": "rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "body", "depth": 3, "parentIndex": 2, "parentName": "root", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "body_top0", "depth": 4, "parentIndex": 3, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 5, "name": "body_top1", "depth": 5, "parentIndex": 4, "parentName": "body_top0", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 6, "name": "body_top2", "depth": 6, "parentIndex": 5, "parentName": "body_top1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 7, "name": "shoulder_right", "depth": 7, "parentIndex": 6, "parentName": "body_top2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 8, "name": "arm_right_top", "depth": 8, "parentIndex": 7, "parentName": "shoulder_right", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 9, "name": "arm_right_bot", "depth": 9, "parentIndex": 8, "parentName": "arm_right_top", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 10, "name": "arm_right_hand", "depth": 10, "parentIndex": 9, "parentName": "arm_right_bot", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 11, "name": "ring_right0", "depth": 11, "parentIndex": 10, "parentName": "arm_right_hand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 12, "name": "ring_right1", "depth": 12, "parentIndex": 11, "parentName": "ring_right0", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 13, "name": "ring_right2", "depth": 13, "parentIndex": 12, "parentName": "ring_right1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 14, "name": "ring_right3", "depth": 14, "parentIndex": 13, "parentName": "ring_right2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 15, "name": "index_right0", "depth": 11, "parentIndex": 10, "parentName": "arm_right_hand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 16, "name": "index_right1", "depth": 12, "parentIndex": 15, "parentName": "index_right0", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 17, "name": "index_right2", "depth": 13, "parentIndex": 16, "parentName": "index_right1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 18, "name": "index_right3", "depth": 14, "parentIndex": 17, "parentName": "index_right2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 19, "name": "thumb_right0", "depth": 11, "parentIndex": 10, "parentName": "arm_right_hand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 20, "name": "thumb_right1", "depth": 12, "parentIndex": 19, "parentName": "thumb_right0", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 21, "name": "thumb_right2", "depth": 13, "parentIndex": 20, "parentName": "thumb_right1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 22, "name": "thumb_right3", "depth": 14, "parentIndex": 21, "parentName": "thumb_right2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 23, "name": "middle_right0", "depth": 11, "parentIndex": 10, "parentName": "arm_right_hand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 24, "name": "middle_right1", "depth": 12, "parentIndex": 23, "parentName": "middle_right0", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 25, "name": "middle_right2", "depth": 13, "parentIndex": 24, "parentName": "middle_right1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 26, "name": "middle_right3", "depth": 14, "parentIndex": 25, "parentName": "middle_right2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 27, "name": "neck", "depth": 7, "parentIndex": 6, "parentName": "body_top2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 28, "name": "head", "depth": 8, "parentIndex": 27, "parentName": "neck", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 29, "name": "shoulder_left", "depth": 7, "parentIndex": 6, "parentName": "body_top2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 30, "name": "arm_left_top", "depth": 8, "parentIndex": 29, "parentName": "shoulder_left", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 31, "name": "arm_left_bot", "depth": 9, "parentIndex": 30, "parentName": "arm_left_top", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 32, "name": "arm_left_hand", "depth": 10, "parentIndex": 31, "parentName": "arm_left_bot", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 33, "name": "ring_left0", "depth": 11, "parentIndex": 32, "parentName": "arm_left_hand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 34, "name": "ring_left1", "depth": 12, "parentIndex": 33, "parentName": "ring_left0", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 35, "name": "ring_left2", "depth": 13, "parentIndex": 34, "parentName": "ring_left1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 36, "name": "ring_left3", "depth": 14, "parentIndex": 35, "parentName": "ring_left2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 37, "name": "index_left0", "depth": 11, "parentIndex": 32, "parentName": "arm_left_hand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 38, "name": "index_left1", "depth": 12, "parentIndex": 37, "parentName": "index_left0", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 39, "name": "index_left2", "depth": 13, "parentIndex": 38, "parentName": "index_left1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 40, "name": "index_left3", "depth": 14, "parentIndex": 39, "parentName": "index_left2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 41, "name": "thumb_left0", "depth": 11, "parentIndex": 32, "parentName": "arm_left_hand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 42, "name": "thumb_left1", "depth": 12, "parentIndex": 41, "parentName": "thumb_left0", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 43, "name": "thumb_left2", "depth": 13, "parentIndex": 42, "parentName": "thumb_left1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 44, "name": "thumb_left3", "depth": 14, "parentIndex": 43, "parentName": "thumb_left2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 45, "name": "middle_left0", "depth": 11, "parentIndex": 32, "parentName": "arm_left_hand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 46, "name": "middle_left1", "depth": 12, "parentIndex": 45, "parentName": "middle_left0", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 47, "name": "middle_left2", "depth": 13, "parentIndex": 46, "parentName": "middle_left1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 48, "name": "middle_left3", "depth": 14, "parentIndex": 47, "parentName": "middle_left2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 49, "name": "little_left0", "depth": 11, "parentIndex": 32, "parentName": "arm_left_hand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 50, "name": "little_left1", "depth": 12, "parentIndex": 49, "parentName": "little_left0", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 51, "name": "little_left2", "depth": 13, "parentIndex": 50, "parentName": "little_left1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 52, "name": "little_left3", "depth": 14, "parentIndex": 51, "parentName": "little_left2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 53, "name": "leg_right_top", "depth": 4, "parentIndex": 3, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 54, "name": "leg_right_bot", "depth": 5, "parentIndex": 53, "parentName": "leg_right_top", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 55, "name": "leg_right_foot", "depth": 6, "parentIndex": 54, "parentName": "leg_right_bot", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 56, "name": "leg_left_top", "depth": 4, "parentIndex": 3, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 57, "name": "leg_left_bot", "depth": 5, "parentIndex": 56, "parentName": "leg_left_top", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 58, "name": "leg_left_foot", "depth": 6, "parentIndex": 57, "parentName": "leg_left_bot", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 59,
        "name": "Aphase1basebody",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "rig",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "Aphase1basebody_idle_Aphase1basebody",
        "bbox": {
          "min": [-34.6099, -34.7952, -9.5626],
          "max": [34.6099, 34.7952, 9.5626],
          "size": [69.2199, 69.5905, 19.1252]
        },
        "skinIndex": 0
      }
    ],
    "skins": [
      {
        "name": "Skin",
        "inverseBindMatrices": 14,
        "joints": [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58]
      }
    ]
  },
  "humanoid-optimized.glb": {
    "label": "Humanoid Drone",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [
      { "index": 0, "name": "Animation", "minTime": 0, "maxTime": 1.0666667222976685 },
      { "index": 1, "name": "RESET", "minTime": 0, "maxTime": 0 }
    ],
    "nodes": [
      { "index": 0, "name": "humanoid", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "Armature", "depth": 1, "parentIndex": 0, "parentName": "humanoid", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 2, "name": "mixamorig_Hips", "depth": 2, "parentIndex": 1, "parentName": "Armature", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "mixamorig_Spine", "depth": 3, "parentIndex": 2, "parentName": "mixamorig_Hips", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "mixamorig_Spine1", "depth": 4, "parentIndex": 3, "parentName": "mixamorig_Spine", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 5, "name": "mixamorig_Spine2", "depth": 5, "parentIndex": 4, "parentName": "mixamorig_Spine1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 6, "name": "mixamorig_Neck", "depth": 6, "parentIndex": 5, "parentName": "mixamorig_Spine2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 7, "name": "mixamorig_Head", "depth": 7, "parentIndex": 6, "parentName": "mixamorig_Neck", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 8, "name": "mixamorig_LeftShoulder", "depth": 6, "parentIndex": 5, "parentName": "mixamorig_Spine2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 9, "name": "mixamorig_LeftArm", "depth": 7, "parentIndex": 8, "parentName": "mixamorig_LeftShoulder", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 10, "name": "mixamorig_LeftForeArm", "depth": 8, "parentIndex": 9, "parentName": "mixamorig_LeftArm", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 11, "name": "mixamorig_LeftHand", "depth": 9, "parentIndex": 10, "parentName": "mixamorig_LeftForeArm", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 12, "name": "mixamorig_LeftHandThumb1", "depth": 10, "parentIndex": 11, "parentName": "mixamorig_LeftHand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 13, "name": "mixamorig_LeftHandThumb2", "depth": 11, "parentIndex": 12, "parentName": "mixamorig_LeftHandThumb1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 14, "name": "mixamorig_LeftHandThumb3", "depth": 12, "parentIndex": 13, "parentName": "mixamorig_LeftHandThumb2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 15, "name": "mixamorig_LeftHandIndex1", "depth": 10, "parentIndex": 11, "parentName": "mixamorig_LeftHand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 16, "name": "mixamorig_LeftHandIndex2", "depth": 11, "parentIndex": 15, "parentName": "mixamorig_LeftHandIndex1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 17, "name": "mixamorig_LeftHandIndex3", "depth": 12, "parentIndex": 16, "parentName": "mixamorig_LeftHandIndex2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 18, "name": "mixamorig_LeftHandMiddle1", "depth": 10, "parentIndex": 11, "parentName": "mixamorig_LeftHand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 19, "name": "mixamorig_LeftHandMiddle2", "depth": 11, "parentIndex": 18, "parentName": "mixamorig_LeftHandMiddle1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 20, "name": "mixamorig_LeftHandMiddle3", "depth": 12, "parentIndex": 19, "parentName": "mixamorig_LeftHandMiddle2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 21, "name": "mixamorig_LeftHandRing1", "depth": 10, "parentIndex": 11, "parentName": "mixamorig_LeftHand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 22, "name": "mixamorig_LeftHandRing2", "depth": 11, "parentIndex": 21, "parentName": "mixamorig_LeftHandRing1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 23, "name": "mixamorig_LeftHandRing3", "depth": 12, "parentIndex": 22, "parentName": "mixamorig_LeftHandRing2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 24, "name": "mixamorig_LeftHandPinky1", "depth": 10, "parentIndex": 11, "parentName": "mixamorig_LeftHand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 25, "name": "mixamorig_LeftHandPinky2", "depth": 11, "parentIndex": 24, "parentName": "mixamorig_LeftHandPinky1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 26, "name": "mixamorig_LeftHandPinky3", "depth": 12, "parentIndex": 25, "parentName": "mixamorig_LeftHandPinky2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 27, "name": "mixamorig_RightShoulder", "depth": 6, "parentIndex": 5, "parentName": "mixamorig_Spine2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 28, "name": "mixamorig_RightArm", "depth": 7, "parentIndex": 27, "parentName": "mixamorig_RightShoulder", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 29, "name": "mixamorig_RightForeArm", "depth": 8, "parentIndex": 28, "parentName": "mixamorig_RightArm", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 30, "name": "mixamorig_RightHand", "depth": 9, "parentIndex": 29, "parentName": "mixamorig_RightForeArm", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 31, "name": "mixamorig_RightHandThumb1", "depth": 10, "parentIndex": 30, "parentName": "mixamorig_RightHand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 32, "name": "mixamorig_RightHandThumb2", "depth": 11, "parentIndex": 31, "parentName": "mixamorig_RightHandThumb1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 33, "name": "mixamorig_RightHandThumb3", "depth": 12, "parentIndex": 32, "parentName": "mixamorig_RightHandThumb2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 34, "name": "mixamorig_RightHandIndex1", "depth": 10, "parentIndex": 30, "parentName": "mixamorig_RightHand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 35, "name": "mixamorig_RightHandIndex2", "depth": 11, "parentIndex": 34, "parentName": "mixamorig_RightHandIndex1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 36, "name": "mixamorig_RightHandIndex3", "depth": 12, "parentIndex": 35, "parentName": "mixamorig_RightHandIndex2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 37, "name": "mixamorig_RightHandMiddle1", "depth": 10, "parentIndex": 30, "parentName": "mixamorig_RightHand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 38, "name": "mixamorig_RightHandMiddle2", "depth": 11, "parentIndex": 37, "parentName": "mixamorig_RightHandMiddle1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 39, "name": "mixamorig_RightHandMiddle3", "depth": 12, "parentIndex": 38, "parentName": "mixamorig_RightHandMiddle2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 40, "name": "mixamorig_RightHandRing1", "depth": 10, "parentIndex": 30, "parentName": "mixamorig_RightHand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 41, "name": "mixamorig_RightHandRing2", "depth": 11, "parentIndex": 40, "parentName": "mixamorig_RightHandRing1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 42, "name": "mixamorig_RightHandRing3", "depth": 12, "parentIndex": 41, "parentName": "mixamorig_RightHandRing2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 43, "name": "mixamorig_RightHandPinky1", "depth": 10, "parentIndex": 30, "parentName": "mixamorig_RightHand", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 44, "name": "mixamorig_RightHandPinky2", "depth": 11, "parentIndex": 43, "parentName": "mixamorig_RightHandPinky1", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 45, "name": "mixamorig_RightHandPinky3", "depth": 12, "parentIndex": 44, "parentName": "mixamorig_RightHandPinky2", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 46, "name": "mixamorig_LeftUpLeg", "depth": 3, "parentIndex": 2, "parentName": "mixamorig_Hips", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 47, "name": "mixamorig_LeftLeg", "depth": 4, "parentIndex": 46, "parentName": "mixamorig_LeftUpLeg", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 48, "name": "mixamorig_LeftFoot", "depth": 5, "parentIndex": 47, "parentName": "mixamorig_LeftLeg", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 49, "name": "mixamorig_LeftToeBase", "depth": 6, "parentIndex": 48, "parentName": "mixamorig_LeftFoot", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 50, "name": "mixamorig_RightUpLeg", "depth": 3, "parentIndex": 2, "parentName": "mixamorig_Hips", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 51, "name": "mixamorig_RightLeg", "depth": 4, "parentIndex": 50, "parentName": "mixamorig_RightUpLeg", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 52, "name": "mixamorig_RightFoot", "depth": 5, "parentIndex": 51, "parentName": "mixamorig_RightLeg", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 53, "name": "mixamorig_RightToeBase", "depth": 6, "parentIndex": 52, "parentName": "mixamorig_RightFoot", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 54,
        "name": "mesh",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "cEsXQckEQVWg-mbDmWDdNTYz2_mesh",
        "bbox": {
          "min": [-0.9998, -1.1613, -0.205],
          "max": [0.9998, 0.8723, 0.2343],
          "size": [1.9996, 2.0336, 0.4394]
        },
        "skinIndex": 0
      }
    ],
    "skins": [
      {
        "name": "Skin",
        "inverseBindMatrices": 7,
        "joints": [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53]
      }
    ]
  },
  "quadcopter_bmb-optimized.glb": {
    "label": "Bomber Drone",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "quadcopter_bmb", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "body", "depth": 1, "parentIndex": 0, "parentName": "quadcopter_bmb", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 2,
        "name": "body_mesh",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "body",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_21",
        "bbox": { "min": [-9.4944, 0.0133, -7.7905], "max": [9.4944, 6.6615, 8.2817], "size": [18.9889, 6.6482, 16.0722] }
      },
      { "index": 3, "name": "props", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "propFR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 5,
        "name": "prop_mesh",
        "depth": 4,
        "parentIndex": 4,
        "parentName": "propFR",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_53",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 6, "name": "propFL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 7,
        "name": "prop_mesh2",
        "depth": 4,
        "parentIndex": 6,
        "parentName": "propFL",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_532",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 8, "name": "propBL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 9,
        "name": "prop_mesh3",
        "depth": 4,
        "parentIndex": 8,
        "parentName": "propBL",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_533",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 10, "name": "propBR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 11,
        "name": "prop_mesh4",
        "depth": 4,
        "parentIndex": 10,
        "parentName": "propBR",
        "hasMesh": true,
        "meshIndex": 4,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_534",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 12, "name": "lights", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 13,
        "name": "light_mesh",
        "depth": 3,
        "parentIndex": 12,
        "parentName": "lights",
        "hasMesh": true,
        "meshIndex": 5,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_mesh",
        "bbox": { "min": [-0.0005, -0.0005, -0.0005], "max": [1.0462, 0.001, 0.0005], "size": [1.0467, 0.0015, 0.001] }
      },
      { "index": 14, "name": "bomb", "depth": 1, "parentIndex": 0, "parentName": "quadcopter_bmb", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 15,
        "name": "bomb_mesh",
        "depth": 2,
        "parentIndex": 14,
        "parentName": "bomb",
        "hasMesh": true,
        "meshIndex": 6,
        "meshName": "Sketchfab_Scene_Object_0",
        "bbox": { "min": [-3.3828, -6.2923, -0.0687], "max": [3.7808, 4.5211, 3.4544], "size": [7.1636, 10.8133, 3.5231] }
      }
    ],
    "skins": []
  },
  "quadcopter_cam-optimized.glb": {
    "label": "Recon Drone",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "quadcopter_cam", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "body", "depth": 1, "parentIndex": 0, "parentName": "quadcopter_cam", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 2,
        "name": "body_mesh",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "body",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_21",
        "bbox": { "min": [-9.4944, 0.0133, -7.7905], "max": [9.4944, 6.6615, 8.2817], "size": [18.9889, 6.6482, 16.0722] }
      },
      { "index": 3, "name": "props", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "propFR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 5,
        "name": "prop_mesh",
        "depth": 4,
        "parentIndex": 4,
        "parentName": "propFR",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_53",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 6, "name": "propFL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 7,
        "name": "prop_mesh2",
        "depth": 4,
        "parentIndex": 6,
        "parentName": "propFL",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_532",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 8, "name": "propBL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 9,
        "name": "prop_mesh3",
        "depth": 4,
        "parentIndex": 8,
        "parentName": "propBL",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_533",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 10, "name": "propBR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 11,
        "name": "prop_mesh4",
        "depth": 4,
        "parentIndex": 10,
        "parentName": "propBR",
        "hasMesh": true,
        "meshIndex": 4,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_534",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 12, "name": "lights", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 13,
        "name": "light_mesh",
        "depth": 3,
        "parentIndex": 12,
        "parentName": "lights",
        "hasMesh": true,
        "meshIndex": 5,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_mesh",
        "bbox": { "min": [-0.0005, -0.0005, -0.0005], "max": [1.0462, 0.001, 0.0005], "size": [1.0467, 0.0015, 0.001] }
      },
      { "index": 14, "name": "cam", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 15,
        "name": "cam_mesh",
        "depth": 3,
        "parentIndex": 14,
        "parentName": "cam",
        "hasMesh": true,
        "meshIndex": 6,
        "meshName": "quadcopter_camera (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_29",
        "bbox": { "min": [-1.1086, 0.1822, 2.565], "max": [1.1104, 2.3026, 5.905], "size": [2.219, 2.1204, 3.34] }
      }
    ],
    "skins": []
  },
  "quadcopter_rifle-optimized.glb": {
    "label": "Rotary Shooter",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "quadcopter_rifle", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "body", "depth": 1, "parentIndex": 0, "parentName": "quadcopter_rifle", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 2,
        "name": "body_mesh",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "body",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_21",
        "bbox": { "min": [-9.4944, 0.0133, -7.7905], "max": [9.4944, 6.6615, 8.2817], "size": [18.9889, 6.6482, 16.0722] }
      },
      { "index": 3, "name": "props", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "propFR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 5,
        "name": "prop_mesh",
        "depth": 4,
        "parentIndex": 4,
        "parentName": "propFR",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_53",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 6, "name": "propFL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 7,
        "name": "prop_mesh2",
        "depth": 4,
        "parentIndex": 6,
        "parentName": "propFL",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_532",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 8, "name": "propBL", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 9,
        "name": "prop_mesh3",
        "depth": 4,
        "parentIndex": 8,
        "parentName": "propBL",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_533",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 10, "name": "propBR", "depth": 3, "parentIndex": 3, "parentName": "props", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 11,
        "name": "prop_mesh4",
        "depth": 4,
        "parentIndex": 10,
        "parentName": "propBR",
        "hasMesh": true,
        "meshIndex": 4,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_Quad_quadcopter_Sketchfab_Scene_Object_534",
        "bbox": { "min": [-12.6742, 5.3671, 4.911], "max": [-4.2748, 6.4291, 9.9596], "size": [8.3994, 1.062, 5.0486] }
      },
      { "index": 12, "name": "gun", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 13,
        "name": "rifle_mesh",
        "depth": 3,
        "parentIndex": 12,
        "parentName": "gun",
        "hasMesh": true,
        "meshIndex": 5,
        "meshName": "quadcopter_rifle (1)_Sketchfab_Scene_defaultMaterial4",
        "bbox": { "min": [-0.5053, -5.9669, -0.8553], "max": [0.5804, 3.1963, 1.0521], "size": [1.0858, 9.1632, 1.9073] }
      },
      { "index": 14, "name": "lights", "depth": 2, "parentIndex": 1, "parentName": "body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 15,
        "name": "light_mesh",
        "depth": 3,
        "parentIndex": 14,
        "parentName": "lights",
        "hasMesh": true,
        "meshIndex": 6,
        "meshName": "quadcopter_rifle (1)_camquadcopter-opt_camquadcopter-opt_mesh",
        "bbox": { "min": [-0.0005, -0.0005, -0.0005], "max": [1.0462, 0.001, 0.0005], "size": [1.0467, 0.0015, 0.001] }
      }
    ],
    "skins": []
  },
  "uav-optimized.glb": {
    "label": "Fixed Wing",
    "materialsCount": 6,
    "texturesCount": 4,
    "imagesCount": 4,
    "animations": [
      { "index": 0, "name": "RQ-180_1_rigAction", "minTime": 0, "maxTime": 25 }
    ],
    "nodes": [
      { "index": 0, "name": "UAV", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "RQ-180_1_master", "depth": 1, "parentIndex": 0, "parentName": "UAV", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 2, "name": "RQ-180_1_rig", "depth": 2, "parentIndex": 1, "parentName": "RQ-180_1_master", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "Root", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "suspension", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 5, "name": "elevator L", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 6, "name": "elevator R", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 7, "name": "aileron L", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 8, "name": "aileron R", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 9, "name": "cover F", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 10, "name": "cover L", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 11, "name": "cover R", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 12, "name": "cover bay 1", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 13, "name": "cover bay 2", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 14, "name": "wheel F", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 15, "name": "wheel L", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 16, "name": "wheel R", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 17, "name": "cover bay L 1", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 18, "name": "cover bay R 1", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 19, "name": "cover bay L 2", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 20, "name": "cover bay R 2", "depth": 3, "parentIndex": 2, "parentName": "RQ-180_1_rig", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 21,
        "name": "UAV_mesh",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "RQ-180_1_rig",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "fixed_wing_drone_animated_recon_fixed-wing_Plane",
        "bbox": { "min": [-10.8321, -0.0276, -20.1513], "max": [7.7046, 4.4305, 19.8686], "size": [18.5367, 4.4581, 40.0199] },
        "skinIndex": 0
      }
    ],
    "skins": [
      {
        "name": "Skin",
        "inverseBindMatrices": 32,
        "joints": [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
      }
    ]
  },
  "ugv-optimized.glb": {
    "label": "Wheeled Drone",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "UGV", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "Body", "depth": 1, "parentIndex": 0, "parentName": "UGV", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 2,
        "name": "Chassis_mesh",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Body",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_Sketchfab_Scene_Cube_BASE_0",
        "bbox": { "min": [-1.9835, -1.5944, -0.5455], "max": [2.7386, 1.5197, 1.438], "size": [4.7221, 3.114, 1.9835] }
      },
      { "index": 3, "name": "FrontAxel", "depth": 2, "parentIndex": 1, "parentName": "Body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 4,
        "name": "FrontAxel_mesh",
        "depth": 3,
        "parentIndex": 3,
        "parentName": "FrontAxel",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_Sketchfab_Scene_Cylinder_005_Tires_0",
        "bbox": { "min": [-0.6816, -2.1612, -0.6765], "max": [0.685, 2.1612, 0.6765], "size": [1.3666, 4.3223, 1.3531] }
      },
      { "index": 5, "name": "BackAxel", "depth": 2, "parentIndex": 1, "parentName": "Body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 6,
        "name": "BackAxel_mesh",
        "depth": 3,
        "parentIndex": 5,
        "parentName": "BackAxel",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_Sketchfab_Scene_Cylinder_005_Tires_02",
        "bbox": { "min": [-0.6816, -2.1612, -0.6765], "max": [0.685, 2.1612, 0.6765], "size": [1.3666, 4.3223, 1.3531] }
      },
      { "index": 7, "name": "Turret", "depth": 2, "parentIndex": 1, "parentName": "Body", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 8,
        "name": "TurretPole_mesh",
        "depth": 3,
        "parentIndex": 7,
        "parentName": "Turret",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_ceramic_pot_1k_PRL_CERAMIC_POT_COMBINED",
        "bbox": { "min": [-0.9113, -0.0009, -0.8398], "max": [0.3281, 0.992, 0.663], "size": [1.2394, 0.9929, 1.5028] }
      },
      { "index": 9, "name": "gun", "depth": 3, "parentIndex": 7, "parentName": "Turret", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 10,
        "name": "MountedGun_mesh",
        "depth": 4,
        "parentIndex": 9,
        "parentName": "gun",
        "hasMesh": true,
        "meshIndex": 4,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_modular_metal_gutter_1k_Cylinder_069",
        "bbox": { "min": [-0.3418, -1.1602, -0.2618], "max": [0.22, 1.6959, 0.0976], "size": [0.5618, 2.8561, 0.3593] }
      },
      { "index": 11, "name": "barrel", "depth": 4, "parentIndex": 9, "parentName": "gun", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      {
        "index": 12,
        "name": "Barrel_mesh",
        "depth": 5,
        "parentIndex": 11,
        "parentName": "barrel",
        "hasMesh": true,
        "meshIndex": 5,
        "meshName": "wheeled_drone_supremewheeled-opt-optimized-optimized-opt_thewgeel_wheeled-opt-optimized-optimized_Wheeled_Sketchfab_Scene_Object_4",
        "bbox": { "min": [-4.4872, 0.2561, -0.7093], "max": [3.3277, 0.9108, 0.3874], "size": [7.8149, 0.6547, 1.0967] }
      }
    ],
    "skins": []
  },
  "robodog-optimized.glb": {
    "label": "Robodog",
    "materialsCount": 1,
    "texturesCount": 3,
    "imagesCount": 3,
    "animations": [
      {
        "index": 0,
        "name": "0LXN",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 1,
        "name": "0LXP",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 2,
        "name": "0LYN",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 3,
        "name": "0LYP",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 4,
        "name": "0RXN",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 5,
        "name": "0RXP",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 6,
        "name": "0RYN",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 7,
        "name": "0RYP",
        "minTime": 0,
        "maxTime": 0
      },
      {
        "index": 8,
        "name": "1Idle",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 9,
        "name": "1LXN",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 10,
        "name": "1LXP",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 11,
        "name": "1LYN",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 12,
        "name": "1LYP",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 13,
        "name": "1RXN",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 14,
        "name": "1RXP",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 15,
        "name": "1RYN",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 16,
        "name": "1RYP",
        "minTime": 0,
        "maxTime": 0.5
      },
      {
        "index": 17,
        "name": "Playing",
        "minTime": 0,
        "maxTime": 2.6666665077209473
      },
      {
        "index": 18,
        "name": "RESET",
        "minTime": 0,
        "maxTime": 0
      }
    ],
    "nodes": [
      {
        "index": 0,
        "name": "robodog",
        "depth": 0,
        "parentIndex": null,
        "parentName": "ROOT",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 1,
        "name": "Armature_30",
        "depth": 1,
        "parentIndex": 0,
        "parentName": "robodog",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 2,
        "name": "BodyBone_25",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature_30",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 3,
        "name": "HipBRBone_5",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "BodyBone_25",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 4,
        "name": "ThighBRBone_3",
        "depth": 4,
        "parentIndex": 3,
        "parentName": "HipBRBone_5",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 5,
        "name": "CalfBRBone_1",
        "depth": 5,
        "parentIndex": 4,
        "parentName": "ThighBRBone_3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 6,
        "name": "CalfBR_0",
        "depth": 6,
        "parentIndex": 5,
        "parentName": "CalfBRBone_1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 7,
        "name": "Object_9",
        "depth": 7,
        "parentIndex": 6,
        "parentName": "CalfBR_0",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 8,
        "name": "Object_93",
        "depth": 8,
        "parentIndex": 7,
        "parentName": "Object_9",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 9,
        "name": "Object_933",
        "depth": 9,
        "parentIndex": 8,
        "parentName": "Object_93",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 10,
        "name": "Object_9333",
        "depth": 10,
        "parentIndex": 9,
        "parentName": "Object_933",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 11,
        "name": "ThighBR_2",
        "depth": 5,
        "parentIndex": 4,
        "parentName": "ThighBRBone_3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 12,
        "name": "Object_11",
        "depth": 6,
        "parentIndex": 11,
        "parentName": "ThighBR_2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 13,
        "name": "Object_113",
        "depth": 7,
        "parentIndex": 12,
        "parentName": "Object_11",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 14,
        "name": "Object_1133",
        "depth": 8,
        "parentIndex": 13,
        "parentName": "Object_113",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 15,
        "name": "Object_11333",
        "depth": 9,
        "parentIndex": 14,
        "parentName": "Object_1133",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 16,
        "name": "HipBR_4",
        "depth": 4,
        "parentIndex": 3,
        "parentName": "HipBRBone_5",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 17,
        "name": "Object_13",
        "depth": 5,
        "parentIndex": 16,
        "parentName": "HipBR_4",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 18,
        "name": "Object_133",
        "depth": 6,
        "parentIndex": 17,
        "parentName": "Object_13",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 19,
        "name": "Object_1333",
        "depth": 7,
        "parentIndex": 18,
        "parentName": "Object_133",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 20,
        "name": "Object_13333",
        "depth": 8,
        "parentIndex": 19,
        "parentName": "Object_1333",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 21,
        "name": "Object_14",
        "depth": 5,
        "parentIndex": 16,
        "parentName": "HipBR_4",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 22,
        "name": "Object_143",
        "depth": 6,
        "parentIndex": 21,
        "parentName": "Object_14",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 23,
        "name": "Object_1433",
        "depth": 7,
        "parentIndex": 22,
        "parentName": "Object_143",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 24,
        "name": "Object_14333",
        "depth": 8,
        "parentIndex": 23,
        "parentName": "Object_1433",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 25,
        "name": "HipFRBone_11",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "BodyBone_25",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 26,
        "name": "ThighFRBone_9",
        "depth": 4,
        "parentIndex": 25,
        "parentName": "HipFRBone_11",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 27,
        "name": "CalfFRBone_7",
        "depth": 5,
        "parentIndex": 26,
        "parentName": "ThighFRBone_9",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 28,
        "name": "CalfFR_6",
        "depth": 6,
        "parentIndex": 27,
        "parentName": "CalfFRBone_7",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 29,
        "name": "Object_19",
        "depth": 7,
        "parentIndex": 28,
        "parentName": "CalfFR_6",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 30,
        "name": "Object_193",
        "depth": 8,
        "parentIndex": 29,
        "parentName": "Object_19",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 31,
        "name": "Object_1933",
        "depth": 9,
        "parentIndex": 30,
        "parentName": "Object_193",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 32,
        "name": "Object_19333",
        "depth": 10,
        "parentIndex": 31,
        "parentName": "Object_1933",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 33,
        "name": "ThighFR_8",
        "depth": 5,
        "parentIndex": 26,
        "parentName": "ThighFRBone_9",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 34,
        "name": "Object_21",
        "depth": 6,
        "parentIndex": 33,
        "parentName": "ThighFR_8",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 35,
        "name": "Object_213",
        "depth": 7,
        "parentIndex": 34,
        "parentName": "Object_21",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 36,
        "name": "Object_2133",
        "depth": 8,
        "parentIndex": 35,
        "parentName": "Object_213",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 37,
        "name": "Object_21333",
        "depth": 9,
        "parentIndex": 36,
        "parentName": "Object_2133",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 38,
        "name": "HipFR_10",
        "depth": 4,
        "parentIndex": 25,
        "parentName": "HipFRBone_11",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 39,
        "name": "Object_23",
        "depth": 5,
        "parentIndex": 38,
        "parentName": "HipFR_10",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 40,
        "name": "Object_233",
        "depth": 6,
        "parentIndex": 39,
        "parentName": "Object_23",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 41,
        "name": "Object_2333",
        "depth": 7,
        "parentIndex": 40,
        "parentName": "Object_233",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 42,
        "name": "Object_23333",
        "depth": 8,
        "parentIndex": 41,
        "parentName": "Object_2333",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 43,
        "name": "Object_24",
        "depth": 5,
        "parentIndex": 38,
        "parentName": "HipFR_10",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 44,
        "name": "Object_243",
        "depth": 6,
        "parentIndex": 43,
        "parentName": "Object_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 45,
        "name": "Object_2433",
        "depth": 7,
        "parentIndex": 44,
        "parentName": "Object_243",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 46,
        "name": "Object_24333",
        "depth": 8,
        "parentIndex": 45,
        "parentName": "Object_2433",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 47,
        "name": "HipBLBone_17",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "BodyBone_25",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 48,
        "name": "ThighBLBone_15",
        "depth": 4,
        "parentIndex": 47,
        "parentName": "HipBLBone_17",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 49,
        "name": "CalfBLBone_13",
        "depth": 5,
        "parentIndex": 48,
        "parentName": "ThighBLBone_15",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 50,
        "name": "CalfBL_12",
        "depth": 6,
        "parentIndex": 49,
        "parentName": "CalfBLBone_13",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 51,
        "name": "Object_29",
        "depth": 7,
        "parentIndex": 50,
        "parentName": "CalfBL_12",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 52,
        "name": "Object_293",
        "depth": 8,
        "parentIndex": 51,
        "parentName": "Object_29",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 53,
        "name": "Object_2933",
        "depth": 9,
        "parentIndex": 52,
        "parentName": "Object_293",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 54,
        "name": "Object_29333",
        "depth": 10,
        "parentIndex": 53,
        "parentName": "Object_2933",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 55,
        "name": "ThighBL_14",
        "depth": 5,
        "parentIndex": 48,
        "parentName": "ThighBLBone_15",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 56,
        "name": "Object_31",
        "depth": 6,
        "parentIndex": 55,
        "parentName": "ThighBL_14",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 57,
        "name": "Object_313",
        "depth": 7,
        "parentIndex": 56,
        "parentName": "Object_31",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 58,
        "name": "Object_3133",
        "depth": 8,
        "parentIndex": 57,
        "parentName": "Object_313",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 59,
        "name": "Object_31333",
        "depth": 9,
        "parentIndex": 58,
        "parentName": "Object_3133",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 60,
        "name": "HipBL_16",
        "depth": 4,
        "parentIndex": 47,
        "parentName": "HipBLBone_17",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 61,
        "name": "Object_33",
        "depth": 5,
        "parentIndex": 60,
        "parentName": "HipBL_16",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 62,
        "name": "Object_333",
        "depth": 6,
        "parentIndex": 61,
        "parentName": "Object_33",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 63,
        "name": "Object_3333",
        "depth": 7,
        "parentIndex": 62,
        "parentName": "Object_333",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 64,
        "name": "Object_33333",
        "depth": 8,
        "parentIndex": 63,
        "parentName": "Object_3333",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 65,
        "name": "Object_34",
        "depth": 5,
        "parentIndex": 60,
        "parentName": "HipBL_16",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 66,
        "name": "Object_343",
        "depth": 6,
        "parentIndex": 65,
        "parentName": "Object_34",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 67,
        "name": "Object_3433",
        "depth": 7,
        "parentIndex": 66,
        "parentName": "Object_343",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 68,
        "name": "Object_34333",
        "depth": 8,
        "parentIndex": 67,
        "parentName": "Object_3433",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 69,
        "name": "HipFLBone_23",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "BodyBone_25",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 70,
        "name": "ThighFLBone_21",
        "depth": 4,
        "parentIndex": 69,
        "parentName": "HipFLBone_23",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 71,
        "name": "CalfFLBone_19",
        "depth": 5,
        "parentIndex": 70,
        "parentName": "ThighFLBone_21",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 72,
        "name": "CalfFL_18",
        "depth": 6,
        "parentIndex": 71,
        "parentName": "CalfFLBone_19",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 73,
        "name": "Object_39",
        "depth": 7,
        "parentIndex": 72,
        "parentName": "CalfFL_18",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 74,
        "name": "Object_393",
        "depth": 8,
        "parentIndex": 73,
        "parentName": "Object_39",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 75,
        "name": "Object_3933",
        "depth": 9,
        "parentIndex": 74,
        "parentName": "Object_393",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 76,
        "name": "Object_39333",
        "depth": 10,
        "parentIndex": 75,
        "parentName": "Object_3933",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 77,
        "name": "ThighFL_20",
        "depth": 5,
        "parentIndex": 70,
        "parentName": "ThighFLBone_21",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 78,
        "name": "Object_41",
        "depth": 6,
        "parentIndex": 77,
        "parentName": "ThighFL_20",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 79,
        "name": "Object_413",
        "depth": 7,
        "parentIndex": 78,
        "parentName": "Object_41",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 80,
        "name": "Object_4133",
        "depth": 8,
        "parentIndex": 79,
        "parentName": "Object_413",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 81,
        "name": "Object_41333",
        "depth": 9,
        "parentIndex": 80,
        "parentName": "Object_4133",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 82,
        "name": "HipFL_22",
        "depth": 4,
        "parentIndex": 69,
        "parentName": "HipFLBone_23",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 83,
        "name": "Object_43",
        "depth": 5,
        "parentIndex": 82,
        "parentName": "HipFL_22",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 84,
        "name": "Object_433",
        "depth": 6,
        "parentIndex": 83,
        "parentName": "Object_43",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 85,
        "name": "Object_4333",
        "depth": 7,
        "parentIndex": 84,
        "parentName": "Object_433",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 86,
        "name": "Object_43333",
        "depth": 8,
        "parentIndex": 85,
        "parentName": "Object_4333",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 87,
        "name": "Object_44",
        "depth": 5,
        "parentIndex": 82,
        "parentName": "HipFL_22",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 88,
        "name": "Object_443",
        "depth": 6,
        "parentIndex": 87,
        "parentName": "Object_44",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 89,
        "name": "Object_4433",
        "depth": 7,
        "parentIndex": 88,
        "parentName": "Object_443",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 90,
        "name": "Object_44333",
        "depth": 8,
        "parentIndex": 89,
        "parentName": "Object_4433",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 91,
        "name": "Trunk_24",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "BodyBone_25",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 92,
        "name": "Object_46",
        "depth": 4,
        "parentIndex": 91,
        "parentName": "Trunk_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 93,
        "name": "Object_463",
        "depth": 5,
        "parentIndex": 92,
        "parentName": "Object_46",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 94,
        "name": "holder_mesh",
        "depth": 6,
        "parentIndex": 93,
        "parentName": "Object_463",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 95,
        "name": "holder_mesh3",
        "depth": 7,
        "parentIndex": 94,
        "parentName": "holder_mesh",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 96,
        "name": "holder_mesh33",
        "depth": 8,
        "parentIndex": 95,
        "parentName": "holder_mesh3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 97,
        "name": "Object_4633",
        "depth": 6,
        "parentIndex": 93,
        "parentName": "Object_463",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 98,
        "name": "Object_46333",
        "depth": 7,
        "parentIndex": 97,
        "parentName": "Object_4633",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 99,
        "name": "riflestand",
        "depth": 5,
        "parentIndex": 92,
        "parentName": "Object_46",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 100,
        "name": "mag_mesh",
        "depth": 6,
        "parentIndex": 99,
        "parentName": "riflestand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 101,
        "name": "mag_mesh3",
        "depth": 7,
        "parentIndex": 100,
        "parentName": "mag_mesh",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 102,
        "name": "mag_mesh33",
        "depth": 8,
        "parentIndex": 101,
        "parentName": "mag_mesh3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 103,
        "name": "rifle_mesh",
        "depth": 6,
        "parentIndex": 99,
        "parentName": "riflestand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 104,
        "name": "rifle_mesh3",
        "depth": 7,
        "parentIndex": 103,
        "parentName": "rifle_mesh",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 105,
        "name": "rifle_mesh33",
        "depth": 8,
        "parentIndex": 104,
        "parentName": "rifle_mesh3",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 106,
        "name": "Object_47",
        "depth": 4,
        "parentIndex": 91,
        "parentName": "Trunk_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 107,
        "name": "Object_473",
        "depth": 5,
        "parentIndex": 106,
        "parentName": "Object_47",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 108,
        "name": "Object_4733",
        "depth": 6,
        "parentIndex": 107,
        "parentName": "Object_473",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 109,
        "name": "Object_47333",
        "depth": 7,
        "parentIndex": 108,
        "parentName": "Object_4733",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 110,
        "name": "Object_48",
        "depth": 4,
        "parentIndex": 91,
        "parentName": "Trunk_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 111,
        "name": "Object_483",
        "depth": 5,
        "parentIndex": 110,
        "parentName": "Object_48",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 112,
        "name": "Object_4833",
        "depth": 6,
        "parentIndex": 111,
        "parentName": "Object_483",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 113,
        "name": "Object_48333",
        "depth": 7,
        "parentIndex": 112,
        "parentName": "Object_4833",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 114,
        "name": "Object_49",
        "depth": 4,
        "parentIndex": 91,
        "parentName": "Trunk_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 115,
        "name": "Object_493",
        "depth": 5,
        "parentIndex": 114,
        "parentName": "Object_49",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 116,
        "name": "Object_4933",
        "depth": 6,
        "parentIndex": 115,
        "parentName": "Object_493",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 117,
        "name": "Object_49333",
        "depth": 7,
        "parentIndex": 116,
        "parentName": "Object_4933",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 118,
        "name": "Object_50",
        "depth": 4,
        "parentIndex": 91,
        "parentName": "Trunk_24",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 119,
        "name": "Object_503",
        "depth": 5,
        "parentIndex": 118,
        "parentName": "Object_50",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 120,
        "name": "Object_5033",
        "depth": 6,
        "parentIndex": 119,
        "parentName": "Object_503",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 121,
        "name": "Object_50333",
        "depth": 7,
        "parentIndex": 120,
        "parentName": "Object_5033",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 122,
        "name": "FootBRBone_26",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature_30",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 123,
        "name": "FootFRBone_27",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature_30",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 124,
        "name": "FootFLBone_28",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature_30",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 125,
        "name": "FootBLBone_29",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature_30",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 126,
        "name": "Object_93333",
        "depth": 11,
        "parentIndex": 10,
        "parentName": "Object_9333",
        "hasMesh": true,
        "meshIndex": 0,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_0",
        "bbox": {
          "min": [
            -0.0227,
            -0.2353,
            -0.0202
          ],
          "max": [
            0.0316,
            0.0313,
            0.0202
          ],
          "size": [
            0.0543,
            0.2665,
            0.0404
          ]
        }
      },
      {
        "index": 127,
        "name": "Object_113333",
        "depth": 10,
        "parentIndex": 15,
        "parentName": "Object_11333",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_1",
        "bbox": {
          "min": [
            -0.047,
            -0.228,
            -0.0162
          ],
          "max": [
            0.047,
            0.049,
            0.0617
          ],
          "size": [
            0.0941,
            0.277,
            0.0779
          ]
        }
      },
      {
        "index": 128,
        "name": "Object_133333",
        "depth": 9,
        "parentIndex": 20,
        "parentName": "Object_13333",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_2",
        "bbox": {
          "min": [
            -0.0565,
            -0.0481,
            -0.0345
          ],
          "max": [
            0.031,
            0.0481,
            0.0193
          ],
          "size": [
            0.0875,
            0.0962,
            0.0538
          ]
        }
      },
      {
        "index": 129,
        "name": "Object_143333",
        "depth": 9,
        "parentIndex": 24,
        "parentName": "Object_14333",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_3",
        "bbox": {
          "min": [
            -0.0482,
            -0.0463,
            -0.015
          ],
          "max": [
            0.0482,
            0.0463,
            0.011
          ],
          "size": [
            0.0964,
            0.0925,
            0.026
          ]
        }
      },
      {
        "index": 130,
        "name": "Object_193333",
        "depth": 11,
        "parentIndex": 32,
        "parentName": "Object_19333",
        "hasMesh": true,
        "meshIndex": 4,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_02",
        "bbox": {
          "min": [
            -0.0227,
            -0.2353,
            -0.0202
          ],
          "max": [
            0.0316,
            0.0313,
            0.0202
          ],
          "size": [
            0.0543,
            0.2665,
            0.0404
          ]
        }
      },
      {
        "index": 131,
        "name": "Object_213333",
        "depth": 10,
        "parentIndex": 37,
        "parentName": "Object_21333",
        "hasMesh": true,
        "meshIndex": 5,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_12",
        "bbox": {
          "min": [
            -0.047,
            -0.228,
            -0.0162
          ],
          "max": [
            0.047,
            0.049,
            0.0617
          ],
          "size": [
            0.0941,
            0.277,
            0.0779
          ]
        }
      },
      {
        "index": 132,
        "name": "Object_233333",
        "depth": 9,
        "parentIndex": 42,
        "parentName": "Object_23333",
        "hasMesh": true,
        "meshIndex": 6,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_22",
        "bbox": {
          "min": [
            -0.0565,
            -0.0481,
            -0.0345
          ],
          "max": [
            0.031,
            0.0481,
            0.0193
          ],
          "size": [
            0.0875,
            0.0962,
            0.0538
          ]
        }
      },
      {
        "index": 133,
        "name": "Object_243333",
        "depth": 9,
        "parentIndex": 46,
        "parentName": "Object_24333",
        "hasMesh": true,
        "meshIndex": 7,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_32",
        "bbox": {
          "min": [
            -0.0482,
            -0.0463,
            -0.015
          ],
          "max": [
            0.0482,
            0.0463,
            0.011
          ],
          "size": [
            0.0964,
            0.0925,
            0.026
          ]
        }
      },
      {
        "index": 134,
        "name": "Object_293333",
        "depth": 11,
        "parentIndex": 54,
        "parentName": "Object_29333",
        "hasMesh": true,
        "meshIndex": 8,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_03",
        "bbox": {
          "min": [
            -0.0227,
            -0.2353,
            -0.0202
          ],
          "max": [
            0.0316,
            0.0313,
            0.0202
          ],
          "size": [
            0.0543,
            0.2665,
            0.0404
          ]
        }
      },
      {
        "index": 135,
        "name": "Object_313333",
        "depth": 10,
        "parentIndex": 59,
        "parentName": "Object_31333",
        "hasMesh": true,
        "meshIndex": 9,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_9",
        "bbox": {
          "min": [
            -0.047,
            -0.228,
            -0.0162
          ],
          "max": [
            0.047,
            0.049,
            0.0617
          ],
          "size": [
            0.0941,
            0.277,
            0.0779
          ]
        }
      },
      {
        "index": 136,
        "name": "Object_333333",
        "depth": 9,
        "parentIndex": 64,
        "parentName": "Object_33333",
        "hasMesh": true,
        "meshIndex": 10,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_23",
        "bbox": {
          "min": [
            -0.0565,
            -0.0481,
            -0.0345
          ],
          "max": [
            0.031,
            0.0481,
            0.0193
          ],
          "size": [
            0.0875,
            0.0962,
            0.0538
          ]
        }
      },
      {
        "index": 137,
        "name": "Object_343333",
        "depth": 9,
        "parentIndex": 68,
        "parentName": "Object_34333",
        "hasMesh": true,
        "meshIndex": 11,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_33",
        "bbox": {
          "min": [
            -0.0482,
            -0.0463,
            -0.015
          ],
          "max": [
            0.0482,
            0.0463,
            0.011
          ],
          "size": [
            0.0964,
            0.0925,
            0.026
          ]
        }
      },
      {
        "index": 138,
        "name": "Object_393333",
        "depth": 11,
        "parentIndex": 76,
        "parentName": "Object_39333",
        "hasMesh": true,
        "meshIndex": 12,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_04",
        "bbox": {
          "min": [
            -0.0227,
            -0.2353,
            -0.0202
          ],
          "max": [
            0.0316,
            0.0313,
            0.0202
          ],
          "size": [
            0.0543,
            0.2665,
            0.0404
          ]
        }
      },
      {
        "index": 139,
        "name": "Object_413333",
        "depth": 10,
        "parentIndex": 81,
        "parentName": "Object_41333",
        "hasMesh": true,
        "meshIndex": 13,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_92",
        "bbox": {
          "min": [
            -0.047,
            -0.228,
            -0.0162
          ],
          "max": [
            0.047,
            0.049,
            0.0617
          ],
          "size": [
            0.0941,
            0.277,
            0.0779
          ]
        }
      },
      {
        "index": 140,
        "name": "Object_433333",
        "depth": 9,
        "parentIndex": 86,
        "parentName": "Object_43333",
        "hasMesh": true,
        "meshIndex": 14,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_24",
        "bbox": {
          "min": [
            -0.0565,
            -0.0481,
            -0.0345
          ],
          "max": [
            0.031,
            0.0481,
            0.0193
          ],
          "size": [
            0.0875,
            0.0962,
            0.0538
          ]
        }
      },
      {
        "index": 141,
        "name": "Object_443333",
        "depth": 9,
        "parentIndex": 90,
        "parentName": "Object_44333",
        "hasMesh": true,
        "meshIndex": 15,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_34",
        "bbox": {
          "min": [
            -0.0482,
            -0.0463,
            -0.015
          ],
          "max": [
            0.0482,
            0.0463,
            0.011
          ],
          "size": [
            0.0964,
            0.0925,
            0.026
          ]
        }
      },
      {
        "index": 142,
        "name": "holder_mesh333",
        "depth": 9,
        "parentIndex": 96,
        "parentName": "holder_mesh33",
        "hasMesh": true,
        "meshIndex": 16,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_mesh",
        "bbox": {
          "min": [
            -0.05,
            -0.05,
            -0.05
          ],
          "max": [
            0.05,
            0.05,
            0.05
          ],
          "size": [
            0.1,
            0.1,
            0.1
          ]
        }
      },
      {
        "index": 143,
        "name": "Object_463333",
        "depth": 8,
        "parentIndex": 98,
        "parentName": "Object_46333",
        "hasMesh": true,
        "meshIndex": 17,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_16",
        "bbox": {
          "min": [
            -0.097,
            -0.0598,
            -0.1316
          ],
          "max": [
            0.097,
            0.0713,
            0.2993
          ],
          "size": [
            0.194,
            0.1311,
            0.4309
          ]
        }
      },
      {
        "index": 144,
        "name": "mag_mesh333",
        "depth": 9,
        "parentIndex": 102,
        "parentName": "mag_mesh33",
        "hasMesh": true,
        "meshIndex": 18,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_nodriflee3d-opt_Sketchfab_Scene_SM_Rif_SCAR_L_Mag_001_ScarMK16Mag_MI_0",
        "bbox": {
          "min": [
            -1.2846,
            -5.6811,
            -16.2429
          ],
          "max": [
            1.3641,
            2.717,
            3.4879
          ],
          "size": [
            2.6486,
            8.3981,
            19.7307
          ]
        }
      },
      {
        "index": 145,
        "name": "rifle_mesh333",
        "depth": 9,
        "parentIndex": 105,
        "parentName": "rifle_mesh33",
        "hasMesh": true,
        "meshIndex": 19,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_nodriflee3d-opt_Sketchfab_Scene_SK_Rif_SCAR_L_001_ScarMK16_MI_0",
        "bbox": {
          "min": [
            -13.2804,
            -4.3716,
            67.5446
          ],
          "max": [
            12.0154,
            3.2344,
            146.309
          ],
          "size": [
            25.2959,
            7.606,
            78.7645
          ]
        }
      },
      {
        "index": 146,
        "name": "Object_473333",
        "depth": 8,
        "parentIndex": 109,
        "parentName": "Object_47333",
        "hasMesh": true,
        "meshIndex": 20,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_17",
        "bbox": {
          "min": [
            -0.0956,
            -0.0573,
            -0.091
          ],
          "max": [
            0.0956,
            0.0249,
            0.2893
          ],
          "size": [
            0.1911,
            0.0822,
            0.3803
          ]
        }
      },
      {
        "index": 147,
        "name": "Object_483333",
        "depth": 8,
        "parentIndex": 113,
        "parentName": "Object_48333",
        "hasMesh": true,
        "meshIndex": 21,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_18",
        "bbox": {
          "min": [
            -0.0682,
            -0.0564,
            0.2512
          ],
          "max": [
            0.0128,
            0.0713,
            0.2968
          ],
          "size": [
            0.0811,
            0.1276,
            0.0455
          ]
        }
      },
      {
        "index": 148,
        "name": "Object_493333",
        "depth": 8,
        "parentIndex": 117,
        "parentName": "Object_49333",
        "hasMesh": true,
        "meshIndex": 22,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_19",
        "bbox": {
          "min": [
            -0.03,
            -0.0568,
            0.0921
          ],
          "max": [
            0.03,
            0.057,
            0.2286
          ],
          "size": [
            0.06,
            0.1138,
            0.1365
          ]
        }
      },
      {
        "index": 149,
        "name": "Object_503333",
        "depth": 8,
        "parentIndex": 121,
        "parentName": "Object_50333",
        "hasMesh": true,
        "meshIndex": 23,
        "meshName": "robodog-opt(1)_robodog-opt(1)_robodog-opt_Sketchfab_Scene_Object_20",
        "bbox": {
          "min": [
            -0.0687,
            -0.0121,
            0.2433
          ],
          "max": [
            0.0687,
            0.0212,
            0.2549
          ],
          "size": [
            0.1373,
            0.0333,
            0.0116
          ]
        }
      }
    ],
    "skins": []
  },
  "attachments-optimized.glb": {
    "label": "Weapon Attachments",
    "materialsCount": 19,
    "texturesCount": 28,
    "imagesCount": 28,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "attachments", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 1, "name": "SK_Pistol_light_X300", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 7, "name": "Object_25", "depth": 3, "parentIndex": 2, "parentName": "Object_19", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_Pistol_light_X300_001_MI_Cubicle_Glass_001_0", "bbox": { "min": [101.6331, 1.7704, 45.2638], "max": [103.8522, 3.9895, 45.2638], "size": [2.2191, 2.2191, 0] } },
      { "index": 8, "name": "Object_26", "depth": 3, "parentIndex": 2, "parentName": "Object_19", "hasMesh": true, "meshIndex": 1, "meshName": "Sketchfab_Scene_SK_Pistol_light_X300_001_MI_Flashight_M600V_Inst_0", "bbox": { "min": [100.7685, 1.144, 36.3598], "max": [104.1437, 4.6159, 45.4143], "size": [3.3752, 3.4719, 9.0545] } },
      { "index": 9, "name": "SK_suppressor_gm9", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 14, "name": "Object_489", "depth": 3, "parentIndex": 10, "parentName": "Object_484", "hasMesh": true, "meshIndex": 2, "meshName": "Sketchfab_Scene_SK_suppressor_gm9_001_MI_Attachment_GM9_0", "bbox": { "min": [-2.2889, 1.4776, 34.959], "max": [0.7822, 4.5316, 54.6604], "size": [3.0711, 3.0541, 19.7015] } },
      { "index": 15, "name": "sk_optic_acog_rds", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 25, "name": "Object_510", "depth": 3, "parentIndex": 16, "parentName": "Object_500", "hasMesh": true, "meshIndex": 5, "meshName": "Sketchfab_Scene_sk_optic_acog_rds_001_MI_Optic_ACOG_0", "bbox": { "min": [-15.6546, -0.5659, -10.5698], "max": [-5.1139, 6.7521, 6.5087], "size": [10.5406, 7.318, 17.0785] } },
      { "index": 31, "name": "sk_rif_laser", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 37, "name": "Object_523", "depth": 3, "parentIndex": 32, "parentName": "Object_517", "hasMesh": true, "meshIndex": 11, "meshName": "Sketchfab_Scene_sk_rif_laser_001_MI_Laser_Rif_0", "bbox": { "min": [95.6972, -3.2101, 38.1756], "max": [101.4839, 0.5892, 47.9535], "size": [5.7868, 3.7993, 9.7779] } },
      { "index": 38, "name": "sm_optic_atacr18", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 46, "name": "Object_533", "depth": 3, "parentIndex": 39, "parentName": "Object_525", "hasMesh": true, "meshIndex": 12, "meshName": "Sketchfab_Scene_sm_optic_atacr18_001_MI_Optic_ATACR_0", "bbox": { "min": [85.7572, -0.6094, -3.7828], "max": [91.5564, 6.3694, 21.6421], "size": [5.7992, 6.9788, 25.4249] } },
      { "index": 51, "name": "Holosight_512", "depth": 1, "parentIndex": 0, "parentName": "attachments", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 60, "name": "Object_16", "depth": 3, "parentIndex": 52, "parentName": "Object_7", "hasMesh": true, "meshIndex": 18, "meshName": "Sketchfab_Scene_Holosight_512_001_Optic_1P_HOLO_INST_0", "bbox": { "min": [-15.3733, -2.9514, 95.8976], "max": [-7.8193, 3.0559, 112.0786], "size": [7.5541, 6.0072, 16.181] } }
    ]
  },
  "brn_180-optimized.glb": {
    "label": "BRN-180 Rifle",
    "materialsCount": 2,
    "texturesCount": 6,
    "imagesCount": 6,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "BRN180", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "_rootJoint", "depth": 3, "parentIndex": 2, "parentName": "Object_219", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "J_Gun_0104", "depth": 4, "parentIndex": 3, "parentName": "_rootJoint", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 22, "name": "tag_bolt_0116", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 36, "name": "tag_muzzle_0126", "depth": 8, "parentIndex": 35, "parentName": "tag_barrel_2_0125", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 40, "name": "tag_trigger_0129", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 46, "name": "combat_grip_0132", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 50, "name": "mault_socket_0134", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 56, "name": "laser_socket_0137", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 60, "name": "EXPS3_socket_0139", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 62, "name": "MicroT2Raised_socket_0140", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 64, "name": "socom338_socket_0141", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 68, "name": "sdr_socket_0143", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 70, "name": "Reflex_Socket_0144", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 78, "name": "HS510C_socket_0148", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0104", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 84, "name": "Object_302", "depth": 3, "parentIndex": 2, "parentName": "Object_219", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_Rif_BRN180_001_MI_1P_BRN180_0", "bbox": { "min": [-108.4853, -4.6181, -32.2449], "max": [-87.0248, 2.8299, 38.7007], "size": [21.4606, 7.448, 70.9456] } }
    ]
  },
  "f_90-optimized.glb": {
    "label": "F90 Rifle",
    "materialsCount": 3,
    "texturesCount": 9,
    "imagesCount": 9,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "f90", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "_rootJoint", "depth": 3, "parentIndex": 2, "parentName": "Object_305", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "J_Gun_0151", "depth": 4, "parentIndex": 3, "parentName": "_rootJoint", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 19, "name": "tag_bolt_0161", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 35, "name": "tag_muzzle_0172", "depth": 8, "parentIndex": 34, "parentName": "tag_barrel_2_0171", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 37, "name": "tag_trigger_0173", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 44, "name": "Reflex_Socket_0177", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 46, "name": "EXPS3_socket_0178", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 48, "name": "MicroT2Raised_Socket_0179", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 52, "name": "sdr_Socket_0181", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 54, "name": "atac_Socket_0182", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 58, "name": "combat_grip_0184", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 60, "name": "socom338_socket_0185", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 66, "name": "mault_socket_0188", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 76, "name": "HS510C_socket_0193", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_0151", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 88, "name": "Object_392", "depth": 3, "parentIndex": 2, "parentName": "Object_305", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_Rif_F90_001_F90_MI_0", "bbox": { "min": [-4.1702, -1.2484, -128.4533], "max": [13.9393, 5.7971, -56.2111], "size": [18.1095, 7.0455, 72.2422] } }
    ]
  },
  "hk_51-optimized.glb": {
    "label": "HK-51 Rifle",
    "materialsCount": 2,
    "texturesCount": 6,
    "imagesCount": 6,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "HK51", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "J_Gun_08", "depth": 4, "parentIndex": 3, "parentName": "_rootJoint", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 38, "name": "tag_muzzle_011", "depth": 8, "parentIndex": 37, "parentName": "tag_barrel_010", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 52, "name": "EXPS3_socket_013", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_08", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 66, "name": "Object_121", "depth": 3, "parentIndex": 2, "parentName": "Object_28", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_RIF_HK51_001_MI_1P_HK51_0", "bbox": { "min": [-92.4206, -3.8327, -25.2671], "max": [-75.4042, 3.8433, 27.6748], "size": [17.0164, 7.676, 52.9419] } }
    ]
  },
  "scar_h_mk_17-optimized.glb": {
    "label": "SCAR-H MK17",
    "materialsCount": 2,
    "texturesCount": 6,
    "imagesCount": 6,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "scar_h", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "_rootJoint", "depth": 3, "parentIndex": 2, "parentName": "Object_252", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "J_Gun_00", "depth": 4, "parentIndex": 3, "parentName": "_rootJoint", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 21, "name": "tag_bolt_063", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 35, "name": "tag_muzzle_01", "depth": 8, "parentIndex": 34, "parentName": "tag_barrel_2_01", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 41, "name": "tag_grip_075", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 45, "name": "tag_trigger_077", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 76, "name": "combat_grip_093", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 82, "name": "Object_336", "depth": 3, "parentIndex": 2, "parentName": "Object_252", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_Rif_SCARH_001_MI_1P_SCAR_H_0", "bbox": { "min": [-106.6713, -5.0298, -26.963], "max": [-86.6436, 4.4144, 46.5936], "size": [20.0277, 9.4442, 73.5566] } }
    ]
  },
  "scar_l-optimized.glb": {
    "label": "SCAR-L",
    "materialsCount": 2,
    "texturesCount": 6,
    "imagesCount": 6,
    "animations": [],
    "nodes": [
      { "index": 0, "name": "scar_l", "depth": 0, "parentIndex": null, "parentName": "ROOT", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 3, "name": "_rootJoint", "depth": 3, "parentIndex": 2, "parentName": "Object_244", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 4, "name": "J_Gun_00", "depth": 4, "parentIndex": 3, "parentName": "_rootJoint", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 22, "name": "tag_bolt_0211", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 35, "name": "tag_muzzle_01", "depth": 8, "parentIndex": 34, "parentName": "tag_barrel_2_01", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 40, "name": "tag_trigger_0223", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 60, "name": "combat_grip_0233", "depth": 5, "parentIndex": 4, "parentName": "J_Gun_00", "hasMesh": false, "meshIndex": -1, "meshName": null, "bbox": null },
      { "index": 82, "name": "Object_328", "depth": 3, "parentIndex": 2, "parentName": "Object_244", "hasMesh": true, "meshIndex": 0, "meshName": "Sketchfab_Scene_SK_Rif_SCARL_001_MI_1P_SCAR_L_0", "bbox": { "min": [-106.7725, -4.9547, -26.963], "max": [-86.6436, 4.4144, 46.5936], "size": [20.1289, 9.3691, 73.5566] } }
    ]
  }
};

Object.keys(ASSET_STRUCTURE).forEach(key => {
  ASSET_STRUCTURE[key].fileName = key;
});
