import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preview and staging deployments must never be indexed.
  const isProduction = process.env.VERCEL_ENV === "production";

  return {
    rules: isProduction
      ? // Private pages must be crawlable for their noindex tags to be read.
        { userAgent: "*", allow: "/", disallow: ["/api/"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
