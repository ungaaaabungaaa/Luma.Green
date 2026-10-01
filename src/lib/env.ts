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
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
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
  BETTER_AUTH_URL: optionalUrl,
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  PHOTO_ESTIMATE_DAILY_LIMIT: z.string().optional(),
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

/** Convex action configuration, read on each request; blank or invalid means manual-only. */
export function photoEstimateEnv() {
  const quota = process.env.PHOTO_ESTIMATE_DAILY_LIMIT;
  const parsed = z
    .object({
      apiKey: z.string().trim().min(1),
      model: z.string().trim().min(1).max(200),
      dailyLimit: z.coerce.number().int().min(1).max(1000),
    })
    .safeParse({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL,
      dailyLimit: quota === undefined || quota.trim() === "" ? "100" : quota,
    });
  return parsed.success ? parsed.data : undefined;
}
