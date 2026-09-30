// Scratch preview: renders every illustration to one static HTML page with
// the Tailwind colour classes resolved to hex. Not part of the project.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = process.argv[2];
const out = process.argv[3];
const require = createRequire(path.join(root, "package.json"));
const { createJiti } = require("jiti");

const jiti = createJiti(path.join(root, "package.json"), {
  jsx: true,
  alias: { "@": path.join(root, "src") },
});

const React = require("react");
globalThis.React = React;
const { renderToStaticMarkup } = require("react-dom/server");
const mod = await jiti.import(
  path.join(root, "src/components/illustrations/index.ts"),
);

function oklchToHex(L, C, h) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const f = (x) => {
    const c = Math.max(0, Math.min(1, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  };
  return (
    "#" +
    rgb
      .map((x) =>
        Math.round(f(x) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

const colors = { white: "#ffffff" };
const theme = readFileSync(
  path.join(root, "node_modules/tailwindcss/theme.css"),
  "utf8",
);
for (const m of theme.matchAll(
  /--color-([a-z]+-\d+): oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/g,
)) {
  colors[m[1]] = oklchToHex(Number(m[2]) / 100, Number(m[3]), Number(m[4]));
}
const globals = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
for (const m of globals.matchAll(/--color-(brand-\d+): (#[0-9a-f]{6});/g)) {
  colors[m[1]] = m[2];
}

const names = Object.keys(mod.illustrations);
const cards = names
  .map((name) => {
    const Component = mod.illustrations[name];
    const svg = renderToStaticMarkup(React.createElement(Component, {}));
    return `<figure><div class="art">${svg}</div><figcaption>${name}</figcaption></figure>`;
  })
  .join("\n");

const used = new Set();
for (const m of cards.matchAll(/\b(fill|stroke)-([a-z]+(?:-\d+)?)\b/g)) {
  used.add(`${m[1]}-${m[2]}`);
}
const css = [...used]
  .map((cls) => {
    const [prop, ...rest] = cls.split("-");
    const color = colors[rest.join("-")];
    if (!color) return `/* missing ${cls} */`;
    return `.${cls}{${prop}:${color}}`;
  })
  .join("\n");

writeFileSync(
  out,
  `<!doctype html><html><head><meta charset="utf-8"><title>Illustrations</title><style>
body{font-family:system-ui;margin:24px;background:#fff;color:#222}
.grid{display:grid;grid-template-columns:repeat(3,260px);gap:16px}
figure{margin:0;border:1px solid #eee;border-radius:12px;padding:10px}
figcaption{font-size:12px;color:#666;margin-top:4px}
svg{width:240px;height:auto;display:block}
${css}
</style></head><body><div class="grid">${cards}</div></body></html>`,
);
console.log("wrote", out, "classes:", used.size);
console.log([...used].filter((c) => !colors[c.split("-").slice(1).join("-")]));
