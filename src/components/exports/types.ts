import type { FunctionReturnType } from "convex/server";
import type { Infer } from "convex/values";

import type { api } from "../../../convex/_generated/api";
import type { vExportKind } from "../../../convex/tables/exports";

/** Result shapes of the exports functions, as the screens use them. */

export type ReportView = FunctionReturnType<typeof api.exports.tally>;
/** Every report kind, not only the one `tally` returns. */
export type ReportKind = Infer<typeof vExportKind>;
export type ReportCell = ReportView["rows"][number][number];

export type PackView = NonNullable<
  FunctionReturnType<typeof api.exports.documents>
>;
export type PackDocuments = PackView["mine"];
export type DocumentField = PackView["editable"][number];
export type PackSide = PackView["side"];
export type PackStatus = PackView["trade"]["status"];

export type PackListItem = FunctionReturnType<typeof api.exports.packs>[number];
export type RunView = FunctionReturnType<typeof api.exports.runs>[number];
export type RunKind = RunView["kind"];

export type EvidencePack = NonNullable<
  FunctionReturnType<typeof api.exports.evidencePack>
>;
