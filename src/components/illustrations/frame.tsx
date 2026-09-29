import type { ReactNode, SVGProps } from "react";

import { cn } from "@/lib/utils";

export interface IllustrationProps extends Omit<
  SVGProps<SVGSVGElement>,
  "children" | "viewBox" | "role"
> {
  /**
   * What the picture shows, for screen readers. Leave it out when the
   * picture only decorates text that already says the same thing.
   */
  title?: string;
}

/**
 * The canvas every spot illustration shares: 240 × 180, a soft green backdrop
 * and a ground shadow, so the set reads as one family. Colours come from the
 * brand scale and Tailwind's warm neutrals — never raw hex.
 */
export function IllustrationFrame({
  title,
  className,
  children,
  ...props
}: IllustrationProps & { children: ReactNode }) {
  const a11y = title
    ? ({ role: "img", "aria-label": title } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 180"
      width={240}
      height={180}
      focusable="false"
      className={cn("h-auto w-full max-w-60", className)}
      {...a11y}
      {...props}
    >
      <path
        d="M34 98c-4-38 28-72 76-76 46-4 92 18 98 60 6 40-20 74-66 80-50 7-104-18-108-64Z"
        className="fill-brand-50"
      />
      <ellipse cx="120" cy="157" rx="88" ry="6" className="fill-stone-200" />
      {children}
    </svg>
  );
}
