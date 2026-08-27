import { initClientSentry } from "./sentry";

/**
 * Client-Side Doppler Integration for Production Secrets Management.
 * Fetches client-scoped secrets from the server-side proxy in AI Studio.
 * Outside AI Studio, relies entirely on baked-in environment variables.
 */

export interface ClientDopplerSecrets {
  [key: string]: string;
}

let clientSecrets: ClientDopplerSecrets = {};

// Negative cache: once the server proxy reports no secrets (or the fetch
// fails), stop re-attempting for the rest of the session.
let proxyUnavailable = false;

export async function loadClientDopplerSecrets(): Promise<ClientDopplerSecrets> {
  const isAiStudio =
    typeof window !== "undefined" &&
    (window.location.hostname.endsWith(".run.app") ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (!isAiStudio) {
    console.log("[Doppler Client] Outside AI Studio: relying on baked-in environment variables.");
    return clientSecrets;
  }

  if (proxyUnavailable) {
    return clientSecrets;
  }

  try {
    console.log("[Doppler Client] AI Studio environment detected: Fetching client secrets from server proxy...");
    const response = await fetch("/api/doppler-client-secrets");

    if (!response.ok) {
      proxyUnavailable = true;
      console.warn(`[Doppler Client] Could not load secrets from Doppler server proxy. Status: ${response.status}`);
      return clientSecrets;
    }

    const payload = await response.json();

    // Server explicitly reports no Doppler token configured in this environment
    if (payload && typeof payload === "object" && (payload as { available?: boolean }).available === false) {
      proxyUnavailable = true;
      console.log("[Doppler Client] Server proxy has no Doppler token configured — relying on baked-in environment variables.");
      return clientSecrets;
    }

    const secrets = payload as Record<string, string>;
    clientSecrets = secrets;
    console.log(
      `[Doppler Client] Successfully loaded ${Object.keys(secrets).length} client secrets via server proxy.`
    );

    // Initialize client Sentry if VITE_SENTRY_DSN or SENTRY_DSN was retrieved
    const sentryDsn = secrets["VITE_SENTRY_DSN"] || secrets["SENTRY_DSN"];
    if (sentryDsn) {
      initClientSentry(sentryDsn);
    }
  } catch (err) {
    console.error("[Doppler Client] Exception while fetching secrets via server proxy:", err);
  }

  return clientSecrets;
}

export function getClientDopplerSecret(key: string): string | undefined {
  if (clientSecrets[key]) {
    return clientSecrets[key];
  }

  // Explicit static inlining fallbacks for Vite production build compatibility
  if (key === "VITE_SENTRY_DSN" || key === "SENTRY_DSN") {
    return (import.meta as any).env?.VITE_SENTRY_DSN || (import.meta as any).env?.SENTRY_DSN;
  }
  if (key === "VITE_SERVER_URL") {
    return (import.meta as any).env?.VITE_SERVER_URL;
  }
  if (key === "VITE_CONFIGCAT_SDK_KEY") {
    return (import.meta as any).env?.VITE_CONFIGCAT_SDK_KEY;
  }

  return (import.meta as any).env?.[key];
}

export function getClientServerUrl(): string {
  return (
    getClientDopplerSecret("VITE_SERVER_URL") ||
    (import.meta as any).env?.VITE_SERVER_URL ||
    window.location.origin
  );
}

// Automatically initiate load at startup
export const dopplerLoaded = loadClientDopplerSecrets();
