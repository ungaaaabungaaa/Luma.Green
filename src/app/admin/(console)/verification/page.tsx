import type { Metadata } from "next";

import { VerificationQueue } from "@/components/admin/verification/queue";

export const metadata: Metadata = { title: "Verification" };

export default function VerificationPage() {
  return <VerificationQueue />;
}
