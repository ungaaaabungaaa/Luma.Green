import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { DBAdapter } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { constantTimeEqual } from "better-auth/crypto";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { phoneNumber } from "better-auth/plugins";

import { authEmailEnv } from "../src/lib/env";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import {
  adminSessionExpiry,
  getAdminSetupToken,
  isAdminEmail,
} from "./lib/admin";
import { clearPasswordResetProofs } from "./lib/adminRecovery";
import { sendLocalPhoneCode } from "./lib/authEmail";
import {
  guardEmailRecovery,
  requireEmailDelivery,
  sendEmailVerification,
  sendPasswordReset,
} from "./lib/emailAuth";
import { PHONE_EMAIL_DOMAIN } from "./lib/phone";
import { isIndianMobile, phoneEmail } from "./lib/phone";
import { phoneTwoFactor } from "./lib/phoneTwoFactor";
import { securityAudit } from "./lib/securityAudit";
import { CODE_TTL_MINUTES, codeDelivery } from "./lib/sms";
import { smsPhoneHash } from "./lib/smsLimits";

/**
 * Sign-in for Luma.Green — docs/architecture/auth.md.
 *
 * - Members: verified email + password, or phone number + 6-digit SMS code.
 * - The one admin: email + password, then an authenticator-app code. Email
 *   sign-up requires `ADMIN_EMAIL` and the operator's `ADMIN_SETUP_TOKEN`.
 */
export const authComponent: ReturnType<
  typeof createClient<DataModel, typeof authSchema>
> = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  // Our own copy of the component, with tables generated from the plugins
  // below (`pnpm auth:schema`) — the packaged default lags better-auth.
  {
    local: { schema: authSchema },
    authFunctions: internal.authEvents,
    triggers: securityAudit,
  },
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
  const delivery = codeDelivery({
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
    MSG91_OTP_TEMPLATE_ID: process.env.MSG91_OTP_TEMPLATE_ID,
    AUTH_DEV_MODE: process.env.AUTH_DEV_MODE,
  });
  if (delivery.kind === "off" && authEmailEnv()?.kind !== "local") {
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

/** Keep phone identities separate until there is a verified linking workflow. */
async function guardPhoneIdentity(
  path: string,
  body: unknown,
  adapter: DBAdapter,
) {
  if (body === null || typeof body !== "object") return;
  if (
    (path === "/sign-up/email" || path === "/update-user") &&
    ("phoneNumber" in body || "phoneNumberVerified" in body)
  )
    throw new APIError("FORBIDDEN", {
      code: "UNSUPPORTED_PHONE_ACCOUNT_CHANGE",
      message: "Use phone sign-in.",
    });
  if (
    path !== "/phone-number/verify" ||
    !("phoneNumber" in body) ||
    typeof body.phoneNumber !== "string"
  )
    return;
  const existing = await adapter.findOne<{ email: string }>({
    model: "user",
    where: [{ field: "phoneNumber", value: body.phoneNumber }],
  });
  // Reject old/imported cross-method bindings before the phone plugin marks
  // the number verified or creates any session.
  if (existing && existing.email !== phoneEmail(body.phoneNumber))
    throw new APIError("FORBIDDEN", {
      code: isAdminEmail(existing.email)
        ? "ADMIN_PASSWORD_REQUIRED"
        : "UNSUPPORTED_PHONE_ACCOUNT_CHANGE",
      message: "Use email sign-in.",
    });
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
    // Keep the same origin/CSRF boundary in tests and production.
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      sendResetPassword: sendPasswordReset,
      onPasswordReset: async ({ user }) => {
        await clearPasswordResetProofs(ctx, user.id);
      },
      resetPasswordTokenExpiresIn: 15 * 60,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendVerificationEmail: sendEmailVerification,
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: 15 * 60,
    },
    // Kept in the database: in memory, each Convex request could start with a
    // clean slate. The plugins set the limits (phone: 10 a minute; two-factor:
    // 3 per 10 seconds), per client IP.
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        // Public verification keys contain no credentials. Convex verifiers share
        // an IP; limiting discovery can reject otherwise valid user sessions.
        "/convex/jwks": (request, rule) => request.method !== "GET" && rule,
        "/sign-up/email": { window: 15 * 60, max: 5 },
        "/send-verification-email": { window: 15 * 60, max: 3 },
        "/request-password-reset": { window: 15 * 60, max: 3 },
        "/reset-password": { window: 15 * 60, max: 5 },
      },
    },
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
        await guardPhoneIdentity(
          hookCtx.path,
          hookCtx.body,
          hookCtx.context.adapter,
        );
        if (hookCtx.path === "/phone-number/send-otp") {
          await reserveCodeRequest(ctx, hookCtx.body);
          return;
        }
        const body = hookCtx.body as { email?: unknown } | undefined;
        const email = typeof body?.email === "string" ? body.email : "";
        const isAdmin = isAdminEmail(email);
        const context = hookCtx.context;
        if (
          isAdmin &&
          (hookCtx.path === "/sign-up/email" ||
            hookCtx.path === "/sign-in/email")
        ) {
          // Options are created for this HTTP request. Admin bootstrap remains
          // password + owner token, then mandatory authenticator enrollment.
          context.options.emailAndPassword = {
            ...context.options.emailAndPassword,
            enabled: true,
            requireEmailVerification: false,
          };
          context.options.emailVerification = {
            ...context.options.emailVerification,
            sendOnSignUp: false,
          };
        }
        if (
          hookCtx.path === "/send-verification-email" ||
          (!isAdmin && hookCtx.path === "/sign-up/email")
        ) {
          if (email.toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`))
            throw new APIError("FORBIDDEN", {
              code: "EMAIL_NOT_ALLOWED",
              message: "Use phone sign-in.",
            });
          requireEmailDelivery();
          context.runInBackgroundOrAwait = async (task) => {
            await task;
          };
        }
        if (!isAdmin || hookCtx.path !== "/sign-up/email") return;
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
      {
        id: "admin-recovery-guard",
        hooks: {
          before: [
            {
              matcher: (hookCtx) =>
                hookCtx.path === "/request-password-reset" ||
                hookCtx.path === "/reset-password",
              handler: guardEmailRecovery,
            },
          ],
        },
      },
      phoneTwoFactor(),
      convex({ authConfig }),
      phoneNumber({
        otpLength: 6,
        expiresIn: CODE_TTL_MINUTES * 60,
        allowedAttempts: 5,
        phoneNumberValidator: isIndianMobile,
        callbackOnVerification: ({ user }) => {
          // Admin sessions require password sign-in followed by TOTP.
          if (isAdminEmail(user.email)) {
            throw new APIError("FORBIDDEN", {
              code: "ADMIN_PASSWORD_REQUIRED",
              message: "Use admin sign-in.",
            });
          }
          return Promise.resolve();
        },
        // Hand the code to an action through the scheduler: the request
        // returns at once, and nothing is left as a dangling promise that
        // Convex could drop.
        sendOTP: async ({ phoneNumber: phone, code }) => {
          if (authEmailEnv()?.kind === "local") {
            await sendLocalPhoneCode(phone, code);
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
        signUpOnVerification: {
          getTempEmail: phoneEmail,
          getTempName: (phone) => phone,
        },
      }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
