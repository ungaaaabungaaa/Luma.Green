import {
  lockDeviceSignOut,
  revokeCurrentDevice,
} from "@/components/notifications/device-provider";
import { authClient } from "@/lib/auth-client";
import { beginSignOutLifecycle } from "@/lib/sign-out-lifecycle";

/** Keep registration locked through auth completion and provider cleanup. */
export async function signOutWithDeviceRevocation(
  sessionId: string | undefined,
) {
  const releaseOnFailure = lockDeviceSignOut(sessionId);
  let lifecycle: ReturnType<typeof beginSignOutLifecycle> | undefined;
  try {
    await revokeCurrentDevice();
    lifecycle = beginSignOutLifecycle(sessionId);
    const result = await authClient.signOut();
    if (result.error) throw new Error("SIGN_OUT_FAILED");
    lifecycle.complete();
  } catch (error) {
    lifecycle?.fail();
    releaseOnFailure();
    throw error;
  }
}
