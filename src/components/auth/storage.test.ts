import { afterEach, expect, it } from "vitest";

import {
  isPhonePreview,
  readPhone,
  rememberPhone,
  rememberPreviewPhone,
} from "./storage";

afterEach(() => {
  sessionStorage.clear();
});

it("keeps a preview number in tab storage without marking it as sent", () => {
  rememberPreviewPhone("+919876543210");
  expect(readPhone()).toBe("+919876543210");
  expect(isPhonePreview()).toBe(true);
  expect(sessionStorage.getItem("lg.signInPhone")).toBeNull();
  expect(localStorage.getItem("lg.signInPreview")).toBeNull();
});

it("clears preview state after a real code request", () => {
  rememberPreviewPhone("+919876543210");
  rememberPhone("+919876543211");
  expect(readPhone()).toBe("+919876543211");
  expect(isPhonePreview()).toBe(false);
});

it("clears a previous sent number when a preview starts", () => {
  rememberPhone("+919876543211");
  rememberPreviewPhone("+919876543210");
  expect(readPhone()).toBe("+919876543210");
  expect(sessionStorage.getItem("lg.signInPhone")).toBeNull();
});
