import { getTranslations, setRequestLocale } from "next-intl/server";

import { LogoMark } from "@/components/brand/logo";

/**
 * Placeholder root route.
 *
 * It exists because Next needs at least one route to build (and CI needs a
 * build to check). It renders the mark, the name and the tagline — nothing
 * else. Replace it with the real landing page; no other file depends on it.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("brand");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <LogoMark className="size-20" />
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {t("name")}
        </h1>
        <p className="text-lg text-balance text-muted-foreground">
          {t("tagline")}
        </p>
      </div>
    </main>
  );
}
