import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuery } from "convex/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import type * as CsvModule from "./csv";
import { downloadCsv } from "./csv";
import { type Material, MaterialCodes } from "./material-codes";

const convex = vi.hoisted(() => ({ configured: true }));

vi.mock("@/components/providers/convex-provider", () => ({
  get isConvexConfigured() {
    return convex.configured;
  },
}));

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));

vi.mock("./csv", async (importOriginal) => ({
  ...(await importOriginal<typeof CsvModule>()),
  downloadCsv: vi.fn(),
}));

const materials: Material[] = [
  {
    code: "PAPER-NEWS",
    family: "paper",
    stage: "scrap",
    names: { en: "Newspaper", hi: "अख़बार (रद्दी)" },
    co2eFactor: 1,
  },
  {
    code: "RECYCLED-PET-FLAKE",
    family: "plastic",
    stage: "recycled",
    names: { en: "Recycled PET flakes" },
    co2eFactor: 1.5,
  },
];

function renderCodes(locale = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MaterialCodes />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  convex.configured = true;
  vi.mocked(useQuery).mockReturnValue(materials);
});

describe("MaterialCodes", () => {
  it("lists every code with its name, family and stage", () => {
    renderCodes();

    const table = screen.getByRole("table", {
      name: "Luma.Green material codes",
    });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("PAPER-NEWS")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Newspaper")).toBeInTheDocument();
    expect(within(rows[1]).getAllByText("Recycled")).not.toHaveLength(0);
    expect(within(rows[1]).getAllByText(/Plastic/)).not.toHaveLength(0);
    expect(screen.getByText("2 materials")).toBeInTheDocument();
  });

  it("shows names in the reader's language", () => {
    renderCodes("hi");

    expect(screen.getByText("अख़बार (रद्दी)")).toBeInTheDocument();
    // English stands in where a name hasn't been translated yet.
    expect(screen.getByText("Recycled PET flakes")).toBeInTheDocument();
  });

  it("downloads the list as a CSV built from the live catalogue", async () => {
    const user = userEvent.setup();
    renderCodes();

    await user.click(
      screen.getByRole("button", { name: "Download the codes (CSV)" }),
    );

    expect(downloadCsv).toHaveBeenCalledWith(
      "luma-green-material-codes.csv",
      expect.stringContaining(
        "PAPER-NEWS,paper,scrap,Newspaper,अख़बार (रद्दी)",
      ),
    );
  });

  it("waits, then explains when the list is empty", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    const { rerender } = renderCodes();
    expect(
      screen.getByRole("status", { name: "Loading…" }),
    ).toBeInTheDocument();

    vi.mocked(useQuery).mockReturnValue([]);
    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <MaterialCodes />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("No material codes yet.")).toBeInTheDocument();
  });

  it("says so when Convex isn't connected", () => {
    convex.configured = false;
    renderCodes();

    expect(
      screen.getByText(
        "The code list isn't available right now. Please check back soon.",
      ),
    ).toBeInTheDocument();
    expect(useQuery).not.toHaveBeenCalled();
  });
});
