import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, "../..");
const staticDirectory = path.resolve(repository, ".next/static");
const styles = readdirSync(path.resolve(staticDirectory, "css")).filter(
  (file) => file.endsWith(".css"),
);
const fontClasses = styles
  .flatMap((file) => {
    const rules = readFileSync(
      path.resolve(staticDirectory, "css", file),
      "utf8",
    ).split("}");
    return rules
      .filter(
        (rule) =>
          rule.startsWith(".") &&
          (rule.includes("{--font-geist:") ||
            rule.includes("{--font-noto-sans:") ||
            rule.includes("{--font-noto-mono:")),
      )
      .map((rule) => rule.slice(1, rule.indexOf("{")));
  })
  .join(" ");

export default defineConfig({
  root: directory,
  publicDir: staticDirectory,
  envDir: directory,
  define: { "process.env": JSON.stringify({ NODE_ENV: "development" }) },
  plugins: [
    react(),
    {
      name: "documentation-build-style",
      transformIndexHtml(html) {
        return html
          .replace("<!-- APP_STYLES -->", () =>
            styles
              .map((file) => `<link rel="stylesheet" href="/css/${file}">`)
              .join("\n"),
          )
          .replace("APP_FONT_CLASSES", () => fontClasses);
      },
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (request.url?.startsWith("/_next/static/")) {
            // Connect requires a mutable URL to map local build assets; no remote proxy is used.
            // eslint-disable-next-line no-param-reassign
            request.url = request.url.replace("/_next/static/", "/");
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: [
      { find: "next/image", replacement: path.resolve(directory, "image.tsx") },
      {
        find: "next-intl/server",
        replacement: path.resolve(directory, "translations.ts"),
      },
      {
        find: "@/lib/auth-client",
        replacement: path.resolve(directory, "auth.ts"),
      },
      {
        find: "@/i18n/navigation",
        replacement: path.resolve(directory, "navigation.tsx"),
      },
      {
        find: "convex/react",
        replacement: path.resolve(directory, "queries.ts"),
      },
      {
        find: "next/link",
        replacement: path.resolve(directory, "navigation.tsx"),
      },
      {
        find: "next/navigation",
        replacement: path.resolve(directory, "navigation.tsx"),
      },
      { find: "@", replacement: path.resolve(repository, "src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 3202,
    strictPort: true,
    fs: { allow: [repository] },
  },
});
