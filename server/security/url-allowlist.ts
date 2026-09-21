/**
 * Asset URL Allowlist
 * Single responsibility: decide whether an outbound proxy fetch target is the
 * known asset CDN. Blocks SSRF against internal/metadata hosts by requiring an
 * exact host match over https.
 */

export const ASSET_CDN_HOSTS: readonly string[] = [
  "vexea-r2-asset-guard.alte.workers.dev",
];

export function isAllowedAssetUrl(rawUrl: string | undefined | null): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (parsed.port && parsed.port !== "443") return false;

  return ASSET_CDN_HOSTS.includes(parsed.hostname.toLowerCase());
}
