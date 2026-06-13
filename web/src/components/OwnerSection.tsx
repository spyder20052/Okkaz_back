"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "@/app/page.module.css";

gsap.registerPlugin(ScrollTrigger);

export default function OwnerSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleMovingRef = useRef<HTMLSpanElement>(null);
  const cardsRef = useRef<(HTMLElement | null)[]>([]);

  useGSAP(() => {
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
          scrub: 1.2,
        },
      }
    );

    const mm = gsap.matchMedia();

    mm.add("(min-width: 0px)", () => {
      const cards = cardsRef.current.filter(Boolean);
      const finalStates = [
        { xPercent: 0, y: 0, rotation: -7 },
        { xPercent: 0, y: "1.8rem", rotation: 2.5 },
        { xPercent: 0, y: 0, rotation: -3.5 },
      ];

      gsap.set(cards, {
        transformOrigin: "left bottom",
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 72%",
          end: "center 42%",
          scrub: 1.15,
        },
      });

      cards.forEach((card, index) => {
        tl.fromTo(
          card,
          {
            xPercent: index * -104,
            y: 130 + index * 16,
            rotation: -12 + index * 3,
            scale: 0.92,
            opacity: 0.86,
          },
          {
            ...finalStates[index],
            scale: 1,
            opacity: 1,
            ease: "none",
          },
          0
        );
      });
    });
  }, { scope: sectionRef });

  return (
    <section className={styles.ownerSection} ref={sectionRef}>
      <div className={styles.ownerIntro}>
        <p className={styles.ownerEyebrow}>Pour propriétaires</p>
        <h2 className={styles.ownerTitle} ref={titleRef}>
          <span className={styles.ownerStaticTitleText}>Rentabilisez vos biens</span>
          <span className={styles.ownerMovingTitleLine}>
            <span className={styles.ownerMovingTitleText} ref={titleMovingRef}>
              inutilisés.
            </span>
          </span>
        </h2>
      </div>

      <div className={styles.ownerCards} aria-label="Avantages pour les propriétaires">
        <Link
          href="/admin"
          ref={(el) => { cardsRef.current[0] = el; }}
          className={`${styles.ownerCard} ${styles.ownerCardPink}`}
        >
          <span className={styles.ownerPill}>Publier</span>
          <h3>Ajoutez votre bien en quelques minutes</h3>
          <p>Photos, prix, conditions et disponibilité restent simples à gérer.</p>
        </Link>

        <Link
          href="/admin"
          ref={(el) => { cardsRef.current[1] = el; }}
          className={`${styles.ownerCard} ${styles.ownerCardGreen}`}
        >
          <span className={styles.ownerPill}>Valider</span>
          <h3>Recevez des demandes plus fiables</h3>
          <p>OKKAZ cadre les profils, les annonces et les échanges importants.</p>
        </Link>

        <Link
          href="/admin"
          ref={(el) => { cardsRef.current[2] = el; }}
          className={`${styles.ownerCard} ${styles.ownerCardOrange}`}
        >
          <span className={styles.ownerPill}>Gagner</span>
          <h3>Transformez vos actifs en revenus</h3>
          <p>Location, Achat / Vente ou mise en avant Pro selon votre stratégie.</p>
        </Link>
      </div>
    </section>
  );
}
