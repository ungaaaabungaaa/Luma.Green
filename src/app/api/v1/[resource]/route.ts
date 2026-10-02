import { convexSiteUrlFrom } from "@/lib/convex-urls";
import { clientEnv } from "@/lib/env";
import { proxyIntegrationRequest } from "@/lib/integration-proxy";

export function GET(request: Request) {
  const siteUrl =
    clientEnv.NEXT_PUBLIC_CONVEX_SITE_URL ??
    (clientEnv.NEXT_PUBLIC_CONVEX_URL
      ? convexSiteUrlFrom(clientEnv.NEXT_PUBLIC_CONVEX_URL)
      : undefined);
  return proxyIntegrationRequest(request, siteUrl);
}

// Explicitly reject methods so HEAD cannot spend a key's read quota.
export {
  GET as DELETE,
  GET as HEAD,
  GET as OPTIONS,
  GET as PATCH,
  GET as POST,
  GET as PUT,
};
