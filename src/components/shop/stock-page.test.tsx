import { screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { StockPage } from "./stock-page";
import {
  fakeQueries,
  IRON,
  NEWSPAPER,
  renderWithIntl,
  SHOP_WORKSPACE,
  YARD_WORKSPACE,
} from "./test-helpers";
import type { Stock } from "./types";

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useQuery: vi.fn(),
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

const IRON_ROW: Stock["rows"][number] = {
  material: IRON,
  stage: "scrap",
  grams: 260_000,
  marketPaise: 2700,
  valuePaise: 702_000,
  updatedAt: 0,
};
const NEWSPAPER_ROW: Stock["rows"][number] = {
  material: NEWSPAPER,
  stage: "scrap",
  grams: 180_000,
  marketPaise: 1450,
  valuePaise: 261_000,
  updatedAt: 0,
};

const SHOP_STOCK: Stock = {
  kind: "kabadiwala",
  buyerKind: "yard",
  rows: [IRON_ROW, NEWSPAPER_ROW],
  totalGrams: 440_000,
  totalValuePaise: 963_000,
};

function renderStock(stock: Stock | undefined, workspace: unknown) {
  vi.mocked(useQuery).mockImplementation(
    fakeQueries({
      "workspace:mine": workspace,
      "stock:mine": stock,
    }) as unknown as typeof useQuery,
  );
  renderWithIntl(<StockPage />);
}

describe("StockPage", () => {
  it("shows each material's weight and worth, the totals, and a way to sell", () => {
    renderStock(SHOP_STOCK, SHOP_WORKSPACE);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Stock",
    );
    expect(screen.getByText("440 kg")).toBeInTheDocument();
    expect(screen.getByText("₹9,630")).toBeInTheDocument();
    expect(screen.getByText("Iron and steel")).toBeInTheDocument();
    expect(screen.getByText("260 kg")).toBeInTheDocument();
    expect(screen.getByText("₹7,020")).toBeInTheDocument();
    expect(screen.getByText("Market ₹14.50/kg")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Sell to a yard" }),
    ).toHaveAttribute("href", "/app/sell");
  });

  it("offers no sale where nobody further up buys", () => {
    renderStock(
      {
        ...SHOP_STOCK,
        kind: "manufacturer",
        buyerKind: null,
        rows: SHOP_STOCK.rows.map((row) => ({ ...row, stage: "recycled" })),
      },
      SHOP_WORKSPACE,
    );
    expect(
      screen.queryByRole("link", { name: /^Sell/ }),
    ).not.toBeInTheDocument();
  });

  it("splits raw scrap from recycled material when a business holds both", () => {
    renderStock(
      {
        ...SHOP_STOCK,
        kind: "recycler",
        buyerKind: "manufacturer",
        rows: [IRON_ROW, { ...NEWSPAPER_ROW, stage: "recycled" }],
      },
      YARD_WORKSPACE,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Scrap" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Recycled material" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Sell to a manufacturer" }),
    ).toBeInTheDocument();
  });

  it("says how stock arrives when there is none", () => {
    renderStock(
      { ...SHOP_STOCK, rows: [], totalGrams: 0, totalValuePaise: 0 },
      SHOP_WORKSPACE,
    );
    expect(screen.getByText("No stock yet")).toBeInTheDocument();
    expect(
      screen.getByText("Weigh and pay for a pickup, and it shows up here."),
    ).toBeInTheDocument();
  });

  it("tells a Saathi that stock is for businesses", () => {
    renderStock(undefined, {
      kind: "saathi",
      saathi: { name: "Lakshmi Devi", area: "Yeshwanthpur", city: "Bengaluru" },
    });
    expect(screen.getByText("Only for businesses")).toBeInTheDocument();
  });
});
