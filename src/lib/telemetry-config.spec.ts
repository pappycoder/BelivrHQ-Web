import { afterEach, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";

vi.mock("@sentry/nextjs", () => ({ init: vi.fn(), captureRouterTransitionStart: vi.fn(), replayIntegration: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it.each(["server", "edge", "browser"])("enables the transaction privacy hook in the %s SDK", async (runtime) => {
  vi.stubEnv("SENTRY_DSN", "https://public@ingest.example/1");
  vi.stubEnv("SENTRY_DEBUG", "1");
  if (runtime === "server") await import("../sentry.server.config");
  else if (runtime === "edge") await import("../sentry.edge.config");
  else (await import("../instrumentation-client")).register();
  const options = vi.mocked(Sentry.init).mock.calls[0][0]!;
  expect(options.traceLifecycle).toBe("static");
  expect(options.beforeSendTransaction).toBeTypeOf("function");
  expect(JSON.stringify(options.beforeSendTransaction!({ request: { url: "https://example.org/forms/public/secret?token=secret" } } as never, {} as never))).not.toContain("secret");
});
