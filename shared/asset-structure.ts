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
  "label": "Mixamo-rigged Player character model",
  "materialsCount": 2,
  "texturesCount": 5,
  "imagesCount": 5,
  "animations": [
    {
      "index": 0,
      "name": "rifle_idle",
      "minTime": 0,
      "maxTime": 8.6
    },
    {
      "index": 1,
      "name": "rifle_aim_idle",
      "minTime": 0,
      "maxTime": 3.133333
    },
    {
      "index": 2,
      "name": "rifle_run",
      "minTime": 0,
      "maxTime": 0.766667
    },
    {
      "index": 3,
      "name": "rifle_fire",
      "minTime": 0,
      "maxTime": 0.3
    },
    {
      "index": 4,
      "name": "pistol_idle",
      "minTime": 0,
      "maxTime": 1.266667
    },
    {
      "index": 5,
      "name": "pistol_jump_2",
      "minTime": 0,
      "maxTime": 0.833333
    },
    {
      "index": 6,
      "name": "pistol_jump",
      "minTime": 0,
      "maxTime": 2.033333
    },
    {
      "index": 7,
      "name": "pistol_kneel_to_stand",
      "minTime": 0,
      "maxTime": 1.4
    },
    {
      "index": 8,
      "name": "pistol_kneeling_idle",
      "minTime": 0,
      "maxTime": 3.833333
    },
    {
      "index": 9,
      "name": "pistol_run_arc_2",
      "minTime": 0,
      "maxTime": 0.666667
    },
    {
      "index": 10,
      "name": "pistol_run_arc",
      "minTime": 0,
      "maxTime": 0.6
    },
    {
      "index": 11,
      "name": "pistol_run_backward_arc_2",
      "minTime": 0,
      "maxTime": 0.533333
    },
    {
      "index": 12,
      "name": "pistol_run_backward_arc",
      "minTime": 0,
      "maxTime": 0.533333
    },
    {
      "index": 13,
      "name": "pistol_run_backward",
      "minTime": 0,
      "maxTime": 0.566667
    },
    {
      "index": 14,
      "name": "pistol_run",
      "minTime": 0,
      "maxTime": 0.533333
    },
    {
      "index": 15,
      "name": "pistol_stand_to_kneel",
      "minTime": 0,
      "maxTime": 1.0
    },
    {
      "index": 16,
      "name": "pistol_strafe_2",
      "minTime": 0,
      "maxTime": 0.6
    },
    {
      "index": 17,
      "name": "pistol_strafe",
      "minTime": 0,
      "maxTime": 0.6
    },
    {
      "index": 18,
      "name": "pistol_walk_arc_2",
      "minTime": 0,
      "maxTime": 0.8
    },
    {
      "index": 19,
      "name": "pistol_walk_arc",
      "minTime": 0,
      "maxTime": 0.766667
    },
    {
      "index": 20,
      "name": "pistol_walk_backward_arc_2",
      "minTime": 0,
      "maxTime": 0.633333
    },
    {
      "index": 21,
      "name": "pistol_walk_backward_arc",
      "minTime": 0,
      "maxTime": 0.6
    },
    {
      "index": 22,
      "name": "pistol_walk_backward",
      "minTime": 0,
      "maxTime": 1.033333
    },
    {
      "index": 23,
      "name": "pistol_walk",
      "minTime": 0,
      "maxTime": 0.833333
    }
  ],
  "nodes": [
    {
      "index": 0,
      "name": "mixamorig:HeadTop_End",
      "depth": 7,
      "parentIndex": 1,
      "parentName": "mixamorig:Head",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 1,
      "name": "mixamorig:Head",
      "depth": 6,
      "parentIndex": 2,
      "parentName": "mixamorig:Neck",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 2,
      "name": "mixamorig:Neck",
      "depth": 5,
      "parentIndex": 27,
      "parentName": "mixamorig:Spine2",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 3,
      "name": "mixamorig:LeftHandThumb4",
      "depth": 12,
      "parentIndex": 4,
      "parentName": "mixamorig:LeftHandThumb3",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 4,
      "name": "mixamorig:LeftHandThumb3",
      "depth": 11,
      "parentIndex": 5,
      "parentName": "mixamorig:LeftHandThumb2",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 5,
      "name": "mixamorig:LeftHandThumb2",
      "depth": 10,
      "parentIndex": 6,
      "parentName": "mixamorig:LeftHandThumb1",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 6,
      "name": "mixamorig:LeftHandThumb1",
      "depth": 9,
      "parentIndex": 11,
      "parentName": "mixamorig:LeftHand",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 7,
      "name": "mixamorig:LeftHandIndex4",
      "depth": 12,
      "parentIndex": 8,
      "parentName": "mixamorig:LeftHandIndex3",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 8,
      "name": "mixamorig:LeftHandIndex3",
      "depth": 11,
      "parentIndex": 9,
      "parentName": "mixamorig:LeftHandIndex2",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 9,
      "name": "mixamorig:LeftHandIndex2",
      "depth": 10,
      "parentIndex": 10,
      "parentName": "mixamorig:LeftHandIndex1",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 10,
      "name": "mixamorig:LeftHandIndex1",
      "depth": 9,
      "parentIndex": 11,
      "parentName": "mixamorig:LeftHand",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 11,
      "name": "mixamorig:LeftHand",
      "depth": 8,
      "parentIndex": 12,
      "parentName": "mixamorig:LeftForeArm",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 12,
      "name": "mixamorig:LeftForeArm",
      "depth": 7,
      "parentIndex": 13,
      "parentName": "mixamorig:LeftArm",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 13,
      "name": "mixamorig:LeftArm",
      "depth": 6,
      "parentIndex": 14,
      "parentName": "mixamorig:LeftShoulder",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 14,
      "name": "mixamorig:LeftShoulder",
      "depth": 5,
      "parentIndex": 27,
      "parentName": "mixamorig:Spine2",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 15,
      "name": "mixamorig:RightHandThumb4",
      "depth": 12,
      "parentIndex": 16,
      "parentName": "mixamorig:RightHandThumb3",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 16,
      "name": "mixamorig:RightHandThumb3",
      "depth": 11,
      "parentIndex": 17,
      "parentName": "mixamorig:RightHandThumb2",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 17,
      "name": "mixamorig:RightHandThumb2",
      "depth": 10,
      "parentIndex": 18,
      "parentName": "mixamorig:RightHandThumb1",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 18,
      "name": "mixamorig:RightHandThumb1",
      "depth": 9,
      "parentIndex": 23,
      "parentName": "mixamorig:RightHand",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 19,
      "name": "mixamorig:RightHandIndex4",
      "depth": 12,
      "parentIndex": 20,
      "parentName": "mixamorig:RightHandIndex3",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 20,
      "name": "mixamorig:RightHandIndex3",
      "depth": 11,
      "parentIndex": 21,
      "parentName": "mixamorig:RightHandIndex2",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 21,
      "name": "mixamorig:RightHandIndex2",
      "depth": 10,
      "parentIndex": 22,
      "parentName": "mixamorig:RightHandIndex1",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 22,
      "name": "mixamorig:RightHandIndex1",
      "depth": 9,
      "parentIndex": 23,
      "parentName": "mixamorig:RightHand",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 23,
      "name": "mixamorig:RightHand",
      "depth": 8,
      "parentIndex": 24,
      "parentName": "mixamorig:RightForeArm",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 24,
      "name": "mixamorig:RightForeArm",
      "depth": 7,
      "parentIndex": 25,
      "parentName": "mixamorig:RightArm",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 25,
      "name": "mixamorig:RightArm",
      "depth": 6,
      "parentIndex": 26,
      "parentName": "mixamorig:RightShoulder",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 26,
      "name": "mixamorig:RightShoulder",
      "depth": 5,
      "parentIndex": 27,
      "parentName": "mixamorig:Spine2",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 27,
      "name": "mixamorig:Spine2",
      "depth": 4,
      "parentIndex": 28,
      "parentName": "mixamorig:Spine1",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 28,
      "name": "mixamorig:Spine1",
      "depth": 3,
      "parentIndex": 29,
      "parentName": "mixamorig:Spine",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 29,
      "name": "mixamorig:Spine",
      "depth": 2,
      "parentIndex": 40,
      "parentName": "mixamorig:Hips",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 30,
      "name": "mixamorig:LeftToe_End",
      "depth": 6,
      "parentIndex": 31,
      "parentName": "mixamorig:LeftToeBase",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 31,
      "name": "mixamorig:LeftToeBase",
      "depth": 5,
      "parentIndex": 32,
      "parentName": "mixamorig:LeftFoot",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 32,
      "name": "mixamorig:LeftFoot",
      "depth": 4,
      "parentIndex": 33,
      "parentName": "mixamorig:LeftLeg",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 33,
      "name": "mixamorig:LeftLeg",
      "depth": 3,
      "parentIndex": 34,
      "parentName": "mixamorig:LeftUpLeg",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 34,
      "name": "mixamorig:LeftUpLeg",
      "depth": 2,
      "parentIndex": 40,
      "parentName": "mixamorig:Hips",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 35,
      "name": "mixamorig:RightToe_End",
      "depth": 6,
      "parentIndex": 36,
      "parentName": "mixamorig:RightToeBase",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 36,
      "name": "mixamorig:RightToeBase",
      "depth": 5,
      "parentIndex": 37,
      "parentName": "mixamorig:RightFoot",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 37,
      "name": "mixamorig:RightFoot",
      "depth": 4,
      "parentIndex": 38,
      "parentName": "mixamorig:RightLeg",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 38,
      "name": "mixamorig:RightLeg",
      "depth": 3,
      "parentIndex": 39,
      "parentName": "mixamorig:RightUpLeg",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 39,
      "name": "mixamorig:RightUpLeg",
      "depth": 2,
      "parentIndex": 40,
      "parentName": "mixamorig:Hips",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 40,
      "name": "mixamorig:Hips",
      "depth": 1,
      "parentIndex": 42,
      "parentName": "Armature",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    },
    {
      "index": 41,
      "name": "Player_Mixamo_Unrigged_Rest",
      "depth": 1,
      "parentIndex": 42,
      "parentName": "Armature",
      "hasMesh": true,
      "meshIndex": 0,
      "meshName": "Aphase1basebody_idle_Aphase1basebody.001",
      "bbox": {
        "min": [
          -34.60995101928711,
          -0.9482915997505188,
          -9.562601089477539
        ],
        "max": [
          34.61101150512695,
          68.64217376708984,
          9.56065845489502
        ],
        "size": [
          69.22096252441406,
          69.59046536684036,
          19.12325954437256
        ]
      },
      "skinIndex": 0
    },
    {
      "index": 42,
      "name": "Armature",
      "depth": 0,
      "parentIndex": null,
      "parentName": "ROOT",
      "hasMesh": false,
      "meshIndex": -1,
      "meshName": null,
      "bbox": null
    }
  ],
  "skins": [
    {
      "name": "Armature",
      "inverseBindMatrices": 12,
      "joints": [
        40,
        29,
        28,
        27,
        2,
        1,
        0,
        14,
        13,
        12,
        11,
        6,
        5,
        4,
        3,
        10,
        9,
        8,
        7,
        26,
        25,
        24,
        23,
        18,
        17,
        16,
        15,
        22,
        21,
        20,
        19,
        34,
        33,
        32,
        31,
        30,
        39,
        38,
        37,
        36,
        35
      ]
    }
  ]
  },
  "humanoid-optimized.glb": {
    "label": "Humanoid Drone (exact saved F90 equipped pose)",
    "materialsCount": 4,
    "texturesCount": 12,
    "imagesCount": 12,
    "animations": [],
    "nodes": [
      {
        "index": 0,
        "name": "humanoid",
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
        "name": "Armature",
        "depth": 1,
        "parentIndex": 0,
        "parentName": "humanoid",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 2,
        "name": "mixamorig_Hips",
        "depth": 2,
        "parentIndex": 1,
        "parentName": "Armature",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 3,
        "name": "mixamorig_Spine",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "mixamorig_Hips",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 4,
        "name": "mixamorig_Spine1",
        "depth": 4,
        "parentIndex": 3,
        "parentName": "mixamorig_Spine",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 5,
        "name": "mixamorig_Spine2",
        "depth": 5,
        "parentIndex": 4,
        "parentName": "mixamorig_Spine1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 6,
        "name": "mixamorig_Neck",
        "depth": 6,
        "parentIndex": 5,
        "parentName": "mixamorig_Spine2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 7,
        "name": "mixamorig_Head",
        "depth": 7,
        "parentIndex": 6,
        "parentName": "mixamorig_Neck",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 8,
        "name": "mixamorig_LeftShoulder",
        "depth": 6,
        "parentIndex": 5,
        "parentName": "mixamorig_Spine2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 9,
        "name": "mixamorig_LeftArm",
        "depth": 7,
        "parentIndex": 8,
        "parentName": "mixamorig_LeftShoulder",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 10,
        "name": "mixamorig_LeftForeArm",
        "depth": 8,
        "parentIndex": 9,
        "parentName": "mixamorig_LeftArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 11,
        "name": "mixamorig_LeftHand",
        "depth": 9,
        "parentIndex": 10,
        "parentName": "mixamorig_LeftForeArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 12,
        "name": "mixamorig_LeftHandThumb1",
        "depth": 10,
        "parentIndex": 11,
        "parentName": "mixamorig_LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 13,
        "name": "mixamorig_LeftHandThumb2",
        "depth": 11,
        "parentIndex": 12,
        "parentName": "mixamorig_LeftHandThumb1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 14,
        "name": "mixamorig_LeftHandThumb3",
        "depth": 12,
        "parentIndex": 13,
        "parentName": "mixamorig_LeftHandThumb2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 15,
        "name": "mixamorig_LeftHandIndex1",
        "depth": 10,
        "parentIndex": 11,
        "parentName": "mixamorig_LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 16,
        "name": "mixamorig_LeftHandIndex2",
        "depth": 11,
        "parentIndex": 15,
        "parentName": "mixamorig_LeftHandIndex1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 17,
        "name": "mixamorig_LeftHandIndex3",
        "depth": 12,
        "parentIndex": 16,
        "parentName": "mixamorig_LeftHandIndex2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 18,
        "name": "mixamorig_LeftHandMiddle1",
        "depth": 10,
        "parentIndex": 11,
        "parentName": "mixamorig_LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 19,
        "name": "mixamorig_LeftHandMiddle2",
        "depth": 11,
        "parentIndex": 18,
        "parentName": "mixamorig_LeftHandMiddle1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 20,
        "name": "mixamorig_LeftHandMiddle3",
        "depth": 12,
        "parentIndex": 19,
        "parentName": "mixamorig_LeftHandMiddle2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 21,
        "name": "mixamorig_LeftHandRing1",
        "depth": 10,
        "parentIndex": 11,
        "parentName": "mixamorig_LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 22,
        "name": "mixamorig_LeftHandRing2",
        "depth": 11,
        "parentIndex": 21,
        "parentName": "mixamorig_LeftHandRing1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 23,
        "name": "mixamorig_LeftHandRing3",
        "depth": 12,
        "parentIndex": 22,
        "parentName": "mixamorig_LeftHandRing2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 24,
        "name": "mixamorig_LeftHandPinky1",
        "depth": 10,
        "parentIndex": 11,
        "parentName": "mixamorig_LeftHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 25,
        "name": "mixamorig_LeftHandPinky2",
        "depth": 11,
        "parentIndex": 24,
        "parentName": "mixamorig_LeftHandPinky1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 26,
        "name": "mixamorig_LeftHandPinky3",
        "depth": 12,
        "parentIndex": 25,
        "parentName": "mixamorig_LeftHandPinky2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 27,
        "name": "mixamorig_RightShoulder",
        "depth": 6,
        "parentIndex": 5,
        "parentName": "mixamorig_Spine2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 28,
        "name": "mixamorig_RightArm",
        "depth": 7,
        "parentIndex": 27,
        "parentName": "mixamorig_RightShoulder",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 29,
        "name": "mixamorig_RightForeArm",
        "depth": 8,
        "parentIndex": 28,
        "parentName": "mixamorig_RightArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 30,
        "name": "mixamorig_RightHand",
        "depth": 9,
        "parentIndex": 29,
        "parentName": "mixamorig_RightForeArm",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 31,
        "name": "mixamorig_RightHandThumb1",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 32,
        "name": "mixamorig_RightHandThumb2",
        "depth": 11,
        "parentIndex": 31,
        "parentName": "mixamorig_RightHandThumb1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 33,
        "name": "mixamorig_RightHandThumb3",
        "depth": 12,
        "parentIndex": 32,
        "parentName": "mixamorig_RightHandThumb2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 34,
        "name": "mixamorig_RightHandIndex1",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 35,
        "name": "mixamorig_RightHandIndex2",
        "depth": 11,
        "parentIndex": 34,
        "parentName": "mixamorig_RightHandIndex1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 36,
        "name": "mixamorig_RightHandIndex3",
        "depth": 12,
        "parentIndex": 35,
        "parentName": "mixamorig_RightHandIndex2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 37,
        "name": "mixamorig_RightHandMiddle1",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 38,
        "name": "mixamorig_RightHandMiddle2",
        "depth": 11,
        "parentIndex": 37,
        "parentName": "mixamorig_RightHandMiddle1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 39,
        "name": "mixamorig_RightHandMiddle3",
        "depth": 12,
        "parentIndex": 38,
        "parentName": "mixamorig_RightHandMiddle2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 40,
        "name": "mixamorig_RightHandRing1",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 41,
        "name": "mixamorig_RightHandRing2",
        "depth": 11,
        "parentIndex": 40,
        "parentName": "mixamorig_RightHandRing1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 42,
        "name": "mixamorig_RightHandRing3",
        "depth": 12,
        "parentIndex": 41,
        "parentName": "mixamorig_RightHandRing2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 43,
        "name": "mixamorig_RightHandPinky1",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 44,
        "name": "mixamorig_RightHandPinky2",
        "depth": 11,
        "parentIndex": 43,
        "parentName": "mixamorig_RightHandPinky1",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 45,
        "name": "mixamorig_RightHandPinky3",
        "depth": 12,
        "parentIndex": 44,
        "parentName": "mixamorig_RightHandPinky2",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 46,
        "name": "mixamorig_LeftUpLeg",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "mixamorig_Hips",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 47,
        "name": "mixamorig_LeftLeg",
        "depth": 4,
        "parentIndex": 46,
        "parentName": "mixamorig_LeftUpLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 48,
        "name": "mixamorig_LeftFoot",
        "depth": 5,
        "parentIndex": 47,
        "parentName": "mixamorig_LeftLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 49,
        "name": "mixamorig_LeftToeBase",
        "depth": 6,
        "parentIndex": 48,
        "parentName": "mixamorig_LeftFoot",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 50,
        "name": "mixamorig_RightUpLeg",
        "depth": 3,
        "parentIndex": 2,
        "parentName": "mixamorig_Hips",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 51,
        "name": "mixamorig_RightLeg",
        "depth": 4,
        "parentIndex": 50,
        "parentName": "mixamorig_RightUpLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 52,
        "name": "mixamorig_RightFoot",
        "depth": 5,
        "parentIndex": 51,
        "parentName": "mixamorig_RightLeg",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 53,
        "name": "mixamorig_RightToeBase",
        "depth": 6,
        "parentIndex": 52,
        "parentName": "mixamorig_RightFoot",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
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
          "min": [
            -0.9997674226760864,
            -1.1612815856933594,
            -0.20503760874271393
          ],
          "max": [
            0.9998247027397156,
            0.8722943067550659,
            0.23432959616184235
          ],
          "size": [
            1.999592125415802,
            2.0335758924484253,
            0.4393672049045563
          ]
        },
        "skinIndex": 0
      },
      {
        "index": 55,
        "name": "f90",
        "depth": 10,
        "parentIndex": 30,
        "parentName": "mixamorig_RightHand",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 56,
        "name": "SK_Rif_F90",
        "depth": 11,
        "parentIndex": 55,
        "parentName": "f90",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 57,
        "name": "Object_305",
        "depth": 12,
        "parentIndex": 56,
        "parentName": "SK_Rif_F90",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 58,
        "name": "_rootJoint",
        "depth": 13,
        "parentIndex": 57,
        "parentName": "Object_305",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 59,
        "name": "J_Gun_0151",
        "depth": 14,
        "parentIndex": 58,
        "parentName": "_rootJoint",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 60,
        "name": "tag_mag_01_0152",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 61,
        "name": "tag_mag_01_bullets_0153",
        "depth": 16,
        "parentIndex": 60,
        "parentName": "tag_mag_01_0152",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 62,
        "name": "tag_mag_01_bullets_Socket_0154",
        "depth": 17,
        "parentIndex": 61,
        "parentName": "tag_mag_01_bullets_0153",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 63,
        "name": "tag_mag_01_bullets_Socket_end_0373",
        "depth": 18,
        "parentIndex": 62,
        "parentName": "tag_mag_01_bullets_Socket_0154",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 64,
        "name": "tag_mag_01_Socket_0155",
        "depth": 16,
        "parentIndex": 60,
        "parentName": "tag_mag_01_0152",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 65,
        "name": "tag_mag_01_Socket_end_0374",
        "depth": 17,
        "parentIndex": 64,
        "parentName": "tag_mag_01_Socket_0155",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 66,
        "name": "tag_mag_02_0156",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 67,
        "name": "tag_mag_02_bullets_0157",
        "depth": 16,
        "parentIndex": 66,
        "parentName": "tag_mag_02_0156",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 68,
        "name": "tag_mag_02_bullets_Socket_0158",
        "depth": 17,
        "parentIndex": 67,
        "parentName": "tag_mag_02_bullets_0157",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 69,
        "name": "tag_mag_02_bullets_Socket_end_0375",
        "depth": 18,
        "parentIndex": 68,
        "parentName": "tag_mag_02_bullets_Socket_0158",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 70,
        "name": "tag_mag_02_Socket_0159",
        "depth": 16,
        "parentIndex": 66,
        "parentName": "tag_mag_02_0156",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 71,
        "name": "tag_mag_02_Socket_end_0376",
        "depth": 17,
        "parentIndex": 70,
        "parentName": "tag_mag_02_Socket_0159",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 72,
        "name": "tag_brass_0160",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 73,
        "name": "tag_brass_end_0377",
        "depth": 16,
        "parentIndex": 72,
        "parentName": "tag_brass_0160",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 74,
        "name": "tag_bolt_0161",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 75,
        "name": "tag_bolt_end_0378",
        "depth": 16,
        "parentIndex": 74,
        "parentName": "tag_bolt_0161",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 76,
        "name": "tag_charginghandle_0162",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 77,
        "name": "tag_charginghandle_end_0379",
        "depth": 16,
        "parentIndex": 76,
        "parentName": "tag_charginghandle_0162",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 78,
        "name": "tag_boltcatch_0163",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 79,
        "name": "tag_boltcatch_end_0380",
        "depth": 16,
        "parentIndex": 78,
        "parentName": "tag_boltcatch_0163",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 80,
        "name": "tag_sight_0164",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 81,
        "name": "tag_sight_rear_0165",
        "depth": 16,
        "parentIndex": 80,
        "parentName": "tag_sight_0164",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 82,
        "name": "tag_sight_rear_flip_0166",
        "depth": 17,
        "parentIndex": 81,
        "parentName": "tag_sight_rear_0165",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 83,
        "name": "tag_sight_rear_flip_end_0381",
        "depth": 18,
        "parentIndex": 82,
        "parentName": "tag_sight_rear_flip_0166",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 84,
        "name": "tag_sight_front_0167",
        "depth": 16,
        "parentIndex": 80,
        "parentName": "tag_sight_0164",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 85,
        "name": "tag_sight_front_flip_0168",
        "depth": 17,
        "parentIndex": 84,
        "parentName": "tag_sight_front_0167",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 86,
        "name": "tag_sight_front_flip_end_0382",
        "depth": 18,
        "parentIndex": 85,
        "parentName": "tag_sight_front_flip_0168",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 87,
        "name": "tag_shroud_0149",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 88,
        "name": "tag_barrel_1_0170",
        "depth": 16,
        "parentIndex": 87,
        "parentName": "tag_shroud_0149",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 89,
        "name": "tag_barrel_2_0171",
        "depth": 17,
        "parentIndex": 88,
        "parentName": "tag_barrel_1_0170",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 90,
        "name": "tag_muzzle_0172",
        "depth": 18,
        "parentIndex": 89,
        "parentName": "tag_barrel_2_0171",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 91,
        "name": "tag_muzzle_end_0383",
        "depth": 19,
        "parentIndex": 90,
        "parentName": "tag_muzzle_0172",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 92,
        "name": "tag_trigger_0173",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 93,
        "name": "tag_fireselector_0174",
        "depth": 16,
        "parentIndex": 92,
        "parentName": "tag_trigger_0173",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 94,
        "name": "tag_fireselector_end_0384",
        "depth": 17,
        "parentIndex": 93,
        "parentName": "tag_fireselector_0174",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 95,
        "name": "tag_mag_release_0175",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 96,
        "name": "tag_mag_release_end_0385",
        "depth": 16,
        "parentIndex": 95,
        "parentName": "tag_mag_release_0175",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 97,
        "name": "tag_mag_release_2_0176",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 98,
        "name": "tag_mag_release_2_end_0386",
        "depth": 16,
        "parentIndex": 97,
        "parentName": "tag_mag_release_2_0176",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 99,
        "name": "Reflex_Socket_0177",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 100,
        "name": "Reflex_Socket_end_0387",
        "depth": 16,
        "parentIndex": 99,
        "parentName": "Reflex_Socket_0177",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 101,
        "name": "EXPS3_socket_0178",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 102,
        "name": "EXPS3_socket_end_0388",
        "depth": 16,
        "parentIndex": 101,
        "parentName": "EXPS3_socket_0178",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 103,
        "name": "MicroT2Raised_Socket_0179",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 104,
        "name": "MicroT2Raised_Socket_end_0369",
        "depth": 16,
        "parentIndex": 103,
        "parentName": "MicroT2Raised_Socket_0179",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 105,
        "name": "M5B_Socket_0180",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 106,
        "name": "M5B_Socket_end_0390",
        "depth": 16,
        "parentIndex": 105,
        "parentName": "M5B_Socket_0180",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 107,
        "name": "sdr_Socket_0181",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 108,
        "name": "sdr_Socket_end_0391",
        "depth": 16,
        "parentIndex": 107,
        "parentName": "sdr_Socket_0181",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 109,
        "name": "atac_Socket_0182",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 110,
        "name": "atac_Socket_end_0392",
        "depth": 16,
        "parentIndex": 109,
        "parentName": "atac_Socket_0182",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 111,
        "name": "foregrip_socket_0183",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 112,
        "name": "foregrip_socket_end_0393",
        "depth": 16,
        "parentIndex": 111,
        "parentName": "foregrip_socket_0183",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 113,
        "name": "combat_grip_0184",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 114,
        "name": "combat_grip_end_0394",
        "depth": 16,
        "parentIndex": 113,
        "parentName": "combat_grip_0184",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 115,
        "name": "socom338_socket_0185",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 116,
        "name": "socom338_socket_end_0395",
        "depth": 16,
        "parentIndex": 115,
        "parentName": "socom338_socket_0185",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 117,
        "name": "sfmb_socket_0186",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 118,
        "name": "sfmb_socket_end_0396",
        "depth": 16,
        "parentIndex": 117,
        "parentName": "sfmb_socket_0186",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 119,
        "name": "asr_socket_0187",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 120,
        "name": "asr_socket_end_0397",
        "depth": 16,
        "parentIndex": 119,
        "parentName": "asr_socket_0187",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 121,
        "name": "mault_socket_0188",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 122,
        "name": "mault_socket_end_0398",
        "depth": 16,
        "parentIndex": 121,
        "parentName": "mault_socket_0188",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 123,
        "name": "light_3_socket_0169",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 124,
        "name": "light_3_socket_end_0399",
        "depth": 16,
        "parentIndex": 123,
        "parentName": "light_3_socket_0169",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 125,
        "name": "laser_socket_0190",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 126,
        "name": "laser_socket_end_0400",
        "depth": 16,
        "parentIndex": 125,
        "parentName": "laser_socket_0190",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 127,
        "name": "pointer_socket_0191",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 128,
        "name": "pointer_socket_end_0401",
        "depth": 16,
        "parentIndex": 127,
        "parentName": "pointer_socket_0191",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 129,
        "name": "rk1_socket_0192",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 130,
        "name": "rk1_socket_end_0402",
        "depth": 16,
        "parentIndex": 129,
        "parentName": "rk1_socket_0192",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 131,
        "name": "HS510C_socket_0193",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 132,
        "name": "HS510C_socket_end_0403",
        "depth": 16,
        "parentIndex": 131,
        "parentName": "HS510C_socket_0193",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 133,
        "name": "Bossxe_socket_0194",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 134,
        "name": "Bossxe_socket_end_0404",
        "depth": 16,
        "parentIndex": 133,
        "parentName": "Bossxe_socket_0194",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 135,
        "name": "mrohd_socket_0195",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 136,
        "name": "mrohd_socket_end_0405",
        "depth": 16,
        "parentIndex": 135,
        "parentName": "mrohd_socket_0195",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 137,
        "name": "peak_socket_0196",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 138,
        "name": "peak_socket_end_0406",
        "depth": 16,
        "parentIndex": 137,
        "parentName": "peak_socket_0196",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 139,
        "name": "45degree_socket_0197",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 140,
        "name": "45degree_socket_end_0407",
        "depth": 16,
        "parentIndex": 139,
        "parentName": "45degree_socket_0197",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 141,
        "name": "light_wml_socket_0198",
        "depth": 15,
        "parentIndex": 59,
        "parentName": "J_Gun_0151",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 142,
        "name": "light_wml_socket_end_0408",
        "depth": 16,
        "parentIndex": 141,
        "parentName": "light_wml_socket_0198",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 143,
        "name": "Object_392",
        "depth": 13,
        "parentIndex": 57,
        "parentName": "Object_305",
        "hasMesh": true,
        "meshIndex": 1,
        "meshName": "Sketchfab_Scene_SK_Rif_F90_001_F90_MI_0",
        "bbox": {
          "min": [
            -4.170221328735352,
            -1.2483859062194824,
            -128.45327758789062
          ],
          "max": [
            13.939324378967285,
            5.797146797180176,
            -56.21105194091797
          ],
          "size": [
            18.109545707702637,
            7.045532703399658,
            72.24222564697266
          ]
        },
        "skinIndex": 1
      },
      {
        "index": 144,
        "name": "Object_393",
        "depth": 13,
        "parentIndex": 57,
        "parentName": "Object_305",
        "hasMesh": true,
        "meshIndex": 2,
        "meshName": "Sketchfab_Scene_SK_Rif_F90_001_F90_Sights_MI_0",
        "bbox": {
          "min": [
            -8.275442123413086,
            0.38817596435546875,
            -104.52784729003906
          ],
          "max": [
            -3.619201421737671,
            3.956744909286499,
            -73.75106811523438
          ],
          "size": [
            4.656240701675415,
            3.5685689449310303,
            30.776779174804688
          ]
        },
        "skinIndex": 1
      },
      {
        "index": 145,
        "name": "Object_391",
        "depth": 13,
        "parentIndex": 57,
        "parentName": "Object_305",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 146,
        "name": "F90_Mag_Static",
        "depth": 12,
        "parentIndex": 56,
        "parentName": "SK_Rif_F90",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 147,
        "name": "F90_Mag_Static_001",
        "depth": 13,
        "parentIndex": 146,
        "parentName": "F90_Mag_Static",
        "hasMesh": false,
        "meshIndex": -1,
        "meshName": null,
        "bbox": null
      },
      {
        "index": 148,
        "name": "F90_Mag_Static_001_F90_MAG_MI_0",
        "depth": 14,
        "parentIndex": 147,
        "parentName": "F90_Mag_Static_001",
        "hasMesh": true,
        "meshIndex": 3,
        "meshName": "Sketchfab_Scene_F90_Mag_Static_001_F90_MAG_MI_0",
        "bbox": {
          "min": [
            -1.2764484882354736,
            -5.524354934692383,
            -15.310718536376953
          ],
          "max": [
            1.3227689266204834,
            2.9604787826538086,
            4.623813629150391
          ],
          "size": [
            2.599217414855957,
            8.484833717346191,
            19.934532165527344
          ]
        }
      }
    ],
    "skins": [
      {
        "name": "Skin",
        "inverseBindMatrices": 29,
        "joints": [
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26,
          27,
          28,
          29,
          30,
          31,
          32,
          33,
          34,
          35,
          36,
          37,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          46,
          47,
          48,
          49,
          50,
          51,
          52,
          53
        ]
      },
      {
        "name": "Skin6",
        "inverseBindMatrices": 30,
        "joints": [
          58,
          59,
          60,
          61,
          62,
          63,
          64,
          65,
          66,
          67,
          68,
          69,
          70,
          71,
          72,
          73,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          82,
          83,
          84,
          85,
          86,
          87,
          88,
          89,
          90,
          91,
          92,
          93,
          94,
          95,
          96,
          97,
          98,
          99,
          100,
          101,
          102,
          103,
          104,
          105,
          106,
          107,
          108,
          109,
          110,
          111,
          112,
          113,
          114,
          115,
          116,
          117,
          118,
          119,
          120,
          121,
          122,
          123,
          124,
          125,
          126,
          127,
          128,
          129,
          130,
          131,
          132,
          133,
          134,
          135,
          136,
          137,
          138,
          139,
          140,
          141,
          142
        ]
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
