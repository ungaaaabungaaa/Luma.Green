import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(path.join(process.cwd(), "node_modules/.pnpm/intl-messageformat@11.2.15/node_modules/intl-messageformat/package.json"));
const { IntlMessageFormat } = require(path.join(process.cwd(), "node_modules/.pnpm/intl-messageformat@11.2.15/node_modules/intl-messageformat"));
const dir = path.join(process.cwd(), "messages");
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => typeof v === "object" && v !== null ? flat(v, p ? `${p}.${k}` : k) : [[p ? `${p}.${k}` : k, v]]);
const en = JSON.parse(readFileSync(path.join(dir, "en.json"), "utf8"));
const enMap = new Map(flat(en));
let bad = 0;
const selectsWithoutOther = [];
for (const file of readdirSync(dir)) {
  const locale = file.replace(".json", "");
  const msgs = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  for (const [key, value] of flat(msgs)) {
    if (typeof value !== "string") continue;
    let ast;
    try { ast = new IntlMessageFormat(value, locale === "en" ? "en-IN" : locale).getAst(); }
    catch (e) { bad++; console.log(`BROKEN ${locale} ${key}: ${e.message.split("\n")[0]} :: ${value.slice(0,120)}`); continue; }
    // compare argument names with English
    const args = (a, set = new Set()) => { for (const el of a) { if (el.value && (el.type === 1 || el.type === 2 || el.type === 3 || el.type === 4 || el.type === 5 || el.type === 6)) set.add(el.value); if (el.options) for (const o of Object.values(el.options)) args(o.value, set); } return set; };
    const mine = args(ast);
    if (locale !== "en") {
      const enVal = enMap.get(key);
      if (typeof enVal === "string") {
        const theirs = args(new IntlMessageFormat(enVal, "en-IN").getAst());
        const missing = [...theirs].filter((x) => !mine.has(x));
        const extra = [...mine].filter((x) => !theirs.has(x));
        if (extra.length) { bad++; console.log(`EXTRA-ARG ${locale} ${key}: extra=${extra.join(",")} en=${[...theirs].join(",")}`); }
      }
    }
    const checkSelect = (a) => { for (const el of a) { if ((el.type === 5 || el.type === 6) && el.options && !("other" in el.options)) selectsWithoutOther.push(`${locale} ${key} {${el.value}} options=${Object.keys(el.options).join("|")}`); if (el.options) for (const o of Object.values(el.options)) checkSelect(o.value); } };
    checkSelect(ast);
  }
}
console.log("broken/extra:", bad);
console.log("selects without other:", selectsWithoutOther.length);
for (const s of selectsWithoutOther.slice(0, 60)) console.log("  ", s);
