import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Next already owns Sharp for image optimization. Resolve it through Next so
// this reproducible asset conversion does not need a second image toolchain.
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public/brand");
const source = await readFile(path.join(output, "logo-mark.svg"));
await mkdir(output, { recursive: true });

async function icon(size, isForeground = false) {
  const edge = Math.round(size * (isForeground ? 0.5 : 0.78));
  const mark = await sharp(source).resize(edge, edge).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: isForeground ? 0 : 1 },
    },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toBuffer();
}

await writeFile(path.join(output, "app-icon.png"), await icon(1024));
await writeFile(
  path.join(output, "app-icon-foreground.png"),
  await icon(1024, true),
);

// Modern ICO and ICNS containers can contain PNG payloads. Construct only
// documented image-size entries; no native platform utility is required.
const icoSizes = [16, 32, 48, 64, 128, 256];
const icoImages = await Promise.all(icoSizes.map((size) => icon(size)));
const directory = Buffer.alloc(6 + 16 * icoSizes.length);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(icoSizes.length, 4);
let offset = directory.length;
for (const [index, bytes] of icoImages.entries()) {
  const start = 6 + 16 * index;
  directory[start] = icoSizes[index] === 256 ? 0 : icoSizes[index];
  directory[start + 1] = directory[start];
  directory.writeUInt16LE(1, start + 4);
  directory.writeUInt16LE(32, start + 6);
  directory.writeUInt32LE(bytes.length, start + 8);
  directory.writeUInt32LE(offset, start + 12);
  offset += bytes.length;
}
await writeFile(
  path.join(output, "app-icon.ico"),
  Buffer.concat([directory, ...icoImages]),
);

const icnsSizes = new Map([
  [128, "ic07"],
  [256, "ic08"],
  [512, "ic09"],
  [1024, "ic10"],
]);
const chunks = [];
for (const [size, type] of icnsSizes) {
  const png = await icon(size);
  const header = Buffer.alloc(8);
  header.write(type);
  header.writeUInt32BE(png.length + 8, 4);
  chunks.push(header, png);
}
const header = Buffer.alloc(8);
header.write("icns");
header.writeUInt32BE(
  8 + chunks.reduce((size, chunk) => size + chunk.length, 0),
  4,
);
await writeFile(
  path.join(output, "app-icon.icns"),
  Buffer.concat([header, ...chunks]),
);
