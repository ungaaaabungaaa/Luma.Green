import type { Metadata } from "next";

import { SupportInbox } from "@/components/admin/support/support-inbox";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return <SupportInbox />;
}
