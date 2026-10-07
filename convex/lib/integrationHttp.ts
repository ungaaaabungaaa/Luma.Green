import {
  INTEGRATION_DEFAULT_PAGE_SIZE,
  INTEGRATION_MAX_PAGE_SIZE,
  type IntegrationResource,
  isIntegrationToken,
} from "./integrations";

export const INTEGRATION_PATH = "/api/v1/";

export interface IntegrationRequest {
  resource: IntegrationResource;
  limit: number;
  cursor: string | null;
  side: "buyer" | "seller";
}

type ParsedRequest =
  | { kind: "data"; args: IntegrationRequest }
  | { kind: "schema" }
  | { kind: "error"; status: number; code: string };

/** Parse the same small contract at both public entry points. No tenant input. */
export function parseIntegrationRequest(url: URL): ParsedRequest {
  const resource = url.pathname.slice(INTEGRATION_PATH.length);
  if (
    !url.pathname.startsWith(INTEGRATION_PATH) ||
    ![
      "organization",
      "materials",
      "inventory",
      "trades",
      "news",
      "openapi.json",
    ].includes(resource)
  ) {
    return { kind: "error", status: 404, code: "NOT_FOUND" };
  }
  if (url.href.length > 8192) {
    return { kind: "error", status: 400, code: "INVALID_QUERY" };
  }
  const names = [...url.searchParams.keys()];
  const allowed =
    resource === "trades" ? ["limit", "cursor", "side"] : ["limit", "cursor"];
  if (resource === "news") allowed.splice(0, allowed.length, "limit");
  else if (resource === "organization" || resource === "openapi.json")
    allowed.length = 0;
  if (
    names.some((name) => !allowed.includes(name)) ||
    new Set(names).size !== names.length
  ) {
    return { kind: "error", status: 400, code: "INVALID_QUERY" };
  }
  if (resource === "openapi.json") return { kind: "schema" };
  const limitText = url.searchParams.get("limit");
  const defaultLimit = resource === "news" ? 10 : INTEGRATION_DEFAULT_PAGE_SIZE;
  const limit = limitText === null ? defaultLimit : Number(limitText);
  const cursor = url.searchParams.get("cursor");
  const side = url.searchParams.get("side") ?? "buyer";
  if (
    (limitText !== null && !/^[1-9]\d{0,2}$/.test(limitText)) ||
    limit > (resource === "news" ? 20 : INTEGRATION_MAX_PAGE_SIZE) ||
    (cursor !== null && (cursor.length === 0 || cursor.length > 4096)) ||
    (side !== "buyer" && side !== "seller")
  ) {
    return { kind: "error", status: 400, code: "INVALID_QUERY" };
  }
  // The allowlist above narrows the external string to this protocol union.
  return {
    kind: "data",
    args: { resource: resource as IntegrationResource, limit, cursor, side },
  };
}

export function integrationBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  const match = header ? /^Bearer (\S+)$/i.exec(header) : null;
  const token = match?.[1];
  return token && isIntegrationToken(token) ? token : null;
}

export function integrationHeaders(requestId: string): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
    "X-Robots-Tag": "noindex",
  };
}

export function integrationError(
  status: number,
  code: string,
  requestId: string,
): Response {
  const headers = integrationHeaders(requestId);
  if (status === 401)
    headers["WWW-Authenticate"] = 'Bearer realm="luma-green-api"';
  else if (status === 405) headers.Allow = "GET";
  return Response.json({ error: { code } }, { status, headers });
}
