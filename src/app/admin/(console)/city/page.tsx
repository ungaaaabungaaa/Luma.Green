import type { Metadata } from "next";

import { CityDashboard } from "@/components/admin/city/city-dashboard";

export const metadata: Metadata = { title: "City" };

export default function Page() {
  return <CityDashboard />;
}
