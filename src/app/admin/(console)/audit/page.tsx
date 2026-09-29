import type { Metadata } from "next";

import { AuditLog } from "@/components/admin/audit/audit-log";

export const metadata: Metadata = { title: "Audit log" };

export default function Page() {
  return <AuditLog />;
}
