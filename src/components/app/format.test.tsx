import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { expect, it } from "vitest";

import { useFormat } from "./format";

it("uses exact paise for both app money and per-kilogram prices", () => {
  const { result } = renderHook(() => useFormat(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NextIntlClientProvider locale="en" messages={{}}>
        {children}
      </NextIntlClientProvider>
    ),
  });
  expect(result.current.money(Number.MAX_SAFE_INTEGER)).toBe(
    "₹9,00,71,99,25,47,409.91",
  );
  expect(result.current.perKg(Number.MAX_SAFE_INTEGER)).toBe(
    "₹9,00,71,99,25,47,409.91",
  );
  expect(result.current.money(-1)).toBe("-₹0.01");
});

it("keeps the active Arabic locale for app currency", () => {
  const { result } = renderHook(() => useFormat(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NextIntlClientProvider locale="ar" messages={{}}>
        {children}
      </NextIntlClientProvider>
    ),
  });
  const expected = new Intl.NumberFormat("ar", {
    style: "currency",
    currency: "INR",
  }).format(-0.01);
  expect(result.current.money(-1)).toBe(expected);
});
