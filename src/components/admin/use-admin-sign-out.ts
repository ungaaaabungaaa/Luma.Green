"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { signOutWithDeviceRevocation } from "@/lib/sign-out";

export function useAdminSignOut() {
  const router = useRouter();
  const session = authClient.useSession();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signOut() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await signOutWithDeviceRevocation(session.data?.session.id);
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
