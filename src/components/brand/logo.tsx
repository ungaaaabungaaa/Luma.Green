import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

/**
 * The Luma.Green mark: four leaf blades turning around a shared centre —
 * material in motion, always coming back around.
 *
 * The gradient ids are static on purpose: every instance renders identical
 * `<defs>`, so repeats on one page resolve to the same paint.
 */
export function LogoMark({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label={site.name}
      className={cn("size-10", className)}
      {...props}
    >
      <defs>
        <linearGradient
          id="lg-mid"
          x1="0"
          y1="-200"
          x2="130"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#8FD073" />
          <stop offset="1" stopColor="#1F7A5A" />
        </linearGradient>
        <linearGradient
          id="lg-light"
          x1="0"
          y1="-200"
          x2="130"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#CDEDA3" />
          <stop offset="1" stopColor="#7DC46B" />
        </linearGradient>
        <linearGradient
          id="lg-deep"
          x1="0"
          y1="-200"
          x2="130"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#2E8B57" />
          <stop offset="1" stopColor="#0E4030" />
        </linearGradient>
        <linearGradient
          id="lg-fold-deep"
          x1="0"
          y1="-200"
          x2="130"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#145C43" />
          <stop offset="1" stopColor="#0B3326" />
        </linearGradient>
        <linearGradient
          id="lg-fold-mid"
          x1="0"
          y1="-200"
          x2="130"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#4CA96B" />
          <stop offset="1" stopColor="#2E8B57" />
        </linearGradient>
      </defs>

      <g transform="translate(256 256)">
        <g transform="rotate(0)">
          <path d="M0 0 L0 -200 A130 100 0 0 1 0 0 Z" fill="url(#lg-mid)" />
          <path
            d="M0 -200 A130 100 0 0 1 0 0 C40 -60 110 -140 0 -200 Z"
            fill="url(#lg-fold-deep)"
          />
        </g>
        <g transform="rotate(90)">
          <path d="M0 0 L0 -200 A130 100 0 0 1 0 0 Z" fill="url(#lg-light)" />
          <path
            d="M0 -200 A130 100 0 0 1 0 0 C40 -60 110 -140 0 -200 Z"
            fill="url(#lg-fold-mid)"
            opacity="0.55"
          />
        </g>
        <g transform="rotate(180)">
          <path d="M0 0 L0 -200 A130 100 0 0 1 0 0 Z" fill="url(#lg-deep)" />
          <path
            d="M0 -200 A130 100 0 0 1 0 0 C40 -60 110 -140 0 -200 Z"
            fill="url(#lg-fold-deep)"
          />
        </g>
        <g transform="rotate(270)">
          <path d="M0 0 L0 -200 A130 100 0 0 1 0 0 Z" fill="url(#lg-light)" />
          <path
            d="M0 -200 A130 100 0 0 1 0 0 C40 -60 110 -140 0 -200 Z"
            fill="url(#lg-fold-mid)"
            opacity="0.55"
          />
        </g>
      </g>
    </svg>
  );
}

/** Mark + wordmark, set in Noto so it holds up in every locale we ship. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-8 shrink-0" />
      <span className="font-display text-xl font-semibold tracking-tight">
        {site.name}
      </span>
    </span>
  );
}
