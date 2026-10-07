import { z } from "zod";

import type { cashfreeEnv } from "../../src/lib/env";

export type CashfreeConfig = NonNullable<ReturnType<typeof cashfreeEnv>>;
export type CashfreeMode = CashfreeConfig["mode"];
export const CASHFREE_VERSION = "2026-01-01";
export const CASHFREE_BODY_LIMIT = 64 * 1024;
// A local safety ceiling, not a claim about the merchant account's limit.
export const MAX_PAYMENT_PAISE = 1_000_000_000_000;
export const PAYMENT_LEASE_MS = 30_000;
export const VENDOR_FRESH_MS = 5 * 60_000;

// eslint-disable-next-line unicorn/prefer-bigint-literals -- The shared web TS target is ES2017; the runtime supports the BigInt constructor.
const PAISE_PER_RUPEE = BigInt(100);

export function decimalPaise(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0 || paise > MAX_PAYMENT_PAISE)
    throw new Error("INVALID_PAYMENT_AMOUNT");
  const n = BigInt(paise);
  return `${String(n / PAISE_PER_RUPEE)}.${String(n % PAISE_PER_RUPEE).padStart(2, "0")}`;
}

export function parsePaise(value: unknown): number {
  if (typeof value !== "number" && typeof value !== "string")
    throw new Error("INVALID_PAYMENT_AMOUNT");
  const text = String(value);
  if (!/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(text))
    throw new Error("INVALID_PAYMENT_AMOUNT");
  const [whole, fraction = ""] = text.split(".", 2);
  const paise = Number(
    BigInt(whole) * PAISE_PER_RUPEE + BigInt(fraction.padEnd(2, "0")),
  );
  decimalPaise(paise);
  return paise;
}

const providerId = z.union([
  z.string().regex(/^\d{1,40}$/),
  z.number().int().nonnegative().transform(String),
]);
const orderId = z.string().regex(/^[\w-]{3,45}$/);
const currency = z.string().regex(/^[A-Z]{3}$/);
const amount = z.union([z.number(), z.string()]).transform((value, ctx) => {
  try {
    return parsePaise(value);
  } catch {
    ctx.addIssue({ code: "custom", message: "Invalid money" });
    return z.NEVER;
  }
});
export const vendorResponse = z.object({
  vendor_id: z.string().regex(/^\w{1,100}$/),
  status: z.string().max(64),
});
export const orderResponse = z.object({
  order_id: orderId,
  cf_order_id: providerId,
  order_amount: amount,
  order_currency: currency,
  order_status: z.enum([
    "ACTIVE",
    "PAID",
    "EXPIRED",
    "TERMINATED",
    "TERMINATION_REQUESTED",
  ]),
  order_expiry_time: z.iso.datetime({ offset: true }),
  payment_session_id: z.string().min(1).max(2048),
  customer_details: z.object({ customer_id: z.string().max(100) }),
  order_splits: z
    .array(z.object({ vendor: z.string().max(100), amount }))
    .max(10),
});
export type ProviderOrder = z.infer<typeof orderResponse>;

export const paymentResponse = z.object({
  cf_payment_id: providerId,
  order_id: orderId,
  payment_status: z.enum([
    "SUCCESS",
    "FAILED",
    "PENDING",
    "NOT_ATTEMPTED",
    "USER_DROPPED",
    "CANCELLED",
    "VOID",
  ]),
  payment_amount: amount,
  payment_currency: currency,
});
/** Preauthorization is separate evidence even when is_captured is true. */
export const paymentLookupResponse = paymentResponse.extend({
  is_captured: z.boolean(),
  authorization: z
    .object({
      action: z.enum(["CAPTURE", "VOID"]),
      status: z.enum(["SUCCESS", "PENDING"]),
      captured_amount: amount,
    })
    .nullish(),
});

export function isFullyCaptured(
  payment: z.infer<typeof paymentLookupResponse>,
  expectedPaise: number,
): boolean {
  if (!payment.is_captured || payment.payment_amount !== expectedPaise)
    return false;
  const authorization = payment.authorization;
  return (
    authorization == null ||
    (authorization.action === "CAPTURE" &&
      authorization.status === "SUCCESS" &&
      authorization.captured_amount === expectedPaise)
  );
}

