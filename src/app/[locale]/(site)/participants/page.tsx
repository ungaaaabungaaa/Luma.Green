import { HouseIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RoleStoryImage } from "@/components/showcase/role-story-image";
import { ClosingCta } from "@/components/site/closing-cta";
import { Container } from "@/components/site/container";
import { roles } from "@/components/site/content";
import { PageHeader } from "@/components/site/page-header";
import { localeFromParams } from "@/i18n/paths";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "participants" });

  return pageMetadata({
    locale,
    path: "/participants",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function ParticipantsPage() {
  const [t, showcase] = await Promise.all([
    getTranslations("participants"),
    getTranslations("showcase"),
  ]);
  const participants = [
    {
      key: "household",
      icon: HouseIcon,
      title: t("householdHeading"),
      body: t("householdBody"),
    },
    ...roles.map(({ key, icon }) => ({
      key,
      icon,
      title: t(`${key}.name`),
      body: t(`${key}.body`),
    })),
    {
      key: "admin",
      icon: ShieldCheckIcon,
      title: showcase("preview.roles.admin.title"),
      body: showcase("adminBody"),
    },
  ] as const;

  return (
    <>
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        art={<RoleStoryImage scene="kabadiwala" compact />}
      />

      <Container className="py-10 sm:py-16">
        <ul className="space-y-6 sm:space-y-8">
          {participants.map(({ key, icon: Icon, title, body }, index) => (
            <li key={key}>
              <section
                aria-labelledby={`participant-${key}`}
                className="grid items-center gap-8 rounded-3xl border border-border bg-card p-5 sm:gap-10 sm:p-8 lg:grid-cols-2"
              >
                <div
                  className={cn(
                    "min-w-0 space-y-6",
                    index % 2 === 1 && "lg:order-2",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border text-primary">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <h2
                      id={`participant-${key}`}
                      className="text-2xl font-semibold tracking-tight sm:text-3xl"
                    >
                      {title}
                    </h2>
                  </div>
                  <p className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {body}
                  </p>
                </div>
                <RoleStoryImage scene={key} className="w-full min-w-0" />
              </section>
            </li>
          ))}
        </ul>
      </Container>

      <ClosingCta />
    </>
  );
}
