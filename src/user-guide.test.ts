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
});
