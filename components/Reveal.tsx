"use client";

import { useEffect } from "react";

// Adds .seen to every .rv element as it scrolls into view.
export default function Reveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".rv"));
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("seen"));
      return;
    }
    const o = new IntersectionObserver(
      (entries) =>
        entries.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add("seen");
            o.unobserve(x.target);
          }
        }),
      { threshold: 0.12 },
    );
    els.forEach((e) => o.observe(e));
    return () => o.disconnect();
  }, []);
  return null;
}
