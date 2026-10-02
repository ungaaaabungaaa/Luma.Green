import { z } from "zod";

export const newsFamiliesSchema = z
  .array(z.enum(["paper", "plastic", "metal", "glass", "ewaste", "other"]))
  .max(6);
type Family = z.infer<typeof newsFamiliesSchema>[number];
const terms: Record<Family, string> = {
  paper: '"paper recycling" OR "recycled paper"',
  plastic: '"plastic recycling" OR "recycled plastic"',
  metal: '"metal recycling" OR "scrap metal"',
  glass: '"glass recycling" OR cullet',
  ewaste: '"electronic waste" OR "electronics recycling"',
  other: '"industrial recycling" OR "circular economy"',
};
const articleSchema = z.object({
  title: z.string().trim().min(1).max(500),
  url: z
    .url()
    .max(2048)
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    }),
  source: z.object({ name: z.string().trim().min(1).max(200) }),
  publishedAt: z.iso.datetime({ offset: true }),
});
const responseSchema = z.object({
  status: z.literal("ok"),
  articles: z.array(z.unknown()).max(100),
});

export interface IndustryArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

/** Fixed provider and trusted material terms. No org identity or contacts are sent. */
export async function fetchIndustryNews(
  apiKey: string,
  families: Family[],
  limit: number,
): Promise<IndustryArticle[] | null> {
  const selected = [...new Set(families)];
  const query = (selected.length > 0 ? selected : ["other" as const])
    .map((family) => `(${terms[family]})`)
    .join(" OR ");
  const url = new URL("https://newsapi.org/v2/everything");
  url.search = new URLSearchParams({
    q: query,
    language: "en",
    sortBy: "publishedAt",
    pageSize: String(limit),
    searchIn: "title,description",
  }).toString();
  const response = await fetch(url, {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const body = await readNewsBody(response);
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) return null;
  const articles: IndustryArticle[] = [];
  const seen = new Set<string>();
  for (const input of parsed.data.articles) {
    const result = articleSchema.safeParse(input);
    if (!result.success) continue;
    const article = result.data;
    if (article.title === "[Removed]" || seen.has(article.url)) continue;
    seen.add(article.url);
    articles.push({
      title: article.title,
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt,
    });
    if (articles.length >= limit) break;
  }
  return articles;
}

/** Provider article content is discarded; cap even unexpected/chunked payloads. */
async function readNewsBody(response: Response): Promise<unknown> {
  const maxBytes = 512 * 1024;
  if (
    Number(response.headers.get("content-length")) > maxBytes ||
    !response.body
  )
    return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(result.value, { stream: true });
    }
    text += decoder.decode();
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } finally {
    reader.releaseLock();
  }
}
