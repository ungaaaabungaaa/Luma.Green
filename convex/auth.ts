import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { constantTimeEqual } from "better-auth/crypto";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { phoneNumber, twoFactor } from "better-auth/plugins";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import {
  adminSessionExpiry,
  getAdminSetupToken,
  isAdminEmail,
} from "./lib/admin";
import { DEMO_CODE, isDemoPhone } from "./lib/demo";
import { isIndianMobile, phoneEmail } from "./lib/phone";
import { CODE_TTL_MINUTES, codeDelivery } from "./lib/sms";
import { smsPhoneHash } from "./lib/smsLimits";

/**
 * Sign-in for Luma.Green — docs/architecture/auth.md.
 *
 * - Everyone but the admin: phone number + 6-digit SMS code.
 * - The one admin: email + password, then an authenticator-app code. Email
 *   sign-up requires `ADMIN_EMAIL` and the operator's `ADMIN_SETUP_TOKEN`.
 */
export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  // Our own copy of the component, with tables generated from the plugins
  // below (`pnpm auth:schema`) — the packaged default lags better-auth.
  { local: { schema: authSchema } },
);

/** Origins Better Auth accepts requests from: the site plus any extras. */
function trustedOrigins(): string[] {
  return [
    process.env.SITE_URL,
    ...(process.env.EXTRA_TRUSTED_ORIGINS ?? "").split(","),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin));
}

/** Runs before code creation, so a rejected resend cannot invalidate a code. */
async function reserveCodeRequest(
  ctx: GenericCtx<DataModel>,
  requestBody: unknown,
) {
  const body = requestBody as { phoneNumber?: unknown } | undefined;
  const phone = typeof body?.phoneNumber === "string" ? body.phoneNumber : "";
  if (!isIndianMobile(phone)) return; // The plugin supplies its validation error.
  if (isDemoPhone(phone, process.env.AUTH_DEV_MODE)) return;
  const delivery = codeDelivery({
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
    MSG91_OTP_TEMPLATE_ID: process.env.MSG91_OTP_TEMPLATE_ID,
    AUTH_DEV_MODE: process.env.AUTH_DEV_MODE,
  });
  if (delivery.kind === "off") {
    throw new APIError("SERVICE_UNAVAILABLE", {
      message: "SMS is not configured.",
    });
  }
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || !("runMutation" in ctx)) {
    throw new APIError("SERVICE_UNAVAILABLE", {
      message: "SMS limits are not configured.",
    });
  }
  const phoneHash = await smsPhoneHash(phone, secret);
  const allowance = await ctx.runMutation(internal.smsLimits.reserve, {
    phoneHash,
  });
  if (!allowance.allowed) {
    throw new APIError(
      "TOO_MANY_REQUESTS",
      {
        message: "Wait before requesting another code.",
      },
      { "Retry-After": String(allowance.retryAfterSeconds) },
    );
  }
}

/**
 * The options on their own, so the component (convex/betterAuth/adapter.ts)
 * and the schema generator (scripts/generate-auth-schema.mts) share them.
 */
export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    appName: "Luma.Green",
    baseURL: process.env.SITE_URL,
    trustedOrigins: trustedOrigins(),
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    // Kept in the database: in memory, each Convex request could start with a
    // clean slate. The plugins set the limits (phone: 10 a minute; two-factor:
    // 3 per 10 seconds), per client IP.
    rateLimit: { enabled: true, storage: "database" },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      // A session lasts a fixed time from sign-in and is never extended.
      // Better Auth's refresh would otherwise stretch the admin's 12-hour
      // session (below) back to 30 days the first time it's used.
      disableSessionRefresh: true,
    },
    databaseHooks: {
      session: {
        create: {
          // Look the user up through the component: Better Auth's endpoint
          // context isn't available to hooks inside the Convex runtime.
          before: async (session) => {
            const user = await authComponent.getAnyUserById(
              ctx,
              session.userId,
            );
            if (!isAdminEmail(user?.email)) return;
            return {
              data: {
                ...session,
                expiresAt: adminSessionExpiry(session.expiresAt, Date.now()),
              },
            };
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (hookCtx) => {
        if (hookCtx.path === "/phone-number/send-otp") {
          await reserveCodeRequest(ctx, hookCtx.body);
          return;
        }
        if (hookCtx.path !== "/sign-up/email") return;
        const body = hookCtx.body as { email?: unknown } | undefined;
        const email = typeof body?.email === "string" ? body.email : "";
        if (!isAdminEmail(email)) {
          throw new APIError("FORBIDDEN", { message: "Sign-up is closed." });
        }
        const setupToken = getAdminSetupToken();
        const provided = hookCtx.headers?.get("x-luma-admin-setup-token");
        if (
          !setupToken ||
          !provided ||
          !constantTimeEqual(setupToken, provided)
        ) {
          throw new APIError("FORBIDDEN", {
            code: "ADMIN_SETUP_REQUIRED",
            message: "Admin setup requires a valid setup token.",
          });
        }
      }),
    },
    plugins: [
      convex({ authConfig }),
      phoneNumber({
        otpLength: 6,
        expiresIn: CODE_TTL_MINUTES * 60,
        allowedAttempts: 5,
        phoneNumberValidator: isIndianMobile,
        // Hand the code to an action through the scheduler: the request
        // returns at once, and nothing is left as a dangling promise that
        // Convex could drop.
        sendOTP: async ({ phoneNumber: phone, code }, endpoint) => {
          if (endpoint && isDemoPhone(phone, process.env.AUTH_DEV_MODE)) {
            // Dev only: a demo login's code is always DEMO_CODE and no SMS
            // goes out. Better Auth stores codes as "<code>:<attempts>".
            const adapter = endpoint.context.internalAdapter;
            await adapter.deleteVerificationByIdentifier(phone);
            await adapter.createVerificationValue({
              identifier: phone,
              value: `${DEMO_CODE}:0`,
              expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
            });
            return;
          }
          if (!("scheduler" in ctx)) {
            throw new Error("Sign-in codes can only be sent from an action.");
          }
          await ctx.scheduler.runAfter(0, internal.sms.sendCode, {
            phone,
            code,
          });
        },
        callbackOnVerification: ({ user }) => {
          // The plugin's SMS verification route does not run its MFA hook.
          // Admin sessions must come from password sign-in followed by TOTP.
          if (isAdminEmail(user.email)) {
            throw new APIError("FORBIDDEN", {
              message: "Use admin sign-in.",
            });
          }
          return Promise.resolve();
        },
        signUpOnVerification: {
          getTempEmail: phoneEmail,
          getTempName: (phone) => phone,
        },
      }),
      twoFactor({ issuer: "Luma.Green" }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
