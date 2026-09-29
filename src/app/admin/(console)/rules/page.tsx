import type { Metadata } from "next";

import { Rulebook } from "@/components/admin/rules/rulebook";

export const metadata: Metadata = { title: "Rules" };

export default function Page() {
  return <Rulebook />;
}
