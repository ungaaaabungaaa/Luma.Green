import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useSignOut } from "./use-sign-out";

const calls = vi.hoisted(() => ({
  revoke: vi.fn(),
  signOut: vi.fn(),
  error: vi.fn(),
  translate: (key: string) => key,
}));
vi.mock("@/components/notifications/device-provider", () => ({
  revokeCurrentDevice: calls.revoke,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: calls.signOut },
}));
vi.mock("next-intl", () => ({ useTranslations: () => calls.translate }));
vi.mock("sonner", () => ({ toast: { error: calls.error } }));
beforeEach(() => {
  vi.resetAllMocks();
  calls.revoke.mockResolvedValue(undefined);
  calls.signOut.mockResolvedValue({ error: null });
});

it("revokes this installation before clearing the session and navigating", async () => {
  const done = vi.fn();
  const { result } = renderHook(() => useSignOut(done));
  await act(() => result.current.signOut());
  expect(calls.revoke.mock.invocationCallOrder[0]).toBeLessThan(
    calls.signOut.mock.invocationCallOrder[0],
  );
  expect(done).toHaveBeenCalledOnce();
  expect(result.current.busy).toBe(false);
});

it("keeps the session and allows retry when device revocation fails", async () => {
  calls.revoke.mockRejectedValueOnce(new Error("offline"));
  const done = vi.fn();
  const { result } = renderHook(() => useSignOut(done));
  await act(() => result.current.signOut());
  expect(calls.signOut).not.toHaveBeenCalled();
  expect(done).not.toHaveBeenCalled();
  expect(calls.error).toHaveBeenCalledWith("error");
  await act(() => result.current.signOut());
  expect(done).toHaveBeenCalledOnce();
});

it("does not navigate after an auth error", async () => {
  calls.signOut.mockResolvedValueOnce({ error: { message: "offline" } });
  const done = vi.fn();
  const { result } = renderHook(() => useSignOut(done));
  await act(() => result.current.signOut());
  expect(done).not.toHaveBeenCalled();
  expect(calls.error).toHaveBeenCalledOnce();
});

it("coalesces rapid logout taps while revocation is pending", async () => {
  const deferred = Promise.withResolvers<undefined>();
  calls.revoke.mockReturnValueOnce(deferred.promise);
  const { result } = renderHook(() => useSignOut());
  let first: Promise<void>;
  await act(async () => {
    first = result.current.signOut();
    await result.current.signOut();
  });
  expect(calls.revoke).toHaveBeenCalledOnce();
  await act(async () => {
    deferred.resolve(undefined);
    await first;
  });
  expect(calls.signOut).toHaveBeenCalledOnce();
});
