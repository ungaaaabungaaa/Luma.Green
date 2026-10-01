import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { AppShell } from "./app-shell";
import type { OrgWorkspace } from "./use-workspace";

type ShellFixture =
  | { kind: "org"; org: Pick<OrgWorkspace, "kind" | "name"> }
  | { kind: "saathi"; saathi: { name: string } }
  | null;

const state = vi.hoisted(
  (): {
    pathname: string;
    workspace: ShellFixture;
    replace: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  } => ({
    pathname: "/app",
    workspace: {
      kind: "org",
      org: { kind: "kabadiwala", name: "Test collection shop" },
    },
    replace: vi.fn(),
    signOut: vi.fn(),
  }),
);

vi.mock("./use-workspace", () => ({ useWorkspace: () => state.workspace }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: state.signOut },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
  usePathname: () => state.pathname,
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("@/components/site/language-switcher", () => ({
  LanguageSwitcher: () => null,
}));
vi.mock("@/components/theme/theme-toggle", () => ({ ThemeToggle: () => null }));

function view() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AppShell>
        <h1>Workspace content</h1>
      </AppShell>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  state.pathname = "/app";
  state.workspace = {
    kind: "org",
    org: { kind: "kabadiwala", name: "Test collection shop" },
  };
  state.replace.mockReset();
  state.signOut.mockReset();
});

describe("workspace navigation", () => {
  it("identifies the parent section on desktop and mobile for a request detail", () => {
    state.pathname = "/app/requests/test-request";
    view();
    const sections = screen.getAllByRole("navigation", {
      name: messages.app.navLabel,
    });
    expect(sections).toHaveLength(2);
    for (const navigation of sections) {
      expect(
        within(navigation).getByRole("link", {
          name: messages.app.nav.requests,
        }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        within(navigation).getByRole("link", { name: messages.app.nav.home }),
      ).not.toHaveAttribute("aria-current");
    }
  });

  it("identifies the current secondary section in the mobile menu", async () => {
    state.pathname = "/app/compliance";
    view();
    await userEvent.click(
      screen.getByRole("button", { name: messages.app.more }),
    );
    expect(
      screen.getByRole("menuitem", { name: messages.app.nav.compliance }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("shows Saathi jobs and earnings without business trading actions", () => {
    state.workspace = {
      kind: "saathi",
      saathi: { name: "Test Saathi" },
    };
    state.pathname = "/app/impact";
    view();
    expect(
      screen.getAllByRole("link", { name: messages.app.nav.earnings }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("link", { name: messages.app.nav.buy }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: messages.app.nav.sell }),
    ).not.toBeInTheDocument();
  });

  it("keeps protected children hidden while redirecting a signed-out visitor", () => {
    state.workspace = null;
    state.pathname = "/app/stock";
    view();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(state.replace).toHaveBeenCalledWith({
      pathname: "/login",
      query: { next: "/app/stock" },
    });
  });
});
