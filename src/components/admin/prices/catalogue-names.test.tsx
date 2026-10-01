import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogueNames } from "./catalogue-names";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), toast: vi.fn() }));
vi.mock("convex/react", () => ({ useMutation: () => mocks.mutate }));
vi.mock("sonner", () => ({ toast: { error: mocks.toast } }));
beforeEach(() => {
  mocks.mutate.mockReset();
  mocks.toast.mockReset();
});

describe("catalogue name backfill", () => {
  it("waits for an explicit click, disables duplicate clicks and reports the updated count", async () => {
    const user = userEvent.setup();
    const pending = Promise.withResolvers<{ updated: number }>();
    mocks.mutate.mockReturnValue(pending.promise);
    render(<CatalogueNames />);
    expect(mocks.mutate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Add missing names" }));
    expect(
      screen.getByRole("button", { name: "Adding names…" }),
    ).toBeDisabled();
    expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith({});
    await act(async () => {
      pending.resolve({ updated: 26 });
      await pending.promise;
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Added missing names to 26 materials.",
    );
    expect(
      screen.getByRole("button", { name: "Add missing names" }),
    ).toBeEnabled();
  });

  it("reports an idempotent run without claiming a change", async () => {
    const user = userEvent.setup();
    mocks.mutate.mockResolvedValue({ updated: 0 });
    render(<CatalogueNames />);
    await user.click(screen.getByRole("button", { name: "Add missing names" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "All material names are already present.",
    );
  });

  it("shows a useful error when the admin session expires", async () => {
    const user = userEvent.setup();
    mocks.mutate.mockRejectedValue(new ConvexError("NOT_SIGNED_IN"));
    render(<CatalogueNames />);
    await user.click(screen.getByRole("button", { name: "Add missing names" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Sign in again/);
    expect(mocks.toast).toHaveBeenCalledOnce();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add missing names" }),
    ).toBeEnabled();
  });
});
