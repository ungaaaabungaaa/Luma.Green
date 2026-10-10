import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signOutWithDeviceRevocation } from "@/lib/sign-out";
import { beginSignOutLifecycle } from "@/lib/sign-out-lifecycle";

import { api } from "../../../convex/_generated/api";
import { useSignedInQuery } from "./use-signed-in-query";

const logout = vi.hoisted(() => ({ revoke: vi.fn(), signOut: vi.fn() }));
vi.mock("@/components/notifications/device-provider", () => ({
  lockDeviceSignOut: () => vi.fn(),
  revokeCurrentDevice: logout.revoke,
}));

const auth = { isLoading: true, isAuthenticated: false };
const useQuery = vi.fn();
const session: {
  data: { session: { id: string }; user: { id: string } } | null;
  isPending: boolean;
  error: { status: number } | null;
} = { data: null, isPending: false, error: null };

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => session, signOut: logout.signOut },
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => auth,
  useQuery: (...args: unknown[]) => useQuery(...args) as unknown,
}));

beforeEach(() => {
  beginSignOutLifecycle("reset-test-state").fail();
  Object.assign(session, { data: null, isPending: false, error: null });
  logout.revoke.mockReset().mockResolvedValue(undefined);
  logout.signOut.mockReset().mockResolvedValue({ error: null });
  useQuery.mockReset();
  useQuery.mockReturnValue({ kind: "none", application: null });
});

describe("useSignedInQuery", () => {
  it("waits for the session before asking, so nobody is sent to log in", () => {
    Object.assign(auth, { isLoading: true, isAuthenticated: false });
    const { result } = renderHook(() => useSignedInQuery(api.workspace.mine));

    expect(result.current).toBeUndefined();
    expect(useQuery).toHaveBeenCalledWith(api.workspace.mine, "skip");
  });

  it("answers null once Convex knows nobody is signed in", () => {
    Object.assign(auth, { isLoading: false, isAuthenticated: false });
    const { result } = renderHook(() => useSignedInQuery(api.workspace.mine));

    expect(result.current).toBeNull();
    expect(useQuery).toHaveBeenCalledWith(api.workspace.mine, "skip");
  });

  it("runs the query for a signed-in person", () => {
    Object.assign(auth, { isLoading: false, isAuthenticated: true });
    session.data = { session: { id: "identity-a" }, user: { id: "user-a" } };
    const { result } = renderHook(() => useSignedInQuery(api.workspace.mine));

    expect(result.current).toEqual({ kind: "none", application: null });
    expect(useQuery).toHaveBeenCalledWith(api.workspace.mine, {});
  });

  it("waits for Better Auth to settle before treating Convex false as sign-out", () => {
    Object.assign(auth, { isLoading: false, isAuthenticated: false });
    session.isPending = true;
    const { result } = renderHook(() => useSignedInQuery(api.workspace.mine));
    expect(result.current).toBeUndefined();
    expect(useQuery).toHaveBeenLastCalledWith(api.workspace.mine, "skip");
  });

  it("keeps a valid session unavailable when Convex authentication fails", () => {
    Object.assign(auth, { isLoading: false, isAuthenticated: false });
    session.data = { session: { id: "identity-a" }, user: { id: "user-a" } };
    expect(() =>
      renderHook(() => useSignedInQuery(api.workspace.mine)),
    ).toThrow("AUTH_SERVICE_UNAVAILABLE");
    expect(useQuery).not.toHaveBeenCalled();
  });

  it("does not interpret a session transport failure as confirmed sign-out", () => {
    Object.assign(auth, { isLoading: false, isAuthenticated: false });
    session.error = { status: 503 };
    expect(() =>
      renderHook(() => useSignedInQuery(api.workspace.mine)),
    ).toThrow("AUTH_SERVICE_UNAVAILABLE");
    expect(useQuery).not.toHaveBeenCalled();
  });

  it.each([401, 403])("preserves explicit session rejection %s", (status) => {
    Object.assign(auth, { isLoading: false, isAuthenticated: false });
    session.error = { status };
    const { result } = renderHook(() => useSignedInQuery(api.workspace.mine));
    expect(result.current).toBeNull();
    expect(useQuery).toHaveBeenLastCalledWith(api.workspace.mine, "skip");
  });

  it("removes cached data while identity changes and after confirmed logout", () => {
    Object.assign(auth, { isLoading: false, isAuthenticated: true });
    session.data = { session: { id: "identity-a" }, user: { id: "user-a" } };
    const first = { kind: "org", org: { name: "Previous account" } };
    useQuery.mockReturnValue(first);
    const { result, rerender } = renderHook(() =>
      useSignedInQuery(api.workspace.mine),
    );
    expect(result.current).toEqual(first);
    session.isPending = true;
    rerender();
    expect(result.current).toBeUndefined();
    expect(useQuery).toHaveBeenLastCalledWith(api.workspace.mine, "skip");
    Object.assign(auth, { isLoading: true, isAuthenticated: false });
    session.data = { session: { id: "identity-b" }, user: { id: "user-b" } };
    session.isPending = false;
    rerender();
    expect(result.current).toBeUndefined();
    const next = { kind: "none", application: null };
    useQuery.mockReturnValue(next);
    Object.assign(auth, { isLoading: false, isAuthenticated: true });
    rerender();
    expect(result.current).toEqual(next);
    session.data = null;
    Object.assign(auth, { isLoading: false, isAuthenticated: false });
    rerender();
    expect(result.current).toBeNull();
    expect(useQuery).toHaveBeenLastCalledWith(api.workspace.mine, "skip");
  });
});

