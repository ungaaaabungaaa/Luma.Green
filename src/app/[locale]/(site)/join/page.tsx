import { HomeIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RoleCards } from "@/components/join/role-cards";
import { Container } from "@/components/site/container";
import { PageHeader } from "@/components/site/page-header";
import { Link } from "@/i18n/navigation";
import { localeFromParams } from "@/i18n/paths";
import { pageMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "join" });
  return pageMetadata({
    locale,
    path: "/join",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** Public: what each role is and a way in — docs/architecture/urls.md. */
export default async function JoinPage() {
  const t = await getTranslations("join");

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      <Container className="flex flex-col gap-8 py-8 lg:py-12">
        <RoleCards />
        <aside className="flex flex-col gap-3 border-y py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <HomeIcon
              aria-hidden
              className="mt-1 size-5 shrink-0 text-primary"
            />
            <div>
              <p className="font-medium">{t("homeTitle")}</p>
              <p className="text-muted-foreground">{t("homeBody")}</p>
            </div>
          </div>
          <Link
            href="/how-it-works"
            className="ms-8 inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline sm:ms-0"
          >
            {t("homeLink")}
          </Link>
        </aside>
      </Container>
    </>
  );
}
