// Usage: node merge.mjs check <locale...>   validate scratch translations
//        node merge.mjs apply <locale...>   append "join" to messages/<locale>.json
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const repo = "/Users/syedabdulmuqeeth/Developer/Luma.Green";
const scratch = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.join(repo, "node_modules/.pnpm/intl-messageformat@11.2.15/node_modules/intl-messageformat/package.json"));
const { IntlMessageFormat } = require("./");

const [mode, ...locales] = process.argv.slice(2);
const en = JSON.parse(readFileSync(path.join(repo, "messages/en.json"), "utf8"));

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Rebuild `tr` in en's key order; collect missing/extra/type problems. */
function shape(ref, tr, at, problems) {
  if (!isObj(tr)) {
    problems.push(`${at}: expected object`);
    return {};
  }
  for (const key of Object.keys(tr)) {
    if (!(key in ref)) problems.push(`${at}.${key}: extra key`);
  }
  const out = {};
  for (const [key, value] of Object.entries(ref)) {
    const here = `${at}.${key}`;
    if (!(key in tr)) {
      problems.push(`${here}: missing`);
      continue;
    }
    if (isObj(value)) out[key] = shape(value, tr[key], here, problems);
    else if (typeof tr[key] !== "string" || tr[key].trim() === "") {
      problems.push(`${here}: not a non-empty string`);
    } else out[key] = tr[key];
  }
  return out;
}

function deepMerge(a, b, problems) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (k in out) {
      if (isObj(out[k]) && isObj(v)) out[k] = deepMerge(out[k], v, problems);
      else problems.push(`duplicate key across parts: ${k}`);
    } else out[k] = v;
  }
  return out;
}

const placeholders = (s) =>
  [...s.matchAll(/\{\s*([A-Za-z_]\w*)\s*[,}]/g)].map((m) => m[1]).toSorted();

function leaves(o, p = "") {
  return Object.entries(o).flatMap(([k, v]) =>
    isObj(v) ? leaves(v, p ? `${p}.${k}` : k) : [[p ? `${p}.${k}` : k, v]],
  );
}

const KEEP = ["Luma.Green", "GST", "KSPCB", "PDF", "MB", "SMS", "PAN", "29ABCDE1234F1Z5", "12–24"];

function build(locale) {
  const problems = [];
  let tr = {};
  for (const part of [1, 2]) {
    const file = path.join(scratch, `${locale}.${part}.json`);
    if (!existsSync(file)) {
      problems.push(`missing ${locale}.${part}.json`);
      continue;
    }
    tr = deepMerge(tr, JSON.parse(readFileSync(file, "utf8")), problems);
  }
  const join = shape(en.join, tr, "join", problems);
  const enLeaves = Object.fromEntries(leaves(en.join));
  for (const [key, value] of leaves(join)) {
    const source = enLeaves[key];
    const want = [...new Set(placeholders(source))].toSorted().join(",");
    const got = [...new Set(placeholders(value))].toSorted().join(",");
    if (want !== got) problems.push(`${key}: placeholders ${got} != ${want}`);
    try {
      const values = Object.fromEntries(placeholders(value).map((n) => [n, n === "km" ? 5 : "X"]));
      const out = new IntlMessageFormat(value, locale).format(values);
      // Without plural/select, output must equal a naive substitution: this
      // catches apostrophes that ICU swallowed as quote characters.
      if (!/,\s*(plural|select)/.test(value)) {
        const naive = value.replaceAll(/\{\s*(\w+)\s*\}/g, (_, n) => String(values[n]));
        if (out !== naive) problems.push(`${key}: ICU output differs: ${out}`);
      }
    } catch (error) {
      problems.push(`${key}: ICU error ${error.message}`);
    }
    for (const token of KEEP) {
      if (source.includes(token) && !value.includes(token)) {
        problems.push(`${key}: lost "${token}"`);
      }
    }
    if (/\\u[0-9a-f]{4}/i.test(value)) problems.push(`${key}: escape sequence`);
    if (value === source && !/^\{?\w*\}? ?MB$|^GST$|^PDF$/.test(value)) {
      problems.push(`${key}: identical to English (${value})`);
    }
  }
  return { join, problems, count: leaves(join).length };
}

for (const locale of locales) {
  const { join, problems, count } = build(locale);
  console.log(`${locale}: ${count} leaves, ${problems.length} problems`);
  for (const p of problems) console.log(`  - ${p}`);
  if (mode !== "apply") continue;
  if (problems.length > 0) {
    console.log(`  skipped ${locale}: fix problems first`);
    continue;
  }
  const file = path.join(repo, "messages", `${locale}.json`);
  const before = readFileSync(file, "utf8");
  const parsed = JSON.parse(before);
  if (JSON.stringify(parsed, null, 2) + "\n" !== before) {
    throw new Error(`${locale}: original does not re-serialise byte-for-byte`);
  }
  if ("join" in parsed) throw new Error(`${locale}: already has join`);
  const after = JSON.stringify({ ...parsed, join }, null, 2) + "\n";
  // The rest of the file must be untouched: drop join and compare bytes.
  const reparsed = JSON.parse(after);
  const keys = Object.keys(reparsed);
  if (keys.at(-1) !== "join") throw new Error(`${locale}: join is not last`);
  delete reparsed.join;
  if (JSON.stringify(reparsed, null, 2) + "\n" !== before) {
    throw new Error(`${locale}: rest of file changed`);
  }
  if (!after.startsWith(before.slice(0, -3))) {
    throw new Error(`${locale}: prefix of file changed`);
  }
  writeFileSync(file, after, "utf8");
  console.log(`  wrote ${file} (${before.length} -> ${after.length} chars)`);
}
