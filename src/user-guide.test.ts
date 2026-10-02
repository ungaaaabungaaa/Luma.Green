import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { localeMeta, locales } from "./i18n/locales";

interface GuideBuild {
  format: string;
  docx: string;
  docx_sha256: string;
  visual_review: { status: string; pages: number; docx_sha256: string };
  inputs: Record<string, string>;
}

const build = JSON.parse(
  readFileSync("docs/user-guide/build.json", "utf8"),
) as GuideBuild;
const hash = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

describe("the mandatory platform guide", () => {
  it("keeps the synthetic failure matrix aligned with its source and original browser pixels", () => {
    const evidence = JSON.parse(
      readFileSync("docs/user-guide/failure-captures.json", "utf8"),
    ) as {
      sourceHashes: Record<string, string>;
      screenshots: {
        file: string;
        sha256: string;
        scenario: string;
        locale: string;
        theme: string;
        viewport: { width: number; height: number };
        provenance: string;
        checks: string[];
      }[];
    };
    expect(Object.keys(evidence.sourceHashes)).toEqual(
      expect.arrayContaining([
        "src/components/admin/admin-setup.tsx",
        "src/components/admin/admin-login.tsx",
        "src/components/account/use-sign-out.ts",
        "src/components/join/file-slot.tsx",
        "src/components/join/status-view.tsx",
        "src/components/help/contact-schema.ts",
        "src/components/market/listing-card.tsx",
        "src/components/market/buy-dialog.tsx",
        "convex/lib/chain.ts",
        "src/components/market/logic.ts",
        "messages/en.json",
        "messages/ar.json",
        "src/components/app/format.ts",
        "src/components/admin/format.ts",
        "src/lib/money-format.ts",
        "scripts/guide-preview/auth.ts",
        "scripts/guide-preview/provider.tsx",
        "scripts/guide-preview/queries.ts",
      ]),
    );
    for (const [file, expected] of Object.entries(evidence.sourceHashes)) {
      expect(hash(file), `${file}: recapture the failure matrix`).toBe(
        expected,
      );
    }
    const expectedNames = new Set<string>();
    for (const scenario of [
      "login",
      "totp",
      "setup",
      "file",
      "discard",
      "signout",
      "support",
      "market",
    ]) {
      const locales = ["login", "totp", "setup"].includes(scenario)
        ? ["en"]
        : ["en", "ar"];
      for (const locale of locales)
        for (const theme of ["light", "dark"])
          for (const size of ["phone", "tablet", "desktop"])
            expectedNames.add(
              `screenshots/failure-${scenario}-${locale}-${theme}-${size}.png`,
            );
    }
    expect(
      new Set(evidence.screenshots.map((capture) => capture.file)),
    ).toEqual(expectedNames);
    expect(evidence.screenshots).toHaveLength(expectedNames.size);
    for (const capture of evidence.screenshots) {
      expect(hash(`docs/user-guide/${capture.file}`), capture.file).toBe(
        capture.sha256,
      );
      expect(capture.provenance).toContain("synthetic local failure fixture");
      expect(capture.provenance).toContain(
        "no live authentication, writes or provider execution",
      );
      expect(capture.checks).toEqual(
        expect.arrayContaining([
          "no page error",
          "no horizontal overflow",
          "empty password and token fields",
          "document direction",
          "loaded fonts",
        ]),
      );
      expect([390, 768, 1440]).toContain(capture.viewport.width);
    }
  });

  it("keeps public role photograph captures aligned with the displayed source", () => {
    const evidence = JSON.parse(
      readFileSync("docs/user-guide/showcase-captures.json", "utf8"),
    ) as {
      captures: {
        path: string;
        sha256: string;
        sourceHashes: Record<string, string>;
        actualBrowserUI: boolean;
        productionAuthenticationTested: boolean;
        browserErrors: string[];
        blockedRequests: string[];
      }[];
    };
    expect(evidence.captures).toHaveLength(4);
    for (const capture of evidence.captures) {
      expect(hash(capture.path), capture.path).toBe(capture.sha256);
      expect(Object.keys(capture.sourceHashes)).toContain(
        "src/components/showcase/role-story-image.tsx",
      );
      for (const [file, expected] of Object.entries(capture.sourceHashes)) {
        expect(hash(file), `${file}: recapture role photographs`).toBe(
          expected,
        );
      }
      expect(capture.actualBrowserUI).toBe(true);
      expect(capture.productionAuthenticationTested).toBe(false);
      expect(capture.browserErrors).toEqual([]);
      expect(capture.blockedRequests).toEqual([]);
    }
  });

  it("publishes the editable Word guide that was built and visually checked", () => {
    expect(build.format).toBe("docx");
    expect(build.docx).toBe("output/docx/luma-green-user-guide.docx");
    const archive = readFileSync(build.docx);
    expect(archive.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 3, 4]));
    for (const part of [
      "[Content_Types].xml",
      "word/document.xml",
      "word/styles.xml",
    ]) {
      expect(archive.includes(Buffer.from(part)), part).toBe(true);
    }
    expect(hash(build.docx)).toBe(build.docx_sha256);
    expect(build.visual_review.status).toBe("passed");
    expect(build.visual_review.pages).toBeGreaterThan(20);
    expect(build.visual_review.docx_sha256).toBe(build.docx_sha256);
  });

  it("keeps Word aligned with the complete source and screenshot input set", () => {
    const directory = "docs/user-guide";
    const source = readFileSync(`${directory}/guide.md`, "utf8");
    const images = Array.from(
      source.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g),
      (match) => path.posix.normalize(`${directory}/${match[1]}`),
    );
    const manifests = readdirSync(directory, {
      recursive: true,
      encoding: "utf8",
    })
      .filter((name) => name.endsWith("captures.json"))
      .map((name) => `${directory}/${name}`);
    const expected = new Set([
      `${directory}/guide.md`,
      "scripts/build-user-guide.py",
      "scripts/user-guide-requirements.txt",
      ...images,
      ...manifests,
    ]);
    expect(new Set(Object.keys(build.inputs))).toEqual(expected);
    for (const [file, value] of Object.entries(build.inputs)) {
      expect(hash(file), `${file}: review and rebuild the user guide`).toBe(
        value,
      );
    }
  });

  it("keeps public appearance captures aligned with their browser evidence", () => {
    const captures = JSON.parse(
      readFileSync("docs/user-guide/public-captures.json", "utf8"),
    ) as {
      name: string;
      path: string;
      sha256: string;
      kind: string;
      captureKind: "section" | "viewport";
      viewport: { width: number; height: number };
      theme: "light" | "dark";
      sectionSelector?: string;
      sourceHashes: Record<string, string>;
      browserErrors: string[];
      blockedRequests: string[];
    }[];
    expect(captures.map((capture) => capture.name)).toEqual(
      expect.arrayContaining([
        "public-home-dark",
        "public-home-materials",
        "public-home-pickup",
        "public-home-shop",
        "public-home-payment",
        "public-home-records",
        "public-home-questions",
        "public-participants-dark",
        "public-arabic-dark",
        "public-navigation-phone",
        "public-navigation-tablet",
        "public-navigation-arabic-phone",
        "public-login-languages-phone",
        "public-login-languages-phone-dark",
        "public-solar-details",
        "public-sorting-guide",
        "public-price-guide-dark",
        "public-join-preparation",
        "public-help-topics",
      ]),
    );
    for (const capture of captures) {
      expect(hash(capture.path), capture.path).toBe(capture.sha256);
      expect(capture.kind).toBe("current-local-disconnected");
      if (capture.name.startsWith("public-login-languages-")) {
        expect(capture.viewport).toEqual({ width: 390, height: 844 });
        expect(capture.theme).toBe(
          capture.name.endsWith("-dark") ? "dark" : "light",
        );
      }
      if (capture.captureKind === "section") {
        expect(capture.sectionSelector).toMatch(/^section\[aria-labelledby=/);
      } else {
        expect(capture.captureKind).toBe("viewport");
      }
      expect(Object.keys(capture.sourceHashes)).toEqual(
        expect.arrayContaining([
          "src/app/globals.css",
          "src/lib/fonts.ts",
          "src/lib/number-input.ts",
          "src/components/solar/calc.ts",
          "src/components/solar/solar-planner.tsx",
          "src/components/solar/choice-group.tsx",
          "src/components/sell/draft.ts",
          "src/components/site/home/hero.tsx",
          "src/components/site/closing-cta.tsx",
          "src/components/site/public-effects.module.css",
          "src/components/site/home/chain-diagram.tsx",
          "src/components/site/home/role-benefits.tsx",
          "src/components/site/mobile-nav.tsx",
          "src/components/site/site-nav.tsx",
          "src/components/prices/price-placeholder.tsx",
          "src/components/auth/language-choice.tsx",
          "src/components/auth/login-flow.tsx",
          "src/components/auth/storage.ts",
          "src/app/[locale]/(auth)/layout.tsx",
          "src/i18n/locales.ts",
          "src/components/ui/input.tsx",
          "src/components/ui/label.tsx",
          "src/components/ui/radio-group.tsx",
          "public/images/materials-hall.webp",
        ]),
      );
      for (const [file, expected] of Object.entries(capture.sourceHashes)) {
        expect(hash(file), `${file}: recapture public pages`).toBe(expected);
      }
      expect(capture.browserErrors).toEqual([]);
      expect(capture.blockedRequests).toEqual([]);
    }
  });

  it("labels connected demo-price captures and keeps their evidence current", () => {
    const captures = JSON.parse(
      readFileSync("docs/user-guide/price-captures.json", "utf8"),
    ) as {
      path: string;
      sha256: string;
      kind: string;
      sampleData: boolean;
      productionFrontendTested: boolean;
      authenticationTested: boolean;
      mutationsPerformed: boolean;
      rows: number;
      sourceHashes: Record<string, string>;
      browserErrors: string[];
      blockedRequests: string[];
    }[];
    expect(captures).toHaveLength(2);
    for (const capture of captures) {
      expect(hash(capture.path), capture.path).toBe(capture.sha256);
      expect(capture.kind).toBe("current-local-connected-demo");
      expect(capture.sampleData).toBe(true);
      expect(capture.productionFrontendTested).toBe(false);
      expect(capture.authenticationTested).toBe(false);
      expect(capture.mutationsPerformed).toBe(false);
      expect(capture.rows).toBe(26);
      expect(capture.browserErrors).toEqual([]);
      expect(capture.blockedRequests).toEqual([]);
      for (const [file, expected] of Object.entries(capture.sourceHashes)) {
        expect(hash(file), `${file}: recapture connected demo prices`).toBe(
          expected,
        );
      }
    }
  });

  it("keeps current protected-screen captures aligned with their components", () => {
    const directory = "docs/user-guide/screenshots";
    const evidence = JSON.parse(
      readFileSync(`${directory}/fixture-captures.json`, "utf8"),
    ) as {
      sharedSourceHashes: Record<string, string>;
      captures: {
        component: string;
        componentSha256: string;
        file: string;
        screenshotSha256: string;
        productionAuthenticationTested: boolean;
        browserErrors: string[];
        blockedExternalRequests: string[];
      }[];
    };
    expect(
      Object.keys(evidence.sharedSourceHashes).toSorted((left, right) =>
        left.localeCompare(right),
      ),
    ).toEqual(
      [
        "scripts/guide-preview/account-screens.mjs",
        "scripts/guide-preview/account-fixtures.ts",
        "scripts/guide-preview/auth.ts",
        "scripts/guide-preview/provider.tsx",
        "src/app/[locale]/(account)/account/layout.tsx",
        "src/components/account/account-security.tsx",
        "src/components/account/account-menu.tsx",
        "src/components/account/account-links.tsx",
        "src/components/account/use-sign-out.ts",
        "src/components/auth/factor-challenge.tsx",
        "src/components/admin/auth-shell.tsx",
        "src/components/admin/password-recovery.tsx",
        "src/components/admin/password-input.tsx",
        "src/app/admin/forgot-password/page.tsx",
        "src/app/admin/reset-password/page.tsx",
        "src/components/notifications/notifications-page.tsx",
        "src/components/notifications/notification-error-boundary.tsx",
        "src/components/notifications/device-provider.tsx",
        "messages/ar.json",
        "messages/ta.json",
        "src/components/showcase/role-story-image.tsx",
        "src/app/globals.css",
        "src/components/theme/theme-provider.tsx",
        "src/components/theme/theme-toggle.tsx",
        "src/components/app/app-shell.tsx",
        "src/components/shop/home-cards.tsx",
        "src/components/saathi/job-actions.tsx",
        "src/components/saathi/job-card.tsx",
        "src/components/admin/console-shell.tsx",
        "src/components/ui/button.tsx",
        "src/components/ui/chart.tsx",
        "src/components/ui/switch.tsx",
        "src/components/ui/input.tsx",
        "src/components/ui/label.tsx",
        "src/components/ui/checkbox.tsx",
        "src/components/ui/radio-group.tsx",
        "src/components/admin/pilot/pilot-charts.tsx",
        "src/lib/fonts.ts",
        "src/lib/money-format.ts",
        "src/components/app/format.ts",
        "src/components/admin/format.ts",
        "src/lib/number-input.ts",
        "src/components/market/logic.ts",
        "src/components/market/material-filter.tsx",
        "src/components/shop/weigh.ts",
        "scripts/guide-preview/main.tsx",
        "scripts/guide-preview/navigation.tsx",
        "scripts/guide-preview/translations.ts",
        "scripts/guide-preview/locale.ts",
        "convex/lib/catalogue.ts",
        "scripts/guide-preview/queries.ts",
        "scripts/guide-preview/selection-fixtures.tsx",
        "src/components/sell/basket-step.tsx",
        "src/components/sell/shop-step.tsx",
        "src/components/sell/material-tile.tsx",
        "src/components/sell/kg-stepper.tsx",
        "src/components/sell/mode-choice.tsx",
        "src/components/sell/when-step.tsx",
        "src/components/sell/draft.ts",
        "src/components/sell/step-frame.tsx",
        "src/components/sell/step-indicator.tsx",
        "src/app/[locale]/(household)/layout.tsx",
        "src/app/[locale]/(join)/layout.tsx",
        "src/components/join/join-pages.tsx",
        "src/components/join/join-gate.tsx",
        "src/components/join/fields.tsx",
        "src/components/join/form-parts.tsx",
        "src/components/join/use-autosave.ts",
        "src/components/market/new-listing-form.tsx",
        "src/components/market/listing-fields.tsx",
        "src/components/market/field.tsx",
        "src/components/market/my-listings.tsx",
        "src/components/insights/org-impact.tsx",
        "src/components/insights/bar-list.tsx",
        "src/components/insights/ledger-explainer.tsx",
        "scripts/guide-preview/image.tsx",
        "scripts/guide-preview/vite.config.mts",
        "messages/en.json",
        "public/images/showcase/household-sorting.webp",
        "public/images/showcase/collection-partners.webp",
        "public/images/showcase/material-yard.webp",
        "public/images/showcase/circular-workshop.webp",
        "public/images/showcase/kabadiwala-weighing.webp",
        "public/images/showcase/recycling-line.webp",
        "public/images/showcase/operations-desk.webp",
        "public/images/showcase/solar-rooftop.webp",
      ].toSorted((left, right) => left.localeCompare(right)),
    );
    for (const [file, expected] of Object.entries(
      evidence.sharedSourceHashes,
    )) {
      expect(hash(file), `${file}: recapture protected screens`).toBe(expected);
    }
    expect(evidence.captures.length).toBeGreaterThanOrEqual(72);
    expect(evidence.captures.map((capture) => capture.file)).toEqual(
      expect.arrayContaining([
        "account-inbox-en-light.png",
        "account-inbox-en-dark.png",
        "account-menu-en-light.png",
        "account-menu-ar-dark.png",
        "account-menu-ta-light.png",
        "operator-menu-en.png",
        "operator-menu-ar.png",
        "operator-menu-ta.png",
        "account-security-en.png",
        "account-security-enabled.png",
        "account-security-ar.png",
        "account-security-ta.png",
        "account-challenge-en.png",
        "account-challenge-ar.png",
        "account-challenge-ta.png",
        "account-inbox-empty.png",
        "account-inbox-error.png",
        "account-recovery-challenge.png",
        "admin-password-recovery-light.png",
        "admin-password-recovery-dark.png",
        "admin-password-reset-missing-light.png",
        "admin-password-reset-missing-dark.png",
        "household-basket-phone.png",
        "household-mode-phone.png",
        "household-when-phone.png",
        "admin-overview-dark.png",
        "admin-pilot-outcomes.png",
        "admin-pilot-materials.png",
        "admin-pilot-dark.png",
        "admin-pilot-phone.png",
        "kabadiwala-overview-dark.png",
        "kabadiwala-stock-phone.png",
        "yard-sell.png",
        "yard-invoice.png",
        "recycler-impact.png",
        "recycler-impact-phone.png",
        "join-kabadiwala-phone.png",
        "join-yard.png",
        "join-status-phone.png",
      ]),
    );
    for (const capture of evidence.captures) {
      expect(hash(capture.component), capture.component).toBe(
        capture.componentSha256,
      );
      expect(hash(`${directory}/${capture.file}`), capture.file).toBe(
        capture.screenshotSha256,
      );
      expect(capture.productionAuthenticationTested).toBe(false);
      expect(capture.browserErrors).toEqual([]);
      expect(capture.blockedExternalRequests).toEqual([]);
    }
  });

  it("keeps industry API captures current across the registered script matrix", () => {
    const directory = "docs/user-guide/screenshots";
    const evidence = JSON.parse(
      readFileSync(`${directory}/industry-api-captures.json`, "utf8"),
    ) as {
      sourceHashes: Record<string, string>;
      captures: {
        name: string;
        file: string;
        locale: (typeof locales)[number];
        theme: "light" | "dark";
        viewport: { width: number; height: number };
        screenshotSha256: string;
        productionAuthenticationTested: boolean;
        providerExecutionTested: boolean;
        writesDisabled: boolean;
        realCredentialCaptured: boolean;
        keyboardFieldTab: boolean;
        layout: {
          width: number;
          scrollWidth: number;
          direction: string;
          lang: string;
          loadedFonts: string[];
          dark: boolean;
        };
        browserErrors: string[];
        blockedExternalRequests: string[];
      }[];
    };
    const expectedNames = locales.flatMap((locale) =>
      (locale === "en" || locale === "ar"
        ? [360, 390, 768, 1024, 1440]
        : [390]
      ).flatMap((width) =>
        ["light", "dark"].map(
          (theme) => `api-access-${locale}-${String(width)}-${theme}`,
        ),
      ),
    );
    expect(evidence.captures.map((capture) => capture.name)).toEqual(
      expectedNames,
    );
    expect(Object.keys(evidence.sourceHashes)).toEqual(
      expect.arrayContaining([
        "src/components/integrations/api-access.tsx",
        "src/app/globals.css",
        "src/lib/fonts.ts",
        "scripts/guide-preview/api-main.tsx",
        "scripts/guide-preview/api-capture.mjs",
        ...locales.map((locale) => `messages/${locale}.json`),
      ]),
    );
    for (const [file, expected] of Object.entries(evidence.sourceHashes))
      expect(hash(file), `${file}: recapture API screen`).toBe(expected);
    for (const capture of evidence.captures) {
      expect(hash(`${directory}/${capture.file}`), capture.file).toBe(
        capture.screenshotSha256,
      );
      expect(capture.layout.scrollWidth).toBeLessThanOrEqual(
        capture.layout.width,
      );
      expect(capture.layout.width).toBe(capture.viewport.width);
      expect(capture.layout.direction).toBe(localeMeta[capture.locale].dir);
      expect(capture.layout.lang).toBe(capture.locale);
      expect(capture.layout.loadedFonts.length).toBeGreaterThan(0);
      expect(capture.layout.dark).toBe(capture.theme === "dark");
      expect(capture.productionAuthenticationTested).toBe(false);
      expect(capture.providerExecutionTested).toBe(false);
      expect(capture.writesDisabled).toBe(true);
      expect(capture.realCredentialCaptured).toBe(false);
      expect(capture.keyboardFieldTab).toBe(true);
      expect(capture.browserErrors).toEqual([]);
      expect(capture.blockedExternalRequests).toEqual([]);
    }
  });

  it("retains the scrolled phone controls and keyboard revoke-dialog evidence", () => {
    const directory = "docs/user-guide/screenshots";
    const evidence = JSON.parse(
      readFileSync(`${directory}/industry-api-captures.json`, "utf8"),
    ) as {
      controlCaptures: {
        file: string;
        kind: "lower-controls" | "revoke-dialog";
        screenshotSha256: string;
        writesDisabled: boolean;
        realCredentialCaptured: boolean;
        keyboardFocusOrder?: string[];
        createFocused?: boolean;
        revokeVisibleAboveNavigation?: boolean;
        revokeFocused?: boolean;
        escapeClosesDialog?: boolean;
        escapeReturnsFocus?: boolean;
      }[];
    };
    expect(evidence.controlCaptures.map((capture) => capture.file)).toEqual(
      locales
        .filter((locale) => locale === "en" || locale === "ar")
        .flatMap((locale) =>
          ["light", "dark"].flatMap((theme) => [
            `api-controls-${locale}-390-${theme}.png`,
            `api-revoke-${locale}-390-${theme}.png`,
          ]),
        ),
    );
    for (const capture of evidence.controlCaptures) {
      expect(hash(`${directory}/${capture.file}`), capture.file).toBe(
        capture.screenshotSha256,
      );
      expect(capture.writesDisabled).toBe(true);
      expect(capture.realCredentialCaptured).toBe(false);
      if (capture.kind === "lower-controls") {
        expect(capture.keyboardFocusOrder?.length).toBe(6);
        expect(capture.createFocused).toBe(true);
        expect(capture.revokeVisibleAboveNavigation).toBe(true);
      } else {
        expect(capture.revokeFocused).toBe(true);
        expect(capture.escapeClosesDialog).toBe(true);
        expect(capture.escapeReturnsFocus).toBe(true);
      }
    }
  });

  it("keeps configured analytics captures aligned with their source", () => {
    const evidence = JSON.parse(
      readFileSync("docs/user-guide/analytics-captures.json", "utf8"),
    ) as {
      captures: {
        path: string;
        sha256: string;
        sourceHashes: Record<string, string>;
        browserErrors: string[];
        actualBrowserUI: boolean;
        externalRequestsIntercepted: boolean;
        productionProviderExecutionTested: boolean;
      }[];
    };
    expect(evidence.captures).toHaveLength(2);
    expect(evidence.captures.map((capture) => capture.path)).toEqual(
      expect.arrayContaining([
        "docs/user-guide/screenshots/analytics-choice-arabic.png",
        "docs/user-guide/screenshots/analytics-choice.png",
      ]),
    );
    for (const capture of evidence.captures) {
      expect(hash(capture.path), capture.path).toBe(capture.sha256);
      expect(
        Object.keys(capture.sourceHashes).toSorted((left, right) =>
          left.localeCompare(right),
        ),
      ).toEqual(
        [
          "src/components/providers/analytics-controls.tsx",
          "src/components/providers/analytics-enabled.tsx",
          "src/components/providers/analytics-provider.tsx",
          "src/lib/analytics-runtime.ts",
          "src/lib/analytics.ts",
          "src/components/site/home/hero.tsx",
          "src/components/site/action-name.ts",
          "src/components/site/public-effects.module.css",
          "src/components/site/site-header.tsx",
          "src/components/site/mobile-nav.tsx",
          "src/components/site/site-nav.tsx",
          "src/components/site/language-switcher.tsx",
          "src/components/brand/logo.tsx",
          "src/components/brand/logo.module.css",
          "src/components/theme/theme-toggle.tsx",
          "src/components/ui/button.tsx",
          "src/components/site/container.tsx",
          "src/app/globals.css",
          "src/lib/fonts.ts",
          "public/images/materials-hall.webp",
          "messages/en.json",
          "messages/ar.json",
        ].toSorted((left, right) => left.localeCompare(right)),
      );
      for (const [file, expected] of Object.entries(capture.sourceHashes)) {
        expect(hash(file), `${file}: recapture analytics controls`).toBe(
          expected,
        );
      }
      expect(capture.browserErrors).toEqual([]);
      expect(capture.actualBrowserUI).toBe(true);
      expect(capture.externalRequestsIntercepted).toBe(true);
      expect(capture.productionProviderExecutionTested).toBe(false);
    }
  });
});
