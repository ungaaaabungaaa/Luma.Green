import { z } from "zod";

import {
  integrationBearer,
  integrationError,
  integrationHeaders,
  parseIntegrationRequest,
} from "../../convex/lib/integrationHttp";
import { integrationOpenapi } from "../../convex/lib/integrationOpenapi";

const publicError = z.object({
  error: z.object({
    code: z.enum([
      "INVALID_QUERY",
      "INVALID_REQUEST",
      "INVALID_CURSOR",
      "INVALID_API_KEY",
      "ACCESS_DENIED",
      "INSUFFICIENT_SCOPE",
      "NOT_FOUND",
      "METHOD_NOT_ALLOWED",
      "RATE_LIMITED",
      "INTERNAL_ERROR",
      "API_UNAVAILABLE",
      "NEWS_UNAVAILABLE",
    ]),
  }),
});

/** The upstream is deployment configuration, never a caller-provided URL. */
export async function proxyIntegrationRequest(
  request: Request,
  siteUrl: string | undefined,
): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (request.method !== "GET")
    return integrationError(405, "METHOD_NOT_ALLOWED", requestId);
  const url = new URL(request.url);
  const parsed = parseIntegrationRequest(url);
  if (parsed.kind === "error")
    return integrationError(parsed.status, parsed.code, requestId);
  if (parsed.kind === "schema") {
    return Response.json(integrationOpenapi, {
      headers: integrationHeaders(requestId),
    });
  }
  const token = integrationBearer(request);
  if (!token) return integrationError(401, "INVALID_API_KEY", requestId);
  if (!siteUrl) return integrationError(503, "API_UNAVAILABLE", requestId);
  try {
    const target = new URL(url.pathname + url.search, siteUrl);
    const upstream = await fetch(target, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (
      !upstream.headers.get("content-type")?.includes("application/json") ||
      ![200, 400, 401, 403, 404, 405, 429, 500, 503].includes(upstream.status)
    )
      return integrationError(503, "API_UNAVAILABLE", requestId);
    const headers = integrationHeaders(requestId);
    for (const name of [
      "X-Request-Id",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "Retry-After",
      "WWW-Authenticate",
    ]) {
      const value = upstream.headers.get(name);
      if (value) headers[name] = value;
    }
    if (upstream.status === 500)
      return integrationError(500, "INTERNAL_ERROR", requestId);
    if (upstream.status >= 400) {
      const body: unknown = await upstream.json();
      const parsedError = publicError.safeParse(body);
      if (!parsedError.success)
        return integrationError(503, "API_UNAVAILABLE", requestId);
      return Response.json(parsedError.data, {
        status: upstream.status,
        headers,
      });
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    // Keep credentials and provider error payloads out of application telemetry.
    console.error("Integration upstream unavailable", { requestId });
    return integrationError(503, "API_UNAVAILABLE", requestId);
  }
}
