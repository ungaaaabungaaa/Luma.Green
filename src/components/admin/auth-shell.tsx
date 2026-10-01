import Image from "next/image";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggleControl } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import operations from "../../../public/images/showcase/operations-desk.webp";

/** A focused access form with a secondary, decorative operations scene. */
export function AdminAuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main
      id="main"
      className="flex min-h-dvh items-start justify-center bg-muted/40 px-4 py-8 sm:items-center"
    >
      <div className="grid w-full max-w-5xl items-center gap-6 rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-8 lg:grid-cols-2 lg:gap-10">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-2">
              <Badge variant="outline">Admin</Badge>
              <ThemeToggleControl
                labels={{
                  label: "Appearance",
                  light: "Light",
                  dark: "Dark",
                  system: "System",
                }}
              />
            </div>
          </div>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="px-0">
              <CardTitle className="text-2xl tracking-tight">
                <h1>{title}</h1>
              </CardTitle>
              {description ? (
                <CardDescription>{description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="px-0">{children}</CardContent>
          </Card>
        </div>
        <figure className="mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-border bg-muted">
            <Image
              src={operations}
              alt=""
              sizes="(min-width: 1024px) 448px, 92vw"
              className="h-28 w-full object-cover lg:h-112"
            />
          </div>
        </figure>
      </div>
    </main>
  );
}
