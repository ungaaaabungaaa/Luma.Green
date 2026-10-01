import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DispatchSettings } from "./dispatch-settings";
import { renderWithIntl } from "./test-helpers";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("convex/react", () => ({ useMutation: vi.fn(), useQuery: vi.fn() }));
const save = vi.fn();

beforeEach(() => {
  save.mockReset().mockResolvedValue(null);
  vi.mocked(useQuery).mockReturnValue({
    autoAccept: false,
    pickupRadiusKm: 5,
    canManage: true,
    canAutoAccept: true,
  });
  vi.mocked(useMutation).mockReturnValue(
    save as unknown as ReturnType<typeof useMutation>,
  );
});

describe("DispatchSettings", () => {
  it("saves an explicit auto-accept choice and radius", async () => {
    renderWithIntl(<DispatchSettings />);
    await userEvent.click(
      screen.getByRole("switch", {
        name: "Accept nearby pickups automatically",
      }),
    );
    const radius = screen.getByRole("spinbutton", {
      name: "Pickup radius (km)",
    });
    await userEvent.clear(radius);
    await userEvent.type(radius, "8");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(save).toHaveBeenCalledWith({ autoAccept: true, pickupRadiusKm: 8 });
  });

  it("rejects fractional and out-of-range radii before saving", async () => {
    renderWithIntl(<DispatchSettings />);
    const radius = screen.getByRole("spinbutton", {
      name: "Pickup radius (km)",
    });
    for (const value of ["0", "51", "1.5"]) {
      await userEvent.clear(radius);
      await userEvent.type(radius, value);
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Choose a whole number from 1 to 50.",
      );
    }
    expect(save).not.toHaveBeenCalled();
  });

  it("makes settings read-only for staff", () => {
    vi.mocked(useQuery).mockReturnValue({
      autoAccept: false,
      pickupRadiusKm: 5,
      canManage: false,
      canAutoAccept: true,
    });
    renderWithIntl(<DispatchSettings />);
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(screen.getByRole("spinbutton")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByText("Only the shop owner can change pickup settings."),
    ).toBeVisible();
  });

  it("cannot enable automatic acceptance before pickup location is ready", () => {
    vi.mocked(useQuery).mockReturnValue({
      autoAccept: false,
      pickupRadiusKm: 5,
      canManage: true,
      canAutoAccept: false,
    });
    renderWithIntl(<DispatchSettings />);
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(screen.getByRole("spinbutton")).toBeEnabled();
  });

  it("keeps entered values after a failure so the owner can retry", async () => {
    save.mockRejectedValueOnce(new Error("offline"));
    renderWithIntl(<DispatchSettings />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not save these settings. Try again.",
    );
    expect(
      screen.getByRole("spinbutton", { name: "Pickup radius (km)" }),
    ).toHaveValue(5);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(save).toHaveBeenCalledTimes(2);
  });
});
