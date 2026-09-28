/**
 * How sign-in codes leave the system. Every variable is optional (AGENTS.md):
 *
 * - MSG91 keys present   → send through MSG91 on the DLT-approved template.
 * - `AUTH_DEV_MODE=true` → write the code to the Convex log (dev and preview
 *   deployments only — production never has this variable).
 * - neither              → phone sign-in is switched off.
 */

export interface SmsEnv {
  MSG91_AUTH_KEY?: string;
  MSG91_OTP_TEMPLATE_ID?: string;
  AUTH_DEV_MODE?: string;
}

export type CodeDelivery =
  | { kind: "msg91"; authKey: string; templateId: string }
  | { kind: "log" }
  | { kind: "off" };

export function codeDelivery(env: SmsEnv): CodeDelivery {
  const authKey = env.MSG91_AUTH_KEY?.trim();
  const templateId = env.MSG91_OTP_TEMPLATE_ID?.trim();
  if (authKey && templateId) return { kind: "msg91", authKey, templateId };
  return { kind: env.AUTH_DEV_MODE === "true" ? "log" : "off" };
}

/** Minutes a code stays valid — matches `expiresIn` in convex/auth.ts. */
export const CODE_TTL_MINUTES = 5;

/**
 * MSG91's OTP API with our own code (Better Auth generates and checks it).
 * Docs: https://docs.msg91.com/otp/sendotp — verify the fields again when the
 * DLT templates are approved.
 */
export function msg91OtpRequest(input: {
  phone: string;
  code: string;
  authKey: string;
  templateId: string;
}): { url: string; init: RequestInit } {
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", input.templateId);
  url.searchParams.set("mobile", input.phone.replace("+", ""));
  url.searchParams.set("otp", input.code);
  url.searchParams.set("otp_expiry", String(CODE_TTL_MINUTES));
  return {
    url: url.href,
    init: {
      method: "POST",
      headers: { authkey: input.authKey, accept: "application/json" },
    },
  };
}
