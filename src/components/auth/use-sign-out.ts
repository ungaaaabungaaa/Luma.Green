"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

/** Leave the current screen only after the server confirms sign-out. */
export function useSignOut(errorMessage: string, onSuccess?: () => void) {
  const pending = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (pending.current) return;
    pending.current = true;
    setIsSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        toast.error(errorMessage);
        return;
      }
      onSuccess?.();
    } catch {
      toast.error(errorMessage);
    } finally {
      pending.current = false;
      setIsSigningOut(false);
    }
  }

  return { signOut, isSigningOut };
}
