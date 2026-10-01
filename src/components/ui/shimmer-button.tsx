/*
MIT License

Copyright (c) Magic UI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import {
  cloneElement,
  type ComponentProps,
  type CSSProperties,
  isValidElement,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Adapted from Magic UI's MIT-licensed shimmer-button registry component.
 * Source: https://magicui.design/docs/components/shimmer-button
 * Uses our Button for touch targets, focus, disabled states and link composition.
 */
export type ShimmerButtonProps = ComponentProps<typeof Button> & {
  shimmerColor?: string;
  shimmerSize?: string;
  shimmerDuration?: string;
  background?: string;
};

function ShimmerContents({ children }: { children: ReactNode }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="@container-[size] pointer-events-none absolute inset-0 -z-30 overflow-visible blur-[2px]"
      >
        <span className="absolute inset-0 aspect-square h-[100cqh] animate-shimmer-slide motion-reduce:animate-none">
          <span className="absolute -inset-full block w-auto animate-spin-around [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] motion-reduce:animate-none" />
        </span>
      </span>
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-(--cut) -z-20 rounded-[inherit] [background:var(--bg)]"
      />
    </>
  );
}

export function ShimmerButton({
  shimmerColor = "var(--primary-foreground)",
  shimmerSize = "0.08em",
  shimmerDuration = "3s",
  background = "var(--primary)",
  className,
  children,
  asChild,
  style,
  ...props
}: ShimmerButtonProps) {
  const content =
    asChild && isValidElement<{ children?: ReactNode }>(children) ? (
      cloneElement(
        children,
        {},
        <ShimmerContents>{children.props.children}</ShimmerContents>,
      )
    ) : (
      <ShimmerContents>{children}</ShimmerContents>
    );

  return (
    <Button
      asChild={asChild}
      className={cn(
        "relative isolate overflow-hidden rounded-md border-primary/20 px-6 text-primary-foreground [background:var(--bg)] motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
      style={
        {
          "--spread": "90deg",
          "--shimmer-color": shimmerColor,
          "--speed": shimmerDuration,
          "--cut": shimmerSize,
          "--bg": background,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {content}
    </Button>
  );
}
