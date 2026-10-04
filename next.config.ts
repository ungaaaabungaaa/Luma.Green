import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Sources are already compressed WebP files. Serve their content-hashed
    // URLs directly so Vercel image-transform limits cannot hide public art.
    unoptimized: true,
    formats: ["image/webp"],
    maximumDiskCacheSize: 64 * 1024 * 1024,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      {
        // Private areas: never indexed (docs/architecture/urls.md). The pages
        // also set robots metadata; the header covers non-HTML responses.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

const config = withNextIntl(nextConfig);

/**
 * Sentry only wraps the build when it is actually configured. Without a DSN the
 * plugin is skipped entirely, so local builds and CI stay fast and silent.
 */
export default process.env.NEXT_PUBLIC_TELEMETRY_ENABLED === "true" &&
process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      webpack: { treeshake: { removeDebugLogging: true, removeTracing: true } },
      telemetry: false,
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
        deleteSourcemapsAfterUpload: true,
      },
    })
  : config;
