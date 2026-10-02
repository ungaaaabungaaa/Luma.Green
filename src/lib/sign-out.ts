import {
  lockDeviceSignOut,
  revokeCurrentDevice,
} from "@/components/notifications/device-provider";
import { authClient } from "@/lib/auth-client";

/** Keep registration locked through auth completion and provider cleanup. */
export async function signOutWithDeviceRevocation(
  sessionId: string | undefined,
) {
  const releaseOnFailure = lockDeviceSignOut(sessionId);
  try {
    await revokeCurrentDevice();
    const result = await authClient.signOut();
    if (result.error) throw new Error("SIGN_OUT_FAILED");
  } catch (error) {
    releaseOnFailure();
    throw error;
  }
}