it("hides stale private results throughout deliberate sign-out without reporting an outage", async () => {
  Object.assign(auth, { isLoading: false, isAuthenticated: true });
  session.data = { session: { id: "logout-session" }, user: { id: "user-a" } };
  const response = Promise.withResolvers<{ error: null }>();
  logout.signOut.mockReturnValueOnce(response.promise);
  const { result, rerender } = renderHook(() =>
    useSignedInQuery(api.workspace.mine),
  );
  expect(result.current).not.toBeNull();
  let signingOut: Promise<void> | undefined;
  await act(async () => {
    signingOut = signOutWithDeviceRevocation("logout-session");
    await Promise.resolve();
  });
  expect(result.current).toBeUndefined();
  expect(useQuery).toHaveBeenLastCalledWith(api.workspace.mine, "skip");
  Object.assign(auth, { isLoading: false, isAuthenticated: false });
  rerender();
  expect(result.current).toBeUndefined();
  await act(async () => {
    response.resolve({ error: null });
    await signingOut;
  });
  expect(result.current).toBeNull();
  expect(useQuery).toHaveBeenLastCalledWith(api.workspace.mine, "skip");
  session.data = null;
  rerender();
  expect(result.current).toBeNull();
});

it("keeps private access available while device revocation fails, then permits retry", async () => {
  Object.assign(auth, { isLoading: false, isAuthenticated: true });
  session.data = { session: { id: "revoke-failure" }, user: { id: "user-a" } };
  const revoke = Promise.withResolvers<undefined>();
  logout.revoke.mockReturnValueOnce(revoke.promise);
  const { result } = renderHook(() => useSignedInQuery(api.workspace.mine));
  let signingOut: Promise<unknown> | undefined;
  await act(async () => {
    signingOut = observeFailedSignOut("revoke-failure");
    await Promise.resolve();
  });
  expect(result.current).toEqual({ kind: "none", application: null });
  expect(logout.signOut).not.toHaveBeenCalled();
  await act(async () => {
    revoke.reject(new Error("device offline"));
    expect(await signingOut).toBe("failed");
  });
  expect(result.current).toEqual({ kind: "none", application: null });
  await act(() => signOutWithDeviceRevocation("revoke-failure"));
  expect(result.current).toBeNull();
});

it.each(["rejection", "server refusal"])(
  "restores query and outage handling after logout %s",
  async (failure) => {
    Object.assign(auth, { isLoading: false, isAuthenticated: true });
    session.data = { session: { id: "auth-failure" }, user: { id: "user-a" } };
    const response = Promise.withResolvers<{ error: { message: string } }>();
    logout.signOut.mockReturnValueOnce(response.promise);
    const { result, rerender } = renderHook(() =>
      useSignedInQuery(api.workspace.mine),
    );
    let signingOut: Promise<unknown> | undefined;
    await act(async () => {
      signingOut = observeFailedSignOut("auth-failure");
      await Promise.resolve();
    });
    expect(result.current).toBeUndefined();
    await act(async () => {
      if (failure === "rejection") response.reject(new Error("offline"));
      else response.resolve({ error: { message: "offline" } });
      expect(await signingOut).toBe("failed");
    });
    expect(result.current).toEqual({ kind: "none", application: null });
    expect(useQuery).toHaveBeenLastCalledWith(api.workspace.mine, {});
    Object.assign(auth, { isLoading: false, isAuthenticated: false });
    expect(() => {
      rerender();
    }).toThrow("AUTH_SERVICE_UNAVAILABLE");
  },
);

it.each(["user-a", "user-b"])(
  "does not suppress authentication checks for a new session of %s",
  async (userId) => {
    Object.assign(auth, { isLoading: false, isAuthenticated: true });
    session.data = {
      session: { id: "previous-session" },
      user: { id: "user-a" },
    };
    const { result, rerender } = renderHook(() =>
      useSignedInQuery(api.workspace.mine),
    );
    await act(() => signOutWithDeviceRevocation("previous-session"));
    expect(result.current).toBeNull();
    session.data = { session: { id: "new-session" }, user: { id: userId } };
    rerender();
    expect(result.current).toEqual({ kind: "none", application: null });
    Object.assign(auth, { isLoading: false, isAuthenticated: false });
    expect(() => {
      rerender();
    }).toThrow("AUTH_SERVICE_UNAVAILABLE");
  },
);

async function observeFailedSignOut(sessionId: string) {
  try {
    await signOutWithDeviceRevocation(sessionId);
    return "unexpected-success";
  } catch {
    return "failed";
  }
}
