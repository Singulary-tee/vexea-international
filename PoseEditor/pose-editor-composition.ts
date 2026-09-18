import type { PoseEditorItemCategory } from "./pose-editor-config";
import { PLAYER_BODY_FORWARD } from "../client/src/systems/player-visual-calibration";

export const FIRST_PERSON_BODY_FORWARD = PLAYER_BODY_FORWARD;

/** Match the runtime solver's authored aim basis without sampling weapon geometry. */
export function aimDirectionFromBodyForward(bodyForward: Direction3, pitch = 0): Direction3 {
  const length = Math.hypot(bodyForward.x, bodyForward.y, bodyForward.z);
  if (!Number.isFinite(length) || length < 1e-8) return { ...FIRST_PERSON_BODY_FORWARD };
  const pitchOffset = Number.isFinite(pitch) ? Math.max(-0.5, Math.min(0.5, pitch)) : 0;
  const x = bodyForward.x / length;
  const y = bodyForward.y / length + pitchOffset;
  const z = bodyForward.z / length;
  const resultLength = Math.hypot(x, y, z);
  if (!Number.isFinite(resultLength) || resultLength < 1e-8) return { ...FIRST_PERSON_BODY_FORWARD };
  return { x: x / resultLength, y: y / resultLength, z: z / resultLength };
}

export interface Direction3 {
  x: number;
  y: number;
  z: number;
}

export interface DirectionPlan {
  direction: Direction3;
  length: number;
}

export function opticalAxisCorrection(
  current: Direction3,
  target: Direction3,
  axis: Direction3,
): Direction3 | null {
  const axisLength = Math.hypot(axis.x, axis.y, axis.z);
  if (!Number.isFinite(axisLength) || axisLength < 1e-8) return null;
  const unit = { x: axis.x / axisLength, y: axis.y / axisLength, z: axis.z / axisLength };
  const distance = (target.x - current.x) * unit.x
    + (target.y - current.y) * unit.y
    + (target.z - current.z) * unit.z;
  return { x: unit.x * distance, y: unit.y * distance, z: unit.z * distance };
}

export interface BarrelDirectionChoice {
  direction: Direction3;
  source: "authored" | "measured";
  agreement: number;
}

const MAX_MEASURED_AXIS_DISAGREEMENT = Math.PI / 3;

/** Treat the endpoint as the rear marker and point toward the business end. */
export function directionFromEndpoint(muzzle: Direction3, endpoint: Direction3): DirectionPlan | null {
  const x = muzzle.x - endpoint.x;
  const y = muzzle.y - endpoint.y;
  const z = muzzle.z - endpoint.z;
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length < 1e-8) return null;
  return { direction: { x: x / length, y: y / length, z: z / length }, length };
}

