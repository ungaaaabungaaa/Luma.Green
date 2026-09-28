/**
 * `https://x.convex.cloud` → `https://x.convex.site`: where a deployment's
 * HTTP actions (and so Better Auth) live. `convex deploy` only injects the
 * `.cloud` URL into builds, so preview deployments rely on this.
 */
export function convexSiteUrlFrom(convexUrl: string): string | undefined {
  try {
    const url = new URL(convexUrl);
    if (!url.hostname.endsWith(".convex.cloud")) return undefined;
    url.hostname = url.hostname.replace(/\.convex\.cloud$/, ".convex.site");
    return url.origin;
  } catch {
    return undefined;
  }
}
