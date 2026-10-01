import { gsap } from "gsap";

/** A heading and its lead arrive together. Prices and live data never tween. */
export function startHomeReveal(scope: HTMLElement) {
  let isStopped = false;
  const observer = new IntersectionObserver(
    (entries) => {
      if (isStopped) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const heading = entry.target;
        const lead = heading.nextElementSibling;
        const targets = lead?.tagName === "P" ? [heading, lead] : [heading];
        // Observer callbacks run later, so explicitly record their tweens.
        context.add(() => {
          gsap.fromTo(
            targets,
            { y: 6, opacity: 0.85 },
            {
              y: 0,
              opacity: 1,
              duration: 0.15,
              stagger: 0.03,
              ease: "power2.out",
              clearProps: "transform,opacity",
            },
          );
        });
      }
    },
    { threshold: 0.2 },
  );

  const context = gsap.context(() => {
    for (const heading of scope.querySelectorAll("h1, h2")) {
      observer.observe(heading);
    }
  }, scope);

  return () => {
    isStopped = true;
    observer.disconnect();
    context.revert();
  };
}