export function directionAlignmentAngle(source: Direction3, target: Direction3): number {
  const sourceLength = Math.hypot(source.x, source.y, source.z);
  const targetLength = Math.hypot(target.x, target.y, target.z);
  if (!Number.isFinite(sourceLength) || !Number.isFinite(targetLength) || sourceLength < 1e-8 || targetLength < 1e-8) {
    return Math.PI;
  }
  const dot = (source.x * target.x + source.y * target.y + source.z * target.z) / (sourceLength * targetLength);
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

export function chooseBarrelDirection(authored: Direction3, measured: Direction3): BarrelDirectionChoice {
  const authoredLength = Math.hypot(authored.x, authored.y, authored.z);
  const measuredLength = Math.hypot(measured.x, measured.y, measured.z);
  const authoredDirection = authoredLength >= 1e-8 && Number.isFinite(authoredLength)
    ? { x: authored.x / authoredLength, y: authored.y / authoredLength, z: authored.z / authoredLength }
    : { x: 0, y: 0, z: 1 };
  if (!Number.isFinite(measuredLength) || measuredLength < 1e-8) {
    return { direction: authoredDirection, source: "authored", agreement: 0 };
  }
  const agreement = directionAlignmentAngle(authoredDirection, measured);
  if (agreement > MAX_MEASURED_AXIS_DISAGREEMENT) {
    return { direction: authoredDirection, source: "authored", agreement };
  }
  return {
    direction: { x: measured.x / measuredLength, y: measured.y / measuredLength, z: measured.z / measuredLength },
    source: "measured",
    agreement,
  };
}

export interface FirstPersonFitPlan {
  scale: number;
  playerWidth: number;
  itemWidth: number;
  targetWidth: number;
}

export interface FirstPersonDepthPlan {
  shift: number;
  targetDepth: number;
}

export interface FirstPersonCompositionInput {
  bilateralArmChain: boolean;
  handSeparationFraction: number;
  leftHandVisible: boolean;
  rightHandVisible: boolean;
  bodyVisible: boolean;
  bodyWidthFraction: number;
  bodyHeightFraction: number;
  contentVisible: boolean;
  contentWidthFraction: number;
  contentHeightFraction: number;
  itemVisible: boolean;
  itemWidthFraction: number;
  itemHeightFraction: number;
  minDepth: number;
  depthShift: number;
  naturalFirstPersonCropping?: boolean;
  requiresItemOrientation?: boolean;
  itemOrientationAlignment?: number | null;
  requiresBarrelAlignment?: boolean;
  barrelCameraAlignment: number | null;
  barrelAxisAgreement: number;
}

export interface FirstPersonCompositionResult {
  accepted: boolean;
  reason: string;
}

export interface PoseEditorReadinessInput {
  solverVerified: boolean;
  compositionAccepted: boolean;
  contextLost: boolean;
  durableFrame: boolean;
  canvasContent: boolean;
}

export interface PoseEditorReadinessResult {
  accepted: boolean;
  reason: string;
}

export const POSE_EDITOR_CLEAR_COLOR = [8, 13, 20] as const;
export const POSE_EDITOR_MIN_CONTENT_FRACTION = 0.01;
export const POSE_EDITOR_MIN_CHANNEL_RANGE = 16;

export function hasRenderedPixelContent(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  clearColor: readonly [number, number, number] = POSE_EDITOR_CLEAR_COLOR,
): boolean {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return false;
  if (pixels.length < width * height * 4) return false;

  const cornerIndices = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + width - 1) * 4,
  ];
  const cornerAverage = cornerIndices.reduce(
    (sum, index) => ({
      r: sum.r + pixels[index],
      g: sum.g + pixels[index + 1],
      b: sum.b + pixels[index + 2],
    }),
    { r: 0, g: 0, b: 0 },
  );
  cornerAverage.r /= cornerIndices.length;
  cornerAverage.g /= cornerIndices.length;
  cornerAverage.b /= cornerIndices.length;
  const clearDistance = Math.max(
    Math.abs(cornerAverage.r - clearColor[0]),
    Math.abs(cornerAverage.g - clearColor[1]),
    Math.abs(cornerAverage.b - clearColor[2]),
  );
  const reference = clearDistance <= 4
    ? { r: clearColor[0], g: clearColor[1], b: clearColor[2] }
    : cornerAverage;
  let differentPixels = 0;
  let minChannel = 255;
  let maxChannel = 0;
  for (let index = 0; index < width * height * 4; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    minChannel = Math.min(minChannel, red, green, blue);
    maxChannel = Math.max(maxChannel, red, green, blue);
    if (Math.max(
      Math.abs(red - reference.r),
      Math.abs(green - reference.g),
      Math.abs(blue - reference.b),
    ) > 8) differentPixels += 1;
  }
  return differentPixels / (width * height) >= POSE_EDITOR_MIN_CONTENT_FRACTION
    && maxChannel - minChannel >= POSE_EDITOR_MIN_CHANNEL_RANGE;
}

