import { expect, it, vi } from "vitest";

vi.mock("@/components/workspace/invitation-page", () => ({
  InvitationPage: () => null,
}));
vi.mock("@/components/auth/login-flow", () => ({
  LoginFlow: () => null,
  LoginSkeleton: () => null,
}));
vi.mock("@/lib/require-session", () => ({ requireSession: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: () => Promise.resolve((key: string) => key),
}));

import { generateMetadata as loginMetadata } from "../../../../(auth)/login/page";
import { generateMetadata as inviteMetadata } from "./page";

it.each([loginMetadata, inviteMetadata])(
  "does not send sensitive return paths or invitation URLs as referrers",
  async (generateMetadata) => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "ar" }),
    });
    expect(metadata.referrer).toBe("no-referrer");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toEqual({});
  },
);
