import type { Metadata } from "next";

import { OpsBoard } from "@/components/admin/ops/ops-board";

export const metadata: Metadata = { title: "Ops" };

export default function Page() {
  return <OpsBoard />;
}
