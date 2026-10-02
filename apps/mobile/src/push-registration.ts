import type { PushResult } from "./push-policy.ts";

interface Permission {
  granted: boolean;
  canAskAgain: boolean;
}

/** Testable permission sequence; a stale document never receives a token. */
export async function registerPush({
  enable,
  isCurrent,
  getPermission,
  explain,
  prepareChannel,
  askPermission,
  getToken,
}: {
  enable: boolean;
  isCurrent: () => boolean;
  getPermission: () => Promise<Permission>;
  explain: () => Promise<boolean>;
  prepareChannel: () => Promise<void>;
  askPermission: () => Promise<Permission>;
  getToken: () => Promise<string>;
}): Promise<Omit<PushResult, "requestId"> | undefined> {
  let permission = await getPermission();
  if (!isCurrent()) return;
  if (enable && !permission.granted && permission.canAskAgain) {
    const isApproved = await explain();
    if (!isCurrent()) return;
    if (!isApproved) return { status: "denied" };
    await prepareChannel();
    if (!isCurrent()) return;
    permission = await askPermission();
  }
  if (!isCurrent()) return;
  if (!permission.granted) return { status: "denied" };
  await prepareChannel();
  if (!isCurrent()) return;
  const token = await getToken();
  if (!isCurrent()) return;
  return { status: "granted", token };
}
