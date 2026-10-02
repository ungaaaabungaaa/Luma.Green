"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { signOutWithDeviceRevocation } from "@/lib/sign-out";

/** Keep the session available to retry when device revocation fails. */
export function useSignOut(onSignedOut?: () => void) {
  const t = useTranslations("common");
  const session = authClient.useSession();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  async function signOut() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await signOutWithDeviceRevocation(session.data?.session.id);
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
