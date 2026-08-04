"use client";

import { useRef } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./FooterMotionPath.module.css";

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

export default function FooterMotionPath() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleMovingRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGGElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      gsap.fromTo(
        titleMovingRef.current,
        { yPercent: 18 },
        {
          yPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.25,
          },
        }
      );
    });

    mm.add("(max-width: 768px)", () => {
      gsap.set(titleMovingRef.current, { clearProps: "transform" });
    });

    if (!pathRef.current || !markerRef.current) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.set(markerRef.current, {
      autoAlpha: 1,
      transformOrigin: "50% 50%",
    });

    if (reduceMotion) {
      gsap.set(markerRef.current, { x: 8, y: 102 });
      return () => mm.revert();
    }

    gsap.to(markerRef.current, {
      duration: 6,
      ease: "power1.inOut",
      repeat: -1,
      yoyo: true,
      motionPath: {
        path: pathRef.current,
        align: pathRef.current,
        alignOrigin: [0.5, 0.5],
        autoRotate: true,
      },
    });
    return () => mm.revert();
  }, { scope: sectionRef });

  return (
    <section className={styles.section} ref={sectionRef} aria-label="Trajet OKKAZ">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>OKKAZ en action</span>
          <h2 className={styles.title} ref={titleRef}>
            <span className={styles.staticTitleText}>Du bien disponible</span>
            <span className={styles.movingTitleLine}>
              <span className={styles.movingTitleText} ref={titleMovingRef}>
                à la location, l&apos;échange ou l&apos;achat / vente.
              </span>
            </span>
          </h2>
        </div>

        <svg className={styles.motionPath} viewBox="-20 0 557 190" aria-hidden="true">
          <path
            ref={pathRef}
            className={styles.path}
            fill="none"
            d="M8,102 C15,83 58,25 131,24 206,24 233,63 259,91 292,125 328,155 377,155 464,155 497,97 504,74"
          />
          <g ref={markerRef} className={styles.marker}>
            <path className={styles.markerBody} d="M0 0h54l18 14-18 14H0z" />
            <path className={styles.markerWindow} d="M13 8h25v12H13z" />
            <path className={styles.markerLine} d="M-18 14H-4" />
          </g>
        </svg>
      </div>
    </section>
  );
}
