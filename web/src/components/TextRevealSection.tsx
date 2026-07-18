"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./TextRevealSection.module.css";

gsap.registerPlugin(ScrollTrigger);

export default function TextRevealSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const textRevealRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 80%",
        end: "bottom 60%",
        scrub: 1.2,
      }
    });

    // 1. Scrubber sweeps from left to right across the block
    tl.fromTo(scrubberRef.current,
      { x: 0 },
      { x: "100vw", duration: 2, ease: "none" },
      0
    );

    // 2. Simultaneously, the mask on the reveal text shrinks from right to left (text "lights up")
    tl.fromTo(textRevealRef.current,
      { clipPath: "inset(0 100% 0 0)" },
      { clipPath: "inset(0 0% 0 0)", duration: 2, ease: "none" },
      "<" // same time as scrubber
    );

    // 3. CTA fades in and rises up after text is mostly revealed
    tl.to(ctaRef.current,
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
      "-=0.3"
    );

  }, { scope: sectionRef });

  return (
    <section className={styles.section} ref={sectionRef}>
      <div className={styles.inner}>
        {/* The sweeping line */}
        <div className={styles.scrubber} ref={scrubberRef} />

        {/* Text block with reveal effect */}
        <div className={styles.textWrapper}>
          {/* Base (gray) text */}
          <h2 className={styles.textBase}>
            Posséder moins.<br />Accéder mieux.
          </h2>
          {/* Revealed (dark) text clipped by mask */}
          <h2 className={styles.textReveal} ref={textRevealRef} aria-hidden>
            Posséder moins.<br />Accéder mieux.
          </h2>
        </div>

        {/* CTA that appears after text reveal */}
        <div className={styles.cta} ref={ctaRef}>
          <p className={styles.ctaText}>
            Commencez avec un parcours clair.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/annonces" className={styles.ctaButton}>
              Trouver un bien
            </Link>
            <Link href="/vendeur" className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}>
              Publier un bien
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
