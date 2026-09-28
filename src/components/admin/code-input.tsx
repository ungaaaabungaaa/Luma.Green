"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const LENGTH = 6;

/** Six boxes for an authenticator code; calls `onComplete` on the sixth digit. */
export function CodeInput({
  id,
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <InputOTP
      id={id}
      maxLength={LENGTH}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      value={value}
      disabled={disabled}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      onChange={(next) => {
        onChange(next);
        if (next.length === LENGTH) onComplete(next);
      }}
    >
      <InputOTPGroup>
        {Array.from({ length: LENGTH }, (_, index) => (
          <InputOTPSlot key={index} index={index} className="size-11 text-lg" />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

export const CODE_LENGTH = LENGTH;
