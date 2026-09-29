// Checks a translated chunk against its English source.
//   node scripts/i18n/validate.mjs <english-chunk.json> <translated-chunk.json>
// Exit 0 = good. Otherwise prints every problem, one per line.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// Resolve the ICU parser through next-intl's own dependency chain, so the
// validator parses messages exactly as the app does. Resolution starts from
// this file, so the script runs from any checkout.
const require = createRequire(import.meta.url);
const nextIntl = require.resolve("next-intl");
const intlMessageFormat = require.resolve("intl-messageformat", {
  paths: [nextIntl],
});
const { parse } = require(
  require.resolve("@formatjs/icu-messageformat-parser", {
    paths: [intlMessageFormat],
  }),
);

const [sourcePath, targetPath] = process.argv.slice(2);
const problems = [];

function print(line) {
  process.stdout.write(`${line}\n`);
}

function load(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${file}: not valid JSON (${error.message})`);
  }
}

function flat(object, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flat(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

// TYPE numbers from the parser: 1 argument, 2 number, 3 date, 4 time,
// 5 select, 6 plural, 7 pound, 8 tag.
const SIMPLE_KINDS = { 1: "arg", 2: "number", 3: "date", 4: "time" };

function branchSignature(element, out) {
  const kind = element.type === 5 ? "select" : "plural";
  out.add(`${kind}:${element.value}`);
  if (!Object.hasOwn(element.options, "other")) {
    out.add(`MISSING-other:${element.value}`);
  }
  if (kind === "select") {
    for (const option of Object.keys(element.options)) {
      out.add(`select-option:${element.value}:${option}`);
    }
  }
  for (const option of Object.values(element.options)) {
    signature(option.value, out);
  }
}

function signature(elements, out = new Set()) {
  for (const element of elements) {
    const simple = SIMPLE_KINDS[element.type];
    if (simple) {
      out.add(`${simple}:${element.value}`);
    } else if (element.type === 8) {
      out.add(`tag:${element.value}`);
      signature(element.children, out);
    } else if (element.type === 5 || element.type === 6) {
      branchSignature(element, out);
    }
  }
  return out;
}

function parsed(text, where) {
  try {
    return parse(text, { ignoreTag: false });
  } catch (error) {
    problems.push(`${where}: ICU syntax error (${error.message})`);
    return null;
  }
}

function describe(elements) {
  return [...signature(elements)]
    .toSorted((a, b) => a.localeCompare(b, "en"))
    .join(" ");
}

function check(key, english, value) {
  if (typeof value !== "string" || value.trim() === "") {
    problems.push(`${key}: empty or not a string`);
    return;
  }
  if (/^TODO/i.test(value)) problems.push(`${key}: starts with TODO`);
  const a = parsed(english, `${key} (English)`);
  const b = parsed(value, key);
  if (!a || !b) return;
  const want = describe(a);
  const got = describe(b);
  if (want !== got) {
    problems.push(
      `${key}: placeholders differ. English has [${want}], translation has [${got}]`,
    );
  }
  if (english.includes("Luma.Green") && !value.includes("Luma.Green")) {
    problems.push(`${key}: keep the brand name "Luma.Green" exactly`);
  }
}

const source = flat(load(sourcePath));
const target = flat(load(targetPath));

for (const key of Object.keys(source)) {
  if (!Object.hasOwn(target, key)) problems.push(`${key}: missing`);
}
for (const key of Object.keys(target)) {
  if (!Object.hasOwn(source, key)) {
    problems.push(`${key}: not in the English chunk`);
  }
}
for (const [key, english] of Object.entries(source)) {
  if (Object.hasOwn(target, key)) check(key, english, target[key]);
}

if (problems.length > 0) {
  print(problems.join("\n"));
  print(`\n${problems.length} problem(s)`);
  process.exitCode = 1;
} else {
  print(`OK: ${Object.keys(source).length} keys`);
}
