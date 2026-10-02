import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import messages from "../../../messages/en.json";
import { ConsentCard } from "./consent-card";
import type { Consent } from "./types";

function withIntl(children: ReactNode) {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone="Asia/Kolkata"
    >
      {children}
    </NextIntlClientProvider>
  );
}

const onFile = {
  board: "KSPCB",
  number: "KSPCB/CFO/2025/1187",
  validUntil: "2026-10-29",
  remindOn: undefined,
};

const nothingOnFile: Consent = {
  status: "missing",
  board: undefined,
  number: undefined,
  validUntil: undefined,
  daysLeft: undefined,
  remindOn: undefined,
};

describe("ConsentCard", () => {
  it("shows a valid consent with a review date, without promising a notification", () => {
    const consent: Consent = {
      ...onFile,
      status: "ok",
      daysLeft: 274,
      remindOn: "2026-07-31",
    };
    render(withIntl(<ConsentCard consent={consent} orgKind="yard" />));
    expect(
      screen.getByRole("heading", { name: "Consent validity" }),
    ).toBeInTheDocument();
    expect(screen.getByText("KSPCB · KSPCB/CFO/2025/1187")).toBeInTheDocument();
    expect(screen.getByText("274 days left")).toBeInTheDocument();
    expect(
      screen.getByText(/Renewal review date: .*2026, 90 days before expiry/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/We'll remind you/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("asks for renewal when under 90 days are left", () => {
    const consent: Consent = { ...onFile, status: "expiring", daysLeft: 30 };
    render(withIntl(<ConsentCard consent={consent} orgKind="recycler" />));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Renew your consent now");
    expect(alert).toHaveTextContent("30 days left");
    expect(alert).toHaveTextContent(/Apply to KSPCB for renewal now/);
  });

  it("says plainly when it has run out", () => {
    const consent: Consent = { ...onFile, status: "expired", daysLeft: -3 };
    render(withIntl(<ConsentCard consent={consent} orgKind="manufacturer" />));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Your consent has run out");
    expect(alert).toHaveTextContent("Ran out 3 days ago");
  });

  it("asks a yard for its missing consent, but not a small scrap shop", () => {
    const { unmount } = render(
      withIntl(<ConsentCard consent={nothingOnFile} orgKind="yard" />),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No consent on file");
    unmount();

    const { container } = render(
      withIntl(<ConsentCard consent={nothingOnFile} orgKind="kabadiwala" />),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
