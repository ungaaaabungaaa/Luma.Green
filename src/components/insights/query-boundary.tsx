"use client";

import { CloudOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { EmptyState } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";

function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("common");
  return (
    <div role="alert">
      <EmptyState
        icon={CloudOffIcon}
        title={t("error")}
        action={
          <Button variant="outline" size="lg" onClick={onRetry}>
            {t("retry")}
          </Button>
        }
      />
    </div>
  );
}

/**
 * Catches a Convex query that failed while rendering (a dropped connection,
 * a revoked business) and offers a retry instead of a blank screen.
 */
export class QueryBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override state: { error: Error | null } = { error: null };

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    return this.state.error ? (
      <LoadError
        onRetry={() => {
          this.setState({ error: null });
        }}
      />
    ) : (
      this.props.children
    );
  }
}
