import type { Metadata } from "next";

import { SolarAdmin } from "@/components/admin/solar/solar-admin";

export const metadata: Metadata = { title: "Solar" };

export default function Page() {
  return <SolarAdmin />;
}
