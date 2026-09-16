import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware replacements for `next/link` and the `next/navigation` hooks.
 * Always import navigation helpers from here — never from `next/navigation`
 * directly — or links will drop the active locale.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
