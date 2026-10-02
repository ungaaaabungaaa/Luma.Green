import { writeFile } from "node:fs/promises";

import { format } from "prettier";

import { buildManifest } from "./build";
import { canonicalJson, coverageReport } from "./validate";

const manifest = buildManifest();
const report = coverageReport(manifest);
if (report.errors.length > 0) throw new Error(report.errors.join("\n"));
await writeFile(
  new URL("manifest.json", import.meta.url),
  await format(canonicalJson(manifest), { parser: "json" }),
);
await writeFile(
  new URL("coverage.json", import.meta.url),
  await format(canonicalJson(report), { parser: "json" }),
);
process.stdout.write(
  `${report.manifestSha256}\n${JSON.stringify(report.counts)}\nOffline files only. No database or provider connection.\n`,
);
