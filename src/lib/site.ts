import { clientEnv } from "./env";

/**
 * Brand constants. Anything user-visible that names the product lives here so
 * a rename is a one-file change.
 */
export const site = {
  name: "Luma.Green",
  /** Used where a single token is needed (package names, analytics, app ids). */
  slug: "luma-green",
  tagline: "Cleaner Tomorrow in Motion",
  domain: "luma.green",
  /**
   * Read through `clientEnv`, which treats an empty var as unset. A raw
   * `process.env.X ?? fallback` lets `""` through, and `new URL("")` then fails
   * the prerender of every locale.
   */
  url: clientEnv.NEXT_PUBLIC_SITE_URL ?? "https://luma.green",
  supportEmail: "support@luma.green",
  /** Private vulnerability reports — see SECURITY.md. */
  securityEmail: "security@luma.green",
  github: "https://github.com/ungaaaabungaaa/Luma.Green",
  /** Brand green — keep in sync with `--brand-*` in `globals.css`. */
  themeColor: "#1F7A5A",
} as const;

export type Site = typeof site;
