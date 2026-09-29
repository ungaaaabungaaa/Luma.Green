import type { Metadata } from "next";

import { PilotNumbers } from "@/components/admin/city/pilot-numbers";

export const metadata: Metadata = { title: "Pilot numbers" };

export default function Page() {
  return <PilotNumbers />;
}
