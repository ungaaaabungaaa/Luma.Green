import type { GenericCtx } from "@convex-dev/better-auth";
import {
  APIError,
  createAuthMiddleware,
  type getAuthoritativeSessionFromCtx,
} from "better-auth/api";
import { z } from "zod";

import { adminRecoveryEnv } from "../../src/lib/env";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { isAdminEmail } from "./admin";

const GENERIC_RESET_RESPONSE = {
  status: true,
  message:
    "If this email exists in our system, check your email for the reset link",
};

/** Phone-only identities can never acquire a password through reset APIs. */
export async function checkAdminRecovery(
  ctx: Parameters<typeof getAuthoritativeSessionFromCtx>[0],
) {
  if (ctx.path !== "/request-password-reset" && ctx.path !== "/reset-password")
    return;
  if (!adminRecoveryEnv()) {
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "ADMIN_RECOVERY_UNAVAILABLE",
      message: "Password recovery is not configured.",
    });
  }
  if (ctx.path === "/request-password-reset") {
    const body = z
      .object({ email: z.email(), redirectTo: z.string().optional() })
      .safeParse(ctx.body);
    if (!body.success) return;
    const user = await ctx.context.internalAdapter.findUserByEmail(
      body.data.email,
      { includeAccounts: true },
    );
    if (
      !user ||
      !isAdminEmail(user.user.email) ||
      user.accounts.every(
        (account) => !(account.providerId === "credential" && account.password),
      )
    ) {
      return ctx.json(GENERIC_RESET_RESPONSE);
    }
    // Better Auth's default background helper logs and swallows email
    // failures. This endpoint must tell the admin when delivery failed.
    const context = ctx.context;
    context.runInBackgroundOrAwait = async (task) => {
      await task;
    };
    // The email callback constructs a fixed same-origin reset URL; Better
    // Auth also validates any supplied redirectTo using trustedOrigins.
    return;
  }
  const body = z.object({ token: z.string().optional() }).safeParse(ctx.body);
  const token = body.success ? body.data.token : undefined;
  const record = token
    ? await ctx.context.internalAdapter.findVerificationValue(
        `reset-password:${token}`,
      )
    : null;
  const user = record
    ? await ctx.context.internalAdapter.findUserById(record.value)
    : null;
  const accounts = user
    ? await ctx.context.internalAdapter.findAccounts(user.id)
    : [];
  if (
    !user ||
    !isAdminEmail(user.email) ||
    accounts.every(
      (account) => !(account.providerId === "credential" && account.password),
    )
  ) {
    throw new APIError("BAD_REQUEST", {
      code: "INVALID_TOKEN",
      message: "Invalid or expired reset link.",
    });
  }
}

export const guardAdminRecovery = createAuthMiddleware(checkAdminRecovery);

/** An optional provider adapter; no retries after an ambiguous delivery. */
export async function sendAdminReset({
  user,
  token,
}: {
  user: { email: string };
  token: string;
}) {
  const config = adminRecoveryEnv();
  if (!config || !isAdminEmail(user.email)) {
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "ADMIN_RECOVERY_UNAVAILABLE",
      message: "Password recovery is not configured.",
    });
  }
  const url = new URL("/admin/reset-password", config.siteUrl);
  url.searchParams.set("token", token);
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [user.email],
        subject: "Reset your Luma.Green admin password",
        text: `Use this link within 15 minutes to reset your admin password:\n\n${url.href}\n\nYour authenticator remains required. If you did not request this, ignore this email.`,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "ADMIN_RECOVERY_DELIVERY_FAILED",
      message: "Could not confirm email delivery. Try again later.",
    });
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (
    !response.ok ||
    !z.object({ id: z.string().min(1) }).safeParse(body).success
  ) {
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "ADMIN_RECOVERY_DELIVERY_FAILED",
      message: "Could not confirm email delivery. Try again later.",
    });
  }
}

/** Password recovery invalidates earlier primary proofs and other reset links. */
export async function clearPasswordResetProofs(
  ctx: GenericCtx<DataModel>,
  userId: string,
) {
  if (!("runMutation" in ctx))
    throw new Error("Password reset needs a mutation context.");
  let cursor: string | null = null;
  for (;;) {
    const result = z
      .object({ isDone: z.boolean(), continueCursor: z.string() })
      .parse(
        await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
          input: {
            model: "verification",
            where: [{ field: "value", value: userId }],
          },
          paginationOpts: { cursor, numItems: 100 },
        }),
      );
    if (result.isDone) return;
    cursor = result.continueCursor;
  }
}
