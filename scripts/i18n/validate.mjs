// Checks a translated chunk against its English source.
//   node validate.mjs <english-chunk.json> <translated-chunk.json>
// Exit 0 = good. Otherwise prints every problem, one per line.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(
  "/Users/syedabdulmuqeeth/Developer/Luma.Green/package.json",
);
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

function load(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.log(`${file}: not valid JSON (${error.message})`);
    process.exit(1);
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
function signature(elements, out = new Set()) {
  for (const element of elements) {
    if (element.type === 1) out.add(`arg:${element.value}`);
    if (element.type === 2) out.add(`number:${element.value}`);
    if (element.type === 3) out.add(`date:${element.value}`);
    if (element.type === 4) out.add(`time:${element.value}`);
    if (element.type === 8) {
      out.add(`tag:${element.value}`);
      signature(element.children, out);
    }
    if (element.type === 5 || element.type === 6) {
      const kind = element.type === 5 ? "select" : "plural";
      out.add(`${kind}:${element.value}`);
      if (!("other" in element.options)) {
        out.add(`MISSING-other:${element.value}`);
      }
      if (element.type === 5) {
        for (const option of Object.keys(element.options)) {
          out.add(`select-option:${element.value}:${option}`);
        }
      }
      for (const option of Object.values(element.options)) {
        signature(option.value, out);
      }
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

const source = flat(load(sourcePath));
const target = flat(load(targetPath));

for (const key of Object.keys(source)) {
  if (!(key in target)) problems.push(`${key}: missing`);
}
for (const key of Object.keys(target)) {
  if (!(key in source)) problems.push(`${key}: not in the English chunk`);
}
for (const [key, english] of Object.entries(source)) {
  const value = target[key];
  if (value === undefined) continue;
  if (typeof value !== "string" || value.trim() === "") {
    problems.push(`${key}: empty or not a string`);
    continue;
  }
  if (/^TODO/i.test(value)) problems.push(`${key}: starts with TODO`);
  const a = parsed(english, `${key} (English)`);
  const b = parsed(value, key);
  if (!a || !b) continue;
  const want = [...signature(a)].sort().join(" ");
  const got = [...signature(b)].sort().join(" ");
  if (want !== got) {
    problems.push(`${key}: placeholders differ. English has [${want}], translation has [${got}]`);
  }
  if (english.includes("Luma.Green") && !value.includes("Luma.Green")) {
    problems.push(`${key}: keep the brand name "Luma.Green" exactly`);
  }
}

if (problems.length > 0) {
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`OK: ${Object.keys(source).length} keys`);
