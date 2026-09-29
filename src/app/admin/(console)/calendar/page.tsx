import type { Metadata } from "next";

import { ComplianceCalendar } from "@/components/admin/rules/compliance-calendar";

export const metadata: Metadata = { title: "Calendar" };

export default function Page() {
  return <ComplianceCalendar />;
}
