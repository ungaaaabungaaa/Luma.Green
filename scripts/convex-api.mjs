// Regenerates convex/_generated/api.d.ts from the modules on disk, the way
// `npx convex codegen` does, but offline. Use it when codegen cannot reach
// the deployment (no network) and after merging branches that both changed
// the file. Only api.d.ts is written; the other generated files never change
// with the module list.
//   node scripts/convex-api.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = new URL("../convex/", import.meta.url).pathname;
const OUT = path.join(ROOT, "_generated/api.d.ts");
const SKIP_DIRS = new Set(["_generated", "betterAuth"]);
const SKIP_FILES = new Set(["schema.ts", "convex.config.ts", "auth.config.ts"]);

function modules(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...modules(file));
      continue;
    }
    if (!name.endsWith(".ts") && !name.endsWith(".tsx")) continue;
    if (
      name.endsWith(".test.ts") ||
      name.endsWith(".testing.ts") ||
      name.endsWith(".d.ts")
    )
      continue;
    if (dir === ROOT && SKIP_FILES.has(name)) continue;
    out.push(path.relative(ROOT, file).replace(/\.tsx?$/, ""));
  }
  return out;
}

// Code-unit order, as codegen sorts ("demo" before "demo/city" before "exports").
const list = modules(ROOT).toSorted((a, b) => a.localeCompare(b, "en"));
const alias = (m) => m.replaceAll("/", "_");
const key = (m) => (m.includes("/") ? `"${m}"` : m);

const current = readFileSync(OUT, "utf8");
const head = current.slice(0, current.indexOf("import type * as"));
const tail = current.slice(
  current.indexOf("\nimport type {\n  ApiFromModules"),
);
const fullApiStart = tail.indexOf("declare const fullApi: ApiFromModules<{");
const fullApiEnd = tail.indexOf("}>;", fullApiStart);

const imports = list
  .map((m) => `import type * as ${alias(m)} from "../${m}.js";`)
  .join("\n");
const entries = list.map((m) => `  ${key(m)}: typeof ${alias(m)};`).join("\n");
const next =
  head +
  imports +
  "\n" +
  tail.slice(0, fullApiStart) +
  "declare const fullApi: ApiFromModules<{\n" +
  entries +
  "\n" +
  tail.slice(fullApiEnd);
if (next === current) {
  process.stdout.write(`api.d.ts: ${String(list.length)} modules, unchanged\n`);
} else {
  writeFileSync(OUT, next);
  process.stdout.write(`api.d.ts: ${String(list.length)} modules, rewritten\n`);
}
