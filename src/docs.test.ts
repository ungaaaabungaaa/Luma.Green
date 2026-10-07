import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { NAV } from "@/components/app/nav";
import { publicRoutes } from "@/i18n/paths";

import { DEMO_ACCOUNTS } from "../convex/lib/demo";
import { formatIndianMobile } from "../convex/lib/phone";
import {
  baseUrlFrom,
  byLogin,
  DEFAULT_BASE_URL,
  demoPhone,
  nationalNumber,
  plannedFiles,
  selectShots,
  SHOTS,
  VIEWPORTS,
} from "../scripts/screenshot-plan";

/**
 * The partner docs and the screenshot script have to say what the code does.
 * Vitest only collects src/ and convex/, so the checks for
 * scripts/screenshot-plan.ts and for the Markdown live here.
 */

// Vitest runs from the repo root.
const fromRoot = (file: string) => path.join(process.cwd(), file);
const read = (file: string) => readFileSync(fromRoot(file), "utf8");

/** The docs written for founders, partners and testers. */
const PARTNER_DOCS = [
  "README.md",
  "docs/testing/README.md",
  "docs/product/features.md",
];

describe("the screenshot plan", () => {
  it("gives every screen its own kebab-case name", () => {
    const names = SHOTS.map((shot) => shot.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
  });

  it("takes each screen at phone and desktop size", () => {
    expect(
      VIEWPORTS.map(({ name, width, height }) => [name, width, height]),
    ).toEqual([
      ["phone", 390, 844],
      ["desktop", 1440, 900],
    ]);
    expect(plannedFiles()).toHaveLength(SHOTS.length * 2);
    expect(plannedFiles()).toContain("docs/screenshots/home-phone.png");
    expect(plannedFiles()).toContain("docs/screenshots/home-desktop.png");
  });

  it("opens public pages signed out, and app screens the login's menu has", () => {
    const publicPaths = new Set<string>(publicRoutes);
    for (const shot of SHOTS) {
      const { pathname } = new URL(shot.path, "http://localhost");
      if (shot.login) {
        const { primary, more } = NAV[shot.login];
        const menu = [...primary, ...more].map((item) => item.href);
        expect(menu, shot.name).toContain(pathname);
      } else {
        const isPublic =
          publicPaths.has(pathname) || /^\/t\/[a-z0-9]{10}$/.test(pathname);
        expect(isPublic, shot.name).toBe(true);
      }
    }
  });

  it("signs in with the seeded demo logins", () => {
    const phones = DEMO_ACCOUNTS.map((account) => account.phone);
    for (const shot of SHOTS) {
      if (shot.login) expect(phones).toContain(demoPhone(shot.login));
    }
    expect(demoPhone("kabadiwala")).toBe("+919000000101");
    expect(demoPhone("saathi")).toBe("+919000000105");
  });

  it("signs each login in once, after the public pages", () => {
    const logins = byLogin(SHOTS).map(([login]) => login);
    expect(logins[0]).toBeUndefined();
    expect(new Set(logins).size).toBe(logins.length);
    expect(logins).toEqual([
      undefined,
      "kabadiwala",
      "yard",
      "recycler",
      "manufacturer",
      "saathi",
    ]);
  });

  it("types the ten digits that follow the fixed +91", () => {
    expect(nationalNumber("+919000000101")).toBe("9000000101");
  });

  it("takes a subset with ONLY and names the real screens for a typo", () => {
    expect(selectShots(undefined)).toHaveLength(SHOTS.length);
    expect(selectShots(" ")).toHaveLength(SHOTS.length);
    expect(selectShots("prices, home").map((shot) => shot.name)).toEqual([
      "home",
      "prices",
    ]);
    expect(() => selectShots("home,prise")).toThrow(
      /Unknown screenshot: prise\. Choose from home, prices/,
    );
  });

  it("reads BASE_URL, defaulting to the dev server on port 3100", () => {
    expect(baseUrlFrom(undefined)).toBe(DEFAULT_BASE_URL);
    expect(baseUrlFrom("  ")).toBe("http://localhost:3100");
    expect(baseUrlFrom("https://preview.example.com/some/page")).toBe(
      "https://preview.example.com",
    );
    expect(() => baseUrlFrom("localhost:3100")).toThrow(/BASE_URL/);
    expect(() => baseUrlFrom("ftp://example.com")).toThrow(/BASE_URL/);
  });
});

describe("the partner docs", () => {
  it("show exactly the screenshots the script takes", () => {
    const readme = read("README.md");
    const shown = new Set(
      readme.matchAll(/docs\/screenshots\/[\w-]+\.png/g).map(([file]) => file),
    );
    const planned = new Set(plannedFiles());
    expect(
      [...planned].filter((file) => !shown.has(file)),
      "taken by the script but missing from the README",
    ).toEqual([]);
    expect(
      [...shown].filter((file) => !planned.has(file)),
      "in the README but never taken by the script",
    ).toEqual([]);
  });

  it("documents isolated local acceptance without shared credentials or cloud demo resets", () => {
    for (const doc of ["README.md", "docs/testing/README.md"]) {
      const text = read(doc);
      expect(text, doc).toContain("launch-2026-10-10.md");
      expect(text, doc).toContain("http://localhost:3100");
      expect(text, doc).toContain("restricted annex");
      expect(text, doc).toMatch(/outside Git and the shared guide/);
      expect(text, doc).toMatch(
        /cloud[^\n]*paused|cloud backends[\s\S]{0,80}paused/i,
      );
      expect(text, doc).not.toMatch(
        /123456|AUTH_DEV_MODE(?:=|\s+)true|convex run demo:(?:seed|reset)/,
      );
      for (const { phone } of DEMO_ACCOUNTS)
        expect(
          text,
          `${doc} must not publish reusable demo phone access`,
        ).not.toContain(formatIndianMobile(phone));
    }
    const readme = read("README.md");
    expect(readme).toContain("scripts/local-acceptance/README.md");
    expect(readme).toContain("AUTH_LOCAL_TEST_MODE=true");
    expect(readme).toContain("CONVEX_SITE_URL");
    expect(readme).toContain("historical prototype captures");
    expect(readme).toContain("B2B payment-dependent actions");
    expect(readme).toContain("Cashfree Payment Gateway with Easy Split");
  });

  it.each(PARTNER_DOCS)(
    "%s links only to files and headings that exist",
    (doc) => {
      const links = localLinks(read(doc));
      expect(links.length).toBeGreaterThan(0);
      for (const { file, anchor } of links) {
        const target = file === "" ? doc : path.join(path.dirname(doc), file);
        const label = `${doc} → ${file}#${anchor}`;
        expect(existsSync(fromRoot(target)), label).toBe(true);
        if (anchor !== "" && target.endsWith(".md")) {
          expect(headingIds(read(target)), label).toContain(anchor);
        }
      }
    },
  );
});

/** The Markdown outside fenced code blocks. */
function prose(markdown: string): string {
  let isInCode = false;
  return markdown
    .split("\n")
    .filter((line) => {
      if (line.trimStart().startsWith("```")) isInCode = !isInCode;
      return !isInCode;
    })
    .join("\n");
}

/**
 * Relative links in Markdown and inline HTML, split into file and #anchor.
 * The screenshots are skipped: they exist once `pnpm screenshots` has run.
 */
function localLinks(markdown: string): { file: string; anchor: string }[] {
  const text = prose(markdown);
  const targets = [
    ...text.matchAll(/\]\(([^)\s]+)/g).map((match) => match[1]),
    ...text.matchAll(/(?:href|src)="([^"]+)"/g).map((match) => match[1]),
  ];
  return targets
    .filter(
      (target) =>
        !/^[a-z][a-z+.-]*:/i.test(target) &&
        !target.startsWith("docs/screenshots/"),
    )
    .map((target) => {
      const [file = "", anchor = ""] = target.split("#", 2);
      return { file, anchor };
    });
}

/** The ids GitHub gives a document's headings, for `#anchor` links. */
function headingIds(markdown: string): string[] {
  return prose(markdown)
    .split("\n")
    .filter((line) => /^#{1,6} /.test(line))
    .map((line) =>
      line
        .replace(/^#+ /, "")
        .toLowerCase()
        .replaceAll(/[^\p{L}\p{M}\p{N}_ -]/gu, "")
        .replaceAll(" ", "-"),
    );
}
