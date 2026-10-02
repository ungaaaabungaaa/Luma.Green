/** Narrow mobile bridge. The native shell separately checks document and origin. */
interface NativeBridge {
  postMessage: (message: string) => void;
}
type NativeWindow = Window & { ReactNativeWebView?: NativeBridge };
export interface PushResult {
  requestId: string;
  status: "granted" | "denied" | "unavailable" | "error";
  token?: string;
}

export function isNativePushAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as NativeWindow).ReactNativeWebView)
  );
}

export function parsePushResult(value: unknown): PushResult | undefined {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some(
      (key) => !["requestId", "status", "token"].includes(key),
    ) ||
    typeof record.requestId !== "string" ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(record.requestId)
  )
    return;
  const status = record.status;
  if (
    status !== "granted" &&
    status !== "denied" &&
    status !== "unavailable" &&
    status !== "error"
  )
    return;
  if (
    record.token !== undefined &&
    (status !== "granted" ||
      typeof record.token !== "string" ||
      record.token.length > 256 ||
      !/^(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(record.token))
  )
    return;
  return {
    requestId: record.requestId,
    status,
    ...(typeof record.token === "string" && { token: record.token }),
  };
}

export function requestNativePush(
  type: "luma.push.enable" | "luma.push.status",
  signal: AbortSignal,
): Promise<PushResult> {
  return new Promise((resolve, reject) => {
    const bridge = (window as NativeWindow).ReactNativeWebView;
    if (!bridge || signal.aborted) {
      reject(new Error("PUSH_UNAVAILABLE"));
      return;
    }
    const requestId = crypto.randomUUID();
    const cleanup = () => {
      window.clearTimeout(timeout);
      document.removeEventListener("luma-push-result", receive);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new Error("PUSH_CANCELLED"));
    };
    const receive = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const result = parsePushResult(event.detail);
      if (result?.requestId !== requestId) return;
      cleanup();
      resolve(result);
    };
    const timeout = window.setTimeout(
      () => {
        cleanup();
        reject(new Error("PUSH_TIMEOUT"));
      },
      type === "luma.push.enable" ? 120_000 : 15_000,
    );
    document.addEventListener("luma-push-result", receive);
    signal.addEventListener("abort", abort, { once: true });
    try {
      bridge.postMessage(JSON.stringify({ type, requestId }));
    } catch {
      cleanup();
      reject(new Error("PUSH_UNAVAILABLE"));
    }
  });
}

export function isDesktopShell(): boolean {
  return (
    typeof navigator !== "undefined" && /\bElectron\//.test(navigator.userAgent)
  );
}

export function isWebPushAvailable(): boolean {
  return (
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const bytes = atob(
    value.replaceAll("-", "+").replaceAll("_", "/") +
      "=".repeat((4 - (value.length % 4)) % 4),
  );
  return Uint8Array.from(bytes, (character) => character.codePointAt(0) ?? 0);
}
