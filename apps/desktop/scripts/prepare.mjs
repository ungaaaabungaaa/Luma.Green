import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { buildConfig } from "../src/config.mjs";

const index = process.argv.indexOf("--release");
const config = buildConfig(
  process.env,
  index === -1 ? undefined : process.argv[index + 1] || "invalid",
);
const generated = new URL("../generated/", import.meta.url);
await mkdir(generated, { recursive: true });
const messagesPath = new URL("../../../messages/", import.meta.url);
/** @type {Record<string, import('../src/localization.mjs').Messages>} */
const catalogues = {};
const messageFiles = await readdir(messagesPath);
for (const name of messageFiles) {
  if (!name.endsWith(".json")) continue;
  const messages = JSON.parse(
    await readFile(new URL(name, messagesPath), "utf8"),
  );
  if (!messages.native) throw new Error(`${name}: missing native translations`);
  catalogues[name.slice(0, -5)] = {
    brand: messages.brand,
    common: messages.common,
    nav: messages.nav,
    native: messages.native,
  };
}
await writeFile(
  new URL("config.json", generated),
  `${JSON.stringify(config, null, 2)}\n`,
);
await writeFile(
  new URL("messages.json", generated),
  `${JSON.stringify(catalogues)}\n`,
);
console.warn(`Prepared desktop resources in ${fileURLToPath(generated)}`);

await copyFile(
  new URL("../../../public/brand/app-icon.png", import.meta.url),
  new URL("app-icon.png", generated),
);

for (const extension of ["icns", "ico"]) {
  await copyFile(
    new URL(`../../../public/brand/app-icon.${extension}`, import.meta.url),
    new URL(`app-icon.${extension}`, generated),
  );
}
