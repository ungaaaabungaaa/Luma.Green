import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { localeFromParams } from "@/i18n/paths";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "notFound" });

  return { title: t("metaTitle"), robots: { index: false } };
}

/**
 * Catches every unmatched path under a locale so it renders the localised 404
 * inside the site shell, instead of Next's bare default page.
 */
export default function CatchAll() {
  notFound();
}
