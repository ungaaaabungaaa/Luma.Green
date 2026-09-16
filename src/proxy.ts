import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Run on everything except API routes, Next internals, and files with an
  // extension (images, fonts, robots.txt, …).
  //
  // This MUST stay a plain string literal. Next statically analyses this
  // export at build time and rejects anything it cannot read directly —
  // a `String.raw` template here fails the build with "Invalid segment
  // configuration export".
  // eslint-disable-next-line unicorn/prefer-string-raw
  matcher: "/((?!api|_next|_vercel|monitoring|.*\\..*).*)",
};
