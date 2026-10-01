"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";

import { AppPageHeader } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
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

import { api } from "../../../../convex/_generated/api";
import { shiftDate } from "../../../../convex/lib/dates";
import { indiaToday } from "../../../../convex/lib/onboarding";
import { formatDay, formatRupees } from "../format";

type Summary = FunctionReturnType<typeof api.pilot.summary>;
const PERIODS = [
  { value: "1", label: "Today" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "pilot", label: "13–20 October" },
] as const;
type Period = (typeof PERIODS)[number]["value"];
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

function periodDates(period: Period, now: number) {
  if (period === "pilot") return { start: "2026-10-13", end: "2026-10-20" };
  const end = indiaToday(now);
  return { start: shiftDate(end, 1 - Number(period)), end };
}

export function PilotNumbers() {
  const [period, setPeriod] = useState<Period>("7");
  const [now, setNow] = useState(() => Date.now());
  const { start, end } = periodDates(period, now);
  const summary = useQuery(api.pilot.summary, {
    from: Date.parse(`${start}T00:00:00+05:30`),
    to: Date.parse(`${shiftDate(end, 1)}T00:00:00+05:30`),
  });
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <AppPageHeader
        title="Pilot numbers"
        lead="Bookings and applications recorded on the platform. Payments are recorded at the door; the platform does not transfer money."
      />
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Report period"
      >
        {PERIODS.map((option) => (
          <Button
            key={option.value}
            variant={period === option.value ? "default" : "outline"}
            aria-pressed={period === option.value}
            onClick={() => {
              setPeriod(option.value);
              setNow(Date.now());
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {formatDay(start)} to {formatDay(end)}, India time. Booking counts use
        the date booked. Application counts use the latest submission date.
        Outcomes show their current state.
      </p>
      {summary === undefined ? (
        <div role="status" aria-label="Loading pilot numbers">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <Report summary={summary} />
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Not measured yet</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Photo-to-booking conversion and onboarding form drop-offs need event
          recording. They are not zero and are not included in this report.
          Sample bookings, if present in this deployment, are included.
        </CardContent>
      </Card>
    </div>
  );
}

function Report({ summary }: { summary: Summary }) {
  const { bookings, applications } = summary;
  const isTruncated =
    summary.bookingsTruncated || summary.applicationsTruncated;
  return (
    <>
      {isTruncated ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive p-4 text-sm"
        >
          Partial report: only the latest {number.format(summary.sampleLimit)}{" "}
          records from each group are included. Choose a shorter period before
          using these totals.
        </p>
      ) : null}
      {bookings.count === 0 && applications.count === 0 ? (
        <p role="status">
          No bookings or submitted applications in this period.
        </p>
      ) : null}
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Bookings"
          value={number.format(bookings.count)}
          hint={`${number.format(bookings.reassignedCount)} sent to another shop`}
        />
        <Metric
          label="Average time to accept"
          value={
            bookings.averageAcceptMs === null
              ? "Not available"
              : `${number.format(bookings.averageAcceptMs / 60_000)} min`
          }
          hint={`From booking to first acceptance · ${number.format(bookings.acceptedCount)} bookings`}
        />
        <Metric
          label="Material collected"
          value={`${number.format(bookings.weighedGrams / 1000)} kg`}
          hint={`${number.format(bookings.completedWithReceipt)} completed bookings with receipts`}
        />
        <Metric
          label="Paid to households"
          value={formatRupees(bookings.paidPaise)}
          hint={`Estimate for the same receipts: ${formatRupees(bookings.estimatedPaise)}`}
        />
      </dl>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Booking outcomes</h2>
          </CardTitle>
          <CardDescription>
            Unanswered offers move to another shop. If no eligible shop remains,
            the booking ends as declined.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric
              label="Waiting for a shop"
              value={number.format(bookings.outcomes.requested)}
            />
            <Metric
              label="Accepted"
              value={number.format(bookings.outcomes.accepted)}
            />
            <Metric
              label="On the way"
              value={number.format(bookings.outcomes.on_the_way)}
            />
            <Metric
              label="Completed"
              value={number.format(bookings.outcomes.completed)}
            />
            <Metric
              label="Declined / no shop found"
              value={number.format(bookings.outcomes.declined)}
            />
            <Metric
              label="Cancelled"
              value={number.format(bookings.outcomes.cancelled)}
            />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Estimate and weighed material</h2>
          </CardTitle>
          <CardDescription>
            Only completed bookings with receipts. These are household
            estimates; an AI photo estimate is not connected yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed receipts in this period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material code</TableHead>
                  <TableHead className="text-end">Estimated kg</TableHead>
                  <TableHead className="text-end">Weighed kg</TableHead>
                  <TableHead className="text-end">Difference kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.materials.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-mono">{row.code}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {number.format(row.estimatedGrams / 1000)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {number.format(row.weighedGrams / 1000)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {number.format(
                        (row.weighedGrams - row.estimatedGrams) / 1000,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Application decisions</h2>
          </CardTitle>
          <CardDescription>
            Latest submission for each application. Historical review rounds and
            drafts are not included.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="Applications submitted"
              value={number.format(applications.count)}
              hint={`${number.format(applications.awaitingDecisionCount)} waiting for a decision`}
            />
            <Metric
              label="Decisions recorded"
              value={number.format(applications.decidedCount)}
            />
            <Metric
              label="Average time to decide"
              value={
                applications.averageDecisionMs === null
                  ? "Not available"
                  : `${number.format(applications.averageDecisionMs / 3_600_000)} h`
              }
            />
          </dl>
        </CardContent>
      </Card>
    </>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint ? (
        <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>
      ) : null}
    </div>
  );
}
