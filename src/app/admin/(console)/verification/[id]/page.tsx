import type { Metadata } from "next";

import { ApplicationReview } from "@/components/admin/verification/application-review";

export const metadata: Metadata = { title: "Review an application" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplicationReviewPage({ params }: Props) {
  const { id } = await params;
  // Keyed, so the checklist starts empty for every application.
  return <ApplicationReview key={id} applicationId={id} />;
}
