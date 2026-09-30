// Checks that every literal message key used in the given files exists in
// messages/en.json. Translator variables are mapped to namespaces from
// `useTranslations("ns")` / `getTranslations("ns")` calls in the same file,
// including `const [a, b] = await Promise.all([getTranslations("x"), ...])`.
import { readFileSync } from "node:fs";

const root = process.argv[2];
const files = process.argv.slice(3);
const messages = JSON.parse(readFileSync(`${root}/messages/en.json`, "utf8"));

function has(path) {
  return (
    path
      .split(".")
      .reduce(
        (node, part) =>
          node && typeof node === "object" ? node[part] : undefined,
        messages,
      ) !== undefined
  );
}

let problems = 0;
let checked = 0;
for (const file of files) {
  const source = readFileSync(`${root}/${file}`, "utf8");
  const namespaces = new Map();
  for (const match of source.matchAll(
    /const (\w+) = (?:await )?(?:use|get)Translations\((?:"([^"]*)")?\)/g,
  )) {
    const set = namespaces.get(match[1]) ?? new Set();
    set.add(match[2] ?? "");
    namespaces.set(match[1], set);
  }
  for (const match of source.matchAll(
    /const \[([^\]]+)\] = await Promise\.all\(\[([\s\S]*?)\]\)/g,
  )) {
    const names = match[1].split(",").map((name) => name.trim());
    const calls = [...match[2].matchAll(/(getTranslations|getFormatter)\((?:"([^"]*)")?\)/g)];
    names.forEach((name, index) => {
      const call = calls[index];
      if (call?.[1] === "getTranslations") {
        const set = namespaces.get(name) ?? new Set();
        set.add(call[2] ?? "");
        namespaces.set(name, set);
      }
    });
  }
  for (const [variable, set] of namespaces) {
    const pattern = new RegExp(`\\b${variable}(?:\\.rich)?\\("([^"$]+)"`, "g");
    for (const match of source.matchAll(pattern)) {
      const keys = [...set].map((namespace) =>
        namespace ? `${namespace}.${match[1]}` : match[1],
      );
      checked += 1;
      if (!keys.some((key) => has(key))) {
        problems += 1;
        console.log(`MISSING ${file}: ${keys.join(" | ")}`);
      }
    }
  }
}
console.log(`checked ${checked} literal keys, ${problems} missing`);
process.exit(problems ? 1 : 0);
