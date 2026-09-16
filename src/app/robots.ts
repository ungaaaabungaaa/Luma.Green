import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preview and staging deployments must never be indexed.
  const isProduction = process.env.VERCEL_ENV === "production";

  return {
    rules: isProduction
      ? { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
