import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminSignOut } from "@/components/admin/use-admin-sign-out";

import messages from "../../../messages/en.json";
import {
  NotificationDeviceProvider,
  NotificationRevocationProvider,
  revokeCurrentDevice,
  useNotificationDevice,
} from "./device-provider";

interface MockState {
  settings: { webKey: string | null; expo: boolean } | undefined;
  settingsError: boolean;
  me: { hasProfile: boolean };
  session: { data: { session: { id: string } } };
  registerExpo: ReturnType<typeof vi.fn>;
  registerWeb: ReturnType<typeof vi.fn>;
  unregister: ReturnType<typeof vi.fn>;
  unregisterInstallation: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
}
const mocks = vi.hoisted((): MockState => ({
  settings: { webKey: null, expo: true },
  settingsError: false,
  me: { hasProfile: true },
  session: { data: { session: { id: "session-a" } } },
  registerExpo: vi.fn(),
  registerWeb: vi.fn(),
  unregister: vi.fn(),
  unregisterInstallation: vi.fn(),
  postMessage: vi.fn(),
  signOut: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("@/components/providers/convex-provider", () => ({
  isConvexConfigured: true,
}));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => mocks.session, signOut: mocks.signOut },
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
  useQuery: (query: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(query);
    if (name === "identity:me") return mocks.me;
    if (name === "push:settings") {
      if (mocks.settingsError) throw new Error("push:settings is unavailable");
      return mocks.settings;
    }
    throw new Error(name);
  },
  useMutation: (mutation: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(mutation);
    const functions = {
      "push:registerExpo": mocks.registerExpo,
      "push:registerWeb": mocks.registerWeb,
      "push:unregister": mocks.unregister,
      "push:unregisterInstallation": mocks.unregisterInstallation,
    };
    const key = name as keyof typeof functions;
    return functions[key];
  },
}));

