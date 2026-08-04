import * as Sentry from "@sentry/browser";

let isClientSentryInitialized = false;

export function initClientSentry(customDsn?: string): void {
  const dsn =
    customDsn ||
    (import.meta as any).env?.VITE_SENTRY_DSN ||
    (import.meta as any).env?.SENTRY_DSN ||
    (typeof process !== "undefined" ? process.env?.SENTRY_DSN : undefined);

  if (!dsn) {
    return;
  }

  if (isClientSentryInitialized) {
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    environment: (import.meta as any).env?.MODE || "development",
    integrations: [
      Sentry.captureConsoleIntegration({
        levels: ["error"],
      }),
    ],
    dataCollection: {
      userInfo: true,
    },
    debug: false,
  });
  isClientSentryInitialized = true;
  console.log("[Sentry Client] Initialized with DSN from env/Doppler.");
}

// Initial check at module load
initClientSentry();

export { Sentry };

