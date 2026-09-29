import { afterEach, describe, expect, it, vi } from "vitest";

import { CSV_BOM, csvCell, downloadCsv, materialCodesCsv, toCsv } from "./csv";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("PAPER-NEWS")).toBe("PAPER-NEWS");
    expect(csvCell("अख़बार (रद्दी)")).toBe("अख़बार (रद्दी)");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("Wires, cables")).toBe('"Wires, cables"');
    expect(csvCell('5" pipe')).toBe('"5"" pipe"');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
  });

  it("never lets a spreadsheet run a cell as a formula", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF, as spreadsheets expect", () => {
    expect(
      toCsv([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toBe("a,b\r\nc,d\r\n");
  });
});

describe("materialCodesCsv", () => {
  it("lists every code with a name column per language, English first", () => {
    const csv = materialCodesCsv([
      {
        code: "PAPER-NEWS",
        family: "paper",
        stage: "scrap",
        names: { kn: "ದಿನಪತ್ರಿಕೆ", en: "Newspaper", hi: "अख़बार" },
      },
      {
        code: "RECYCLED-KRAFT",
        family: "paper",
        stage: "recycled",
        names: { en: "Recycled kraft paper" },
      },
    ]);

    expect(csv.split("\r\n")).toEqual([
      "code,family,stage,name_en,name_hi,name_kn",
      "PAPER-NEWS,paper,scrap,Newspaper,अख़बार,ದಿನಪತ್ರಿಕೆ",
      "RECYCLED-KRAFT,paper,recycled,Recycled kraft paper,,",
      "",
    ]);
  });

  it("still has a header when the list is empty", () => {
    expect(materialCodesCsv([])).toBe("code,family,stage\r\n");
  });
});

describe("downloadCsv", () => {
  // jsdom has no object URLs; lend it a pair for this test only.
  const names = ["createObjectURL", "revokeObjectURL"] as const;
  const originals = names.map((name) =>
    Object.getOwnPropertyDescriptor(URL, name),
  );
  function lend(name: (typeof names)[number], value: unknown) {
    Object.defineProperty(URL, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
  afterEach(() => {
    for (const [index, name] of names.entries()) {
      const original = originals[index];
      if (original) Object.defineProperty(URL, name, original);
      else Reflect.deleteProperty(URL, name);
    }
  });

  it("saves a UTF-8 file with a byte-order mark and frees the URL", async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn((_blob: Blob) => "blob:codes");
    const revokeObjectURL = vi.fn();
    lend("createObjectURL", createObjectURL);
    lend("revokeObjectURL", revokeObjectURL);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => null);

    downloadCsv("codes.csv", "code\r\n");

    expect(click).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.lastCall?.[0];
    if (!blob) throw new Error("no file was offered");
    expect(blob.type).toBe("text/csv;charset=utf-8");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // EF BB BF is the UTF-8 byte-order mark (CSV_BOM).
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe("code\r\n");
    expect(CSV_BOM.codePointAt(0)).toBe(0xfe_ff);

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:codes");
  });
});
