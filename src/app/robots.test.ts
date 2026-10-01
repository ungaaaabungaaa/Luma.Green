import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "./robots";

afterEach(() => vi.unstubAllEnvs());

describe("robots", () => {
  it.each([undefined, "development", "preview"])(
    "blocks crawling outside the production deployment (%s)",
    (deployment) => {
      vi.stubEnv("VERCEL_ENV", deployment);
      expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
    },
  );

  it("lets production crawlers read private-page noindex tags", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(robots().rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    });
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
