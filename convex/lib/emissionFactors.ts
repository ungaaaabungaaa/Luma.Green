/**
 * Emission factors the impact screen estimates with — SAMPLE figures for the
 * pilot, one source per line, dated. Every number on a screen that comes
 * from here is labelled an estimate; nothing here is a credit. Replace a
 * line (and bump `FACTORS_AS_OF`) before any public claim; a claim already
 * made keeps the factor it was made with (`creditClaims.factorUsed`).
 *
 * Units: kg CO2e per kg of material, kg CO2e per kWh, kg CO2e per litre,
 * grams CO2e per tonne-kilometre. Arithmetic on these happens in grams and
 * rounds once at the end.
 */

import type { OrgKind } from "./chain";

export const FACTORS_AS_OF = "2026-09-29";

export interface EmissionFactor {
  code: string;
  /** kg CO2e avoided per kg recycled instead of made new. */
  kgCo2ePerKg: number;
  source: string;
  note?: string;
}

const WARM = "US EPA WARM v16 (2023), recycling vs landfill, per short ton";

/**
 * By material code. Paper lines are set well below WARM's values, which
 * include forest carbon storage that Indian mills' fibre mix doesn't
 * support; metals and plastics are WARM rounded to one decimal.
 */
export const EMISSION_FACTORS: readonly EmissionFactor[] = [
  {
    code: "PAPER-NEWS",
    kgCo2ePerKg: 1,
    source: WARM,
    note: "WARM newspaper ≈ 3.0; forest carbon excluded, process only",
  },
  {
    code: "PAPER-CARTON",
    kgCo2ePerKg: 1,
    source: WARM,
    note: "WARM corrugated ≈ 3.5; forest carbon excluded, process only",
  },
  {
    code: "PAPER-BOOKS",
    kgCo2ePerKg: 1,
    source: WARM,
    note: "as mixed paper, forest carbon excluded",
  },
  {
    code: "PAPER-OFFICE",
    kgCo2ePerKg: 1,
    source: WARM,
    note: "WARM office paper ≈ 3.2; forest carbon excluded",
  },
  {
    code: "PAPER-MIXED",
    kgCo2ePerKg: 1,
    source: WARM,
    note: "as mixed paper, forest carbon excluded",
  },
  { code: "PLASTIC-PET", kgCo2ePerKg: 1.5, source: WARM, note: "PET ≈ 1.15" },
  { code: "PLASTIC-HDPE", kgCo2ePerKg: 1, source: WARM, note: "HDPE ≈ 0.95" },
  { code: "PLASTIC-PP", kgCo2ePerKg: 1, source: WARM, note: "PP ≈ 1.0" },
  { code: "PLASTIC-LDPE", kgCo2ePerKg: 1, source: WARM, note: "LDPE ≈ 1.0" },
  {
    code: "PLASTIC-MIXED",
    kgCo2ePerKg: 0.8,
    source: WARM,
    note: "mixed plastics ≈ 1.0, discounted for contamination",
  },
  {
    code: "METAL-IRON",
    kgCo2ePerKg: 1.5,
    source: WARM,
    note: "steel cans ≈ 2.0; HMS discounted",
  },
  { code: "METAL-SS", kgCo2ePerKg: 1.5, source: WARM, note: "as steel" },
  {
    code: "METAL-ALU-CAN",
    kgCo2ePerKg: 9,
    source: WARM,
    note: "aluminium cans ≈ 10.0",
  },
  {
    code: "METAL-ALU",
    kgCo2ePerKg: 9,
    source: WARM,
    note: "as aluminium cans",
  },
  {
    code: "METAL-COPPER",
    kgCo2ePerKg: 3,
    source: WARM,
    note: "copper wire ≈ 5.0; mixed grades discounted",
  },
  {
    code: "METAL-BRASS",
    kgCo2ePerKg: 2.5,
    source: WARM,
    note: "between copper and mixed metals",
  },
  {
    code: "GLASS-BOTTLE",
    kgCo2ePerKg: 0.3,
    source: WARM,
    note: "container glass ≈ 0.3",
  },
  {
    code: "EWASTE-SMALL",
    kgCo2ePerKg: 2,
    source: WARM,
    note: "mixed electronics ≈ 0.9–2.3 by device",
  },
  {
    code: "EWASTE-PHONE",
    kgCo2ePerKg: 2,
    source: WARM,
    note: "as electronics",
  },
  {
    code: "EWASTE-CABLE",
    kgCo2ePerKg: 2,
    source: WARM,
    note: "copper wire with insulation, discounted",
  },
  {
    code: "EWASTE-BATTERY",
    kgCo2ePerKg: 1,
    source: "Placeholder: lead-acid recovery vs primary lead, indicative",
  },
  {
    code: "OTHER-CLOTHES",
    kgCo2ePerKg: 3,
    source: "WRAP (UK) textiles reuse and recycling, indicative",
  },
  // Recycled output: the same factor as the scrap it came from, so a kilo
  // that went in as scrap and came out as granules isn't credited twice.
  {
    code: "RECYCLED-PET-FLAKE",
    kgCo2ePerKg: 1.5,
    source: WARM,
    note: "as PET",
  },
  {
    code: "RECYCLED-HDPE-GRANULE",
    kgCo2ePerKg: 1,
    source: WARM,
    note: "as HDPE",
  },
  {
    code: "RECYCLED-KRAFT",
    kgCo2ePerKg: 1,
    source: WARM,
    note: "as corrugated, forest carbon excluded",
  },
  {
    code: "RECYCLED-ALU-INGOT",
    kgCo2ePerKg: 9,
    source: WARM,
    note: "as aluminium",
  },
];

