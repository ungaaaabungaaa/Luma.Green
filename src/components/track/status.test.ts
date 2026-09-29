import { describe, expect, it } from "vitest";

import { isFinished, progressIndex, progressSteps, statusTone } from "./status";

describe("booking progress", () => {
  it("has four steps for a pickup and three for a drop-off", () => {
    expect(progressSteps("pickup")).toEqual([
      "booked",
      "accepted",
      "onTheWay",
      "done",
    ]);
    expect(progressSteps("dropoff")).toEqual(["booked", "confirmed", "done"]);
  });

  it("moves along the bar as the booking moves", () => {
    expect(progressIndex("requested", "pickup")).toBe(0);
    expect(progressIndex("accepted", "pickup")).toBe(1);
    expect(progressIndex("on_the_way", "pickup")).toBe(2);
    expect(progressIndex("completed", "pickup")).toBe(3);
    expect(progressIndex("completed", "dropoff")).toBe(2);
  });

  it("shows no bar once it stopped", () => {
    expect(progressIndex("declined", "pickup")).toBeNull();
    expect(progressIndex("cancelled", "dropoff")).toBeNull();
  });

  it("colours waiting, good news and bad news differently", () => {
    expect(statusTone("requested")).toBe("warn");
    expect(statusTone("accepted")).toBe("good");
    expect(statusTone("declined")).toBe("bad");
    expect(statusTone("cancelled")).toBe("neutral");
  });

  it("knows when nothing more will happen", () => {
    expect(isFinished("completed")).toBe(true);
    expect(isFinished("cancelled")).toBe(true);
    expect(isFinished("on_the_way")).toBe(false);
  });
});
