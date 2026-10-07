import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { EmailComplete } from "@/components/auth/email-complete";
import { LoginSkeleton } from "@/components/auth/login-flow";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "emailAuth" });
  return { ...privateMetadata(t("signin")), referrer: "no-referrer" };
}
export default function Page() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <EmailComplete />
    </Suspense>
  );
}
