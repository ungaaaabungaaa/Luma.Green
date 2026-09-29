import type { Metadata } from "next";

import { Registrations } from "@/components/admin/registrations/registrations";

export const metadata: Metadata = { title: "Registrations" };

export default function Page() {
  return <Registrations />;
}
