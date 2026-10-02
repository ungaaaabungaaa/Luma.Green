import { z } from "zod";

/**
 * Environment access, validated once.
 *
 * Rules:
 *  - Client vars MUST be read as literal `process.env.NEXT_PUBLIC_*` so Next
 *    can inline them at build time. Never index `process.env` dynamically.
 *  - Server vars are read lazily through `serverEnv()` so a server-only secret
 *    can never be pulled into a client bundle by an accidental import.
 *  - Everything is optional today: the repo must build and test green with an
 *    empty `.env`. Make a var required only once a feature depends on it.
 */

// An unset var and a var set to "" mean the same thing here: not configured.
const optionalUrl = z
  .url()
  .optional()
  .or(z.literal("").transform((): undefined => undefined));

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXT_PUBLIC_CONVEX_URL: optionalUrl,
  NEXT_PUBLIC_CONVEX_SITE_URL: optionalUrl,
  NEXT_PUBLIC_TELEMETRY_ENABLED: z
    .enum(["true", "false", ""])
    .optional()
    .transform((value) => value === "true"),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z
    .string()
    .regex(/^G-[A-Z0-9]+$/)
    .optional()
    .or(z.literal("")),
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().optional(),
  NEXT_PUBLIC_BING_SITE_VERIFICATION: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
  NEXT_PUBLIC_TELEMETRY_ENABLED: process.env.NEXT_PUBLIC_TELEMETRY_ENABLED,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION:
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  NEXT_PUBLIC_BING_SITE_VERIFICATION:
    process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});

export type ClientEnv = z.infer<typeof clientSchema>;

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  CONVEX_DEPLOYMENT: z.string().optional(),
  CONVEX_DEPLOY_KEY: z.string().optional(),
  BETTER_AUTH_SECRET: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(32).optional(),
  ),
  ADMIN_SETUP_TOKEN: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(32).max(512).optional(),
  ),
  BETTER_AUTH_URL: optionalUrl,
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  PHOTO_ESTIMATE_DAILY_LIMIT: z.string().optional(),
  PHOTO_ESTIMATE_PROVIDER: z.string().optional(),
  PHOTO_ESTIMATE_ENDPOINT: z.string().optional(),
  PHOTO_ESTIMATE_API_KEY: z.string().optional(),
  PHOTO_ESTIMATE_MODEL: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

// Held on an object rather than a bare `let` so the memo write is a property
// assignment, not a reassignment of module state from inside a function.
const memo: { value?: ServerEnv } = {};

/** Server-only. Throws if called from the browser. */
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() was called in the browser");
  }
  memo.value ??= serverSchema.parse(process.env);
  return memo.value;
}

/** Operator-controlled HTTPS gateway. Never accept an endpoint from an action argument. */
const photoEndpoint = z.url().refine((value) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    !value.includes("\\") &&
    url.pathname.endsWith("/v1/chat/completions") &&
    !url.hostname.startsWith("[") &&
    !/^[\d.]+$/.test(url.hostname) &&
    url.hostname.includes(".") &&
    !/\.(localhost|local|internal)$/.test(url.hostname)
  );
});

/** Convex action configuration, read on each request; blank or invalid means manual-only. */
export function photoEstimateEnv() {
  const quota = process.env.PHOTO_ESTIMATE_DAILY_LIMIT;
  const configuredProvider = process.env.PHOTO_ESTIMATE_PROVIDER?.trim();
  const provider =
    configuredProvider === ""
      ? "openrouter"
      : (configuredProvider ?? "openrouter");
  const isSelfHosted = provider === "self-hosted";
  const parsed = z
    .object({
      provider: z.enum(["openrouter", "self-hosted"]),
      endpoint: photoEndpoint,
      apiKey: z
        .string()
        .trim()
        .min(1)
        .max(4096)
        .regex(/^[^\r\n]+$/),
      model: z.string().trim().min(1).max(200),
      dailyLimit: z.coerce.number().int().min(1).max(1000),
    })
    .safeParse({
      provider,
      endpoint: isSelfHosted
        ? process.env.PHOTO_ESTIMATE_ENDPOINT
        : "https://openrouter.ai/api/v1/chat/completions",
      apiKey: isSelfHosted
        ? process.env.PHOTO_ESTIMATE_API_KEY
        : process.env.OPENROUTER_API_KEY,
      model: isSelfHosted
        ? process.env.PHOTO_ESTIMATE_MODEL
        : process.env.OPENROUTER_MODEL,
      dailyLimit: quota === undefined || quota.trim() === "" ? "100" : quota,
    });
  return parsed.success ? parsed.data : undefined;
}

/** News is optional, server-side and off unless explicitly enabled by the operator. */
export function industryNewsEnv() {
  if (process.env.INDUSTRY_NEWS_ENABLED !== "true") return null;
  const dailyLimit = process.env.INDUSTRY_NEWS_DAILY_LIMIT?.trim();
  const parsed = z
    .object({
      apiKey: z
        .string()
        .trim()
        .min(1)
        .max(256)
        .regex(/^[a-zA-Z0-9_-]+$/),
      dailyLimit: z.coerce.number().int().min(1).max(1000),
    })
    .safeParse({
      apiKey: process.env.INDUSTRY_NEWS_API_KEY,
      dailyLimit: dailyLimit === "" ? "100" : (dailyLimit ?? "100"),
    });
  return parsed.success ? parsed.data : null;
}
