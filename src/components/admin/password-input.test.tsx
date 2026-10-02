import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SubmitEvent } from "react";
import { expect, it, vi } from "vitest";

import { PasswordInput, passwordQuality } from "./password-input";

it.each([
  ["", 0],
  ["short", 1],
  ["password123456789", 1],
  ["aaaaaaaaaaaaaaaaaaaa", 1],
  ["Unique phrase 42", 2],
  ["Unique testing phrase 42", 3],
])("gives length and common-pattern guidance for %j", (value, expected) => {
  expect(passwordQuality(value).value).toBe(expected);
});

it("toggles visibility without losing the value or submitting", async () => {
  const submit = vi.fn((event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
  });
  render(
    <form onSubmit={submit}>
      <label htmlFor="password">Password</label>
      <PasswordInput
        id="password"
        defaultValue="Synthetic phrase 42"
        autoComplete="new-password"
      />
    </form>,
  );
  const input = screen.getByLabelText("Password");
  expect(input).toHaveAttribute("type", "password");
  await userEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(input).toHaveAttribute("type", "text");
  expect(input).toHaveValue("Synthetic phrase 42");
  expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
  expect(input).toHaveAttribute("type", "password");
  expect(submit).not.toHaveBeenCalled();
});

it("links guidance to the field and preserves existing descriptions", () => {
  render(
    <>
      <p id="existing">Use a unique password.</p>
      <label htmlFor="password">Password</label>
      <PasswordInput id="password" aria-describedby="existing" showStrength />
    </>,
  );
  const input = screen.getByLabelText("Password");
  expect(input).toHaveAttribute(
    "aria-describedby",
    "existing password-strength",
  );
  fireEvent.change(input, { target: { value: "short" } });
  expect(
    screen.getByText("Too short — use at least 12 characters."),
  ).toBeVisible();
});

it("disables the visibility control while the form is busy", () => {
  render(<PasswordInput id="password" disabled />);
  expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
});
