import { render, screen, within } from "@testing-library/react";
import { NewspaperIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import { BarList, barPercent } from "./bar-list";

describe("barPercent", () => {
  it("sizes bars against the longest", () => {
    expect(barPercent(400, 400)).toBe(100);
    expect(barPercent(100, 400)).toBe(25);
  });

  it("keeps a tiny value visible and an empty one empty", () => {
    expect(barPercent(1, 100_000)).toBe(1);
    expect(barPercent(0, 400)).toBe(0);
    expect(barPercent(5, 0)).toBe(0);
    expect(barPercent(500, 400)).toBe(100);
  });
});

describe("BarList", () => {
  it("writes out every value, with bars in proportion", () => {
    render(
      <BarList
        label="By material"
        rows={[
          {
            key: "paper",
            label: "Paper",
            icon: NewspaperIcon,
            value: 400_000,
            display: "400 kg",
            detail: "400 kg CO₂e avoided",
          },
          {
            key: "metal",
            label: "Metal",
            icon: NewspaperIcon,
            value: 100_000,
            display: "100 kg",
          },
        ]}
      />,
    );

    const list = screen.getByRole("list", { name: "By material" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Paper400 kg400 kg CO₂e avoided");
    expect(items[1]).toHaveTextContent("Metal100 kg");

    const bars = screen.getAllByTestId("bar");
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "25%" });
  });
});
