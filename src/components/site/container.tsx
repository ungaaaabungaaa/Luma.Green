import { cn } from "@/lib/utils";

/** The page's content column. Every section lines up on this. */
export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12",
        className,
      )}
      {...props}
    />
  );
}
