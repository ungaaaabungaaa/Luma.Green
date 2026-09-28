import { describe, expect, it } from "vitest";

import { pageMetadata, serializeJsonLd } from "./seo";

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
