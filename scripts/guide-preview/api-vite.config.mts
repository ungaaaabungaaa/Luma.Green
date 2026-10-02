import { mergeConfig } from "vite";

import base from "./vite.config.mjs";

/** Same isolated adapters and production assets, with only the entry point changed. */
export default mergeConfig(base, {
  plugins: [
    {
      name: "industry-api-documentation-entry",
      transformIndexHtml(html: string) {
        return html.replace('src="/main.tsx"', 'src="/api-main.tsx"');
      },
    },
  ],
  server: { port: 3213 },
});
