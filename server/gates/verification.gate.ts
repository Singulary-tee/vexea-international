/**
 * Server Gate — Verification & Game State Gate
 * Encapsulates server-authoritative purchase, reward, and match state verification checks.
 */

import { VerificationService } from "../verification/verification-service";

export class ServerVerificationGate {
  public static readonly Service = VerificationService;
}
