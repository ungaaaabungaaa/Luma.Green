import { getTranslations } from "next-intl/server";

import { Container } from "@/components/site/container";
import { PageHeader } from "@/components/site/page-header";

/** A public page that is being built. Its title lives under `soon.<key>`. */
export async function SoonPage({ titleKey }: { titleKey: string }) {
  const [soon, app] = await Promise.all([
    getTranslations("soon"),
    getTranslations("app"),
  ]);
  return (
    <>
      <PageHeader title={soon(titleKey)} lead={app("comingSoon")} />
      <Container className="py-20" />
    </>
  );
}
