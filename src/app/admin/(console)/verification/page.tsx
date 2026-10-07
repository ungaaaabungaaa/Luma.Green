import type { Metadata } from "next";

import { VerificationQueue } from "@/components/admin/verification/queue";
import { StakeholderQueue } from "@/components/admin/verification/stakeholder-queue";

export const metadata: Metadata = { title: "Verification" };

export default function VerificationPage() {
  return (
    <div className="flex flex-col gap-10">
      <VerificationQueue />
      <StakeholderQueue />
    </div>
  );
}
