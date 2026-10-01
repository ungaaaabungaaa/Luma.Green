import type { Metadata } from "next";

import { PilotNumbers } from "@/components/admin/pilot/pilot-numbers";

export const metadata: Metadata = {
  title: "Pilot numbers",
  description:
    "Booking outcomes, pickup receipts and application decision times for the Luma.Green pilot.",
};

export default function PilotPage() {
  return <PilotNumbers />;
}
