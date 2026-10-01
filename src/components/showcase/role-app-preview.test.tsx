import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import arabic from "../../../messages/ar.json";
import english from "../../../messages/en.json";
import urdu from "../../../messages/ur.json";
import { type PreviewRole, RoleAppPreview } from "./role-app-preview";

const adminRole: PreviewRole = "admin";
const roles: PreviewRole[] = [
  "household",
  "kabadiwala",
  "yard",
  "recycler",
  "manufacturer",
  "saathi",
  "admin",
];

describe("illustrative app previews", () => {
  it.each(roles)(
    "explains %s tasks without presenting real data or fake controls",
    (role) => {
      render(
        <NextIntlClientProvider locale="en" messages={english}>
          <RoleAppPreview role={role} />
        </NextIntlClientProvider>,
      );
      const copy = english.showcase.preview.roles[role];
      const preview = screen.getByRole("figure", { name: copy.title });
      expect(
        within(preview).getByText(english.showcase.preview.label),
      ).toBeVisible();
      expect(within(preview).getAllByRole("listitem")).toHaveLength(3);
      for (const text of [copy.first, copy.second, copy.third]) {
        expect(within(preview).getByText(text)).toBeVisible();
      }
      expect(within(preview).queryByRole("button")).not.toBeInTheDocument();
      expect(within(preview).queryByRole("link")).not.toBeInTheDocument();
      expect(within(preview).queryByRole("textbox")).not.toBeInTheDocument();
      expect(preview.querySelector("[tabindex]")).toBeNull();
    },
  );

  it("keeps the disclosure and role tasks in compact previews", () => {
    const role: PreviewRole = "household";
    render(
      <NextIntlClientProvider locale="en" messages={english}>
        <RoleAppPreview role={role} compact />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(english.showcase.preview.label)).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it.each([
    { locale: "ar", messages: arabic },
    { locale: "ur", messages: urdu },
  ])(
    "uses translated copy within the $locale reading direction",
    ({ locale, messages }) => {
      render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div dir="rtl">
            <RoleAppPreview role={adminRole} />
          </div>
        </NextIntlClientProvider>,
      );
      const preview = screen.getByRole("figure", {
        name: messages.showcase.preview.roles.admin.title,
      });
      expect(preview.closest("[dir]")).toHaveAttribute("dir", "rtl");
      expect(
        within(preview).getByText(messages.showcase.preview.label),
      ).toBeVisible();
      expect(
        within(preview).getByText(messages.showcase.preview.roles.admin.second),
      ).toBeVisible();
      expect(
        screen.queryByText(english.showcase.preview.roles.admin.title),
      ).not.toBeInTheDocument();
    },
  );
});
