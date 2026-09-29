"use client";

import { useQuery } from "convex/react";
import {
  HouseIcon,
  IndianRupeeIcon,
  LifeBuoyIcon,
  LogOutIcon,
  type LucideIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import { QueryProvider } from "@/components/providers/query-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import { api } from "../../../convex/_generated/api";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** A number from `review.summary` to show beside the label. */
  count?: { key: "waiting" | "openSupport"; label: string };
}

const nav: readonly NavItem[] = [
  { href: "/admin", label: "Home", icon: HouseIcon },
  {
    href: "/admin/verification",
    label: "Verification",
    icon: ShieldCheckIcon,
    count: { key: "waiting", label: "waiting for review" },
  },
  { href: "/admin/prices", label: "Prices", icon: IndianRupeeIcon },
  {
    href: "/admin/support",
    label: "Support",
    icon: LifeBuoyIcon,
    count: { key: "openSupport", label: "open" },
  },
];

/** Home only on its own page; every other section on its sub-pages too. */
function isCurrent(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Every console page sits inside this. The server layout has already checked
 * there's a session; this checks it's the admin with an authenticator, and
 * Convex checks again on every query.
 */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const me = useQuery(api.identity.me);

  let redirectTo: string | null = null;
  if (me === null) redirectTo = "/admin/login";
  else if (me?.kind === "admin" && (!me.twoFactorEnabled || !me.adminName)) {
    redirectTo = "/admin/setup";
  }

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (me === undefined || me === null || redirectTo) {
    return <ConsoleSkeleton />;
  }
  if (me.kind !== "admin") return <NotAdmin />;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar name={me.adminName ?? "Admin"} />
      <main id="main" className="min-w-0 flex-1 px-4 py-6 lg:px-10 lg:py-10">
        <QueryProvider>{children}</QueryProvider>
      </main>
    </div>
  );
}

function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const summary = useQuery(api.review.summary);

  async function signOut() {
    await authClient.signOut();
    router.replace("/admin/login");
  }

  return (
    <aside className="flex flex-col gap-4 border-b bg-background px-4 py-3 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-e lg:border-b-0 lg:px-4 lg:py-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/admin"
          aria-label="Admin home"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <Badge variant="secondary">Admin</Badge>
      </div>
      <nav aria-label="Admin">
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {nav.map((item) => {
            const isActive = isCurrent(pathname, item.href);
            const count = item.count ? summary?.[item.count.key] : undefined;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive
                      ? "bg-brand-50 font-medium text-primary"
                      : "hover:bg-muted",
                  )}
                >
                  <item.icon aria-hidden className="size-4 shrink-0" />
                  <span>{item.label}</span>
                  {count && item.count ? (
                    <span className="ms-auto rounded-full bg-primary px-1.5 text-xs leading-5 font-medium text-primary-foreground tabular-nums">
                      {count}
                      <span className="sr-only"> {item.count.label}</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto hidden flex-col gap-2 border-t pt-4 lg:flex">
        <p className="truncate text-sm font-medium">{name}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void signOut();
          }}
        >
          <LogOutIcon aria-hidden />
          Sign out
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="self-start lg:hidden"
        onClick={() => {
          void signOut();
        }}
      >
        <LogOutIcon aria-hidden />
        Sign out {name}
      </Button>
    </aside>
  );
}

function NotAdmin() {
  return (
    <main
      id="main"
      className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-4 px-4 py-10"
    >
      <h1 className="text-xl font-semibold">This area is for the admin</h1>
      <p className="text-muted-foreground">
        You&apos;re signed in with a phone number, which can&apos;t open the
        admin console.
      </p>
      <Button
        variant="outline"
        className="self-start"
        onClick={() => {
          void authClient.signOut();
        }}
      >
        Sign out
      </Button>
    </main>
  );
}

function ConsoleSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row" aria-busy="true">
      <div className="border-b bg-background p-4 lg:w-64 lg:border-e lg:border-b-0">
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6 lg:p-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
