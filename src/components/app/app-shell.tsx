"use client";

import { EllipsisIcon, LifeBuoyIcon, LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { isCurrentSection } from "@/components/site/site-nav";
import { SkipLink } from "@/components/site/skip-link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import { type AppRole, NAV, type NavItem } from "./nav";
import { ListSkeleton } from "./page-parts";
import { useWorkspace } from "./use-workspace";

function isActive(pathname: string, href: string) {
  return href === "/app"
    ? pathname === "/app"
    : isCurrentSection(pathname, href);
}

/**
 * The business app's frame: who you are, where you can go, a way out. Phones
 * get a bottom bar; wider screens a sidebar. People without an approved
 * business or Saathi profile are sent to their application.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("app");
  const workspace = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (workspace === null) {
      router.replace({ pathname: "/login", query: { next: pathname } });
    } else if (workspace?.kind === "none") {
      router.replace("/join/status");
    }
  }, [workspace, router, pathname]);

  if (!workspace || workspace.kind === "none") {
    return (
      <div className="mx-auto w-full max-w-5xl p-4">
        <ListSkeleton />
      </div>
    );
  }

  const role: AppRole =
    workspace.kind === "org" ? workspace.org.kind : "saathi";
  const name =
    workspace.kind === "org" ? workspace.org.name : workspace.saathi.name;
  const { primary, more } = NAV[role];
  const help = `/help/${role}`;

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/login");
  };

  const link = (item: NavItem, className: string) => {
    const Icon = item.icon;
    const isCurrent = isActive(pathname, item.href);
    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        aria-current={isCurrent ? "page" : undefined}
        className={cn(className, isCurrent && "bg-brand-50 text-primary")}
      >
        <Icon aria-hidden className="size-5 shrink-0" />
        <span className="break-words">{t(`nav.${item.label}`)}</span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40 md:flex-row">
      <SkipLink />
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 overflow-y-auto bg-brand-950 p-5 text-brand-50 md:flex lg:w-72 lg:p-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <div className="rounded-2xl border border-brand-700/50 bg-brand-900 p-4">
          <p className="truncate text-base font-semibold">{name}</p>
          <p className="mt-1 text-xs text-brand-200">{t(`roles.${role}`)}</p>
        </div>
        <nav aria-label={t("navLabel")} className="flex flex-col gap-2">
          {[...primary, ...more].map((item) =>
            link(
              item,
              "flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium outline-none transition-colors hover:bg-brand-800 hover:text-brand-50 focus-visible:ring-3 focus-visible:ring-ring/50",
            ),
          )}
          <Link
            href={help}
            className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium transition-colors outline-none hover:bg-brand-800 hover:text-brand-50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <LifeBuoyIcon aria-hidden className="size-5" />
            {t("nav.help")}
          </Link>
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-brand-800 pt-5">
          <LanguageSwitcher />
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 text-foreground"
            onClick={() => void signOut()}
          >
            <LogOutIcon aria-hidden />
            {t("signOut")}
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-18 items-center justify-between gap-2 border-b border-border/70 bg-background/95 px-4 backdrop-blur md:hidden">
        <Link
          href="/"
          aria-label={t("homeLink")}
          className="inline-flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo idPrefix="lg-bar" />
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label={t("more")}>
                <EllipsisIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <p className="px-2 py-1.5 text-sm font-medium">{name}</p>
              <DropdownMenuSeparator />
              {more.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href}>
                    <item.icon aria-hidden />
                    {t(`nav.${item.label}`)}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild>
                <Link href={help}>
                  <LifeBuoyIcon aria-hidden />
                  {t("nav.help")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOutIcon aria-hidden />
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-8 px-4 pt-7 pb-28 sm:px-6 md:px-8 md:pt-10 md:pb-12 lg:px-12"
      >
        {children}
      </main>

      <nav
        aria-label={t("navLabel")}
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border/70 bg-background/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur md:hidden"
        style={{
          gridTemplateColumns: `repeat(${String(primary.length)}, minmax(0, 1fr))`,
        }}
      >
        {primary.map((item) =>
          link(
            item,
            "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-xs font-medium text-muted-foreground outline-none focus-visible:bg-muted",
          ),
        )}
      </nav>
    </div>
  );
}
