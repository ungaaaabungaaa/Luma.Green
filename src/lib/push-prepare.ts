import {
  applicationServerKey,
  isDesktopShell,
  isNativePushAvailable,
  isWebPushAvailable,
  requestNativePush,
} from "./push-device";

interface WebSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
type PreparedDevice =
  | { status: "granted"; kind: "native"; token: string }
  | { status: "granted"; kind: "web"; subscription: WebSubscription }
  | { status: "granted"; kind: "desktop" }
  | { status: "denied" | "unavailable" | "error" | "off" };

/** Stop waiting on browser APIs at logout, even if an OS dialog is still open. */
function waitFor<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  timeoutMs = 15_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("PUSH_CANCELLED"));
      return;
    }
    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new Error("PUSH_CANCELLED"));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("PUSH_TIMEOUT"));
    }, timeoutMs);
    signal.addEventListener("abort", abort, { once: true });
    // Consume late browser results after timeout or logout without rebinding.
    void (async () => {
      try {
        const value = await promise;
        cleanup();
        resolve(value);
      } catch {
        cleanup();
        reject(new Error("PUSH_FAILED"));
      }
    })();
  });
}

async function prepareNative(
  shouldAsk: boolean,
  signal: AbortSignal,
): Promise<PreparedDevice> {
  const result = await requestNativePush(
    shouldAsk ? "luma.push.enable" : "luma.push.status",
    signal,
  );
  if (result.status !== "granted") return { status: result.status };
  return result.token
    ? { status: "granted", kind: "native", token: result.token }
    : { status: "error" };
}

async function prepareDesktop(
  shouldAsk: boolean,
  signal: AbortSignal,
): Promise<PreparedDevice> {
  if (!("Notification" in window)) return { status: "unavailable" };
  const result = shouldAsk
    ? await waitFor(Notification.requestPermission(), signal, 120_000)
    : Notification.permission;
  if (result === "granted") return { status: "granted", kind: "desktop" };
  return { status: result === "denied" ? "denied" : "off" };
}

async function prepareWeb(
  key: string,
  shouldAsk: boolean,
  signal: AbortSignal,
): Promise<PreparedDevice> {
  if (!isWebPushAvailable()) return { status: "unavailable" };
  const result = shouldAsk
    ? await waitFor(Notification.requestPermission(), signal, 120_000)
    : Notification.permission;
  signal.throwIfAborted();
  if (result !== "granted")
    return { status: result === "denied" ? "denied" : "off" };
  const registration = await waitFor(
    navigator.serviceWorker.register("/push-sw.js", { scope: "/" }),
    signal,
  );
  await waitFor(navigator.serviceWorker.ready, signal);
  const existing = await waitFor(
    registration.pushManager.getSubscription(),
    signal,
  );
  if (!shouldAsk && !existing) return { status: "off" };
  const subscription =
    existing ??
    (await waitFor(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(key),
      }),
      signal,
    ));
  const serialized = subscription.toJSON();
  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth)
    throw new Error("INVALID_SUBSCRIPTION");
  return {
    status: "granted",
    kind: "web",
    subscription: {
      endpoint: serialized.endpoint,
      keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth },
    },
  };
}

export async function preparePushDevice(
  settings: { expo: boolean; webKey: string | null },
  shouldAsk: boolean,
  signal: AbortSignal,
): Promise<PreparedDevice> {
  if (isNativePushAvailable())
    return settings.expo
      ? prepareNative(shouldAsk, signal)
      : { status: "unavailable" };
  if (isDesktopShell()) return prepareDesktop(shouldAsk, signal);
  return settings.webKey
    ? prepareWeb(settings.webKey, shouldAsk, signal)
    : { status: "unavailable" };
}
