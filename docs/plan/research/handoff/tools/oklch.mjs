// Scratch helper: approximate sRGB hex for Tailwind oklch tokens, to pick
// illustration tones by eye. Not part of the project.
import { readFileSync } from "node:fs";

function oklchToHex(L, C, h) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const f = (x) => {
    const c = Math.max(0, Math.min(1, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  };
  return (
    "#" +
    [r, g, bl]
      .map((x) =>
        Math.round(f(x) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

const css = readFileSync(process.argv[2], "utf8");
const wanted = new Set(process.argv.slice(3));
for (const match of css.matchAll(
  /--color-([a-z]+)-(\d+): oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/g,
)) {
  const [, family, step, L, C, h] = match;
  if (!wanted.has(family)) continue;
  console.log(
    `${family}-${step}`.padEnd(12),
    oklchToHex(Number(L) / 100, Number(C), Number(h)),
  );
}
