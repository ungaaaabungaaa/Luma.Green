import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../../convex/_generated/api";
import { useSignedInQuery } from "./use-signed-in-query";

const auth = { isLoading: true, isAuthenticated: false };
const useQuery = vi.fn();
const session: {
  data: { session: { id: string }; user: { id: string } } | null;
  isPending: boolean;
  error: { status: number } | null;
} = { data: null, isPending: false, error: null };

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => session },
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => auth,
  useQuery: (...args: unknown[]) => useQuery(...args) as unknown,
}));

describe("useSignedInQuery", () => {
  beforeEach(() => {
    Object.assign(session, { data: null, isPending: false, error: null });
    useQuery.mockReset();
    useQuery.mockReturnValue({ kind: "none", application: null });
  });

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
