import { DroneType } from "../../../shared/constants";
import { rotaryShooterBehavior } from "./behaviors/RotaryShooterBehavior";
import { bomberBehavior } from "./behaviors/BomberBehavior";
import { reconBehavior } from "./behaviors/ReconBehavior";
import { fixedWingBehavior } from "./behaviors/FixedWingBehavior";
import { humanoidBehavior } from "./behaviors/HumanoidBehavior";
import { wheeledBehavior } from "./behaviors/WheeledBehavior";
import { robotDogBehavior } from "./behaviors/RobotDogBehavior";
import { BehaviorContext, BehaviorOutput } from "./types";

export type BehaviorFn = (drone: any, ctx: BehaviorContext, out: BehaviorOutput) => void;

export const BEHAVIORS: Partial<Record<DroneType, BehaviorFn>> = {
  [DroneType.ROTARY_SHOOTER]: rotaryShooterBehavior,
  [DroneType.BOMBER]: bomberBehavior,
  [DroneType.RECON]: reconBehavior,
  [DroneType.FIXED_WING]: fixedWingBehavior,
  [DroneType.WHEELED]: wheeledBehavior,
  [DroneType.ROBOT_DOG]: robotDogBehavior,
  [DroneType.HUMANOID]: humanoidBehavior,
};
