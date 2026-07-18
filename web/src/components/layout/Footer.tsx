"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  const [inView, setInView] = useState(false);
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const observedText = textRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
          } else {
            setInView(false); // Reset to allow replaying animation when scrolling back
          }
        });
      },
      { threshold: 0.2 } // Trigger when 20% of the element is visible
    );

    if (observedText) {
      observer.observe(observedText);
    }

    return () => {
      if (observedText) {
        observer.unobserve(observedText);
      }
    };
  }, []);

  return (
    <footer className={styles.footer}>
      {/* Main Content Container */}
      <div className={styles.mainContainer}>
        
        {/* Top row: Email and Call to Action */}
        <div className={styles.topRow}>
          
          {/* Left: Email */}
          <div className={styles.emailSection}>
            <div className={styles.decorator}>
              <div className={styles.decoratorLine}></div>
            </div>
            <p className={styles.emailDesc}>
              Une question, une annonce ou un partenariat.
            </p>
            <div className={styles.emailTitleContainer}>
              <h2 className={styles.emailTitle}>contact@okkaz.bj</h2>
            </div>
          </div>

          {/* Right: CTA Box */}
          <Link href="/annonces" className={styles.ctaBox}>
            <h3 className={styles.ctaTitle}>Entrer</h3>
            <div className={styles.ctaButton}>
              <span className={styles.ctaButtonText}>Démarrer</span>
              <span>→</span>
            </div>
          </Link>

        </div>

        {/* Middle row: Links and Address */}
        <div className={styles.middleRow}>
          
          {/* Left Links */}
          <div className={styles.links}>
            <h4 className={styles.linksTitle}>Liens utiles</h4>
            <Link href="/" className={styles.linkItem}>Accueil</Link>
            <Link href="/annonces" className={styles.linkItem}>Biens disponibles</Link>
            <Link href="/vendeur/publier" className={styles.linkItem}>Publier un bien</Link>
            <Link href="/vendeur" className={styles.linkItem}>Espace vendeur</Link>
            <Link href="/contact" className={styles.linkItem}>Contact</Link>
            <Link href="/faq" className={styles.linkItem}>FAQ</Link>
            <Link href="/connexion" className={styles.linkItem}>Connexion</Link>
          </div>

          {/* Right Address */}
          <div className={styles.address}>
            <h4 className={styles.addressTitle}>Bureau</h4>
            <p className={styles.addressText}>
              Cotonou<br />
              Littoral, Bénin<br />
              00229
            </p>
          </div>

        </div>

        {/* Huge Text */}
        <div className={styles.hugeTextContainer}>
          <h1 
            ref={textRef}
            className={`${styles.hugeText} ${inView ? styles.inView : ''}`}
          >
            {['O', 'k', 'k', 'a', 'z'].map((letter, index) => (
              <span key={index} className={styles.letterWrapper}>
                <span 
                  className={styles.animatedLetter} 
                  style={{ transitionDelay: `${index * 0.15}s` }}
                >
                  {letter}
                </span>
              </span>
            ))}
          </h1>
        </div>

      </div>

      {/* Bottom Blue Bar */}
      <div className={styles.bottomBar}>
        <div>Copyright © Okkaz {new Date().getFullYear()}</div>
        <div className={styles.bottomBarLocation}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          Cotonou, BJ
        </div>
        <div className={styles.bottomBarLinks}>
          <Link href="/contact" className={styles.bottomBarLink}>Support</Link>
          <Link href="/faq" className={styles.bottomBarLink}>Aide</Link>
        </div>
      </div>

    </footer>
  );
}