export function evaluatePoseEditorReadiness(
  input: PoseEditorReadinessInput,
): PoseEditorReadinessResult {
  if (!input.solverVerified) return { accepted: false, reason: "pose solver rejected" };
  if (!input.compositionAccepted) return { accepted: false, reason: "first-person composition rejected" };
  if (input.contextLost) return { accepted: false, reason: "renderer context lost" };
  if (!input.durableFrame) return { accepted: false, reason: "durable rendered frame unavailable" };
  if (!input.canvasContent) return { accepted: false, reason: "rendered canvas content unavailable" };
  return { accepted: true, reason: "solver, composition, and rendered frame verified" };
}

export const FIRST_PERSON_MAX_DEPTH_SHIFT = 1.2;
export const FIRST_PERSON_MAX_BARREL_ALIGNMENT = 0.08;
export const FIRST_PERSON_MAX_AXIS_AGREEMENT = Math.PI / 3;
export const FIRST_PERSON_MIN_CONTENT_FRACTION = 0.05;
export const FIRST_PERSON_MIN_ITEM_FRACTION = 0.02;
export const FIRST_PERSON_MAX_ITEM_ORIENTATION = 0.35;
export const FIRST_PERSON_MIN_HAND_SEPARATION = 0.03;

export function evaluateFirstPersonComposition(
  input: FirstPersonCompositionInput,
  maxWidthFraction = 0.72,
  maxHeightFraction = 0.68,
  minDepth = 0.08,
): FirstPersonCompositionResult {
  if (!input.bilateralArmChain) return { accepted: false, reason: "bilateral arm bone chain unavailable" };
  if (!Number.isFinite(input.handSeparationFraction)
    || input.handSeparationFraction < FIRST_PERSON_MIN_HAND_SEPARATION) {
    return { accepted: false, reason: "bilateral hands are not screen-readable" };
  }
  if (!input.leftHandVisible) return { accepted: false, reason: "left hand is not screen-readable" };
  if (!input.rightHandVisible) return { accepted: false, reason: "right hand is not screen-readable" };
  if (!input.bodyVisible) return { accepted: false, reason: "complete player body not visible" };
  if (!Number.isFinite(input.bodyWidthFraction)
    || !Number.isFinite(input.bodyHeightFraction)
    || input.bodyWidthFraction < FIRST_PERSON_MIN_CONTENT_FRACTION
    || input.bodyHeightFraction < FIRST_PERSON_MIN_CONTENT_FRACTION) {
    return { accepted: false, reason: "complete player body below minimum size" };
  }
  if (!input.contentVisible) return { accepted: false, reason: "first-person content not visible" };
  if (!Number.isFinite(input.contentWidthFraction)
    || !Number.isFinite(input.contentHeightFraction)
    || input.contentWidthFraction < FIRST_PERSON_MIN_CONTENT_FRACTION
    || input.contentHeightFraction < FIRST_PERSON_MIN_CONTENT_FRACTION) {
    return { accepted: false, reason: "first-person content below minimum size" };
  }
  if (!input.itemVisible) return { accepted: false, reason: "held item not visible" };
  if (!Number.isFinite(input.itemWidthFraction)
    || !Number.isFinite(input.itemHeightFraction)
    || input.itemWidthFraction < FIRST_PERSON_MIN_ITEM_FRACTION
    || input.itemHeightFraction < FIRST_PERSON_MIN_ITEM_FRACTION) {
    return { accepted: false, reason: "held item below minimum size" };
  }
  if (!Number.isFinite(input.minDepth) || input.minDepth < minDepth) {
    return { accepted: false, reason: "first-person content crosses near plane" };
  }
  if (!Number.isFinite(input.depthShift) || input.depthShift > FIRST_PERSON_MAX_DEPTH_SHIFT) {
    return { accepted: false, reason: "first-person depth search exceeded bound" };
  }
  if (!input.naturalFirstPersonCropping
    && (input.contentWidthFraction > maxWidthFraction || input.contentHeightFraction > maxHeightFraction)) {
    return { accepted: false, reason: "first-person content exceeds view bounds" };
  }
  if (input.requiresItemOrientation
    && (input.itemOrientationAlignment === null
      || input.itemOrientationAlignment === undefined
      || !Number.isFinite(input.itemOrientationAlignment)
      || input.itemOrientationAlignment > FIRST_PERSON_MAX_ITEM_ORIENTATION)) {
    return { accepted: false, reason: "held item orientation is not authored" };
  }
  if (input.requiresBarrelAlignment
    && (input.barrelCameraAlignment === null
      || !Number.isFinite(input.barrelCameraAlignment)
      || input.barrelCameraAlignment > FIRST_PERSON_MAX_BARREL_ALIGNMENT)) {
    return { accepted: false, reason: "measured barrel is not camera-forward" };
  }
  if (input.requiresBarrelAlignment
    && (!Number.isFinite(input.barrelAxisAgreement) || input.barrelAxisAgreement > FIRST_PERSON_MAX_AXIS_AGREEMENT)) {
    return { accepted: false, reason: "authored and measured barrel axes conflict" };
  }
  return { accepted: true, reason: "bilateral content and authored fit verified" };
}

