"use client";

import { useTranslations } from "next-intl";
import { Component, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { lotError, type LotErrorKey } from "./logic";

function ReadFailure({
  failure,
  retry,
}: {
  failure: LotErrorKey;
  retry: () => void;
}) {
  const t = useTranslations("lots");
  return (
    <div className="flex flex-col gap-4">
      <p role="alert">
        {t(failure === "accessChanged" ? failure : "loadError")}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-11" variant="outline" onClick={retry}>
          {t("retry")}
        </Button>
        <Button asChild variant="link" className="min-h-11">
          <Link href="/app/lots">{t("back")}</Link>
        </Button>
      </div>
    </div>
  );
}
/** A transfer or permission change may revoke an open detail; keep a route out. */
export class LotQueryBoundary extends Component<
  { children: ReactNode },
  { failure: LotErrorKey | null }
> {
  static getDerivedStateFromError(error: unknown) {
    return { failure: lotError(error) };
  }
  state: { failure: LotErrorKey | null } = { failure: null };
  render() {
    return this.state.failure ? (
      <ReadFailure
        failure={this.state.failure}
        retry={() => {
          this.setState({ failure: null });
        }}
      />
    ) : (
      this.props.children
    );
  }
}
