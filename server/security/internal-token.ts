/**
 * Internal Service Token
 * Single responsibility: authenticate process-local, server-to-server calls
 * (e.g. `NetworkBroadcaster` posting match rewards over loopback) without
 * exposing a browser-usable credential. The token is generated once per boot
 * and inherited by forked room workers through the environment.
 */

import { randomBytes, timingSafeEqual } from "crypto";

export const INTERNAL_SERVICE_TOKEN_HEADER = "x-vexea-internal-token";

const TOKEN_ENV_KEY = "INTERNAL_SERVICE_TOKEN";

export function getInternalServiceToken(): string {
  let token = process.env[TOKEN_ENV_KEY];
  if (!token) {
    token = randomBytes(32).toString("hex");
    process.env[TOKEN_ENV_KEY] = token;
  }
  return token;
}

export function isInternalServiceToken(candidate: string | undefined | null): boolean {
  if (!candidate) return false;
  const expected = Buffer.from(getInternalServiceToken());
  const provided = Buffer.from(candidate);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
