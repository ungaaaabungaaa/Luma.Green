import { type CodeErrorKey, codeErrorKey } from "@/components/auth/errors";
import { authClient } from "@/lib/auth-client";

export type SendCodeErrorKey = "sendFailed" | "sendRateLimited";

/** A lost connection must leave the form ready for another attempt. */
export async function requestPhoneCode(
  phone: string,
): Promise<SendCodeErrorKey | null> {
  try {
    const { error } = await authClient.phoneNumber.sendOtp({
      phoneNumber: phone,
    });
    if (!error) return null;
    return error.status === 429 ? "sendRateLimited" : "sendFailed";
  } catch {
    return "sendFailed";
  }
}

export async function verifyPhoneCode(
  phone: string,
  code: string,
): Promise<CodeErrorKey | null> {
  try {
    const { error } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code,
    });
    return error ? codeErrorKey(error) : null;
  } catch {
    return "errorGeneric";
  }
}
