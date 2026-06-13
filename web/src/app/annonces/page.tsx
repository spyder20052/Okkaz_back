"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHeroUnfold } from "@/hooks/useHeroUnfold";
import { mockAds } from "@/lib/data";
import styles from "./annonces.module.css";

const MODES = ["Tous", "Achat / Vente", "Location"] as const;
const CATEGORY_ORDER = ["Toutes", "Véhicules", "Immobilier", "Électronique", "Équipements Pro", "Événementiel", "Mobilier"];
const HERO_LETTERS = ["b", "i", "e", "n", "s"];

function AnnoncesContent() {
  const searchParams = useSearchParams();
  const unfoldProgress = useHeroUnfold();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") ?? "Toutes");
  const [mode, setMode] = useState<(typeof MODES)[number]>("Tous");

  const categories = useMemo(() => {
    const existing = new Set(mockAds.map((ad) => ad.category));
    return CATEGORY_ORDER.filter((item) => item === "Toutes" || existing.has(item));
  }, []);

  const filteredAds = mockAds.filter((ad) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      ad.title.toLowerCase().includes(query) ||
      ad.location.toLowerCase().includes(query) ||
      ad.owner.toLowerCase().includes(query);
    const matchesCategory = category === "Toutes" || ad.category === category;
    const matchesMode = mode === "Tous" || (mode === "Achat / Vente" ? ad.loaPossible : !ad.loaPossible);

    return matchesSearch && matchesCategory && matchesMode;
  });

  const heroCenter = (HERO_LETTERS.length - 1) / 2;

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroBackgroundTextContainer}>
          <h1 className={styles.heroBackgroundText} aria-hidden>
            {HERO_LETTERS.map((letter, index) => {
              const distanceFromCenter = index - heroCenter;

              return (
                <span
                  key={index}
                  className={styles.heroLetterWrapper}
                  style={{
                    transform: `translate3d(${
                      unfoldProgress * -0.92 + distanceFromCenter * unfoldProgress * 0.06
                    }em, 0, 0)`,
                  }}
                >
                  <span
                    className={styles.heroAnimatedLetter}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {letter}
                  </span>
                </span>
              );
            })}
          </h1>
        </div>

        <div className={styles.heroOverlayContent} />
      </section>

      <section className={styles.listingShell}>
        <div className={styles.filters}>
          <label className={styles.searchBox}>
            <span>Recherche</span>
            <input
              type="search"
              placeholder="Titre, vendeur ou ville"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className={styles.filterGroup} aria-label="Filtrer par catégorie">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={category === cat ? styles.activeFilter : undefined}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.filterGroup} aria-label="Filtrer par mode">
            {MODES.map((item) => (
              <button
                key={item}
                type="button"
                className={mode === item ? styles.activeFilter : undefined}
                onClick={() => setMode(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.resultsHeader}>
          <span>{filteredAds.length} résultat{filteredAds.length > 1 ? "s" : ""}</span>
          <span>Bénin</span>
        </div>

        <div className={styles.grid}>
          {filteredAds.map((ad, index) => (
            <Link
              key={ad.id}
              href={`/annonces/${ad.id}`}
              className={`${styles.card} ${index % 2 === 0 ? styles.darkCard : styles.lightCard}`}
            >
              <div className={styles.imageWrap}>
                <Image src={ad.image} alt={ad.title} fill sizes="(max-width: 900px) 90vw, 25vw" />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <span>{ad.category}</span>
                  <span>{ad.loaPossible ? "Achat / Vente" : "Location"}</span>
                </div>
                <h2>{ad.title}</h2>
                <strong className={styles.price}>{ad.price.toLocaleString("fr-FR")} FCFA / mois</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default function AnnoncesPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Chargement des annonces...</div>}>
      <AnnoncesContent />
    </Suspense>
  );
}
