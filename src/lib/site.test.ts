import { afterEach, describe, expect, it, vi } from "vitest";

// `site` reads the env when the module is evaluated, so each case loads a
// fresh copy after stubbing.
async function loadSite() {
  vi.resetModules();
  const module_ = await import("./site");
  return module_.site;
}

describe("site.url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to the production domain when the var is set but empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const site = await loadSite();

    expect(site.url).toBe("https://luma.green");
    expect(() => new URL(site.url)).not.toThrow();
  });

  it("uses the configured URL when one is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://preview.luma.green");
    const site = await loadSite();

    expect(site.url).toBe("https://preview.luma.green");
  });
});
