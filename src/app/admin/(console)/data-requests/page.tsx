import type { Metadata } from "next";

import { DataRequests } from "@/components/admin/disputes/data-requests";

export const metadata: Metadata = { title: "Data requests" };

export default function Page() {
  return <DataRequests />;
}
