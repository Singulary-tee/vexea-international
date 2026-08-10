import { DroneType } from "../../shared/constants";

export type Posture = "ASSAULT" | "SUPPRESS" | "FLANK" | "HOLD" | "RECON" | "RETREAT" | "HARASS";

// Which postures each drone type can execute
export const POSTURE_ALLOWLIST: Record<DroneType, Posture[]> = {
  [DroneType.RECON]: ["RECON", "RETREAT"],
  [DroneType.ROTARY_SHOOTER]: ["SUPPRESS", "HARASS", "RETREAT"],
  [DroneType.BOMBER]: [], // Bomber has hardcoded kamikaze behavior, no postures
  [DroneType.FIXED_WING]: [], // Fixed Wing has hardcoded strafe run, no postures
  [DroneType.WHEELED]: ["ASSAULT", "SUPPRESS", "FLANK", "HOLD", "RETREAT"],
  [DroneType.ROBOT_DOG]: ["ASSAULT", "HOLD", "RECON", "RETREAT"],
  [DroneType.HUMANOID]: ["ASSAULT", "SUPPRESS", "FLANK", "HOLD", "RETREAT"],
  [DroneType.TEST_ENTITY]: [],
};

export class GroupTacticalState {
  private groupPostures: Map<string, Posture> = new Map();

  public setPosture(groupId: string, posture: Posture): boolean {
    this.groupPostures.set(groupId, posture);
    return true;
  }

  public getPosture(groupId: string): Posture | null {
    return this.groupPostures.get(groupId) || null;
  }

  public clear(): void {
    this.groupPostures.clear();
  }

  public isPostureValidForDrone(droneType: DroneType, posture: Posture): boolean {
    const allowlist = POSTURE_ALLOWLIST[droneType];
    return allowlist ? allowlist.includes(posture) : false;
  }
}
