import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LoginFlow, LoginSkeleton } from "@/components/auth/login-flow";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "auth" });
  return privateMetadata(t("metaTitle"));
}

/** One sign-in for every business role — docs/product/onboarding.md. */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginFlow />
    </Suspense>
  );
}
