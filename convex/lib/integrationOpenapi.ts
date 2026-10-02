import { integrationScopes } from "./integrations";

const string = { type: "string" } as const;
const integer = {
  type: "integer",
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
} as const;
const nullableString = { type: ["string", "null"] } as const;
const family = {
  type: "string",
  enum: ["paper", "plastic", "metal", "glass", "ewaste", "other"],
} as const;
const kind = {
  type: "string",
  enum: ["kabadiwala", "yard", "recycler", "manufacturer"],
} as const;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ "application/json": { schema } });
const rateHeaders = {
  "X-Request-Id": {
    description: "Opaque identifier for support. No credentials.",
    schema: string,
  },
  "X-RateLimit-Limit": {
    description: "Per-key requests per minute (60).",
    schema: integer,
  },
  "X-RateLimit-Remaining": {
    description:
      "Effective remaining accepted reads under this key and business window limits.",
    schema: integer,
  },
};
const errorResponses = {
  "400": {
    description: "Invalid query or cursor.",
    content: json(ref("Error")),
  },
  "401": {
    description: "Missing, invalid, expired or revoked key.",
    headers: { "WWW-Authenticate": { schema: string } },
    content: json(ref("Error")),
  },
  "403": {
    description:
      "Scope missing, business suspended, or issuer no longer an owner.",
    content: json(ref("Error")),
  },
  "429": {
    description:
      "Per-key (60/minute) or per-business (180/minute) quota exhausted.",
    headers: {
      "Retry-After": { description: "Seconds before retry.", schema: integer },
      ...rateHeaders,
    },
    content: json(ref("Error")),
  },
  "500": {
    description: "Unexpected server failure.",
    content: json(ref("Error")),
  },
  "503": {
    description: "Backend or optional news provider unavailable.",
    content: json(ref("Error")),
  },
};
const pageParameters = [
  {
    name: "limit",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
  },
  {
    name: "cursor",
    in: "query",
    description:
      "Opaque nextCursor from the same endpoint, business and side. Omit on the first request.",
    schema: { type: "string", minLength: 1, maxLength: 4096 },
  },
];
function pageOf(name: string) {
  return {
    type: "object",
    required: ["data", "pagination"],
    properties: {
      data: { type: "array", items: ref(name) },
      pagination: ref("Pagination"),
    },
  };
}
function operation(
  id: string,
  description: string,
  scope: string,
  schema: object,
  parameters: object[] = [],
) {
  return {
    get: {
      operationId: id,
      description,
      "x-required-scope": scope,
      parameters,
      responses: {
        "200": {
          description: "Success.",
          headers: rateHeaders,
          content: json(schema),
        },
        ...errorResponses,
      },
    },
  };
}

