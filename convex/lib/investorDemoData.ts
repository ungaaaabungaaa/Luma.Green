import type { Doc } from "../_generated/dataModel";
import workbook from "../data/industryWorkbook.json";
import { indiaToday } from "./onboarding";
export const DEMO_NOTICE =
  "DEMO — fictional investor walkthrough; no real customer, payment or certification.";
export const DEMO_MATERIALS: readonly {
  code: string;
  name: string;
  family: Doc<"materials">["family"];
  stage: Doc<"materials">["stage"];
  rate: number;
}[] = [
  {
    code: "DEMO-PET-BOTTLE",
    name: "DEMO PET bottles",
    family: "plastic",
    stage: "scrap",
    rate: 2400,
  },
  {
    code: "DEMO-PET-FLAKE",
    name: "DEMO washed PET flake",
    family: "plastic",
    stage: "scrap",
    rate: 5800,
  },
  {
    code: "DEMO-RPET-PELLET",
    name: "DEMO recycled PET pellets",
    family: "plastic",
    stage: "recycled",
    rate: 8200,
  },
  {
    code: "DEMO-PAPER-OFFCUT",
    name: "DEMO clean paper offcuts",
    family: "paper",
    stage: "scrap",
    rate: 1600,
  },
  {
    code: "DEMO-STEEL-OFFCUT",
    name: "DEMO clean steel offcuts",
    family: "metal",
    stage: "scrap",
    rate: 3200,
  },
  {
    code: "DEMO-GLASS-CULLET",
    name: "DEMO glass cullet",
    family: "glass",
    stage: "scrap",
    rate: 900,
  },
];
export const DEMO_FAMILIES: Doc<"orgs">["families"] = [
  "paper",
  "plastic",
  "metal",
  "glass",
  "ewaste",
  "other",
];
export const DEMO_INDUSTRY_ROWS = [
  ...workbook.sectors.map((row) => ({
    key: row.id,
    name: row.name,
    sourceReference: `${workbook.sourceWorkbook} / ${row.sheet} / row ${String(row.row)}`,
    sector: {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      annexure: row.annexure,
      workbookSha256: row.workbookSha256,
      sheet: row.sheet,
      row: row.row,
      sourceQuality: "workbook_unverified" as const,
    },
  })),
  ...workbook.industries.map((row) => ({
    key: row.id,
    name: row.name,
    sourceReference: `${workbook.sourceWorkbook} / ${row.sheet} / row ${String(row.row)}`,
    sector: undefined,
  })),
];
export function demoDate(now: number, days = 0) {
  return indiaToday(now + days * 86_400_000);
}
