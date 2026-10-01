import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

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
      ]),
    );
    for (const capture of captures) {
      expect(hash(capture.path), capture.path).toBe(capture.sha256);
      expect(capture.kind).toBe("current-local-disconnected");
      if (capture.captureKind === "section") {
        expect(capture.sectionSelector).toMatch(/^section\[aria-labelledby=/);
      } else {
        expect(capture.captureKind).toBe("viewport");
      }
      expect(Object.keys(capture.sourceHashes)).toEqual(
        expect.arrayContaining([
          "src/app/globals.css",
          "src/lib/fonts.ts",
          "src/components/site/home/hero.tsx",
          "src/components/site/closing-cta.tsx",
          "src/components/site/home/chain-diagram.tsx",
          "src/components/site/home/role-benefits.tsx",
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
        "src/components/showcase/role-story-image.tsx",
        "src/app/globals.css",
        "src/components/theme/theme-provider.tsx",
        "src/components/theme/theme-toggle.tsx",
        "src/components/app/app-shell.tsx",
        "src/components/admin/console-shell.tsx",
        "src/components/ui/button.tsx",
        "src/components/ui/chart.tsx",
        "src/components/admin/pilot/pilot-charts.tsx",
        "src/lib/fonts.ts",
        "scripts/guide-preview/main.tsx",
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
    expect(evidence.captures.length).toBeGreaterThanOrEqual(28);
    expect(evidence.captures.map((capture) => capture.file)).toEqual(
      expect.arrayContaining([
        "admin-overview-dark.png",
        "admin-pilot-outcomes.png",
        "admin-pilot-materials.png",
        "admin-pilot-dark.png",
        "admin-pilot-phone.png",
        "kabadiwala-overview-dark.png",
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
      expect(Object.keys(capture.sourceHashes)).toContain(
        "src/components/providers/analytics-controls.tsx",
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
