import { gsap } from "gsap";

import { parallaxDistance, revealTargets } from "./reveal-targets";

/** Content stays visible before hydration. Only decorative artwork follows scroll. */
export function startHomeReveal(scope: HTMLElement) {
  let isStopped = false;
  let frame = 0;
  const layers: { scene: HTMLElement; tween: gsap.core.Tween }[] = [];
  const observer = new IntersectionObserver(
    (entries) => {
      if (isStopped) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        // Observer callbacks run later, so explicitly record their tweens.
        context.add(() => {
          gsap.fromTo(
            entry.target,
            { y: 22, opacity: 0.65 },
            {
              y: 0,
              opacity: 1,
              duration: 0.65,
              ease: "power3.out",
              clearProps: "transform,opacity",
            },
          );
        });
      }
    },
    { threshold: 0.12 },
  );

  function paint() {
    frame = 0;
    if (isStopped) return;
    const height = window.innerHeight;
    for (const { scene, tween } of layers) {
      // Measure the stable frame, never the transformed artwork itself.
      const bounds = scene.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, (height - bounds.top) / (height + bounds.height)),
      );
      tween.progress(progress);
    }
  }

  function requestPaint() {
    frame ||= window.requestAnimationFrame(paint);
  }

  const context = gsap.context(() => {
    for (const target of revealTargets(scope)) observer.observe(target);
    for (const element of scope.querySelectorAll<HTMLElement>(
      "[data-parallax]",
    )) {
      const scene =
        element.parentElement?.closest<HTMLElement>("[data-parallax-scene]") ??
        element.parentElement;
      if (!scene) continue;
      layers.push({
        scene,
        tween: gsap.fromTo(
          element,
          {
            y: () =>
              -parallaxDistance(
                element.dataset.parallax,
                window.innerWidth < 768,
              ),
          },
          {
            y: () =>
              parallaxDistance(
                element.dataset.parallax,
                window.innerWidth < 768,
              ),
            duration: 1,
            paused: true,
            ease: "none",
          },
        ),
      });
    }
    paint();
  }, scope);

  function resize() {
    for (const { tween } of layers) tween.invalidate();
    requestPaint();
  }

  if (layers.length > 0) {
    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("resize", resize);
  }
  return () => {
    isStopped = true;
    window.cancelAnimationFrame(frame);
    window.removeEventListener("scroll", requestPaint);
    window.removeEventListener("resize", resize);
    observer.disconnect();
    context.revert();
  };
}
