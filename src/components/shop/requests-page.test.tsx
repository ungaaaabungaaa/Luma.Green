import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";
import { RequestsPage } from "./requests-page";
import {
  booking,
  fakeQueries,
  NEWSPAPER,
  NOW,
  renderWithIntl,
  SHOP_WORKSPACE,
  YARD_WORKSPACE,
} from "./test-helpers";
import type { Requests } from "./types";

const mocks = vi.hoisted(() => ({
  search: { current: new URLSearchParams() },
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.search.current,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
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

const respond = vi.fn();

const PRIYA = booking({ id: "new-1" as Id<"bookings"> });
const MEENA = booking({
  id: "active-1" as Id<"bookings">,
  name: "Meena Iyer",
  phone: "+919845000012",
  address: "5, Sampige Road, Malleshwaram, Bengaluru",
  items: [{ material: NEWSPAPER, estKg: 20 }],
  slotWindow: "afternoon",
  status: "accepted",
});
const ARJUN = booking({
  id: "active-2" as Id<"bookings">,
  name: "Arjun Nair",
  address: "22, 2nd Cross, Mathikere, Bengaluru",
  slotDate: "2026-09-30",
  slotWindow: "morning",
  status: "accepted",
});
const VIKRAM = booking({
  id: "done-1" as Id<"bookings">,
  name: "Vikram Shetty",
  slotDate: "2026-09-28",
  status: "completed",
  receipt: {
    lines: [
      { material: NEWSPAPER, grams: 20_000, paisePerKg: 1500, paise: 30_000 },
    ],
    totalPaise: 30_000,
    method: "cash",
    paidAt: NOW.getTime() - 86_400_000,
  },
});

const REQUESTS: Requests = {
  new: [PRIYA],
  active: [MEENA, ARJUN],
  done: [VIKRAM],
};

function renderPage({
  requests = REQUESTS,
  workspace = SHOP_WORKSPACE,
  tab,
}: {
  requests?: Requests;
  workspace?: unknown;
  tab?: string;
} = {}) {
  mocks.search.current = new URLSearchParams(tab ? { tab } : {});
  vi.mocked(useQuery).mockImplementation(
    fakeQueries({
      "workspace:mine": workspace,
      "shop:requests": requests,
    }) as unknown as typeof useQuery,
  );
  renderWithIntl(<RequestsPage />);
}

beforeEach(() => {
  respond.mockReset();
  respond.mockResolvedValue(null);
  window.history.replaceState(null, "", "/app/requests");
  vi.mocked(useMutation).mockReturnValue(
    respond as unknown as ReturnType<typeof useMutation>,
  );
});

describe("RequestsPage", () => {
  it("shows a new request: first name, area, slot, items and estimate", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Requests",
    );
    expect(screen.getByRole("tab", { name: /New/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const card = screen.getByRole("article", { name: "Priya" });
    expect(within(card).getByText("Yeshwanthpur")).toBeInTheDocument();
    expect(within(card).getByText("Today, Evening")).toBeInTheDocument();
    expect(within(card).getByText("Newspaper")).toBeInTheDocument();
    expect(within(card).getByText("12 kg")).toBeInTheDocument();
    expect(within(card).getByText("About ₹228")).toBeInTheDocument();
  });

  it("accepts with one tap, and asks before declining", async () => {
    const user = userEvent.setup();
    renderPage();
    const card = screen.getByRole("article", { name: "Priya" });

    await user.click(within(card).getByRole("button", { name: "Accept" }));
    expect(respond).toHaveBeenLastCalledWith({
      bookingId: "new-1",
      accept: true,
    });

    await user.click(within(card).getByRole("button", { name: "Decline" }));
    const dialog = screen.getByRole("dialog", {
      name: "Decline this request?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Yes, decline" }),
    );
    expect(respond).toHaveBeenLastCalledWith({
      bookingId: "new-1",
      accept: false,
    });
  });

  it("keeps the chosen tab in the address", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: /Today/ }));
    expect(window.location.search).toBe("?tab=today");
  });

  it("drops the tab from the address when going back to New", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/app/requests?tab=done");
    renderPage({ tab: "done" });

    await user.click(screen.getByRole("tab", { name: /New/ }));

    expect(window.location.pathname).toBe("/app/requests");
    expect(window.location.search).toBe("");
  });

  it("lists today's pickups first, then the ones coming up", () => {
    renderPage({ tab: "today" });

    const [dueNow, comingUp] = screen.getAllByRole("heading", { level: 2 });
    expect(dueNow).toHaveTextContent("Today");
    expect(comingUp).toHaveTextContent("Coming up");

    const meena = screen.getByRole("article", { name: "Meena" });
    expect(within(meena).getByText("Malleshwaram")).toBeInTheDocument();
    expect(
      within(meena).getByRole("button", { name: "Start trip" }),
    ).toBeInTheDocument();
    expect(
      within(meena).getByRole("link", { name: "Weigh and pay" }),
    ).toHaveAttribute("href", "/app/requests/active-1#weigh");

    const arjun = screen.getByRole("article", { name: "Arjun" });
    expect(within(arjun).getByText("Tomorrow, Morning")).toBeInTheDocument();
  });

  it("shows what was paid for finished pickups", () => {
    renderPage({ tab: "done" });

    const card = screen.getByRole("article", { name: "Vikram" });
    expect(within(card).getByText("₹300")).toBeInTheDocument();
    expect(within(card).getByText("Paid")).toBeInTheDocument();
  });

  it("says when there's nothing new", () => {
    renderPage({ requests: { new: [], active: [], done: [] } });
    expect(screen.getByText("No new requests")).toBeInTheDocument();
  });

  it("tells other businesses the screen isn't for them", () => {
    renderPage({ workspace: YARD_WORKSPACE });
    expect(screen.getByText("Only for kabadiwala shops")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });
});
