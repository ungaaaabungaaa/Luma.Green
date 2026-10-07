import { v } from "convex/values";

import { internalAction } from "./_generated/server";
import { maskPhone } from "./lib/phone";
import { codeDelivery, msg91OtpRequest } from "./lib/sms";

/** Sends one sign-in code. Scheduled by `sendOTP` in convex/auth.ts. */
export const sendCode = internalAction({
  args: { phone: v.string(), code: v.string() },
  returns: v.null(),
  handler: async (_ctx, { phone, code }) => {
    const delivery = codeDelivery({
      MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
      MSG91_OTP_TEMPLATE_ID: process.env.MSG91_OTP_TEMPLATE_ID,
      AUTH_DEV_MODE: process.env.AUTH_DEV_MODE,
    });

    switch (delivery.kind) {
      case "msg91": {
        const { url, init } = msg91OtpRequest({
          phone,
          code,
          authKey: delivery.authKey,
          templateId: delivery.templateId,
        });
        // Bound provider latency. Never retry a timed-out send automatically:
        // it may already have reached the provider.
        const response = await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) {
          throw new Error(
            `MSG91 refused the code for ${maskPhone(phone)} (${String(response.status)}).`,
          );
        }
        const result: unknown = await response.json();
        if (
          !result ||
          typeof result !== "object" ||
          !("type" in result) ||
          result.type !== "success"
        ) {
          throw new Error(
            `MSG91 did not accept the code for ${maskPhone(phone)}.`,
          );
        }
        return null;
      }
      case "off": {
        throw new Error("SMS is not configured on this deployment.");
      }
    }
  },
});
