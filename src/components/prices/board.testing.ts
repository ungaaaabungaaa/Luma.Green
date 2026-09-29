import type { PriceBoardData, PricePoint, PriceRow } from "./board";

/**
 * Thirty days ending on 29 Sep 2026 at `today` paise, stepping up to
 * ₹1.50 above it and back, with one dip mid-month.
 */
export function monthOfPrices(today: number): PricePoint[] {
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 7, 31 + index));
    const wobble = index === 15 ? -100 : ((29 - index) % 4) * 50;
    return {
      date: date.toISOString().slice(0, 10),
      paisePerKg: today + wobble,
    };
  });
}

/** A board row whose history ends at its price today. */
export function boardRow(
  code: string,
  names: Record<string, string>,
  overrides: Partial<PriceRow> = {},
): PriceRow {
  const todayPaise = overrides.todayPaise ?? 1400;
  return {
    code,
    family: "paper",
    stage: "scrap",
    names,
    todayPaise,
    weekChangePct: 2.1,
    floorPaise: 1200,
    series: monthOfPrices(todayPaise),
    ...overrides,
  };
}

/** A small board: three families of scrap and one recycled material. */
export const sampleBoard: PriceBoardData = {
  city: "Bengaluru",
  date: "2026-09-29",
  rows: [
    boardRow("PAPER-NEWS", { en: "Newspaper", hi: "अख़बार" }),
    boardRow(
      "PAPER-CARTON",
      { en: "Cardboard boxes" },
      { weekChangePct: -1.3, todayPaise: 1000, floorPaise: 800 },
    ),
    boardRow(
      "PLASTIC-PET",
      { en: "PET bottles" },
      { family: "plastic", weekChangePct: 0, todayPaise: 2000 },
    ),
    boardRow(
      "METAL-IRON",
      { en: "Iron and steel" },
      { family: "metal", todayPaise: 2800, floorPaise: 2400 },
    ),
    boardRow(
      "RECYCLED-PET-FLAKE",
      { en: "Recycled PET flakes" },
      {
        family: "plastic",
        stage: "recycled",
        todayPaise: 6500,
        floorPaise: 5500,
        weekChangePct: null,
      },
    ),
  ],
};
