import type { Metadata } from "next";

import { Business } from "@/components/admin/businesses/business";

export const metadata: Metadata = { title: "Business" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Business id={id} />;
}
