import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface GuideBuild {
  pages: number;
  pdf: string;
  pdf_sha256: string;
  inputs: Record<string, string>;
}

const build = JSON.parse(
  readFileSync("docs/user-guide/build.json", "utf8"),
) as GuideBuild;
const hash = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

describe("the mandatory platform guide", () => {
  it("keeps public role preview captures aligned with the displayed source", () => {
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
        "src/components/showcase/role-app-preview.tsx",
      );
      for (const [file, expected] of Object.entries(capture.sourceHashes)) {
        expect(hash(file), `${file}: recapture role previews`).toBe(expected);
      }
      expect(capture.actualBrowserUI).toBe(true);
      expect(capture.productionAuthenticationTested).toBe(false);
      expect(capture.browserErrors).toEqual([]);
      expect(capture.blockedRequests).toEqual([]);
    }
  });

  it("publishes the PDF that was built and checked", () => {
    expect(build.pdf).toBe("output/pdf/luma-green-user-guide.pdf");
    expect(build.pages).toBeGreaterThan(20);
    expect(readFileSync(build.pdf).subarray(0, 5).toString()).toBe("%PDF-");
    expect(hash(build.pdf)).toBe(build.pdf_sha256);
  });

  it("keeps the PDF aligned with every source and screenshot input", () => {
    expect(Object.keys(build.inputs)).toContain("docs/user-guide/guide.md");
    expect(Object.keys(build.inputs)).toContain("scripts/build-user-guide.py");
    for (const [file, expected] of Object.entries(build.inputs)) {
      expect(hash(file), `${file}: review and rebuild the user guide`).toBe(
        expected,
      );
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
    expect(evidence.captures.length).toBeGreaterThanOrEqual(12);
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
