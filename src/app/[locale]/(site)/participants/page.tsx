import { ArrowRightIcon, HouseIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RoleStoryImage } from "@/components/showcase/role-story-image";
import { ClosingCta } from "@/components/site/closing-cta";
import { Container } from "@/components/site/container";
import { roles } from "@/components/site/content";
import { PageHeader } from "@/components/site/page-header";
import { Link } from "@/i18n/navigation";
import { localeFromParams } from "@/i18n/paths";
import { pageMetadata } from "@/lib/seo";

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
  const [t, showcase, roleCopy, help] = await Promise.all([
    getTranslations("participants"),
    getTranslations("showcase"),
    getTranslations("home.roles"),
    getTranslations("help"),
  ]);
  const participants = [
    {
      key: "household",
      icon: HouseIcon,
      title: t("householdHeading"),
      body: t("householdBody"),
      href: "/sell",
      action: roleCopy("household.cta"),
    },
    ...roles.map(({ key, icon }) => ({
      key,
      icon,
      title: t(`${key}.name`),
      body: t(`${key}.body`),
      href: `/join/${key}`,
      action: roleCopy(`${key}.cta`),
    })),
    {
      key: "admin",
      icon: ShieldCheckIcon,
      title: showcase("preview.roles.admin.title"),
      body: showcase("adminBody"),
      href: "/help/contact",
      action: help("contact.title"),
    },
  ] as const;

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} scene="saathi" />

      <Container className="py-8 lg:py-12">
        <ul className="divide-y border-y">
          {participants.map(
            ({ key, icon: Icon, title, body, href, action }) => (
              <li key={key}>
                <section
                  aria-labelledby={`participant-${key}`}
                  className="grid items-center gap-6 py-7 sm:gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:py-10"
                >
                  <div className="min-w-0 space-y-6">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex size-8 shrink-0 items-center text-primary">
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
                    <Link
                      href={href}
                      className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {action}
                      <ArrowRightIcon
                        aria-hidden
                        className="size-4 rtl:rotate-180"
                      />
                    </Link>
                  </div>
                  <RoleStoryImage
                    scene={key}
                    compact
                    className="w-full min-w-0"
                  />
                </section>
              </li>
            ),
          )}
        </ul>
      </Container>

      <ClosingCta />
    </>
  );
}
