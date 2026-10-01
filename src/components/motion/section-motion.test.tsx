import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SectionMotion } from "./section-motion";

const route = vi.hoisted(() => ({ pathname: "/prices" }));
vi.mock("@/i18n/navigation", () => ({ usePathname: () => route.pathname }));

describe("secondary page motion", () => {
  let isReduced = false;
  let change: (() => void) | undefined;
  const callbacks: IntersectionObserverCallback[] = [];
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel, addEventListener: vi.fn() }));
  const disconnect = vi.fn();
  const observe = vi.fn();
  let originalAnimate: PropertyDescriptor | undefined;

  beforeEach(() => {
    isReduced = false;
    route.pathname = "/prices";
    callbacks.length = 0;
    vi.clearAllMocks();
    originalAnimate = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "animate",
    );
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: animate,
    });
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = observe;
        unobserve = vi.fn();
        disconnect = disconnect;
        constructor(callback: IntersectionObserverCallback) {
          callbacks.push(callback);
        }
      },
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        get matches() {
          return isReduced;
        },
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        addEventListener: (
          _event: string,
          listener: EventListenerOrEventListenerObject,
        ) => {
          if (typeof listener === "function")
            change = () => {
              listener(new Event("change"));
            };
        },
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalAnimate)
      Object.defineProperty(HTMLElement.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(HTMLElement.prototype, "animate");
  });

  function enter(callback: IntersectionObserverCallback | undefined) {
    const target = screen.getByRole("heading");
    const rectangle = target.getBoundingClientRect();
    callback?.(
      [
        {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          time: 0,
          boundingClientRect: rectangle,
          intersectionRect: rectangle,
          rootBounds: rectangle,
        },
      ],
      new IntersectionObserver(vi.fn()),
    );
  }

  it("leaves homepage motion to its dedicated controller", () => {
    route.pathname = "/";
    render(
      <SectionMotion>
        <h1>Home</h1>
      </SectionMotion>,
    );
    expect(observe).not.toHaveBeenCalled();
    expect(screen.getByRole("heading")).toBeVisible();
  });

  it("leaves content still when reduced motion is already enabled", () => {
    isReduced = true;
    render(
      <SectionMotion>
        <h1>Prices</h1>
      </SectionMotion>,
    );
    expect(screen.getByRole("heading")).toBeVisible();
    expect(observe).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
  });

  it("cancels active entrances and ignores pending observer events on preference change", () => {
    render(
      <SectionMotion>
        <h1>Prices</h1>
      </SectionMotion>,
    );
    const callback = callbacks[0];
    act(() => {
      enter(callback);
    });
    expect(animate).toHaveBeenCalledOnce();
    act(() => {
      isReduced = true;
      change?.();
    });
    expect(cancel).toHaveBeenCalledOnce();
    act(() => {
      enter(callback);
    });
    expect(animate).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading")).toBeVisible();
  });

  it("releases the previous page animation before observing a new route", () => {
    const { rerender, unmount } = render(
      <SectionMotion>
        <h1>Prices</h1>
      </SectionMotion>,
    );
    act(() => {
      enter(callbacks[0]);
    });
    route.pathname = "/participants";
    rerender(
      <SectionMotion>
        <h1>Participants</h1>
      </SectionMotion>,
    );
    expect(cancel).toHaveBeenCalledOnce();
    act(() => {
      enter(callbacks.at(-1));
    });
    expect(animate).toHaveBeenCalledTimes(2);
    unmount();
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
