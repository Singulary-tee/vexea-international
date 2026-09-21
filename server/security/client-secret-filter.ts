/**
 * Client Secret Filter
 * Single responsibility: reduce a Doppler secret bundle to the keys that are
 * safe to hand to a browser. Only `VITE_`-prefixed keys are build-time public;
 * every other key (service accounts, raw DSNs, API tokens) is server-only.
 */

export const CLIENT_SECRET_PREFIX = "VITE_";

export function isClientSafeSecretKey(key: string): boolean {
  return key.startsWith(CLIENT_SECRET_PREFIX);
}

export function filterClientSecrets(
  secrets: Record<string, unknown> | null | undefined
): Record<string, string> {
  const safe: Record<string, string> = {};
  if (!secrets || typeof secrets !== "object") return safe;

  for (const [key, value] of Object.entries(secrets)) {
    if (!isClientSafeSecretKey(key)) continue;
    if (value === null || value === undefined) continue;
    safe[key] = String(value);
  }

  return safe;
}
