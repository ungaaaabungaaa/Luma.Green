import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatWhen } from "../format";
import { AUDIT_LABELS } from "../labels";
import type { ReviewedApplication } from "./checklist";

const BY_LABELS: Record<ReviewedApplication["audit"][number]["by"], string> = {
  applicant: "Applicant",
  admin: "Admin",
  system: "Luma.Green",
};

/** Every recorded step of the application, oldest first, with notes. */
export function AuditTrail({
  entries,
}: {
  entries: ReviewedApplication["audit"];
}) {
  if (entries.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>History</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4 border-s ps-5">
          {entries.map((entry) => (
            <li key={entry.id} className="relative flex flex-col gap-1">
              <span
                aria-hidden
                className="absolute -start-6.5 top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-card"
              />
              <p className="text-sm font-medium">
                {AUDIT_LABELS[entry.action] ?? entry.action}
                {entry.action === "application.submitted" && entry.version
                  ? ` (version ${String(entry.version)})`
                  : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatWhen(entry.at)} · {BY_LABELS[entry.by]}
              </p>
              {entry.note ? (
                <blockquote className="mt-1 rounded-lg border-s-4 border-primary bg-muted/60 px-3 py-2 text-sm whitespace-pre-line">
                  {entry.note}
                </blockquote>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
