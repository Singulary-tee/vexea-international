/**
 * Client Log Sanitizer
 * Single responsibility: coerce and bound forwarded client log payloads before
 * they reach the shared in-memory log buffer.
 */

export const MAX_LOG_ENTRIES = 16;
export const MAX_LOG_LENGTH = 512;

export function sanitizeClientLog(payload: unknown): string {
  const parts = Array.isArray(payload) ? payload : [payload];

  return parts
    .slice(0, MAX_LOG_ENTRIES)
    .map((part) => {
      const text = typeof part === "string" ? part : safeStringify(part);
      return text.slice(0, MAX_LOG_LENGTH);
    })
    .join(" ");
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return "[unserializable]";
  }
}
