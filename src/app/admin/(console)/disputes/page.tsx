import type { Metadata } from "next";

import { DisputeDesk } from "@/components/admin/disputes/dispute-desk";

export const metadata: Metadata = { title: "Disputes" };

export default function Page() {
  return <DisputeDesk />;
}
