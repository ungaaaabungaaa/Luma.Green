import { z } from "zod";

import { industryNewsEnv } from "../src/lib/env";
import { internal } from "./_generated/api";
import { type ActionCtx, httpAction } from "./_generated/server";
import { fetchIndustryNews, newsFamiliesSchema } from "./lib/industryNews";
import {
  integrationBearer,
  integrationError,
  integrationHeaders,
  parseIntegrationRequest,
} from "./lib/integrationHttp";
import { integrationOpenapi } from "./lib/integrationOpenapi";
import { hashToken, INTEGRATION_RATE_LIMIT } from "./lib/integrations";

/** Machine credentials have their own boundary; browser sessions are never accepted. */
export const serve = httpAction(async (ctx: ActionCtx, request) => {
  const requestId = crypto.randomUUID();
  if (request.method !== "GET")
    return integrationError(405, "METHOD_NOT_ALLOWED", requestId);
  const parsed = parseIntegrationRequest(new URL(request.url));
  if (parsed.kind === "error")
    return integrationError(parsed.status, parsed.code, requestId);
  if (parsed.kind === "schema") {
    return Response.json(integrationOpenapi, {
      headers: integrationHeaders(requestId),
    });
  }
  const token = integrationBearer(request);
  if (!token) return integrationError(401, "INVALID_API_KEY", requestId);
  try {
    const result = await ctx.runMutation(internal.integrations.read, {
      keyHash: await hashToken(token),
      ...parsed.args,
    });
    const headers = integrationHeaders(requestId);
    if (result.remaining !== null) {
      headers["X-RateLimit-Limit"] = String(INTEGRATION_RATE_LIMIT);
      headers["X-RateLimit-Remaining"] = String(result.remaining);
    }
    if (result.retryAfter !== null)
      headers["Retry-After"] = String(result.retryAfter);
    if (result.status === 401)
      headers["WWW-Authenticate"] = 'Bearer realm="luma-green-api"';
    return parsed.args.resource === "news" && result.status === 200
      ? await industryNewsResponse(
          ctx,
          result.body,
          parsed.args.limit,
          headers,
          requestId,
        )
      : new Response(result.body, { status: result.status, headers });
  } catch {
    // Never log a request, token, digest, cursor, or private record.
    console.error("Integration read failed", { requestId });
    return integrationError(500, "INTERNAL_ERROR", requestId);
  }
});

async function industryNewsResponse(
  ctx: ActionCtx,
  authBody: string,
  limit: number,
  headers: Record<string, string>,
  requestId: string,
): Promise<Response> {
  const config = industryNewsEnv();
  if (!config) return integrationError(503, "NEWS_UNAVAILABLE", requestId);
  const raw: unknown = JSON.parse(authBody);
  const {
    data: { families },
  } = z.object({ data: z.object({ families: newsFamiliesSchema }) }).parse(raw);
  const isAllowed = await ctx.runMutation(internal.industryNews.reserveQuota, {
    dailyLimit: config.dailyLimit,
  });
  if (!isAllowed) return integrationError(503, "NEWS_UNAVAILABLE", requestId);
  try {
    const articles = await fetchIndustryNews(config.apiKey, families, limit);
    if (!articles) return integrationError(503, "NEWS_UNAVAILABLE", requestId);
    return Response.json(
      {
        data: articles,
        meta: {
          provider: "newsapi",
          language: "en",
          families,
          retrievedAt: Date.now(),
        },
      },
      { headers },
    );
  } catch {
    console.error("Industry news provider unavailable", { requestId });
    return integrationError(503, "NEWS_UNAVAILABLE", requestId);
  }
}
