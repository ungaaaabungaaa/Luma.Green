import type { Locale } from "@/i18n/locales";
import { redirect } from "@/i18n/navigation";

import { hasServerSession } from "./auth-server";

/**
 * For signed-in pages: a visitor without a session goes to `/login` and comes
 * back to `path` afterwards. Checked on the server, so the page never flashes;
 * Convex checks again on every query. Without Convex configured, everyone is
 * signed out.
 */
export async function requireSession(locale: Locale, path: string) {
  if (await hasServerSession()) return;
  redirect({ href: { pathname: "/login", query: { next: path } }, locale });
}
