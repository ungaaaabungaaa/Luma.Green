import "../globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AdminProviders } from "@/components/admin/admin-providers";
import { fontClassName } from "@/lib/fonts";
import { site } from "@/lib/site";

/**
 * Root layout for `/admin` — English only, outside the locale segment
 * (docs/architecture/urls.md). Never indexed: next.config.ts also sends
 * `X-Robots-Tag: noindex` for every `/admin` response.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: `%s · ${site.name} admin` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${fontClassName("en")} h-full`}>
      <body className="flex min-h-full flex-col bg-muted/50 text-foreground">
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
