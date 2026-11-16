import { redactTelemetry } from "@/lib/telemetry-privacy";
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled:
      process.env.NODE_ENV === "production" || process.env.SENTRY_DEBUG === "1",
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ||
      process.env.NODE_ENV ||
      "production",
    release: process.env.SENTRY_RELEASE || undefined,
    // Edge runtime has limited tracing support — keep it minimal.
    tracesSampleRate: 0.1,
    beforeSend: redactTelemetry,
    // Transaction privacy hooks require static lifecycle in the installed SDK.
    traceLifecycle: "static",
    beforeSendTransaction: redactTelemetry,
  });
}
