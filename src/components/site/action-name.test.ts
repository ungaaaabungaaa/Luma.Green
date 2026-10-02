import { describe, expect, it } from "vitest";

import { actionName } from "./action-name";

describe("responsive action names", () => {
  it("includes both visible labels when the translation changes form", () => {
    expect(actionName("சேருங்கள்", "வியாபாரமாகச் சேரவும்")).toBe(
      "சேருங்கள்: வியாபாரமாகச் சேரவும்",
    );
  });

  it("does not repeat identical labels", () => {
    expect(actionName("WhatsApp", "WhatsApp")).toBe("WhatsApp");
  });
});
