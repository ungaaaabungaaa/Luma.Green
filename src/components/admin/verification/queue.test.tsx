import { render, screen, within } from "@testing-library/react";
import type { FunctionReturnType } from "convex/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { VerificationQueue } from "./queue";

type Queue = FunctionReturnType<typeof api.review.queue>;

const queue = vi.fn<() => Queue | undefined>();

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useQuery: () => queue(),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const HOUR = 60 * 60 * 1000;
// The clock reads to the minute: a few spare minutes keep the hours whole.
const MINUTES = 5 * 60 * 1000;

function item(
  overrides: Partial<Queue[number]> &
    Pick<Queue[number], "name" | "waitingSince">,
): Queue[number] {
  return {
    id: `k17${overrides.name.replaceAll(/\W/g, "")}` as Id<"applications">,
    kind: "yard",
    status: "submitted",
    contactName: undefined,
    phone: undefined,
    area: undefined,
    submittedAt: overrides.waitingSince,
    hoursWaiting: 0,
    sla: "ok",
    fileCount: 3,
    version: 1,
    ...overrides,
  };
}

beforeEach(() => {
  queue.mockReset();
});

describe("VerificationQueue", () => {
  it("shows each application's wait against the 24-hour goal", () => {
    const now = Date.now();
    queue.mockReturnValue([
      item({
        name: "Old Town Recyclers",
        kind: "recycler",
        waitingSince: now - 30 * HOUR - MINUTES,
      }),
      item({
        name: "Irfan Metal & Plastic Yard",
        waitingSince: now - 19 * HOUR - MINUTES,
        area: "Hegde Nagar",
        phone: "+919000000107",
      }),
      item({
        name: "Kavitha Raddi Shop",
        kind: "kabadiwala",
        waitingSince: now - 2 * HOUR - MINUTES,
        fileCount: 0,
        version: 2,
      }),
      item({
        name: "Geetha M",
        kind: "saathi",
        status: "changes_requested",
        waitingSince: now - 3 * HOUR - MINUTES,
      }),
    ]);
    render(<VerificationQueue />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Verification" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("3 waiting · 1 due soon · 1 overdue"),
    ).toBeInTheDocument();

    // Wide screens get a table; its rows keep the queue's order.
    const table = screen.getAllByRole("table").at(0);
    expect(table).toBeDefined();
    if (table) {
      const rows = within(table).getAllByRole("row").slice(1);
      expect(
        rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent),
      ).toEqual([
        expect.stringContaining("Old Town Recyclers") as unknown,
        expect.stringContaining("Irfan Metal & Plastic Yard") as unknown,
        expect.stringContaining("Kavitha Raddi Shop") as unknown,
      ]);
      expect(
        within(rows[0] ?? table).getByText(/30 h · Overdue/),
      ).toBeInTheDocument();
      expect(
        within(rows[1] ?? table).getByText(/19 h · Due soon/),
      ).toBeInTheDocument();
      expect(
        within(rows[2] ?? table).getByText(/2 h · On time/),
      ).toBeInTheDocument();
      expect(
        within(rows[2] ?? table).getByText("Version 2"),
      ).toBeInTheDocument();
    }

    const [review] = screen.getAllByRole("link", {
      name: "Review Irfan Metal & Plastic Yard",
    });
    expect(review).toHaveAttribute(
      "href",
      "/admin/verification/k17IrfanMetalPlasticYard",
    );

    const withApplicant = screen.getByRole("region", {
      name: "With the applicant",
    });
    expect(
      within(withApplicant).getAllByText("With applicant · 3 h").length,
    ).toBeGreaterThan(0);
  });

  it("says when there's nothing to review", () => {
    queue.mockReturnValue([]);
    render(<VerificationQueue />);
    expect(screen.getByText("Nothing to review")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "With the applicant" }),
    ).not.toBeInTheDocument();
  });

  it("keeps its heading while the queue loads", () => {
    queue.mockReturnValue(undefined);
    render(<VerificationQueue />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Verification" }),
    ).toBeInTheDocument();
  });
});
