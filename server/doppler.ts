import { initSentry } from "./sentry";

/**
 * Doppler Integration for Production Secrets Management (Server).
 * Automatically fetches secrets (including FIREBASE_SERVICE_ACCOUNT and SENTRY_DSN)
 * from Doppler's REST API if DOPPLER_TOKEN is configured.
 */

export async function loadDopplerSecrets(): Promise<void> {
  const token = process.env.DOPPLER_TOKEN;
  if (!token) {
    return;
  }

  try {
    console.log("[Doppler Server] Fetching production secrets (FIREBASE_SERVICE_ACCOUNT, SENTRY_DSN, etc.) from Doppler API...");
    const response = await fetch(
      "https://api.doppler.com/v3/configs/config/secrets/download?format=json",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Vexea-Server/1.0",
        },
      }
    );

    if (!response.ok) {
      console.error(
        `[Doppler Server] Failed to fetch secrets from Doppler: ${response.status} ${response.statusText}`
      );
      return;
    }

    const secrets = (await response.json()) as Record<string, string>;
    let loadedCount = 0;
    for (const [key, value] of Object.entries(secrets)) {
      if (typeof value === "string") {
        process.env[key] = value;
        loadedCount++;
      }
    }
    console.log(
      `[Doppler Server] Successfully injected ${loadedCount} secrets from Doppler into process.env.`
    );

    // Initialize Sentry if SENTRY_DSN was retrieved from Doppler
    if (process.env.SENTRY_DSN) {
      initSentry();
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("[Doppler Server] FIREBASE_SERVICE_ACCOUNT secret is available in process.env.");
    }
  } catch (err) {
    console.error("[Doppler Server] Exception while loading Doppler secrets:", err);
  }
}

export function getFirebaseServiceAccount(): string | undefined {
  return process.env.FIREBASE_SERVICE_ACCOUNT;
}

