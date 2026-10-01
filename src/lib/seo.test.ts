import { describe, expect, it } from "vitest";

import {
  pageMetadata,
  privateMetadata,
  searchVerificationMetadata,
  serializeJsonLd,
} from "./seo";

const input = {
  path: "/how-it-works",
  title: "How it works",
  description: "What happens at each step.",
};

describe("pageMetadata", () => {
  it("canonicalises each locale to itself, never to the English page", () => {
    const tamil = pageMetadata({ ...input, locale: "ta" });

    expect(tamil.alternates?.canonical).toBe("/ta/how-it-works");
    expect(tamil.openGraph?.url).toBe("/ta/how-it-works");
  });

  it("uses the Open Graph locale format", () => {
    expect(pageMetadata({ ...input, locale: "hi" }).openGraph?.locale).toBe(
      "hi_IN",
    );
  });

  it("applies the site title template unless the title is absolute", () => {
    expect(pageMetadata({ ...input, locale: "en" }).title).toBe("How it works");
    expect(
      pageMetadata({ ...input, locale: "en", absoluteTitle: true }).title,
    ).toEqual({ absolute: "How it works" });
  });
});

describe("serializeJsonLd", () => {
  it("cannot be used to close the script tag it is rendered into", () => {
    const json = serializeJsonLd({ name: "</script><script>alert(1)" });

    expect(json).not.toContain("</script>");
    expect(JSON.parse(json)).toEqual({ name: "</script><script>alert(1)" });
  });
});

describe("searchVerificationMetadata", () => {
  it("emits no ownership tags until configured", () => {
    expect(searchVerificationMetadata({})).toBeUndefined();
    expect(
      searchVerificationMetadata({ google: " ", bing: "" }),
    ).toBeUndefined();
  });

  it("supports independent Google and Bing ownership tokens", () => {
    expect(searchVerificationMetadata({ google: " google-token " })).toEqual({
      google: "google-token",
    });
    expect(searchVerificationMetadata({ bing: "bing-token" })).toEqual({
      other: { "msvalidate.01": "bing-token" },
    });
    expect(
      searchVerificationMetadata({
        google: "google-token",
        bing: "bing-token",
      }),
    ).toEqual({
      google: "google-token",
      other: { "msvalidate.01": "bing-token" },
    });
  });
});

it("private pages clear inherited discovery metadata and prevent indexing", () => {
  expect(privateMetadata("My booking")).toEqual({
    title: "My booking",
    robots: { index: false, follow: false },
    alternates: {},
    openGraph: null,
    twitter: null,
  });
});
