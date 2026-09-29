import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { localeFromParams } from "@/i18n/paths";
import { requireSession } from "@/lib/require-session";

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/** The signed-in business and Saathi app — docs/architecture/urls.md. */
export default async function AppLayout({ children, params }: Props) {
  const locale = await localeFromParams(params);
  await requireSession(locale, "/app");
  return <AppShell>{children}</AppShell>;
}
