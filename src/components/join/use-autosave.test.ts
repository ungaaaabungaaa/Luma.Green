import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutosave, withoutUndefined } from "./use-autosave";

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("doesn't save what it started with", () => {
    const save = vi.fn(() => Promise.resolve());
    renderHook(() => useAutosave({ name: "Ramesh" }, save, 1000));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("saves once, with the latest values, after typing stops", async () => {
    const save = vi.fn(() => Promise.resolve());
    const { result, rerender } = renderHook(
      ({ name }) => useAutosave({ name }, save, 1000),
      { initialProps: { name: "R" } },
    );

    rerender({ name: "Ra" });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ name: "Ram" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ name: "Ram" });
    expect(result.current).toBe("saved");
  });

  it("says so when saving fails", async () => {
    const save = vi.fn(() => Promise.reject(new Error("offline")));
    const { result, rerender } = renderHook(
      ({ name }) => useAutosave({ name }, save, 1000),
      { initialProps: { name: "R" } },
    );
    rerender({ name: "Ra" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current).toBe("error");
  });
});

describe("withoutUndefined", () => {
  it("drops only undefined, keeping false, 0 and empty strings", () => {
    expect(
      withoutUndefined({ a: undefined, b: false, c: 0, d: "", e: null }),
    ).toEqual({ b: false, c: 0, d: "", e: null });
  });
});
