import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { AdminLogin } from "./admin-login";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), signIn: vi.fn() }));
vi.mock("@/components/providers/convex-provider", () => ({
  isConvexConfigured: true,
}));
vi.mock("convex/react", () => ({ useQuery: () => null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { email: mocks.signIn } },
}));

it("links connected admin sign-in to password recovery before authentication", () => {
  render(<AdminLogin />);
  expect(
    screen.getByRole("link", { name: "Forgot password?" }),
  ).toHaveAttribute("href", "/admin/forgot-password");
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
  expect(mocks.signIn).not.toHaveBeenCalled();
  expect(mocks.replace).not.toHaveBeenCalled();
});
