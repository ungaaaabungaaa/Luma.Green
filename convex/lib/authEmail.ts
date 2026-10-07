import { APIError } from "better-auth/api";
import { z } from "zod";

import { authEmailEnv } from "../../src/lib/env";

export interface AuthEmail {
  to: string;
  subject: string;
  text: string;
  kind: "verification" | "password-reset" | "workspace-invitation";
}

/** Await provider acceptance. Never log payloads or retry an uncertain send. */
export async function sendAuthEmail(message: AuthEmail) {
  const config = authEmailEnv();
  if (!config)
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "EMAIL_DELIVERY_UNAVAILABLE",
      message: "Email delivery is not configured.",
    });
  let response: Response;
  try {
    response = await fetch(
      config.kind === "local"
        ? config.inboxUrl
        : "https://api.resend.com/emails",
      {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.kind === "local" ? config.inboxToken : config.apiKey}`,
        },
        body: JSON.stringify(
          config.kind === "local"
            ? message
            : {
                from: config.from,
                to: [message.to],
                subject: message.subject,
                text: message.text,
              },
        ),
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch {
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "EMAIL_DELIVERY_FAILED",
      message: "Could not confirm email delivery.",
    });
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  if (
    !response.ok ||
    !z.object({ id: z.string().min(1) }).safeParse(result).success
  )
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "EMAIL_DELIVERY_FAILED",
      message: "Could not confirm email delivery.",
    });
}

/** Real generated phone codes may leave a local backend only through the secured inbox. */
export async function sendLocalPhoneCode(phone: string, code: string) {
  const config = authEmailEnv();
  if (config?.kind !== "local")
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "LOCAL_DELIVERY_DISABLED",
      message: "Local delivery is disabled.",
    });
  let response: Response;
  try {
    response = await fetch(config.inboxUrl, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.inboxToken}`,
      },
      body: JSON.stringify({
        to: phone,
        subject: "Local phone verification",
        text: code,
        kind: "phone-code",
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new APIError("SERVICE_UNAVAILABLE", {
      message: "Local delivery failed.",
    });
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  if (
    !response.ok ||
    !z.object({ id: z.string().min(1) }).safeParse(result).success
  )
    throw new APIError("SERVICE_UNAVAILABLE", {
      message: "Local delivery failed.",
    });
}
