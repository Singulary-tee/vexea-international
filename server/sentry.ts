import * as Sentry from "@sentry/node";

let isSentryInitialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  if (isSentryInitialized) {
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV || "development",
    debug: false,
  });
  isSentryInitialized = true;
  console.log("[Sentry Server] Initialized with DSN from environment/Doppler.");
}

// Initial check at module load
initSentry();

export { Sentry };

