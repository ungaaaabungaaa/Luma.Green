import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FunctionReturnType } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../../../convex/_generated/api";
import { PilotNumbers } from "./pilot-numbers";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("convex/react", () => ({ useQuery: mocks.query }));

type Summary = FunctionReturnType<typeof api.pilot.summary>;
const summary: Summary = {
  from: 0,
  to: 1000,
  sampleLimit: 1000,
  bookingsTruncated: false,
  applicationsTruncated: false,
  bookings: {
    count: 3,
    outcomes: {
      requested: 1,
      accepted: 0,
      on_the_way: 0,
      completed: 1,
      declined: 1,
      cancelled: 0,
    },
    acceptedCount: 1,
    averageAcceptMs: 120_000,
    reassignedCount: 1,
    completedWithReceipt: 1,
    paidPaise: 25_050,
    estimatedPaise: 24_000,
    weighedGrams: 10_500,
    materials: [
      { code: "PAPER-NEWS", estimatedGrams: 10_000, weighedGrams: 10_500 },
    ],
  },
  applications: {
    count: 2,
    decidedCount: 1,
    awaitingDecisionCount: 1,
    averageDecisionMs: 3_600_000,
  },
};

beforeEach(() => {
  mocks.query.mockReset();
  mocks.query.mockReturnValue(summary);
});

describe("pilot numbers", () => {
  it("shows receipt totals and explains unmeasured data", () => {
    render(<PilotNumbers />);
    expect(
      screen.getByRole("heading", { name: "Pilot numbers" }),
    ).toBeInTheDocument();
    expect(screen.getByText("10.5 kg")).toBeInTheDocument();
    expect(screen.getByText("₹250.50")).toBeInTheDocument();
    expect(screen.getByText("2 min")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("cell", { name: "PAPER-NEWS" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/They are not zero/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps exact gram differences visible beside the material chart", () => {
    mocks.query.mockReturnValue({
      ...summary,
      bookings: {
        ...summary.bookings,
        materials: [
          { code: "PAPER-NEWS", estimatedGrams: 1000, weighedGrams: 1001 },
        ],
      },
    });
    render(<PilotNumbers />);
    const table = screen.getByRole("table");
    const cells = within(table).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual([
      "PAPER-NEWS",
      "1",
      "1.001",
      "0.001",
    ]);
  });

  it("lets the admin choose the pilot dates with the keyboard", async () => {
    const user = userEvent.setup();
    render(<PilotNumbers />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Today" })).toHaveFocus();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "13–20 October" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: "13–20 October" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(mocks.query).toHaveBeenLastCalledWith(api.pilot.summary, {
      from: Date.parse("2026-10-13T00:00:00+05:30"),
      to: Date.parse("2026-10-21T00:00:00+05:30"),
    });
  });

  it("warns when a bounded query does not include the full period", () => {
    mocks.query.mockReturnValue({ ...summary, bookingsTruncated: true });
    render(<PilotNumbers />);
    expect(screen.getByRole("alert")).toHaveTextContent(/Partial report/);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Choose a shorter period/,
    );
  });

  it("distinguishes loading, no records and unavailable averages", () => {
    mocks.query.mockReturnValue(undefined);
    const { rerender } = render(<PilotNumbers />);
    expect(
      screen.getByRole("status", { name: "Loading pilot numbers" }),
    ).toBeInTheDocument();
    mocks.query.mockReturnValue({
      ...summary,
      bookings: {
        ...summary.bookings,
        count: 0,
        averageAcceptMs: null,
        materials: [],
      },
      applications: {
        ...summary.applications,
        count: 0,
        averageDecisionMs: null,
      },
    });
    rerender(<PilotNumbers />);
    expect(screen.getByRole("status")).toHaveTextContent(
      /No bookings or submitted applications/,
    );
    expect(screen.getAllByText("Not available")).toHaveLength(2);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
