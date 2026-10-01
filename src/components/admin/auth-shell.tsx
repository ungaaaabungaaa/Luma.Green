import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggleControl } from "@/components/theme/theme-toggle";

/** A narrow, distraction-free form; setup and sign-in share the same frame. */
export function AdminAuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex min-h-20 items-center justify-between gap-4 border-b bg-background px-5 sm:px-8">
        <Link
          href="/"
          aria-label="Luma.Green home"
          className="inline-flex min-h-11 items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <ThemeToggleControl
          labels={{
            label: "Appearance",
            light: "Light",
            dark: "Dark",
            system: "System",
          }}
        />
      </header>
      <main
        id="main"
        className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-8 sm:py-12"
      >
        <div className="rounded-xl border bg-card p-5 sm:p-8">
          <div className="mb-6 flex items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            <ShieldCheckIcon aria-hidden className="size-4" />
            Administrator access
          </div>
          <div className="mb-8 flex flex-col gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </div>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          Password and authenticator required for console access.
        </p>
      </main>
    </div>
  );
}