/** Versioned, public machine contract. English developer documentation, not UI copy. */
export const integrationOpenapi = {
  openapi: "3.1.2",
  info: {
    title: "Luma.Green Industry API",
    version: "1.0.0",
    description:
      "Read-only business integration. An active business owner creates a scoped key in Compliance → API access. Send it as Authorization: Bearer <key>. Keys expire within 90 days. Money is integer paise (INR); mass is integer grams; timestamps are Unix milliseconds unless marked date-time. No payments, stock writes, certified credits, or private contact data are exposed. All data responses are private and not cached. Only listed query parameters are accepted; duplicates are rejected. No cross-origin browser access is enabled; keep keys in a trusted server or secret manager. Unknown routes return 404 and unsupported methods return 405. Page cursors do not provide a stable snapshot or change feed; reconcile records by identity and repeat full scans when required. Material pages can be empty before the last page because inactive catalogue entries are omitted. Continue until pagination.isDone is true.",
  },
  servers: [
    {
      url: "/api/v1",
      description: "This website, or the configured Convex HTTP origin.",
    },
  ],
  security: [{ apiKey: [] }],
  "x-api-key-scopes": integrationScopes,
  paths: {
    "/organization": operation(
      "getOrganization",
      "The business attached to this key; callers cannot select another business.",
      "organization:read",
      {
        type: "object",
        required: ["data"],
        properties: { data: ref("Organization") },
      },
    ),
    "/materials": operation(
      "listMaterials",
      "Active catalogue entries for ERP material-code mapping.",
      "materials:read",
      pageOf("Material"),
      pageParameters,
    ),
    "/inventory": operation(
      "listInventory",
      "This business's recorded stock, including zero balances. This is stock on hand, not unreserved stock available to sell.",
      "inventory:read",
      pageOf("Inventory"),
      pageParameters,
    ),
    "/trades": operation(
      "listTrades",
      "This business's purchases or sales. paymentMode is always simulated; a paid status does not prove payment.",
      "trades:read",
      pageOf("Trade"),
      [
        ...pageParameters,
        {
          name: "side",
          in: "query",
          schema: {
            type: "string",
            enum: ["buyer", "seller"],
            default: "buyer",
          },
        },
      ],
    ),
    "/news": operation(
      "listIndustryNews",
      "Optional source-linked English headlines selected by this business's material families. A news provider and licensed production access must be configured. Articles are third-party reports, not verified guidance. No full article content is supplied. No cursor pagination. A global daily provider quota also applies.",
      "news:read",
      {
        type: "object",
        required: ["data", "meta"],
        properties: {
          data: { type: "array", items: ref("News") },
          meta: {
            type: "object",
            required: ["provider", "language", "families", "retrievedAt"],
            properties: {
              provider: { const: "newsapi" },
              language: { const: "en" },
              families: { type: "array", items: family },
              retrievedAt: integer,
            },
          },
        },
      },
      [
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 20, default: 10 },
        },
      ],
    ),
    "/openapi.json": {
      get: {
        operationId: "getOpenapi",
        security: [],
        responses: {
          "200": {
            description:
              "This OpenAPI 3.1.2 document. Available even when backend services are not configured.",
            content: json({ type: "object" }),
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      apiKey: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "lg_live_<64 lowercase hex characters>",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code"],
            properties: { code: string },
          },
        },
      },
      Pagination: {
        type: "object",
        required: ["nextCursor", "isDone"],
        properties: { nextCursor: nullableString, isDone: { type: "boolean" } },
      },
      Organization: {
        type: "object",
        required: ["id", "name", "kind", "city", "families"],
        properties: {
          id: string,
          name: string,
          kind,
          city: string,
          families: { type: "array", items: family },
        },
      },
      Material: {
        type: "object",
        required: ["code", "names", "family", "stage"],
        properties: {
          code: string,
          names: { type: "object", additionalProperties: string },
          family,
          stage: { type: "string", enum: ["scrap", "recycled"] },
        },
      },
      Inventory: {
        type: "object",
        required: ["materialCode", "grams", "updatedAt"],
        properties: {
          materialCode: string,
          grams: integer,
          updatedAt: integer,
        },
      },
      Trade: {
        type: "object",
        required: [
          "id",
          "side",
          "materialCode",
          "grams",
          "paisePerKg",
          "totalPaise",
          "status",
          "createdAt",
          "updatedAt",
          "invoiceNo",
          "paymentMode",
        ],
        properties: {
          id: string,
          side: { type: "string", enum: ["buyer", "seller"] },
          materialCode: string,
          grams: integer,
          paisePerKg: integer,
          totalPaise: integer,
          status: {
            type: "string",
            enum: [
              "requested",
              "accepted",
              "paid_to_escrow",
              "dispatched",
              "completed",
              "declined",
            ],
          },
          createdAt: integer,
          updatedAt: integer,
          invoiceNo: nullableString,
          paymentMode: { const: "simulated" },
        },
      },
      News: {
        type: "object",
        required: ["title", "url", "source", "publishedAt"],
        properties: {
          title: string,
          url: { type: "string", format: "uri" },
          source: string,
          publishedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
} as const;
