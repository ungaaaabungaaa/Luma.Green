# Search setup and checks

The site has translated page metadata, canonical URLs, language alternates,
Open Graph images, structured data, a sitemap and crawl rules. Search ownership
verification is optional. It does not load an analytics script or record visits.

## Connect search tools

1. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS domain. Keep the canonical host
   and domain redirects consistent.
2. Add that site in Google Search Console. For a URL-prefix property, select
   HTML tag verification. Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` to the
   tag's `content` value only. A Domain property uses DNS verification instead.
3. Add the site in Bing Webmaster Tools. For HTML meta verification, set
   `NEXT_PUBLIC_BING_SITE_VERIFICATION` to the `msvalidate.01` tag's `content`
   value only. Import from Search Console or DNS verification are alternatives.
4. Rebuild and deploy. These are public build-time ownership tokens, not API
   keys. Check the HTML source of `/` for the matching tags, then select Verify
   in each service. Code or a local tag check does not prove site ownership.
5. Submit `https://<your-domain>/sitemap.xml` in each service. Use URL Inspection
   for the home page and one translated public page. Track indexing and search
   performance in those services. Submission does not guarantee indexing.

Leave either variable empty if that verification method is not used. No paid SEO
API or automatic sitemap submission service is required by this implementation.

## Indexing boundaries

- The existing release rule stays in place: `robots.txt` allows production
  crawling only when `VERCEL_ENV=production`. Preview, local and an unconfigured
  self-hosted release block crawling. Review the release environment deliberately
  before enabling indexing on a different host.
- `/sell` and `/join` are public entry pages and stay in the sitemap. Tracking,
  login, applicant forms, the business app and admin pages stay out.
- Private HTML pages use `noindex, nofollow`. Production does not block those
  pages in `robots.txt`, so crawlers can read the noindex instruction. This is
  a search policy; session and server authorization protect private records.
- `/api/` stays blocked. Admin responses also carry `X-Robots-Tag`.
- Each public page supplies its own canonical. The locale root does not assign
  the home canonical to every child. Sitemap entries include all 33 locales and
  an English `x-default` link. `lastModified` is omitted because the repository
  has no authoritative per-page content update timestamp.

## Release checks

Run `pnpm exec vitest run src/lib/seo.test.ts src/app/robots.test.ts src/app/sitemap.test.ts 'src/app/[locale]/metadata.test.ts'`.
Then run the required `pnpm check` before pushing. On the deployed site, check:

- Public `/`, `/prices` and `/ar/prices`: self-canonical and reciprocal language
  links, correct titles, usable social preview images.
- `/admin/login`, `/login` and `/join/status`: noindex; no public canonical.
- Production `robots.txt`: allows pages and blocks `/api/`. Preview: blocks `/`.
- `sitemap.xml`: public URLs use the final host; no tokens, login or admin URLs.
- Search Console and Bing: ownership accepted and sitemap fetched successfully.

No live ownership verification, indexing result, ranking or Lighthouse score is
established by unit tests. Keep these as deployment checks.

## Official references

- [Next.js verification metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#verification)
- [Google site ownership verification](https://support.google.com/webmasters/answer/9008080)
- [Bing site verification](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b)
- [Google noindex and crawl access](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Google sitemap timestamps](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)
