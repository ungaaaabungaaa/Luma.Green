import { MailIcon, ShieldAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RoleStoryImage } from "@/components/showcase/role-story-image";
import { Container } from "@/components/site/container";
import { PageHeader } from "@/components/site/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localeFromParams } from "@/i18n/paths";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "contact" });

  return pageMetadata({
    locale,
    path: "/contact",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

const emailLink =
  "font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm";

/**
 * Email only for now: a form needs Resend wired (AGENTS.md §9), and a form that
 * silently drops messages is worse than an address.
 */
export default async function ContactPage() {
  const t = await getTranslations("contact");
  const imageRole = "admin";

  return (
    <>
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        art={
          <RoleStoryImage
            scene={imageRole}
            compact
            frameClassName="h-40 aspect-auto sm:h-52 lg:h-64"
          />
        }
      />

      <Container className="grid gap-6 py-16 md:grid-cols-2 lg:py-24">
        <Card className="shadow-none">
          <CardHeader>
            <MailIcon aria-hidden className="size-6 text-primary" />
            <CardTitle>
              <h2 className="text-2xl">{t("emailHeading")}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a href={`mailto:${site.supportEmail}`} className={emailLink}>
              {site.supportEmail}
            </a>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <ShieldAlertIcon aria-hidden className="size-6 text-primary" />
            <CardTitle>
              <h2 className="text-2xl">{t("securityHeading")}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("securityBody")}</p>
            <a href={`mailto:${site.securityEmail}`} className={emailLink}>
              {site.securityEmail}
            </a>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
