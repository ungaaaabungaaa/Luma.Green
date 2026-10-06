import { ConvexError, type Infer, v } from "convex/values";

import { vPaymentVerification } from "./gatewayPayments";
import { vFamily, vOrgKind, vTradeStatus } from "./validators";

export const integrationScopes = [
  "organization:read",
  "materials:read",
  "inventory:read",
  "trades:read",
  "news:read",
] as const;
export type IntegrationScope = (typeof integrationScopes)[number];
export const vIntegrationScope = v.union(
  v.literal("organization:read"),
  v.literal("materials:read"),
  v.literal("inventory:read"),
  v.literal("trades:read"),
  v.literal("news:read"),
);

export const integrationResources = [
  "organization",
  "materials",
  "inventory",
  "trades",
  "news",
] as const;
export type IntegrationResource = (typeof integrationResources)[number];
export const vIntegrationResource = v.union(
  v.literal("organization"),
  v.literal("materials"),
  v.literal("inventory"),
  v.literal("trades"),
  v.literal("news"),
);
export const integrationResourceScopes = {
  organization: "organization:read",
  materials: "materials:read",
  inventory: "inventory:read",
  trades: "trades:read",
  news: "news:read",
} as const satisfies Record<IntegrationResource, IntegrationScope>;

export const INTEGRATION_MAX_KEYS = 5;
export const INTEGRATION_RATE_LIMIT = 60;
export const INTEGRATION_ORG_RATE_LIMIT = 180;
export const INTEGRATION_RATE_WINDOW_MS = 60_000;
export const INTEGRATION_MAX_PAGE_SIZE = 100;
export const INTEGRATION_DEFAULT_PAGE_SIZE = 50;
export const INTEGRATION_DAY_MS = 24 * 60 * 60 * 1000;

export function isIntegrationToken(token: string): boolean {
  return /^lg_live_[\da-f]{64}$/.test(token);
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export const vIntegrationOrganization = v.object({
  id: v.id("orgs"),
  name: v.string(),
  kind: vOrgKind,
  city: v.string(),
  families: v.array(vFamily),
});
export const vIntegrationMaterial = v.object({
  code: v.string(),
  names: v.record(v.string(), v.string()),
  family: vFamily,
  stage: v.union(v.literal("scrap"), v.literal("recycled")),
});
export const vIntegrationInventory = v.object({
  materialCode: v.string(),
  grams: v.number(),
  updatedAt: v.number(),
});
export const vIntegrationTrade = v.object({
  id: v.id("trades"),
  side: v.union(v.literal("buyer"), v.literal("seller")),
  materialCode: v.string(),
  grams: v.number(),
  paisePerKg: v.number(),
  totalPaise: v.number(),
  status: vTradeStatus,
  createdAt: v.number(),
  updatedAt: v.number(),
  invoiceNo: v.union(v.string(), v.null()),
  legacyReceiptNo: v.union(v.string(), v.null()),
  paymentMode: v.literal("gateway_required"),
  paymentVerification: vPaymentVerification,
  gatewayRequired: v.literal(true),
});
export type IntegrationOrganization = Infer<typeof vIntegrationOrganization>;
export type IntegrationMaterial = Infer<typeof vIntegrationMaterial>;
export type IntegrationInventory = Infer<typeof vIntegrationInventory>;
export type IntegrationTrade = Infer<typeof vIntegrationTrade>;

export type IntegrationReadBody =
  | { data: IntegrationOrganization }
  | { data: { families: IntegrationOrganization["families"] } }
  | {
      data: IntegrationMaterial[] | IntegrationInventory[] | IntegrationTrade[];
      pagination: { nextCursor: string | null; isDone: boolean };
    };
export interface IntegrationReadResult {
  status: number;
  body: string;
  remaining: number | null;
  retryAfter: number | null;
}

/** Match the documented Convex pagination error without hiding unrelated failures. */
export function isInvalidIntegrationCursor(error: unknown): boolean {
  if (error instanceof Error && error.message.includes("InvalidCursor"))
    return true;
  const data: unknown = error instanceof ConvexError ? error.data : undefined;
  return (
    typeof data === "object" &&
    data !== null &&
    "isConvexSystemError" in data &&
    data.isConvexSystemError === true &&
    "paginationError" in data &&
    data.paginationError === "InvalidCursor"
  );
}
