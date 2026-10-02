import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const hash = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

describe("the team review pack", () => {
  it("uses fresh local browser captures, with no claimed authenticated access", () => {
    const manifest = JSON.parse(
      readFileSync("docs/team-review/screenshots/manifest.json", "utf8"),
    ) as {
      sourceHashes: Record<string, string>;
      captures: {
        path: string;
        sha256: string;
        actualBrowserUI: boolean;
        authenticatedAccessTested: boolean;
        provenance: string;
        browserErrors: string[];
        blockedRequests: string[];
      }[];
    };
    expect(manifest.captures).toHaveLength(12);
    for (const [file, expected] of Object.entries(manifest.sourceHashes)) {
      expect(hash(file), `${file}: recapture the team examples`).toBe(expected);
    }
    for (const capture of manifest.captures) {
      expect(hash(capture.path)).toBe(capture.sha256);
      expect(capture.actualBrowserUI).toBe(true);
      expect(capture.authenticatedAccessTested).toBe(false);
      expect(capture.provenance).toBe("disconnected-local-production-build");
      expect(capture.browserErrors).toEqual([]);
      expect(capture.blockedRequests).toEqual([]);
    }
  });

  it("ships the reviewed editable document from the current sources", () => {
    const build = JSON.parse(
      readFileSync("docs/team-review/build.json", "utf8"),
    ) as {
      docx: string;
      docx_sha256: string;
      inputs: Record<string, string>;
      visual_review: { status: string; pages: number; docx_sha256: string };
    };
    expect(build.docx).toBe("output/docx/luma-green-team-review.docx");
    expect(hash(build.docx)).toBe(build.docx_sha256);
    expect(build.visual_review.status).toBe("passed");
    expect(build.visual_review.pages).toBeGreaterThan(10);
    expect(build.visual_review.docx_sha256).toBe(build.docx_sha256);
    expect(Object.keys(build.inputs)).toEqual(
      expect.arrayContaining([
        "docs/team-review/review.md",
        "docs/team-review/screenshots/manifest.json",
        "docs/testing/team-end-to-end-manual.md",
        "docs/product/six-month-execution-plan.md",
        "docs/operations/india-entity-trademark-and-legal.md",
        "scripts/build-team-review.py",
      ]),
    );
    for (const [file, expected] of Object.entries(build.inputs)) {
      expect(hash(file), `${file}: rebuild and review the team document`).toBe(
        expected,
      );
    }
  });
});
