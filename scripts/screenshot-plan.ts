/**
 * What `pnpm screenshots` captures and where each picture goes: the
 * browser-free half of scripts/screenshots.mts. It sits apart so a unit test
 * (src/docs.test.ts) can hold it to the app's routes and to the README's
 * "See it" gallery, which must list exactly the files named here.
 */

import { DEMO_ACCOUNTS, type DemoRole } from "../convex/lib/demo";

/** Where the lead's dev server runs (`pnpm dev --port 3100`). */
export const DEFAULT_BASE_URL = "http://localhost:3100";

export const SCREENSHOT_DIR = "docs/screenshots";

export interface Viewport {
  name: "phone" | "desktop";
  width: number;
  height: number;
  /** 2 keeps phone pictures sharp on high-density screens. */
  deviceScaleFactor: number;
  isMobile: boolean;
}

export const VIEWPORTS: readonly Viewport[] = [
  {
    name: "phone",
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
  },
  {
    name: "desktop",
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    isMobile: false,
  },
];

/**
 * The demo logins a screenshot may sign in with. Never the admin: its
 * sign-in needs an authenticator app.
 */
export type ShotLogin = Extract<
  DemoRole,
  "kabadiwala" | "yard" | "recycler" | "manufacturer" | "saathi"
>;

export interface Shot {
  /** Saved as `docs/screenshots/<name>-<viewport>.png`. */
  name: string;
  /** The page to open. */
  path: string;
  /** The demo login to sign in as first; public pages need none. */
  login?: ShotLogin;
  /** Then open the first link on the page whose address contains this. */
  follow?: string;
}

/** The key screens, in the order the README's gallery shows them. */
export const SHOTS: readonly Shot[] = [
  { name: "home", path: "/" },
  { name: "prices", path: "/prices" },
  { name: "sell", path: "/sell" },
  { name: "tracking", path: "/t/priyademo1" },
  { name: "join", path: "/join" },
  { name: "kabadiwala-home", path: "/app", login: "kabadiwala" },
  { name: "kabadiwala-requests", path: "/app/requests", login: "kabadiwala" },
  {
    // The Today tab lists accepted pickups; each has a "Weigh and pay" link
    // to its page's #weigh section.
    name: "kabadiwala-weigh-and-pay",
    path: "/app/requests?tab=today",
    login: "kabadiwala",
    follow: "#weigh",
  },
  { name: "kabadiwala-rate-card", path: "/app/prices", login: "kabadiwala" },
  { name: "yard-market", path: "/app/market", login: "yard" },
  { name: "yard-trades", path: "/app/trades", login: "yard" },
  { name: "recycler-home", path: "/app", login: "recycler" },
  {
    name: "manufacturer-compliance",
    path: "/app/compliance",
    login: "manufacturer",
  },
  { name: "saathi-home", path: "/app", login: "saathi" },
  { name: "help", path: "/help" },
  { name: "solar", path: "/solar" },
  { name: "standards", path: "/standards" },
];

export function screenshotPath(
  name: string,
  viewport: Viewport["name"],
): string {
  return `${SCREENSHOT_DIR}/${name}-${viewport}.png`;
}

/** Every file a run writes: each shot at each size. */
export function plannedFiles(shots: readonly Shot[] = SHOTS): string[] {
  return shots.flatMap((shot) =>
    VIEWPORTS.map((viewport) => screenshotPath(shot.name, viewport.name)),
  );
}

/** The number a demo login signs in with, in E.164. */
export function demoPhone(login: ShotLogin): string {
  const account = DEMO_ACCOUNTS.find(({ role }) => role === login);
  if (!account) throw new Error(`There is no demo login for ${login}.`);
  return account.phone;
}

/** What to type after the sign-in form's fixed +91: the ten digits. */
export function nationalNumber(e164: string): string {
  return e164.replace(/^\+91/, "");
}

/**
 * `ONLY=yard-market,yard-trades` takes just those screens; unset or empty
 * takes them all. An unknown name stops the run and lists the real ones.
 */
export function selectShots(
  only: string | undefined,
  shots: readonly Shot[] = SHOTS,
): Shot[] {
  const names = (only ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
  if (names.length === 0) return [...shots];
  const known = new Set(shots.map((shot) => shot.name));
  const unknown = names.filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown screenshot: ${unknown.join(", ")}. Choose from ${[...known].join(", ")}.`,
    );
  }
  return shots.filter((shot) => names.includes(shot.name));
}

/**
 * Shots grouped by the login they need, in first-seen order, so each demo
 * login signs in once: phone sign-in allows 10 requests a minute.
 */
export function byLogin(
  shots: readonly Shot[],
): [ShotLogin | undefined, Shot[]][] {
  const groups = new Map<ShotLogin | undefined, Shot[]>();
  for (const shot of shots) {
    groups.set(shot.login, [...(groups.get(shot.login) ?? []), shot]);
  }
  return [...groups];
}

/** `BASE_URL` as an origin, or the local dev server when it's unset. */
export function baseUrlFrom(value: string | undefined): string {
  const raw = value?.trim() ?? "";
  const url = URL.parse(raw === "" ? DEFAULT_BASE_URL : raw);
  if (url?.protocol !== "http:" && url?.protocol !== "https:") {
    throw new Error(
      `BASE_URL must be a full address such as ${DEFAULT_BASE_URL}, not "${raw}".`,
    );
  }
  return url.origin;
}
