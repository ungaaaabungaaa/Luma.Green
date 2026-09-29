import type { Metadata } from "next";

import { Businesses } from "@/components/admin/businesses/businesses";

export const metadata: Metadata = { title: "Businesses" };

export default function Page() {
  return <Businesses />;
}
