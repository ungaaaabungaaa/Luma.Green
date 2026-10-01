"use client";

import { useQuery } from "convex/react";
import {
  AlarmClockIcon,
  ArrowRightIcon,
  IndianRupeeIcon,
  LifeBuoyIcon,
  type LucideIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isLocale, localeMeta } from "@/i18n/locales";
import { cn } from "@/lib/utils";

import { api } from "../../../convex/_generated/api";
import { formatPhone, formatWhen } from "./format";

export function ConsoleHome() {
  const me = useQuery(api.identity.me);
  const overview = useQuery(api.admin.overview);
  const summary = useQuery(api.review.summary);
  const firstName = me?.adminName?.split(" ", 1)[0];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Administration
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            What needs you today, and the latest people to join the pilot.
          </p>
        </div>
        <Link
          href="/admin/pilot"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          View pilot report <ArrowRightIcon aria-hidden className="size-4" />
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3" aria-busy={!summary}>
        <li>
          <StatLink
            href="/admin/verification"
            icon={ShieldCheckIcon}
            label="Waiting for review"
            value={summary?.waiting}
            hint={
              summary && summary.dueSoon > 0
                ? `${String(summary.dueSoon)} due soon`
                : "Decide within 24 hours"
            }
          />
        </li>
        <li>
          <StatLink
            href="/admin/verification"
            icon={AlarmClockIcon}
            label="Overdue"
            value={summary?.overdue}
            hint="Waiting more than 24 hours"
            isUrgent={Boolean(summary?.overdue)}
          />
        </li>
        <li>
          <StatLink
            href="/admin/support"
            icon={LifeBuoyIcon}
            label="Open support requests"
            value={summary?.openSupport}
            hint="From the help centre and solar page"
          />
        </li>
      </ul>

      <Link
        href="/admin/prices"
        className="group flex items-center gap-4 rounded-xl border border-border bg-card p-6 transition-colors outline-none hover:border-primary/40 hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <IndianRupeeIcon aria-hidden className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">Price tables</span>
          <span className="text-sm text-muted-foreground">
            The minimum and fallback price per kilo, for every material.
          </span>
        </span>
        <ArrowRightIcon
          aria-hidden
          className="size-4 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5"
        />
      </Link>

      <Card className="rounded-xl border-border shadow-none">
        <CardHeader>
          <CardTitle>
            <h2>Latest sign-ins</h2>
          </CardTitle>
          <CardDescription>
            People who confirmed their phone number, newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentSignIns people={overview?.recentSignIns} />
        </CardContent>
      </Card>
    </div>
  );
}

/** A number that needs the admin, linking to where they deal with it. */
function StatLink({
  href,
  icon: Icon,
  label,
  value,
  hint,
  isUrgent = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  hint: string;
  isUrgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-xs transition-colors outline-none hover:border-primary/40 hover:bg-accent/30 focus-visible:ring-3 focus-visible:ring-ring/50",
        isUrgent && "border-destructive/40",
      )}
    >
      <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        {label}
        <Icon
          aria-hidden
          className={cn(
            "size-4",
            isUrgent ? "text-destructive" : "text-muted-foreground",
          )}
        />
      </span>
      {value === undefined ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <span
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums",
            isUrgent && "text-destructive",
          )}
        >
          {value}
        </span>
      )}
      <span className="text-xs text-muted-foreground">{hint}</span>
    </Link>
  );
}

function RecentSignIns({
  people,
}: {
  people:
    | { id: string; phone?: string; locale: string; createdAt: number }[]
    | undefined;
}) {
  if (people === undefined) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  if (people.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nobody yet. Sign in at /login with a phone to see it here.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Phone</TableHead>
          <TableHead>Language</TableHead>
          <TableHead>First signed in</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {people.map((person) => (
          <TableRow key={person.id}>
            <TableCell className="font-mono">
              {formatPhone(person.phone)}
            </TableCell>
            <TableCell>
              {isLocale(person.locale)
                ? localeMeta[person.locale].english
                : person.locale}
            </TableCell>
            <TableCell>{formatWhen(person.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
