import { APIError, createAuthMiddleware } from "better-auth/api";
import { z } from "zod";

import { isLocale } from "../../src/i18n/locales";
import { authEmailEnv } from "../../src/lib/env";
import { isAdminEmail } from "./admin";
import { checkAdminRecovery, sendAdminReset } from "./adminRecovery";
import { sendAuthEmail } from "./authEmail";
import { PHONE_EMAIL_DOMAIN } from "./phone";

const neutralReset = {
  status: true,
  message:
    "If this email exists in our system, check your email for the reset link",
};

export function requireEmailDelivery() {
  const config = authEmailEnv();
  if (!config)
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "EMAIL_DELIVERY_UNAVAILABLE",
      message: "Email delivery is not configured.",
    });
  return config;
}

function localeFromRequest(request: Request | undefined) {
  const value = request?.headers.get("x-luma-locale");
  return value && isLocale(value) ? value : "en";
}

/** The reset flow cannot add a credential to a phone-only identity. */
export const guardEmailRecovery = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/request-password-reset") {
    const parsed = z.object({ email: z.email() }).safeParse(ctx.body);
    if (!parsed.success) return;
    if (isAdminEmail(parsed.data.email)) return checkAdminRecovery(ctx);
    requireEmailDelivery();
    const account = await ctx.context.internalAdapter.findUserByEmail(
      parsed.data.email,
      { includeAccounts: true },
    );
    if (
      !account ||
      !account.user.emailVerified ||
      account.user.email.endsWith(`@${PHONE_EMAIL_DOMAIN}`) ||
      account.accounts.every(
        (item) => !(item.providerId === "credential" && item.password),
      )
    )
      return ctx.json(neutralReset);
    const context = ctx.context;
    context.runInBackgroundOrAwait = async (task) => {
      await task;
    };
    return;
  }
  if (ctx.path !== "/reset-password") return;
  const parsed = z.object({ token: z.string() }).safeParse(ctx.body);
  const record = parsed.success
    ? await ctx.context.internalAdapter.findVerificationValue(
        `reset-password:${parsed.data.token}`,
      )
    : null;
  const user = record
    ? await ctx.context.internalAdapter.findUserById(record.value)
    : null;
  if (user && isAdminEmail(user.email)) return checkAdminRecovery(ctx);
  const accounts = user
    ? await ctx.context.internalAdapter.findAccounts(user.id)
    : [];
  if (
    !user ||
    !user.emailVerified ||
    user.email.endsWith(`@${PHONE_EMAIL_DOMAIN}`) ||
    accounts.every(
      (item) => !(item.providerId === "credential" && item.password),
    )
  )
    throw new APIError("BAD_REQUEST", {
      code: "INVALID_TOKEN",
      message: "Invalid or expired reset link.",
    });
});

export async function sendPasswordReset(
  { user, token }: { user: { email: string }; token: string },
  request?: Request,
) {
  if (isAdminEmail(user.email)) return sendAdminReset({ user, token });
  const config = requireEmailDelivery();
  const url = new URL(
    `/${localeFromRequest(request)}/login/email/reset`,
    config.siteUrl,
  );
  url.searchParams.set("token", token);
  await sendAuthEmail({
    to: user.email,
    kind: "password-reset",
    subject: "Reset your Luma.Green password",
    text: `Use this link within 15 minutes to reset your password:\n\n${url.href}\n\nIf enabled, your authenticator remains required. If you did not request this, ignore this email.`,
  });
}

export async function sendEmailVerification(
  { user, token }: { user: { email: string }; token: string },
  request?: Request,
) {
  if (isAdminEmail(user.email)) return;
  const config = requireEmailDelivery();
  const url = new URL(
    `/${localeFromRequest(request)}/login/email/verify`,
    config.siteUrl,
  );
  url.searchParams.set("token", token);
  await sendAuthEmail({
    to: user.email,
    kind: "verification",
    subject: "Verify your Luma.Green email",
    text: `Use this link within 15 minutes to verify your email:\n\n${url.href}\n\nThen sign in with your password. If you did not request this, ignore this email.`,
  });
}
