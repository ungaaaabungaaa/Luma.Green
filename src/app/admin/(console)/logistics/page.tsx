import type { Metadata } from "next";

import { LogisticsTables } from "@/components/admin/logistics/logistics-tables";

export const metadata: Metadata = { title: "Logistics" };

export default function Page() {
  return <LogisticsTables />;
}
