import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PM_SURYA_GHAR_URL, SubsidyExplainer } from "./subsidy-explainer";

vi.mock("next-intl/server", () => import("../site/intl-server.testing"));

describe("SubsidyExplainer", () => {
  it("shows the PM Surya Ghar slabs from the same maths as the calculator", async () => {
    render(await SubsidyExplainer());

    const table = screen.getByRole("table", {
      name: "Subsidy by system size, for homes",
    });
    const rows = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.textContent);
    expect(rows).toEqual(["1 kW₹30,000", "2 kW₹60,000", "3 kW or more₹78,000"]);
  });

  it("cites the scheme's own site, in a new tab", async () => {
    render(await SubsidyExplainer());

    const link = screen.getByRole("link", { name: /pmsuryaghar\.gov\.in/ });
    expect(link).toHaveAttribute("href", PM_SURYA_GHAR_URL);
    expect(link).toHaveAttribute("href", "https://pmsuryaghar.gov.in");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
