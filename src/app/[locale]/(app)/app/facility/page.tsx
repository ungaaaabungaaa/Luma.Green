import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { FacilityPage } from "@/components/facility/facility-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "facility" });
  return privateMetadata(t("title"));
}
export default function Page() {
  return <FacilityPage />;
}
