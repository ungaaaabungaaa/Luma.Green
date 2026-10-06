import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { aTrade, WithIntl } from "./test-utils";
import { TradesPage } from "./trades-page";
import type { TradeView } from "./types";

const { data } = vi.hoisted(() => ({
  data: {
    kind: "yard",
    tab: null as string | null,
    trades: { buying: [] as unknown[], selling: [] as unknown[] },
  },
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useMutation: () => vi.fn(),
  useQuery: (query: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(query) === "workspace:mine"
      ? { kind: "org", org: { kind: data.kind } }
      : data.trades,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(data.tab === null ? "" : `tab=${data.tab}`),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const bought = aTrade({
  id: "bought" as TradeView["id"],
  material: { code: "PAPER-NEWS", names: { en: "Newspaper" }, family: "paper" },
  counterparty: {
    name: "Ramesh Kabadi Store",
    area: "Yeshwanthpur",
    kind: "kabadiwala",
  },
  status: "accepted",
  actions: ["pay"],
});
const sold = aTrade({
  id: "sold" as TradeView["id"],
  material: {
    code: "PLASTIC-PET",
    names: { en: "PET bottles" },
    family: "plastic",
  },
  counterparty: {
    name: "GreenLoop Polymers",
    area: "Bommasandra",
    kind: "recycler",
  },
  status: "dispatched",
});

beforeEach(() => {
  data.kind = "yard";
  data.tab = null;
  data.trades = { buying: [bought], selling: [sold] };
});

function renderPage() {
  render(
    <WithIntl>
      <TradesPage />
    </WithIntl>,
  );
}

describe("TradesPage", () => {
  it("gives yards Buying and Selling tabs, opening where they're needed", async () => {
    renderPage();
    const buying = screen.getByRole("tab", { name: /Buying/ });
    expect(buying).toHaveAttribute("aria-selected", "true");
    expect(buying).not.toHaveTextContent("needs you");
    expect(
      screen.getByRole("heading", { name: "Newspaper · 100 kg" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Selling/ }));
    expect(
      screen.getByRole("heading", { name: "PET bottles · 100 kg" }),
    ).toBeInTheDocument();
  });

  it("opens the tab a link asks for", () => {
    data.tab = "selling";
    renderPage();
    expect(screen.getByRole("tab", { name: /Selling/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows kabadiwalas one list, since they only sell", () => {
    data.kind = "kabadiwala";
    data.trades = { buying: [], selling: [] };
    renderPage();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("No sales yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Put stock on sale" }),
    ).toHaveAttribute("href", "/app/sell");
  });
});
