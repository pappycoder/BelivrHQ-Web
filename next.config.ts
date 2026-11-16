import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs/config";

const withSerwist = withSerwistInit({
  // Note: This is only an option in the webpack plugin. In the Vite plugin,
  // you can pass `process.env.NODE_ENV === "production"` instead.
  disable: process.env.NODE_ENV === "development",
  // Note: This is an option that only works with the webpack plugin.
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  register: true,
  // Keep the unlocked workspace and let its sync engine handle reconnection.
  reloadOnOnline: false,
  // A fallback URL alone does not precache its HTML. Refresh this public shell
  // on every build so its chunk references match the deployed assets.
  manifestTransforms: [async (entries) => ({
    manifest: [...entries, { url: "/offline", revision: new Date().toISOString(), size: 0 }],
    warnings: [],
  })],
});

// Development stance: legacy workspace routes were deleted outright (no
// redirect map) — old URLs simply 404 until bookmarks are refreshed.
const nextConfig: NextConfig = withSerwist({
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
      ],
    }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
});

// Sentry must wrap outermost. Build-time instrumentation + source map upload
// are applied here; runtime SDKs are initialized in src/instrumentation*.ts.
// org/project/authToken are read from env so the build stays green without them
// (source map upload is simply skipped until SENTRY_AUTH_TOKEN is provided).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print upload/log info in CI.
  silent: !process.env.CI,

  // Keep source maps out of the browser; Sentry uploads them and strips the
  // <sourceMappingURL> refs from browser bundles (and removes them after upload)
  // so they are only used for readable stack traces in the Sentry dashboard.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Auto-instrument App Router pages/components + middleware, and tree-shake
  // Sentry's debug logging from the production bundle.
  webpack: {
    autoInstrumentAppDirectory: true,
    autoInstrumentMiddleware: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
