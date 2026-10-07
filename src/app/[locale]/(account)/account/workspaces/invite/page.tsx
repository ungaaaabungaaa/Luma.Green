import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InvitationPage } from "@/components/workspace/invitation-page";
import { localeFromParams } from "@/i18n/paths";
import { requireSession } from "@/lib/require-session";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "workspace" });
  return { ...privateMetadata(t("inviteTitle")), referrer: "no-referrer" };
}

export default async function InvitationRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const locale = await localeFromParams(params);
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  await requireSession(
    locale,
    `/account/workspaces/invite?token=${encodeURIComponent(token)}`,
  );
  return <InvitationPage token={token} />;
}
