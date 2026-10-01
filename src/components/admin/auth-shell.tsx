import Image from "next/image";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
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
      className="flex min-h-dvh items-start justify-center px-4 py-10 sm:items-center"
    >
      <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="flex items-center justify-between">
            <Logo />
            <Badge variant="secondary">Admin</Badge>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                <h1>{title}</h1>
              </CardTitle>
              {description ? (
                <CardDescription>{description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </div>
        <figure className="mx-auto w-full max-w-md space-y-2">
          <div className="overflow-hidden rounded-3xl border border-border bg-brand-50">
            <Image
              src={operations}
              alt=""
              sizes="(min-width: 1024px) 448px, 92vw"
              className="h-24 w-full object-cover lg:h-112"
            />
          </div>
          <figcaption className="text-xs text-muted-foreground">
            Illustrative scene
          </figcaption>
        </figure>
      </div>
    </main>
  );
}
