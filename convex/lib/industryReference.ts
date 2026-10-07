import { ConvexError } from "convex/values";

import workbook from "../data/industryWorkbook.json";

export const REFERENCE_KINDS = [
  "sectors",
  "industries",
  "lifecycles",
  "byproducts",
] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

/** Row identity is intentional: even annexure + code is not unique in the source. */
export function getIndustrySector(id: string) {
  return workbook.sectors.find((sector) => sector.id === id) ?? null;
}

function referenceRows(kind: ReferenceKind) {
  switch (kind) {
    case "sectors": {
      return workbook.sectors.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: `${row.code} · ${row.category}`,
        sheet: row.sheet,
        row: row.row,
        details: [
          { key: "annexure", value: row.annexure },
          { key: "category", value: row.category },
          { key: "division", value: row.division },
          { key: "industryGroup", value: row.analysis.industryGroup },
          { key: "inputs", value: row.analysis.inputs },
          { key: "products", value: row.analysis.products },
          { key: "byproducts", value: row.analysis.byproducts },
          { key: "recoverableWaste", value: row.analysis.recoverableWaste },
          { key: "residualWaste", value: row.analysis.residualWaste },
          { key: "nextUser", value: row.analysis.nextUser },
          { key: "suggestedFlow", value: row.analysis.suggestedFlow },
        ],
      }));
    }
    case "industries": {
      return workbook.industries.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.group,
        sheet: row.sheet,
        row: row.row,
        details: [
          { key: "inputs", value: row.inputs },
          { key: "products", value: row.products },
          { key: "byproducts", value: row.byproducts },
          { key: "recoverableWaste", value: row.recoverableWaste },
          { key: "residualWaste", value: row.residualWaste },
          { key: "nextUser", value: row.nextUser },
          { key: "materialState", value: row.materialState },
          { key: "note", value: row.note },
        ],
      }));
    }
    case "lifecycles": {
      return workbook.lifecycles.map((row) => ({
        id: row.id,
        title: row.grade,
        subtitle: row.family,
        sheet: row.sheet,
        row: row.row,
        details: [
          { key: "materialState", value: row.state },
          { key: "route", value: row.route },
          { key: "products", value: row.soldAs },
          { key: "nextUser", value: row.nextUser },
          { key: "qualityAttributes", value: row.qualityAttributes },
        ],
      }));
    }
    case "byproducts": {
      return workbook.byproducts.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.generatedBy,
        sheet: row.sheet,
        row: row.row,
        details: [
          {
            key: "reportedCommercialStatus",
            value: row.reportedCommercialStatus,
          },
          { key: "nextUser", value: row.potentialBuyer },
          { key: "qualityAttributes", value: row.qualityAttributes },
        ],
      }));
    }
  }
}

/** Reference discovery never returns a permission, a price or a compliance decision. */
export function searchIndustryReference(
  kind: ReferenceKind,
  search: string,
  offset = 0,
) {
  if (
    search.length > 200 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 10_000
  )
    throw new ConvexError("INVALID_REFERENCE_SEARCH");
  const terms = search.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  const rows = referenceRows(kind).filter((row) => {
    const text = [
      row.title,
      row.subtitle,
      ...row.details.map((detail) => detail.value),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  return {
    sourceQuality: "workbook_unverified" as const,
    sourceLanguage: "en" as const,
    sourceWorkbook: workbook.sourceWorkbook,
    total: rows.length,
    nextOffset: offset + 25 < rows.length ? offset + 25 : null,
    items: rows.slice(offset, offset + 25),
  };
}
