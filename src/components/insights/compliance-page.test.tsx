import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";
import messages from "../../../messages/en.json";
import { CompliancePage } from "./compliance-page";
import type { ComplianceRecord } from "./types";

const record = vi.hoisted((): { current: unknown } => ({ current: undefined }));
const workspace = vi.hoisted((): { current: unknown } => ({
  current: undefined,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useQuery: () => record.current,
}));
vi.mock("@/components/app/use-workspace", () => ({
  useWorkspace: () => workspace.current,
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

const business = { kind: "org", org: { kind: "recycler" } };

const recycler: ComplianceRecord = {
  orgKind: "recycler",
  gstin: "29AAGCG4321L1Z8",
  consent: {
    status: "ok",
    board: "KSPCB",
    number: "KSPCB/CFO/2025/2210",
    validUntil: "2028-03-31",
    daysLeft: 549,
    remindOn: "2028-01-01",
  },
  checklist: [
    { id: "gst", status: "done" },
    { id: "consent", status: "done" },
    { id: "scale", status: "self_declared" },
    { id: "safety", status: "self_declared" },
  ],
  receipts: [
    {
      tradeId: "trade-6" as Id<"trades">,
      invoiceNo: "LG-26-0006",
      issuedAt: Date.parse("2026-09-28T12:00:00+05:30"),
      side: "sale",
      counterparty: { name: "Deccan Packaging Pvt Ltd", kind: "manufacturer" },
      material: {
        code: "RECYCLED-PET-FLAKE",
        names: { en: "Recycled PET flakes" },
        family: "plastic",
      },
      grams: 5_000_000,
      totalPaise: 32_500_000,
      needsEwayBill: true,
    },
    {
      tradeId: "trade-5" as Id<"trades">,
      invoiceNo: "LG-26-0005",
      issuedAt: Date.parse("2026-09-17T12:00:00+05:30"),
      side: "purchase",
      counterparty: null,
      material: {
        code: "PLASTIC-HDPE",
        names: { en: "Hard plastic (HDPE)" },
        family: "plastic",
      },
      grams: 800_000,
      totalPaise: 3_360_000,
      needsEwayBill: false,
    },
  ],
  epr: {
    role: "recycler",
    from: "2026-04-01",
    to: "2027-03-31",
    rows: [
      {
        stream: "plastic",
        regime: "pwm_2016",
        receivedGrams: 800_000,
        recycledGrams: 2_500_000,
      },
      {
        stream: "battery",
        regime: "bwm_2022",
        receivedGrams: 120_000,
        recycledGrams: 0,
      },
      {
        stream: "paper",
        regime: null,
        receivedGrams: 40_000,
        recycledGrams: 0,
      },
    ],
  },
};

function renderPage() {
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone="Asia/Kolkata"
    >
      <CompliancePage />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  workspace.current = business;
  record.current = recycler;
});

describe("CompliancePage", () => {
  it("lists each check with its status and what it means", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Compliance" }),
    ).toBeInTheDocument();

    const gst = screen
      .getByRole("heading", { name: "GST registration" })
      .closest("li");
    expect(gst).toHaveTextContent("Done");
    expect(gst).toHaveTextContent("GSTIN 29AAGCG4321L1Z8");
    const scale = screen
      .getByRole("heading", { name: "Weighing scale stamped" })
      .closest("li");
    expect(scale).toHaveTextContent("Not checked yet");
    expect(scale).toHaveTextContent(/Legal Metrology/);
    expect(screen.getAllByText("What this means:")).toHaveLength(4);
  });

  it("links every receipt and flags the ones that need an e-way bill", () => {
    renderPage();
    const links = screen.getAllByRole("link", {
      name: "View receipt LG-26-0006",
    });
    // One for phones, one for the wider table.
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/app/trades/trade-6/invoice",
      "/app/trades/trade-6/invoice",
    ]);
    expect(screen.getByText("E-way bill needed")).toBeInTheDocument();
    expect(screen.getByText("No e-way bill needed")).toBeInTheDocument();
    expect(
      screen.getAllByText("A business no longer on Luma.Green").length,
    ).toBeGreaterThan(0);
  });

  it("keeps a recycler's EPR record with the rules for each material", () => {
    renderPage();
    const heading = screen.getByRole("heading", {
      name: "EPR record, FY 2026–27",
    });
    const section = heading.closest("section");
    if (!section) throw new Error("no EPR section");
    const epr = within(section);
    expect(
      epr.getByText("Plastic Waste Management Rules, 2016"),
    ).toBeInTheDocument();
    expect(
      epr.getByText("Battery Waste Management Rules, 2022"),
    ).toBeInTheDocument();
    expect(
      epr.getByText("No EPR rules for this material yet"),
    ).toBeInTheDocument();
    expect(epr.getByText("2,500 kg")).toBeInTheDocument();
    expect(
      epr.getByText(/generated on CPCB's EPR portals/),
    ).toBeInTheDocument();
  });

  it("asks a small scrap shop for neither GST nor a consent", () => {
    record.current = {
      ...recycler,
      orgKind: "kabadiwala",
      gstin: null,
      consent: { status: "missing" },
      checklist: [
        { id: "gst", status: "optional" },
        { id: "consent", status: "not_needed" },
        { id: "scale", status: "self_declared" },
        { id: "safety", status: "self_declared" },
      ],
      epr: null,
    };
    renderPage();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const consent = screen
      .getByRole("heading", { name: "Pollution board consent" })
      .closest("li");
    expect(consent).toHaveTextContent("Not needed");
    expect(consent).toHaveTextContent(/usually doesn't need one/);
    expect(screen.getByText("Not registered")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /EPR record/ }),
    ).not.toBeInTheDocument();
  });

  it("links business records to owner API access", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "API access" })).toHaveAttribute(
      "href",
      "/app/integrations",
    );
  });

  it("sends a Saathi back to their jobs", () => {
    workspace.current = { kind: "saathi", saathi: { name: "Lakshmi" } };
    renderPage();
    expect(screen.getByText("For businesses")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "API access" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to my jobs" })).toHaveAttribute(
      "href",
      "/app",
    );
  });

  it("holds the layout while loading", () => {
    record.current = undefined;
    const { container } = renderPage();
    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });
});
