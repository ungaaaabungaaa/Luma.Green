"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Guidance, not an entropy estimate or a replacement for server validation. */
export function passwordQuality(value: string) {
  if (!value) return { value: 0, label: "Use at least 12 characters." };
  if (value.length < 12)
    return { value: 1, label: "Too short — use at least 12 characters." };
  if (
    /password|qwerty|123456|luma[.\s_-]*green/i.test(value) ||
    /^(.)\1+$/.test(value)
  ) {
    return {
      value: 1,
      label:
        "Easy to guess — avoid common words, sequences and repeated characters.",
    };
  }
  if (value.length < 18)
    return {
      value: 2,
      label: "Meets the length rule. A longer, unique phrase is safer.",
    };
  return {
    value: 3,
    label: "Long password. Keep it unique and save it in a password manager.",
  };
}

export function PasswordInput({
  className,
  showStrength = false,
  onChange,
  ...props
}: ComponentProps<typeof Input> & { showStrength?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [typed, setTyped] = useState("");
  const quality = passwordQuality(
    typeof props.value === "string" ? props.value : typed,
  );
  const strengthId = props.id ? `${props.id}-strength` : undefined;
  const describedBy =
    [props["aria-describedby"], showStrength ? strengthId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          {...props}
          type={visible ? "text" : "password"}
          className={cn("h-12 pe-12", className)}
          aria-describedby={describedBy}
          onChange={(event) => {
            setTyped(event.target.value);
            onChange?.(event);
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute end-0 top-0 size-12"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          disabled={props.disabled}
          onClick={() => {
            setVisible(!visible);
          }}
        >
          {visible ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
        </Button>
      </div>
      {showStrength ? (
        <div className="space-y-2">
          <div aria-hidden className="flex gap-1">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  quality.value >= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <p
            id={strengthId}
            className="text-xs leading-relaxed text-muted-foreground"
          >
            {quality.label}
          </p>
        </div>
      ) : null}
    </div>
  );
}
