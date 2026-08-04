"use client";

import { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./MissionText.module.css";

gsap.registerPlugin(ScrollTrigger);

export default function MissionText() {
  const textRef = useRef<HTMLHeadingElement>(null);
  const movingRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      movingRef.current,
      { yPercent: 18 },
      {
        yPercent: -12,
        ease: "none",
        scrollTrigger: {
          trigger: textRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.25,
        },
      }
    );
  }, []);

  return (
    <h2 className={styles.missionText} ref={textRef}>
      <span className={styles.staticText}>Une plateforme plus directe pour</span>
      <span className={styles.movingLine}>
        <span className={styles.movingText} ref={movingRef}>
          louer, échanger et financer l&apos;accès aux biens essentiels au Bénin.
        </span>
      </span>
    </h2>
  );
}
