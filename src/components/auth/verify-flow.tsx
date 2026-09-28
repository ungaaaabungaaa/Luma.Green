"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { isConvexConfigured } from "@/components/providers/convex-provider";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/safe-next";

import { api } from "../../../convex/_generated/api";
import { formatIndianMobile } from "../../../convex/lib/phone";
import { type CodeErrorKey, codeErrorKey } from "./errors";
import { LoginSkeleton } from "./login-flow";
import { SignInUnavailable } from "./sign-in-unavailable";
import { readPhone, useStoredValue } from "./storage";

/**
 * Keeps a number reading left to right inside Urdu and Arabic sentences
 * (Unicode directional isolates, U+2066 … U+2069).
 */
function ltr(text: string): string {
  return `\u{2066}${text}\u{2069}`;
}

const RESEND_AFTER_SECONDS = 30;
const CODE_LENGTH = 6;
/** Where a new sign-in lands when no `?next=` was given. */
const AFTER_SIGN_IN = "/";

/** `/login/verify`: the 6-digit code, then into the app. */
export function VerifyFlow() {
  return isConvexConfigured ? <VerifyForm /> : <SignInUnavailable />;
}

function VerifyForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), AFTER_SIGN_IN);
  const { isAuthenticated } = useConvexAuth();
  const ensureProfile = useMutation(api.identity.ensureProfile);

  // The number lives in this tab's session storage, never in the URL.
  const phone = useStoredValue(readPhone);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "verified">(
    "idle",
  );
  const [error, setError] = useState<CodeErrorKey | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER_SECONDS);
  const isFinishing = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);

  // After a wrong code the boxes are cleared; put the cursor back in them.
  useEffect(() => {
    if (error) codeInput.current?.focus();
  }, [error]);

  // No number means no code was sent from this tab: start again.
  useEffect(() => {
    if (phone === null && status === "idle") router.replace("/login");
  }, [phone, status, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => {
      setSecondsLeft((seconds) => seconds - 1);
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [secondsLeft]);

  // Convex picks up the new session a moment after the code is accepted; wait
  // for it before creating the profile.
  useEffect(() => {
    if (status !== "verified" || !isAuthenticated || isFinishing.current) {
      return;
    }
    isFinishing.current = true;
    void (async () => {
      try {
        await ensureProfile({ locale });
        router.replace(next);
      } catch {
        isFinishing.current = false;
        setStatus("idle");
        setError("errorGeneric");
      }
    })();
  }, [status, isAuthenticated, ensureProfile, locale, next, router]);

  async function verify(value: string) {
    if (!phone || value.length !== CODE_LENGTH) return;
    setStatus("checking");
    setError(null);
    const { error: authError } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code: value,
    });
    if (authError) {
      setStatus("idle");
      setCode("");
      setError(codeErrorKey(authError));
      return;
    }
    setStatus("verified");
  }

  async function resend() {
    if (!phone) return;
    setError(null);
    const { error: sendError } = await authClient.phoneNumber.sendOtp({
      phoneNumber: phone,
    });
    if (sendError) {
      setError("errorGeneric");
      return;
    }
    setSecondsLeft(RESEND_AFTER_SECONDS);
    toast.success(t("resent"));
  }

  if (phone === undefined || phone === null) return <LoginSkeleton />;

  const isBusy = status !== "idle";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("verifyTitle")}
        </h1>
        <p className="text-muted-foreground">
          {t("sentTo", { phone: ltr(formatIndianMobile(phone)) })}
        </p>
        <Link
          href="/login"
          className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("changeNumber")}
        </Link>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void verify(code);
        }}
      >
        <label htmlFor="code" className="text-base font-medium">
          {t("codeLabel")}
        </label>
        <div dir="ltr" className="flex justify-center">
          <InputOTP
            ref={codeInput}
            id="code"
            maxLength={CODE_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            disabled={isBusy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "code-error" : undefined}
            onChange={(value) => {
              setCode(value);
              if (value.length === CODE_LENGTH) void verify(value);
            }}
          >
            <InputOTPGroup>
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="size-12 text-xl"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        {error ? (
          <p id="code-error" role="alert" className="text-sm text-destructive">
            {t(error)}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="h-12 text-base"
          disabled={isBusy || code.length !== CODE_LENGTH}
        >
          {status === "idle" ? t("verify") : null}
          {status === "checking" ? t("verifying") : null}
          {status === "verified" ? t("signingIn") : null}
        </Button>
      </form>

      <div className="flex justify-center" aria-live="polite">
        {secondsLeft > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("resendIn", { seconds: secondsLeft })}
          </p>
        ) : (
          <Button
            variant="ghost"
            onClick={() => {
              void resend();
            }}
          >
            {t("resend")}
          </Button>
        )}
      </div>
    </div>
  );
}
