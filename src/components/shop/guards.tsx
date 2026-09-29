"use client";

import { CloudOffIcon, type LucideIcon, StoreIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Component, type ReactNode } from "react";

import { AppPageHeader, EmptyState } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** What a screen shows when it isn't for this person, or fails to load. */

export function NotForYou({
  title,
  icon = StoreIcon,
  heading,
  body,
}: {
  /** The page's own title, kept as its h1. */
  title: string;
  icon?: LucideIcon;
  heading: string;
  body: string;
}) {
  const t = useTranslations("shop.notShop");
  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader title={title} />
      <EmptyState
        icon={icon}
        title={heading}
        body={body}
        action={
          <Button asChild variant="outline" size="lg" className="mt-2 h-11">
            <Link href="/app">{t("home")}</Link>
          </Button>
        }
      />
    </div>
  );
}

/** The kabadiwala-only screens, opened by another kind of business. */
export function NotForShop({ title }: { title: string }) {
  const t = useTranslations("shop.notShop");
  return <NotForYou title={title} heading={t("title")} body={t("body")} />;
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("shop.errors");
  return (
    <EmptyState
      icon={CloudOffIcon}
      title={t("loadTitle")}
      body={t("loadBody")}
      action={
        <Button
          variant="outline"
          size="lg"
          className="mt-2 h-11"
          onClick={onRetry}
        >
          {t("retry")}
        </Button>
      }
    />
  );
}

/**
 * Catches a query that failed below it and offers a retry, so one bad load
 * never blanks the whole app.
 */
export class QueryBoundary extends Component<
  { children: ReactNode },
  { hasFailed: boolean }
> {
  static getDerivedStateFromError() {
    return { hasFailed: true };
  }

  state = { hasFailed: false };

  retry = () => {
    this.setState({ hasFailed: false });
  };

  render() {
    return this.state.hasFailed ? (
      <LoadFailed onRetry={this.retry} />
    ) : (
      this.props.children
    );
  }
}
