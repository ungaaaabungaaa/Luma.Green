import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/providers", () => ({ Providers: () => null }));
vi.mock("@/lib/fonts", () => ({ fontClassName: () => "" }));
vi.mock("@/lib/env", () => ({
  clientEnv: {
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: "google-token",
    NEXT_PUBLIC_BING_SITE_VERIFICATION: "bing-token",
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: () => Promise.resolve((key: string) => key),
}));

import { generateMetadata } from "./layout";

describe("locale metadata defaults", () => {
  it("does not assign the home canonical to child routes", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    });
    expect(metadata.alternates).toBeUndefined();
  });

  it("publishes configured search ownership tokens in every locale", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "ar" }),
    });
    expect(metadata.verification).toEqual({
      google: "google-token",
      other: { "msvalidate.01": "bing-token" },
    });
  });
});
