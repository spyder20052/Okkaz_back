"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "@/app/page.module.css";

// Les liens pointent vers les slugs réels des catégories backend (GET /categories).
const ITEMS = [
  { href: "/annonces?category=automobiles", image: "/vehicules.png", title: "Véhicules" },
  { href: "/annonces?category=immobilier", image: "/hero.PNG", title: "Maisons" },
  { href: "/annonces?category=electronique", image: "/electronique.png", title: "Tech" },
  { href: "/annonces?category=outils-de-travail", image: "/equipements-pro.png", title: "Matériel pro" },
  { href: "/annonces?category=divertissement", image: "/evenementiel.png", title: "Événements" },
  { href: "/annonces?category=electromenager", image: "/mobilier-deco.png", title: "Électroménager" },
];

export default function GallerySection() {
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            // restart animation by toggling the attribute
            el.removeAttribute("data-in-view");
            // force reflow so the attribute removal registers before re-adding
            void el.offsetWidth;
            el.setAttribute("data-in-view", "true");
          } else {
            el.removeAttribute("data-in-view");
          }
        });
      },
      { threshold: 0.45, rootMargin: "0px 0px -10% 0px" }
    );

    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.gallerySection}>
      <div className={styles.galleryGrid}>
        {ITEMS.map((item, index) => (
          <Link
            href={item.href}
            key={`${item.title}-${index}`}
            ref={(el) => { cardRefs.current[index] = el; }}
            className={styles.galleryCard}
          >
            <div
              className={styles.cardImagePlaceholder}
              style={{
                backgroundImage: `url(${item.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <h4 className={styles.cardTitle}>{item.title}</h4>
          </Link>
        ))}
      </div>
    </section>
  );
}
