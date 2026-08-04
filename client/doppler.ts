import { initClientSentry } from "./sentry";

/**
 * Client-Side Doppler Integration for Production Secrets Management.
 * Fetches client-scoped secrets (including VITE_SENTRY_DSN and VITE_SERVER_URL)
 * from Doppler REST API using VITE_DOPPLER_TOKEN.
 */

export interface ClientDopplerSecrets {
  [key: string]: string;
}

let clientSecrets: ClientDopplerSecrets = {};

export async function loadClientDopplerSecrets(): Promise<ClientDopplerSecrets> {
  const token =
    (import.meta as any).env?.VITE_DOPPLER_TOKEN ||
    (typeof process !== "undefined" ? (process.env as any)?.VITE_DOPPLER_TOKEN : undefined);

  if (!token) {
    return clientSecrets;
  }

  try {
    console.log("[Doppler Client] Fetching client secrets (VITE_SENTRY_DSN, VITE_SERVER_URL, etc.)...");
    let response: Response | null = null;

    const isAiStudio =
      typeof window !== "undefined" &&
      (window.location.hostname.endsWith(".run.app") ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    if (!isAiStudio) {
      // In production outside of AI Studio, client fetches directly from Doppler API without server proxy
      response = await fetch(
        "https://api.doppler.com/v3/configs/config/secrets/download?format=json",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } else {
      // In AI Studio sandbox, try server proxy first as a workaround for CORS/preflight sandbox restrictions
      try {
        const proxyUrl = token
          ? `/api/doppler-client-secrets?token=${encodeURIComponent(token)}`
          : "/api/doppler-client-secrets";
        const proxyRes = await fetch(proxyUrl);
        if (proxyRes.ok) {
          response = proxyRes;
        }
      } catch {
        // Fallback to direct fetch in AI Studio if proxy is unavailable
      }

      if (!response) {
        response = await fetch(
          "https://api.doppler.com/v3/configs/config/secrets/download?format=json",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    }

    if (!response || !response.ok) {
      console.warn(
        `[Doppler Client] Could not load secrets from Doppler proxy or API.`
      );
      return clientSecrets;
    }

    const secrets = (await response.json()) as Record<string, string>;
    clientSecrets = secrets;
    console.log(
      `[Doppler Client] Successfully loaded ${Object.keys(secrets).length} client secrets from Doppler.`
    );

    // Initialize client Sentry if VITE_SENTRY_DSN or SENTRY_DSN was retrieved
    const sentryDsn = secrets["VITE_SENTRY_DSN"] || secrets["SENTRY_DSN"];
    if (sentryDsn) {
      initClientSentry(sentryDsn);
    }

    if (secrets["VITE_SERVER_URL"]) {
      console.log(`[Doppler Client] VITE_SERVER_URL loaded: ${secrets["VITE_SERVER_URL"]}`);
    }
  } catch (err) {
    console.error("[Doppler Client] Exception while loading Doppler client secrets:", err);
  }

  return clientSecrets;
}

export function getClientDopplerSecret(key: string): string | undefined {
  return clientSecrets[key] || (import.meta as any).env?.[key];
}

export function getClientServerUrl(): string {
  return (
    getClientDopplerSecret("VITE_SERVER_URL") ||
    (import.meta as any).env?.VITE_SERVER_URL ||
    window.location.origin
  );
}

// Automatically initiate load if VITE_DOPPLER_TOKEN is available at startup
if ((import.meta as any).env?.VITE_DOPPLER_TOKEN) {
  loadClientDopplerSecrets();
}

