import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogueSetup } from "./catalogue-setup";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), toast: vi.fn() }));
vi.mock("convex/react", () => ({ useMutation: () => mocks.mutate }));
vi.mock("sonner", () => ({ toast: { error: mocks.toast } }));
beforeEach(() => {
  mocks.mutate.mockReset();
  mocks.toast.mockReset();
});

describe("catalogue definition setup", () => {
  it("waits for an explicit click, disables duplicate clicks and reports the inserted count", async () => {
    const user = userEvent.setup();
    const pending = Promise.withResolvers<{ inserted: number }>();
    mocks.mutate.mockReturnValue(pending.promise);
    render(<CatalogueSetup />);
    expect(mocks.mutate).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Add catalogue definitions" }),
    );
    expect(
      screen.getByRole("button", { name: "Adding definitions…" }),
    ).toBeDisabled();
    expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith({});
    await act(async () => {
      pending.resolve({ inserted: 26 });
      await pending.promise;
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Added 26 material definitions. Set the approved minimum and fallback prices next.",
    );
    expect(
      screen.getByRole("button", { name: "Add catalogue definitions" }),
    ).toBeEnabled();
  });

  it("reports an idempotent run without claiming a change", async () => {
    const user = userEvent.setup();
    mocks.mutate.mockResolvedValue({ inserted: 0 });
    render(<CatalogueSetup />);
    await user.click(
      screen.getByRole("button", { name: "Add catalogue definitions" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "All catalogue definitions are already present.",
    );
  });

  it("shows a useful error when the admin session expires", async () => {
    const user = userEvent.setup();
    mocks.mutate.mockRejectedValue(new ConvexError("NOT_SIGNED_IN"));
    render(<CatalogueSetup />);
    await user.click(
      screen.getByRole("button", { name: "Add catalogue definitions" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Sign in again/);
    expect(mocks.toast).toHaveBeenCalledOnce();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add catalogue definitions" }),
    ).toBeEnabled();
  });
});
