import { redactTelemetry } from "@/lib/telemetry-privacy";
import * as Sentry from "@sentry/nextjs";

export function register() {

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Only capture in production (or when explicitly enabled) — dev stays quiet,
    // but a real DSN set for a prod build will light up as expected.
    // NOTE: client bundles only ever see `NEXT_PUBLIC_*` env vars (the plain
    // `SENTRY_DEBUG` is server-only and resolves to undefined here), so the
    // dev opt-in must be NEXT_PUBLIC_SENTRY_DEBUG=1.
    enabled:
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_SENTRY_DEBUG === "1",
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ||
      process.env.NODE_ENV ||
      "production",
    // Release/commit tracking — set a fixed release from env when available.
    release: process.env.SENTRY_RELEASE || undefined,

    // Tracing — low sample rate to keep volume/cost down.
    tracesSampleRate: 0.1,

    // Session Replay — enabled per-project request. Metadata is masked by
    // default to avoid capturing sensitive member/visitor details.
    replaysOnErrorSampleRate: process.env.NEXT_PUBLIC_SENTRY_REPLAY === "1" ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    integrations: process.env.NEXT_PUBLIC_SENTRY_REPLAY === "1" ? [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })] : [],

    // Privacy: never send the raw text/inputs or media to Sentry.
    beforeSend: redactTelemetry,
    // Transaction privacy hooks require static lifecycle in the installed SDK.
    traceLifecycle: "static",
    beforeSendTransaction: redactTelemetry,
  });
}

// Instrument client-side route navigations as Sentry spans/transactions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
