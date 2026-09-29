import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../../convex/_generated/api";
import { useSignedInQuery } from "./use-signed-in-query";

const auth = { isLoading: true, isAuthenticated: false };
const useQuery = vi.fn();

vi.mock("convex/react", () => ({
  useConvexAuth: () => auth,
  useQuery: (...args: unknown[]) => useQuery(...args) as unknown,
}));

describe("useSignedInQuery", () => {
  beforeEach(() => {
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
    const { result } = renderHook(() => useSignedInQuery(api.workspace.mine));

    expect(result.current).toEqual({ kind: "none", application: null });
    expect(useQuery).toHaveBeenCalledWith(api.workspace.mine, {});
  });
});
