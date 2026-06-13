"use client";

import Link from "next/link";
import { useHeroUnfold } from "@/hooks/useHeroUnfold";
import styles from "./contact.module.css";

const CONTACT_LINKS = [
  { label: "WhatsApp", href: "https://wa.me/22900000000", tone: styles.stickerGreen },
  { label: "Email", href: "mailto:contact@okkaz.bj", tone: styles.stickerLight },
  { label: "Chat OKKAZ", href: "/chat", tone: styles.stickerOrange },
  { label: "LinkedIn", href: "https://www.linkedin.com", tone: styles.stickerLight },
  { label: "Facebook", href: "https://www.facebook.com", tone: styles.stickerBlue },
];

export default function ContactPage() {
  const unfoldProgress = useHeroUnfold();
  const letters = ["c", "o", "n", "t", "a", "c", "t"];
  const center = (letters.length - 1) / 2;

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="contact-title">
        <div className={styles.titleRail} aria-hidden>
          {letters.map((letter, index) => {
            const distanceFromCenter = index - center;

            return (
              <span
                key={`${letter}-${index}`}
                className={styles.titleLetterWrapper}
                style={{
                  transform: `translate3d(${
                    unfoldProgress * -0.92 + distanceFromCenter * unfoldProgress * 0.06
                  }em, 0, 0)`,
                }}
              >
                <span
                  className={styles.titleAnimatedLetter}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  {letter}
                </span>
              </span>
            );
          })}
        </div>

        <div className={styles.bodyGrid}>
          <div className={styles.copy}>
            <h1 id="contact-title">Parlons de votre besoin.</h1>
            <p>
              Location, Achat / Vente, publication ou support vendeur: laissez-nous les détails et nous vous
              orientons vers la bonne solution.
            </p>
          </div>

          <form
            id="contact-form"
            className={styles.form}
            action="mailto:contact@okkaz.bj"
            method="post"
            encType="text/plain"
          >
            <label>
              Nom
              <input name="nom" type="text" placeholder="Votre nom" autoComplete="name" />
            </label>
            <label>
              Email
              <input name="email" type="email" placeholder="vous@email.com" autoComplete="email" />
            </label>
            <label>
              Sujet
              <select name="sujet" defaultValue="">
                <option value="" disabled>
                  Choisir un sujet
                </option>
                <option>Réserver un bien</option>
                <option>Publier une annonce</option>
                <option>Devenir partenaire</option>
                <option>Support</option>
              </select>
            </label>
            <label>
              Message
              <textarea name="message" placeholder="Expliquez-nous ce dont vous avez besoin." />
            </label>
            <button type="submit">Envoyer le message</button>
          </form>
        </div>

        <div className={styles.stickerStage} aria-label="Liens de contact rapides">
          <div className={styles.badge} aria-hidden>
            <span>OKKAZ</span>
            <strong>Contact</strong>
          </div>
          <div className={styles.socialHint} aria-label="Cliquez sur nos stickers de réseaux">
            <span className={styles.socialHintOrb} aria-hidden />
            <span className={styles.socialHintBubble}>Cliquez sur nos stickers de réseaux</span>
          </div>
          {CONTACT_LINKS.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className={`${styles.sticker} ${item.tone} ${styles[`sticker${index + 1}`]}`}
            >
              <span className={styles.stickerText}>{item.label}</span>
              <span className={styles.stickerHoverText}>Clique-moi !</span>
            </Link>
          ))}
          <a className={styles.mailWatermark} href="mailto:contact@okkaz.bj">
            contact@okkaz.bj
          </a>
        </div>
      </section>
    </main>
  );
}
