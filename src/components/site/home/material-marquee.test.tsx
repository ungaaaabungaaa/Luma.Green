import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import arabic from "../../../../messages/ar.json";
import english from "../../../../messages/en.json";
import { MaterialMarquee } from "./material-marquee";

function renderMarquee(locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "ar" ? arabic : english}
    >
      <MaterialMarquee />
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("material marquee", () => {
  it("runs only while in view and disconnects its observer on unmount", () => {
    let notify: IntersectionObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = observe;
        disconnect = disconnect;
        constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
      },
    );
    const { unmount } = renderMarquee();
    const region = screen.getByRole("region", {
      name: english.home.marquee.label,
    });
    const track = within(region).getByRole("list").parentElement;
    const rectangle = region.getBoundingClientRect();
    const observer = {} as IntersectionObserver;
    const update = (isIntersecting: boolean) => {
      act(() =>
        notify?.(
          [
            {
              target: region,
              isIntersecting,
              intersectionRatio: isIntersecting ? 1 : 0,
              time: 0,
              boundingClientRect: rectangle,
              intersectionRect: rectangle,
              rootBounds: rectangle,
            },
          ],
          observer,
        ),
      );
    };
    expect(observe).toHaveBeenCalledWith(region);
    expect(track).toHaveAttribute("data-active", "false");
    update(true);
    expect(track).toHaveAttribute("data-active", "true");
    update(false);
    expect(track).toHaveAttribute("data-active", "false");
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
  it("exposes one material list to assistive technology", () => {
    renderMarquee();
    const region = screen.getByRole("region", {
      name: english.home.marquee.label,
    });
    expect(within(region).getAllByRole("list")).toHaveLength(1);
    const materials = within(region).getAllByRole("listitem");
    expect(materials).toHaveLength(6);
    expect(materials[0]).toHaveTextContent(english.prices.families.paper);
  });

  it("lets a keyboard user pause and resume the loop", async () => {
    const user = userEvent.setup();
    renderMarquee();
    await user.tab();
    expect(
      screen.getByRole("button", { name: english.home.marquee.pause }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: english.home.marquee.resume }),
    ).toHaveFocus();
    await user.keyboard(" ");
    expect(
      screen.getByRole("button", { name: english.home.marquee.pause }),
    ).toHaveFocus();
  });

  it("uses Arabic material names and control labels", async () => {
    const user = userEvent.setup();
    renderMarquee("ar");
    const region = screen.getByRole("region", {
      name: arabic.home.marquee.label,
    });
    expect(within(region).getAllByRole("listitem")[0]).toHaveTextContent(
      arabic.prices.families.paper,
    );
    await user.click(
      screen.getByRole("button", { name: arabic.home.marquee.pause }),
    );
    expect(
      screen.getByRole("button", { name: arabic.home.marquee.resume }),
    ).toBeVisible();
  });
});
