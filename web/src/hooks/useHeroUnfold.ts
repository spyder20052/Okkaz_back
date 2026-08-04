"use client";

import { useEffect, useState } from "react";

export function useHeroUnfold() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reducedMotion.matches) {
      return;
    }

    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const viewportHeight = Math.max(window.innerHeight, 1);
      const nextProgress = Math.min(window.scrollY / (viewportHeight * 0.7), 1);
      setProgress(nextProgress);
    };

    const requestUpdate = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return progress;
}
