/**
 * Ad Multiplier Clamp
 * Single responsibility: constrain post-match reward multipliers to the fixed
 * set the server grants on a verified `rewarded_ad` event. Client supplied
 * values are never applied verbatim.
 */

export const ALLOWED_AD_MULTIPLIERS: readonly number[] = [1, 2];

export function clampAdMultiplier(candidate: unknown): number {
  const value = typeof candidate === "number" ? candidate : Number(candidate);
  if (!Number.isFinite(value)) return 1;
  return ALLOWED_AD_MULTIPLIERS.includes(value) ? value : 1;
}
