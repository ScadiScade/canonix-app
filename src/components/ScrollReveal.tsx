"use client";

import { useEffect } from "react";

export function ScrollReveal({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    const observe = () => {
      document.querySelectorAll(".reveal:not(.reveal-visible)").forEach((el) => {
        io.observe(el);
        // Auto-stagger direct children of reveal-stagger containers
        if (el.classList.contains("reveal-stagger")) {
          const children = el.children;
          for (let i = 0; i < children.length; i++) {
            const child = children[i] as HTMLElement;
            child.classList.add("reveal");
            const delayIdx = (i % 8) + 1;
            child.classList.add(`reveal-delay-${delayIdx}`);
          }
        }
      });
    };

    observe();

    const mo = new MutationObserver(() => observe());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return <>{children}</>;
}
