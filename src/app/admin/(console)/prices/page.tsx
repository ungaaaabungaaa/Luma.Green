import type { Metadata } from "next";

import { PriceTables } from "@/components/admin/prices/price-tables";

export const metadata: Metadata = { title: "Prices" };

export default function PricesPage() {
  return <PriceTables />;
}
