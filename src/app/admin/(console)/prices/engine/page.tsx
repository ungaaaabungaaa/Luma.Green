import type { Metadata } from "next";

import { PriceEngine } from "@/components/admin/prices/price-engine";

export const metadata: Metadata = { title: "Price engine" };

export default function Page() {
  return <PriceEngine />;
}
