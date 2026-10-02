"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { revokeCurrentDevice } from "@/components/notifications/device-provider";
import { authClient } from "@/lib/auth-client";

/** Keep the session available to retry when device revocation fails. */
export function useSignOut(onSignedOut?: () => void) {
  const t = useTranslations("common");
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  async function signOut() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await revokeCurrentDevice();
      const result = await authClient.signOut();
      if (result.error) throw new Error("SIGN_OUT_FAILED");
      onSignedOut?.();
    } catch {
      toast.error(t("error"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { signOut, busy };
}
