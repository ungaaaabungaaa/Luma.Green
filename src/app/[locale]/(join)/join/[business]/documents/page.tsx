import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DocumentsJoin } from "@/components/join/join-pages";
import { localeFromParams } from "@/i18n/paths";
import { requireSession } from "@/lib/require-session";
import { privateMetadata } from "@/lib/seo";

import { isBusinessKind } from "../../../../../../../convex/lib/onboarding";

interface Props {
  params: Promise<{ locale: string; business: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const { business } = await params;
  if (!isBusinessKind(business)) notFound();
  const t = await getTranslations({ locale, namespace: "join" });
  return privateMetadata(t("documents.title"));
}

/** Step 2: consent, machine photos, declaration, send. */
export default async function DocumentsPage({ params }: Props) {
  const locale = await localeFromParams(params);
  const { business } = await params;
  if (!isBusinessKind(business)) notFound();
  await requireSession(locale, `/join/${business}/documents`);
  return <DocumentsJoin kind={business} />;
}
