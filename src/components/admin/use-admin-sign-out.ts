"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { revokeCurrentDevice } from "@/components/notifications/device-provider";
import { authClient } from "@/lib/auth-client";

export function useAdminSignOut() {
  const router = useRouter();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signOut() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await revokeCurrentDevice();
      const result = await authClient.signOut();
      if (result.error) {
        setError("Could not sign out. Please try again.");
        return;
      }
      router.replace("/admin/login");
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { signOut, busy, error };
}
