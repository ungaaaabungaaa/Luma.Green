import { describe, expect, it } from "vitest";

import { CSV_BOM, csvEscape, csvFileName, toCsv } from "./csv";

describe("csvEscape", () => {
  it("leaves plain text and numbers alone", () => {
    expect(csvEscape("Newspaper")).toBe("Newspaper");
    expect(csvEscape(400)).toBe("400");
    expect(csvEscape(17.5)).toBe("17.5");
    expect(csvEscape(-12.25)).toBe("-12.25");
  });

  it("quotes commas, quotes and line breaks, doubling quotes inside", () => {
    expect(csvEscape("Plot 7, Peenya")).toBe('"Plot 7, Peenya"');
    expect(csvEscape('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvEscape("two\nlines")).toBe('"two\nlines"');
    expect(csvEscape("back\r\nagain")).toBe('"back\r\nagain"');
  });

  it("writes nothing for empty cells and unusable numbers", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
    expect(csvEscape(NaN)).toBe("");
    expect(csvEscape(Infinity)).toBe("");
  });

  it("spells booleans the way spreadsheets read them", () => {
    expect(csvEscape(true)).toBe("TRUE");
    expect(csvEscape(false)).toBe("FALSE");
  });

  it("defuses text a spreadsheet would run as a formula", () => {
    expect(csvEscape("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvEscape("+1+1")).toBe("'+1+1");
    expect(csvEscape("@SUM")).toBe("'@SUM");
    expect(csvEscape("-cmd")).toBe("'-cmd");
    // A negative number written as text is still a number.
    expect(csvEscape("-42.5")).toBe("-42.5");
    // Quoting still applies after the guard.
    expect(csvEscape("=a,b")).toBe(`"'=a,b"`);
  });

  it("keeps Indian scripts and the rupee sign as they are", () => {
    expect(csvEscape("ದಿನಪತ್ರಿಕೆ ₹14/kg")).toBe("ದಿನಪತ್ರಿಕೆ ₹14/kg");
  });
});

describe("toCsv", () => {
  it("starts with a byte-order mark and ends every row with CRLF", () => {
    const csv = toCsv([
      ["Voucher Date", "Quantity"],
      ["2026-09-23", 400],
    ]);
    expect(csv).toBe(
      `${CSV_BOM}Voucher Date,Quantity\r\n2026-09-23,400\r\n`,
    );
  });

  it("can leave out the mark and use LF for other software", () => {
    expect(toCsv([["a", "b"]], { bom: false, newline: "\n" })).toBe("a,b\n");
  });

  it("writes an empty file for no rows", () => {
    expect(toCsv([])).toBe(CSV_BOM);
    expect(toCsv([], { bom: false })).toBe("");
  });

  it("keeps a row's empty cells so columns stay aligned", () => {
    expect(toCsv([["a", null, "", undefined, "e"]], { bom: false })).toBe(
      "a,,,,e\r\n",
    );
  });
});

describe("csvFileName", () => {
  it("builds a lower-case, hyphenated name under the product prefix", () => {
    expect(csvFileName("Tally vouchers", "2026-09")).toBe(
      "luma-green-tally-vouchers-2026-09.csv",
    );
    expect(csvFileName("SWM quarterly return", "2026-Q2")).toBe(
      "luma-green-swm-quarterly-return-2026-q2.csv",
    );
  });

  it("drops characters a file system may refuse", () => {
    expect(csvFileName("EPR / purchase: register?", "")).toBe(
      "luma-green-epr-purchase-register.csv",
    );
  });
});
