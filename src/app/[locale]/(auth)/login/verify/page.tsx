import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LoginSkeleton } from "@/components/auth/login-flow";
import { VerifyFlow } from "@/components/auth/verify-flow";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "auth" });
  return privateMetadata(t("verifyMetaTitle"));
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <VerifyFlow />
    </Suspense>
  );
}
