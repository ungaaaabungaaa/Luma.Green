// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

import { industryNewsEnv } from "../../src/lib/env";
import { fetchIndustryNews } from "./industryNews";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("requires both explicit enablement and valid private provider settings", () => {
  vi.stubEnv("INDUSTRY_NEWS_API_KEY", "key");
  expect(industryNewsEnv()).toBeNull();
  vi.stubEnv("INDUSTRY_NEWS_ENABLED", "true");
  expect(industryNewsEnv()).toEqual({ apiKey: "key", dailyLimit: 100 });
  vi.stubEnv("INDUSTRY_NEWS_DAILY_LIMIT", "1001");
  expect(industryNewsEnv()).toBeNull();
});
it("removes malformed, unsafe and duplicate articles and strips full article data", async () => {
  const article = {
    title: "Recycling update",
    source: { name: "Publisher" },
    url: "https://news.example/article",
    publishedAt: "2026-10-01T00:00:00Z",
    content: "full content",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        status: "ok",
        articles: [
          article,
          article,
          { ...article, url: "javascript:alert(1)" },
          { ...article, publishedAt: "invalid" },
          {
            ...article,
            title: "[Removed]",
            url: "https://news.example/removed",
          },
        ],
      }),
    ),
  );
  expect(await fetchIndustryNews("key", ["metal", "paper"], 10)).toEqual([
    {
      title: article.title,
      source: "Publisher",
      url: article.url,
      publishedAt: article.publishedAt,
    },
  ]);
});
it("returns unavailable for malformed provider responses", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        status: "error",
        message: "private provider information",
      }),
    ),
  );
  expect(await fetchIndustryNews("key", [], 10)).toBeNull();
});

it("bounds a chunked provider payload before parsing it", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(" ".repeat(513 * 1024))),
  );
  expect(await fetchIndustryNews("key", ["plastic"], 10)).toBeNull();
});
