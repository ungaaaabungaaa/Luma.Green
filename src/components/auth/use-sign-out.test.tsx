import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSignOut } from "./use-sign-out";

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
beforeEach(() => {
  vi.resetAllMocks();
});

describe("sign-out recovery", () => {
  it.each(["rejection", "server refusal"])(
    "stays on the screen after %s and allows retry",
    async (failure) => {
      if (failure === "rejection")
        mocks.signOut.mockRejectedValueOnce(new Error("Private failure"));
      else
        mocks.signOut.mockResolvedValueOnce({
          error: { message: "Private failure" },
        });
      mocks.signOut.mockResolvedValueOnce({ error: null });
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useSignOut("Try again.", onSuccess));
      await act(() => result.current.signOut());
      expect(onSuccess).not.toHaveBeenCalled();
      expect(mocks.error).toHaveBeenCalledExactlyOnceWith("Try again.");
      expect(result.current.isSigningOut).toBe(false);
      await act(() => result.current.signOut());
      expect(onSuccess).toHaveBeenCalledOnce();
    },
  );

  it("sends only one request while sign-out is pending", async () => {
    const requestResult = Promise.withResolvers<{ error: null }>();
    mocks.signOut.mockReturnValueOnce(requestResult.promise);
    const { result } = renderHook(() => useSignOut("Try again."));
    let request: Promise<void>;
    act(() => {
      request = result.current.signOut();
    });
    expect(result.current.isSigningOut).toBe(true);
    await act(() => result.current.signOut());
    expect(mocks.signOut).toHaveBeenCalledOnce();
    await act(async () => {
      requestResult.resolve({ error: null });
      await request;
    });
    expect(result.current.isSigningOut).toBe(false);
  });
});