/** Keep the solved grip pose intact while matching the item to measured shoulder width. */
export function planFirstPersonFit(
  category: PoseEditorItemCategory,
  playerWidth: number,
  itemWidth: number,
): FirstPersonFitPlan {
  if (!Number.isFinite(playerWidth) || playerWidth <= 0 || !Number.isFinite(itemWidth) || itemWidth <= 0) {
    return { scale: 1, playerWidth, itemWidth, targetWidth: itemWidth };
  }

  const targetWidth = category === "weapon"
    ? playerWidth
    : Math.min(itemWidth, playerWidth * 0.55);
  return {
    scale: Math.min(1, targetWidth / itemWidth),
    playerWidth,
    itemWidth,
    targetWidth,
  };
}

export function planFirstPersonContentScale(
  baseScale: number,
  projectedWidthFraction: number,
  projectedHeightFraction: number,
  maxWidthFraction = 0.72,
  maxHeightFraction = 0.68,
): number {
  const initialScale = Number.isFinite(baseScale) && baseScale > 0 ? Math.min(1, baseScale) : 1;
  let ratio = 1;
  if (Number.isFinite(projectedWidthFraction) && projectedWidthFraction > 0 && maxWidthFraction > 0) {
    ratio = Math.min(ratio, maxWidthFraction / projectedWidthFraction);
  }
  if (Number.isFinite(projectedHeightFraction) && projectedHeightFraction > 0 && maxHeightFraction > 0) {
    ratio = Math.min(ratio, maxHeightFraction / projectedHeightFraction);
  }
  return Math.min(1, initialScale * ratio);
}

/** Prefer moving a correctly scaled view model away from the eye over shrinking it. */
export function planFirstPersonDepth(
  currentDepth: number,
  projectedWidthFraction: number,
  projectedHeightFraction: number,
  maxWidthFraction = 0.58,
  maxHeightFraction = 0.5,
  minDepth = 0.08,
  maxShift = FIRST_PERSON_MAX_DEPTH_SHIFT,
): FirstPersonDepthPlan {
  if (!Number.isFinite(currentDepth) || currentDepth <= 0) return { shift: 0, targetDepth: currentDepth };

  const widthRatio = Number.isFinite(projectedWidthFraction) && maxWidthFraction > 0
    ? projectedWidthFraction / maxWidthFraction
    : 1;
  const heightRatio = Number.isFinite(projectedHeightFraction) && maxHeightFraction > 0
    ? projectedHeightFraction / maxHeightFraction
    : 1;
  const targetDepth = Math.max(minDepth, currentDepth * Math.max(1, widthRatio, heightRatio));
  const shift = Math.min(Math.max(0, maxShift), Math.max(0, targetDepth - currentDepth));
  return { shift, targetDepth: currentDepth + shift };
}