function Controls() {
  const device = useNotificationDevice();
  return (
    <>
      <p role="status">{device?.status}</p>
      <button
        onClick={() => {
          void device?.enable();
        }}
      >
        Enable
      </button>
    </>
  );
}
function App() {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <NotificationDeviceProvider>
        <input aria-label="Unsaved form" />
        <Controls />
      </NotificationDeviceProvider>
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  mocks.settings = { webKey: null, expo: true };
  mocks.settingsError = false;
  mocks.postMessage.mockReset();
  mocks.registerExpo.mockReset().mockResolvedValue("device-a");
  mocks.registerWeb.mockReset();
  mocks.unregister.mockReset().mockResolvedValue(null);
  mocks.unregisterInstallation.mockReset().mockResolvedValue(null);
  mocks.signOut.mockReset().mockResolvedValue({ error: null });
  mocks.replace.mockReset();
  vi.stubGlobal("ReactNativeWebView", { postMessage: mocks.postMessage });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function nativeResult(status: string, token?: string) {
  const sent = JSON.parse(
    mocks.postMessage.mock.calls.at(-1)![0] as string,
  ) as { requestId: string };
  document.dispatchEvent(
    new CustomEvent("luma-push-result", {
      detail: {
        requestId: sent.requestId,
        status,
        ...(token && { token }),
      },
    }),
  );
}

describe("authenticated notification lifecycle", () => {
  it("retains failed cleanup across reloads until revocation succeeds", async () => {
    const installation = "11111111-1111-4111-8111-111111111111";
    localStorage.setItem("luma.push.enabled", "true");
    localStorage.setItem("luma.push.installation", installation);
    mocks.settings = undefined;
    mocks.unregisterInstallation.mockRejectedValueOnce(new Error("offline"));
    const view = render(<App />);
    await expect(revokeCurrentDevice()).rejects.toThrow("offline");
    expect(localStorage.getItem("luma.push.enabled")).toBeNull();
    expect(localStorage.getItem("luma.push.revocation-pending")).toBe("true");
    view.unmount();
    await expect(revokeCurrentDevice()).rejects.toThrow("PUSH_NOT_READY");
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("error");
    expect(mocks.postMessage).not.toHaveBeenCalled();
    await act(async () => {
      await revokeCurrentDevice();
    });
    expect(localStorage.getItem("luma.push.revocation-pending")).toBeNull();
    expect(mocks.unregisterInstallation).toHaveBeenLastCalledWith({
      installationId: installation,
    });
  });
  it("preserves application state when the optional notification backend fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      // React reports the deliberately caught query failure to the console.
    });
    const user = userEvent.setup();
    const view = render(<App />);
    const input = screen.getByRole("textbox", { name: "Unsaved form" });
    await user.type(input, "Keep my work");
    mocks.settingsError = true;
    view.rerender(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("unavailable");
    expect(screen.getByRole("textbox", { name: "Unsaved form" })).toBe(input);
    expect(input).toHaveValue("Keep my work");
    expect(mocks.postMessage).not.toHaveBeenCalled();
  });
  it("lets the admin revoke a previous locale device before logout without intl", async () => {
    const installation = "11111111-1111-4111-8111-111111111111";
    localStorage.setItem("luma.push.enabled", "true");
    localStorage.setItem("luma.push.installation", installation);
    const user = userEvent.setup();
    render(
      <NotificationRevocationProvider>
        <AdminLogout />
      </NotificationRevocationProvider>,
    );
    expect(mocks.postMessage).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(mocks.unregisterInstallation).toHaveBeenCalledWith({
      installationId: installation,
    });
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(
      mocks.unregisterInstallation.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]);
    expect(mocks.replace).toHaveBeenCalledWith("/admin/login");
  });
  it("does not claim cleanup succeeded when browser storage is blocked", async () => {
    render(<App />);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    await expect(revokeCurrentDevice()).rejects.toThrow("storage blocked");
    expect(mocks.unregisterInstallation).not.toHaveBeenCalled();
  });
  it("never prompts on initial mount and binds only after explicit enable", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(mocks.postMessage).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Enable" }));
    expect(mocks.postMessage).toHaveBeenCalledOnce();
    expect(mocks.registerExpo).not.toHaveBeenCalled();
    await act(() => {
      nativeResult("granted", "ExpoPushToken[device]");
      return Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("granted");
    expect(mocks.registerExpo).toHaveBeenCalledWith({
      token: "ExpoPushToken[device]",
      locale: "en",
      installationId: expect.stringMatching(/^[a-f\d-]{36}$/),
    });
    expect(localStorage.getItem("luma.push.enabled")).toBe("true");
    expect(JSON.stringify(localStorage)).not.toContain("ExpoPushToken");
  });
  it("restores an enabled device with status, never an enable prompt", async () => {
    localStorage.setItem("luma.push.enabled", "true");
    render(<App />);
    await waitFor(() => {
      expect(mocks.postMessage).toHaveBeenCalledOnce();
    });
    expect(mocks.postMessage.mock.calls[0][0]).toContain("luma.push.status");
    await act(() => {
      nativeResult("granted", "ExpoPushToken[restored]");
      return Promise.resolve();
    });
    expect(mocks.registerExpo).toHaveBeenCalledOnce();
  });
  it("can revoke before settings or token restoration completes", async () => {
    mocks.settings = undefined;
    const installation = "11111111-1111-4111-8111-111111111111";
    localStorage.setItem("luma.push.enabled", "true");
    localStorage.setItem("luma.push.installation", installation);
    render(<App />);
    await act(async () => {
      await revokeCurrentDevice();
    });
    expect(mocks.unregisterInstallation).toHaveBeenCalledWith({
      installationId: installation,
    });
    expect(mocks.registerExpo).not.toHaveBeenCalled();
  });
  it("removes a late registration before logout completes", async () => {
    const registration = Promise.withResolvers<string>();
    mocks.registerExpo.mockReturnValue(registration.promise);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Enable" }));
    act(() => {
      nativeResult("granted", "ExpoPushToken[late]");
    });
    await waitFor(() => {
      expect(mocks.registerExpo).toHaveBeenCalledOnce();
    });
    let isFinished = false;
    const revoking = (async () => {
      await revokeCurrentDevice();
      isFinished = true;
    })();
    expect(isFinished).toBe(false);
    await act(async () => {
      registration.resolve("late-device");
      await revoking;
    });
    expect(mocks.unregister).toHaveBeenCalledWith({ id: "late-device" });
    expect(mocks.unregisterInstallation).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("off");
  });
  it("reports denied without binding a token", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Enable" }));
    await act(() => {
      nativeResult("denied");
      return Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("denied");
    expect(mocks.registerExpo).not.toHaveBeenCalled();
  });
  it("rejects revocation failure so the caller keeps the session", async () => {
    localStorage.setItem(
      "luma.push.installation",
      "11111111-1111-4111-8111-111111111111",
    );
    mocks.unregisterInstallation.mockRejectedValue(new Error("offline"));
    render(<App />);
    await expect(revokeCurrentDevice()).rejects.toThrow("offline");
  });
});

function AdminLogout() {
  const { signOut, error } = useAdminSignOut();
  return (
    <>
      <button
        onClick={() => {
          void signOut();
        }}
      >
        Sign out
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </>
  );
}
