"use client";

import { useQuery } from "convex/react";
import {
  DatabaseBackupIcon,
  IndianRupeeIcon,
  type LucideIcon,
  ShieldCheckIcon,
} from "lucide-react";

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

import { api } from "../../../convex/_generated/api";
import { formatIndianMobile } from "../../../convex/lib/phone";

/** Admin times are shown in India time, whatever the laptop's zone. */
const when = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const upcoming: readonly {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Verification queue",
    body: "Applications from kabadiwalas, yards, recyclers, manufacturers and Saathis land here with the onboarding release.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Price tables",
    body: "The minimum and fallback prices per material, per kilo.",
    icon: IndianRupeeIcon,
  },
  {
    title: "Backups",
    body: "Daily exports on the office Mac — docs/operations/backups.md.",
    icon: DatabaseBackupIcon,
  },
];

export function ConsoleHome() {
  const me = useQuery(api.identity.me);
  const overview = useQuery(api.admin.overview);
  const firstName = me?.adminName?.split(" ", 1)[0];

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </h1>
        <p className="text-muted-foreground">
          The pilot console. It grows with each release.
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {upcoming.map((item) => (
          <li key={item.title}>
            <Card className="h-full">
              <CardHeader>
                <item.icon aria-hidden className="size-5 text-primary" />
                <CardTitle>
                  <h2>{item.title}</h2>
                </CardTitle>
                <CardDescription>{item.body}</CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>

      <Card>
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
              {person.phone ? formatIndianMobile(person.phone) : "—"}
            </TableCell>
            <TableCell>
              {isLocale(person.locale)
                ? localeMeta[person.locale].english
                : person.locale}
            </TableCell>
            <TableCell>{when.format(person.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
