import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../convex/_generated/api";

export type Impact = FunctionReturnType<typeof api.insights.impact>;
export type OrgImpact = Extract<Impact, { kind: "org" }>;
export type SaathiImpact = Extract<Impact, { kind: "saathi" }>;

export type ComplianceRecord = FunctionReturnType<
  typeof api.insights.compliance
>;
export type Consent = ComplianceRecord["consent"];
export type CheckItem = ComplianceRecord["checklist"][number];
export type Receipt = ComplianceRecord["receipts"][number];
export type Epr = NonNullable<ComplianceRecord["epr"]>;