export const webhookResponse = z
  .object({
    type: z.enum([
      "PAYMENT_SUCCESS_WEBHOOK",
      "PAYMENT_FAILED_WEBHOOK",
      "PAYMENT_USER_DROPPED_WEBHOOK",
    ]),
    data: z.object({
      order: z.object({
        order_id: orderId,
        order_amount: amount,
        order_currency: currency,
      }),
      payment: paymentResponse.omit({ order_id: true }),
      customer_details: z.object({ customer_id: z.string().max(100) }),
    }),
  })
  .refine(
    (event) =>
      ({
        PAYMENT_SUCCESS_WEBHOOK: "SUCCESS",
        PAYMENT_FAILED_WEBHOOK: "FAILED",
        PAYMENT_USER_DROPPED_WEBHOOK: "USER_DROPPED",
      })[event.type] === event.data.payment.payment_status,
  );

export interface FrozenOrder {
  providerOrderId: string;
  totalPaise: number;
  customerId: string;
  customerPhone: string;
  vendorId: string;
  expiresAt: number;
}

export function isOrderMatch(
  order: FrozenOrder,
  response: ProviderOrder,
): boolean {
  return (
    response.order_id === order.providerOrderId &&
    response.order_amount === order.totalPaise &&
    response.order_currency === "INR" &&
    response.customer_details.customer_id === order.customerId &&
    response.order_splits.length === 1 &&
    response.order_splits[0]?.vendor === order.vendorId &&
    response.order_splits[0].amount === order.totalPaise &&
    Date.parse(response.order_expiry_time) === order.expiresAt
  );
}

/** Only this boundary converts paise to Cashfree's decimal JSON numbers. */
export function createOrderBody(order: FrozenOrder): string {
  const money = decimalPaise(order.totalPaise);
  if (order.totalPaise < 100) throw new Error("PAYMENT_BELOW_MINIMUM");
  return `{"order_id":${JSON.stringify(order.providerOrderId)},"order_amount":${money},"order_currency":"INR","customer_details":${JSON.stringify({ customer_id: order.customerId, customer_phone: order.customerPhone })},"order_expiry_time":${JSON.stringify(new Date(order.expiresAt).toISOString())},"order_splits":[{"vendor":${JSON.stringify(order.vendorId)},"amount":${money}}]}`;
}

/** Reads at most 64 KiB even when Content-Length is absent or false. */
export async function boundedBody(
  message: Request | Response,
): Promise<Uint8Array<ArrayBuffer>> {
  const declared = message.headers.get("content-length");
  if (
    declared &&
    (!/^\d+$/.test(declared) || Number(declared) > CASHFREE_BODY_LIMIT)
  )
    throw new Error("PAYMENT_BODY_TOO_LARGE");
  const reader = message.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > CASHFREE_BODY_LIMIT)
        throw new Error("PAYMENT_BODY_TOO_LARGE");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function isSignatureValid(
  bytes: Uint8Array<ArrayBuffer>,
  timestamp: string | null,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (
    !timestamp ||
    !signature ||
    !/^\d{13}$/.test(timestamp) ||
    !/^[\dA-Za-z+/]{43}=$/.test(signature)
  )
    return false;
  const prefix = new TextEncoder().encode(timestamp);
  const payload = new Uint8Array(prefix.length + bytes.length);
  payload.set(prefix);
  payload.set(bytes, prefix.length);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signatureBytes = Uint8Array.from(
    atob(signature),
    (char) => char.codePointAt(0) ?? 0,
  );
  return crypto.subtle.verify("HMAC", key, signatureBytes, payload);
}

export async function bodyHash(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export class CashfreeFailure extends Error {
  constructor(readonly kind: "unavailable" | "not_found" | "invalid_response") {
    super(`CASHFREE_${kind.toUpperCase()}`);
  }
}

/** Never returns provider error bodies, request credentials or bank details. */
export async function cashfreeRequest(
  config: CashfreeConfig,
  path: string,
  options?: { body: string; idempotencyKey: string },
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 10_000);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: options ? "POST" : "GET",
      redirect: "error",
      signal: controller.signal,
      headers: {
        "x-client-id": config.clientId,
        "x-client-secret": config.clientSecret,
        "x-api-version": CASHFREE_VERSION,
        "content-type": "application/json",
        ...(options && { "x-idempotency-key": options.idempotencyKey }),
      },
      ...(options && { body: options.body }),
    });
    const bytes = await boundedBody(response);
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!response.ok) {
      const error = z.object({ code: z.string() }).safeParse(value);
      if (
        response.status === 404 &&
        error.success &&
        error.data.code === "order_not_found"
      )
        throw new CashfreeFailure("not_found");
      throw new CashfreeFailure("unavailable");
    }
    return value;
  } catch (error) {
    if (error instanceof CashfreeFailure) throw error;
    throw new CashfreeFailure("unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