const BY_CODE = new Map(
  EMISSION_FACTORS.map((factor) => [factor.code, factor]),
);

/**
 * The factor for a material code, or `fallback` (the catalogue's own
 * indicative figure) when this table has no line for it.
 */
export function emissionFactor(code: string, fallback = 0): number {
  return BY_CODE.get(code)?.kgCo2ePerKg ?? fallback;
}

/** Grid electricity. */
export const GRID = {
  kgCo2ePerKwh: 0.716,
  source:
    "CEA CO2 Baseline Database v19 (Dec 2023): all-India weighted average 0.716 tCO2/MWh, FY 2022-23",
} as const;

/** Diesel burned in vehicles and generators. */
export const DIESEL = {
  kgCo2ePerLitre: 2.68,
  source:
    "IPCC 2006 default for diesel oil (74.1 tCO2/TJ at 36.4 MJ/l) ≈ 2.68 kg CO2/l",
} as const;

/**
 * Road freight: a placeholder for the pilot. Real legs get their own
 * distance and vehicle once loads are recorded.
 */
export const TRANSPORT = {
  gramsCo2ePerTonneKm: 150,
  source:
    "India GHG Program road transport factors (2015), light and medium trucks ≈ 0.1–0.3 kg CO2/t-km; midpoint",
} as const;

/** Typical distance of one hand-off in Bengaluru, km — placeholder. */
export const LEG_KM: Record<"household" | OrgKind, number> = {
  household: 3, // door to shop, by auto or cart
  kabadiwala: 12, // shop to yard
  yard: 35, // yard to recycler on the city's edge
  recycler: 40, // recycler to factory
  manufacturer: 0, // the chain ends here
};

/** grams CO2e from electricity and diesel, in whole grams. */
export function energyCo2eGrams(kwh: number, dieselLitres: number): number {
  return (
    Math.round(kwh * GRID.kgCo2ePerKwh * 1000) +
    Math.round(dieselLitres * DIESEL.kgCo2ePerLitre * 1000)
  );
}

/** grams CO2e to move `grams` of material `km` kilometres, in whole grams. */
export function transportCo2eGrams(grams: number, km: number): number {
  return Math.round((grams * km * TRANSPORT.gramsCo2ePerTonneKm) / 1_000_000);
}
