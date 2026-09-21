/**
 * CORS Origin Allowlist
 * Single responsibility: resolve which client origin may be echoed back in
 * `Access-Control-Allow-Origin`. The server (smarterasp.net) reads the browser
 * supplied `Origin` header, so the allowlist enumerates *client* origins:
 * the Firebase Hosting domains in production, plus the AI Studio preview
 * (`*.run.app`) and localhost origins when running in dev.
 */

import { IS_DEV } from "../../shared/gates/production.gate";

export const PRODUCTION_CLIENT_ORIGINS: readonly string[] = [
  "https://vexea-e0a37.firebaseapp.com",
  "https://vexea-e0a37.web.app",
];

const DEV_LOCAL_HOSTNAMES: readonly string[] = ["localhost", "127.0.0.1"];

/**
 * Mirrors the AI Studio host detection used by `client/doppler.ts`.
 */
function isDevPreviewOrigin(origin: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

  const hostname = parsed.hostname.toLowerCase();
  return hostname.endsWith(".run.app") || DEV_LOCAL_HOSTNAMES.includes(hostname);
}

export function isAllowedClientOrigin(origin: string | undefined | null): boolean {
  if (!origin || typeof origin !== "string") return false;
  if (PRODUCTION_CLIENT_ORIGINS.includes(origin)) return true;
  return IS_DEV && isDevPreviewOrigin(origin);
}

/**
 * Returns the origin to echo back, or null when the request origin is not
 * allowlisted (in which case no CORS header must be sent at all).
 */
export function resolveAllowedOrigin(origin: string | undefined | null): string | null {
  return isAllowedClientOrigin(origin) ? (origin as string) : null;
}
