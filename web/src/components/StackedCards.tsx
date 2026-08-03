"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./StackedCards.module.css";

gsap.registerPlugin(ScrollTrigger);

const CARDS = [
  {
    id: 1,
    eyebrow: "Recherche",
    title: "Trouvez",
    description: "Parcourez les biens disponibles et repérez celui qui correspond à votre besoin, votre budget et votre zone.",
    stat: "Simple",
    statLabel: "pour comparer les annonces",
    chips: ["Catégorie", "Budget", "Zone"],
    href: "/annonces",
    bgColor: "#171717",
    textColor: "var(--white)",
    theme: styles.darkCard
  },
  {
    id: 2,
    eyebrow: "Choix",
    title: "Décidez",
    description: "Consultez les détails, les conditions et le prix, puis choisissez le bien qui vous intéresse.",
    stat: "Clair",
    statLabel: "avant toute demande",
    chips: ["Prix", "État", "Conditions"],
    href: "/annonces",
    bgColor: "#ffffff",
    textColor: "#111111",
    theme: styles.lightCard
  },
  {
    id: 3,
    eyebrow: "Contact",
    title: "Contactez",
    description: "Affichez gratuitement le contact. Si le vendeur est abonné, son numéro personnel apparaît ; sinon, le numéro OKKAZ est affiché.",
    stat: "Gratuit",
    statLabel: "pour voir le contact",
    chips: ["Numéro vendeur", "Numéro OKKAZ", "Sans paiement"],
    href: "/annonces",
    bgColor: "#171717",
    textColor: "var(--white)",
    theme: styles.darkCard
  },
  {
    id: 4,
    eyebrow: "Échange",
    title: "Discutez",
    description: "Échangez directement sur WhatsApp avec le vendeur ou via le numéro de mise en relation OKKAZ.",
    stat: "Direct",
    statLabel: "sur WhatsApp",
    chips: ["WhatsApp", "Discussion", "Accord direct"],
    href: "/annonces",
    bgColor: "#ffffff",
    textColor: "#111111",
    theme: styles.lightCard
  }
];

export default function StackedCards() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleMovingRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
          scrub: 1.25,
        },
      }
    );

    const mm = gsap.matchMedia();

    const setupStackedCards = ({
      incomingOffset,
      stackLift,
      scaleStep,
      scrollLength,
      scrub,
      snap,
      start,
    }: {
      incomingOffset: number;
      stackLift: number;
      scaleStep: number;
      scrollLength: number;
      scrub: number;
      snap: boolean;
      start: string;
    }) => {
      // Initial state: first card is visible, the others enter from below.
      gsap.set(cardsRef.current, {
        y: (i) => (i === 0 ? 0 : window.innerHeight * incomingOffset),
        scale: 1,
      });
      gsap.set(`.${styles.cardBody}, .${styles.cardFooter}`, {
        y: 24,
        opacity: 0,
      });
      const firstCardParts = cardsRef.current[0]?.querySelectorAll(`.${styles.cardBody}, .${styles.cardFooter}`);

      if (firstCardParts) {
        gsap.set(firstCardParts, {
          y: 0,
          opacity: 1,
        });
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start,
          end: () => `+=${window.innerHeight * (CARDS.length - 1) * scrollLength}`,
          pin: true,
          scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          snap: snap
            ? {
                snapTo: "labels",
                duration: { min: 0.35, max: 0.9 },
                delay: 0.05,
                ease: "power1.inOut"
              }
            : undefined,
        }
      });

      tl.addLabel("card-0", 0);

      CARDS.forEach((_, i) => {
        if (i === 0) return;

        const startTime = i - 1;

        tl.to(cardsRef.current[i], {
          y: 0,
          duration: 1,
          ease: "none"
        }, startTime);

        const cardParts = cardsRef.current[i]?.querySelectorAll(`.${styles.cardBody}, .${styles.cardFooter}`);

        if (cardParts) {
          tl.to(cardParts, {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 0.45,
            ease: "power2.out",
          }, startTime + 0.18);
        }

        for (let j = 0; j < i; j++) {
          tl.to(cardsRef.current[j], {
            scale: 1 - (i - j) * scaleStep,
            y: -((i - j) * stackLift),
            duration: 1,
            ease: "none"
          }, startTime);
        }

        tl.addLabel(`card-${i}`, i);
      });

      tl.addLabel("end", CARDS.length - 1);
    };

    mm.add("(min-width: 769px)", () => {
      setupStackedCards({
        incomingOffset: 1.5,
        stackLift: 30,
        scaleStep: 0.04,
        scrollLength: 0.85,
        scrub: 1.5,
        snap: true,
        start: "top top",
      });
    });

    mm.add("(max-width: 768px)", () => {
      setupStackedCards({
        incomingOffset: 1.15,
        stackLift: 18,
        scaleStep: 0.035,
        scrollLength: 0.9,
        scrub: 1.15,
        snap: false,
        start: "top 12%",
      });
    });

    return () => mm.revert();
  }, { scope: containerRef });

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.label}>Parcours client</span>
        <h2 className={styles.title} ref={titleRef}>
          <span className={styles.staticTitleText}>Cherchez, réservez puis</span>
          <span className={styles.movingTitleLine}>
            <span className={styles.movingTitleText} ref={titleMovingRef}>
              obtenez le <span className={styles.highlight}>contact vendeur</span>.
            </span>
          </span>
        </h2>
      </div>
      <div className={styles.container} ref={containerRef}>
        <div className={styles.cardsWrapper}>
          {CARDS.map((card, index) => (
            <Link
              href={card.href}
              key={card.id}
              ref={(el) => { cardsRef.current[index] = el; }}
              className={`${styles.card} ${card.theme}`}
              style={{
                backgroundColor: card.bgColor,
                color: card.textColor,
                zIndex: index
              }}
            >
              <div className={styles.cardTop}>
                <span className={styles.stepPill}>Étape 0{card.id}</span>
                <h2 className={styles.cardNumber}>0{card.id}</h2>
              </div>

              <div className={styles.cardGrid}>
                <div className={styles.cardBody}>
                  <span className={styles.cardEyebrow}>{card.eyebrow}</span>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardDescription}>{card.description}</p>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.cardChips}>
                  {card.chips.map((chip) => (
                    <span key={chip}>{chip}</span>
                  ))}
                </div>
                <div className={styles.cardStat}>
                  <strong>{card.stat}</strong>
                  <span>{card.statLabel}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
