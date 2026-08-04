"use client";

import { useEffect, useState } from "react";
import styles from "@/app/page.module.css";

const CarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.backIcon}>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
    <path d="M7 17h10" />
  </svg>
);

const LaptopIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.backIcon}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="2" y1="20" x2="22" y2="20" />
    <line x1="12" y1="17" x2="12" y2="20" />
  </svg>
);

const SofaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.backIcon}>
    <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
    <path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5Z" />
    <path d="M5 18v2M19 18v2" />
  </svg>
);

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.backIcon}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const BicycleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.backIcon}>
    <circle cx="5.5" cy="17.5" r="2.5" />
    <circle cx="18.5" cy="17.5" r="2.5" />
    <path d="M15 6h5.5" />
    <path d="M12 12h3.5L18.5 6" />
    <path d="M5.5 17.5 12 12M12 12 8 6h4M12 12v5.5" />
  </svg>
);

const HouseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.backIcon}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const itemsO = [
  { icon: <CarIcon /> },
  { icon: <LaptopIcon /> },
  { icon: <SofaIcon /> }
];

const itemsA = [
  { icon: <BookIcon /> },
  { icon: <BicycleIcon /> },
  { icon: <HouseIcon /> }
];

export default function HeroSection() {
  const [rotation, setRotation] = useState(0);
  const [itemIndexO, setItemIndexO] = useState(0);
  const [itemIndexA, setItemIndexA] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => {
        const nextRotation = prev + 180;
        const isEven = (nextRotation / 180) % 2 === 0;
        if (isEven) {
          setItemIndexO((prevIdx) => (prevIdx + 1) % itemsO.length);
          setItemIndexA((prevIdx) => (prevIdx + 1) % itemsA.length);
        }
        return nextRotation;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const letters = ["o", "k", "k", "a", "z"];

  return (
    <section className={styles.newHero}>
      <div className={styles.heroBackgroundTextContainer}>
        <h1 className={styles.heroBackgroundText}>
          {letters.map((letter, index) => {
            const isO = letter === "o";
            const isA = letter === "a";
            const shouldFlip = isO || isA;

            return (
              <span key={index} className={styles.heroLetterWrapper}>
                <span
                  className={styles.heroAnimatedLetter}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {shouldFlip ? (
                    <span className={styles.flipContainer}>
                      <span
                        className={styles.flipCardInner}
                        style={{ transform: `rotateY(${rotation}deg)` }}
                      >
                        <span className={styles.flipCardFront}>{letter}</span>
                        <span className={styles.flipCardBack}>
                          {isO ? itemsO[itemIndexO].icon : itemsA[itemIndexA].icon}
                        </span>
                      </span>
                    </span>
                  ) : (
                    letter
                  )}
                </span>
              </span>
            );
          })}
        </h1>
      </div>

      <div className={styles.heroOverlayContent}>
        <div className={styles.heroBottomText}>
          <h2>
            Accédez au bon bien.
            <br />
            Au bon moment.
          </h2>
        </div>
      </div>
    </section>
  );
}
