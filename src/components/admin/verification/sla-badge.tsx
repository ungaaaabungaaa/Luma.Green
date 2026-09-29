import {
  AlarmClockIcon,
  CircleCheckIcon,
  type LucideIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { StatusPill } from "@/components/app/page-parts";

import type { Sla } from "../../../../convex/lib/review";
import { formatWaiting } from "../format";

const SLA_LOOK: Record<
  Sla,
  { label: string; tone: "good" | "warn" | "bad"; icon: LucideIcon }
> = {
  ok: { label: "On time", tone: "good", icon: CircleCheckIcon },
  due_soon: { label: "Due soon", tone: "warn", icon: AlarmClockIcon },
  overdue: { label: "Overdue", tone: "bad", icon: TriangleAlertIcon },
};

/** How long an application has waited for the admin, and whether that's OK. */
export function SlaBadge({ sla, hours }: { sla: Sla; hours: number }) {
  const look = SLA_LOOK[sla];
  return (
    <StatusPill tone={look.tone}>
      <look.icon aria-hidden className="me-1 size-3.5" />
      {formatWaiting(hours)} · {look.label}
    </StatusPill>
  );
}
