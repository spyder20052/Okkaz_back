"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHeroUnfold } from "@/hooks/useHeroUnfold";
import { api, mediaUrl } from "@/lib/api";
import {
  formatPrice,
  RENTAL_PERIOD_LABELS,
  type Category,
  type Listing,
} from "@/lib/types";
import styles from "./annonces.module.css";

const SORTS = [
  { value: "recent", label: "Récentes" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "featured", label: "En vedette" },
] as const;

const PAGE_SIZE = 12;
const HERO_LETTERS = ["b", "i", "e", "n", "s"];
const VISIBLE_CATEGORY_SLUGS = new Set(["automobiles", "electromenager", "electronique"]);

function coverUrl(listing: Listing): string {
  const photos = listing.photos ?? [];
  const cover = photos.find((photo) => photo.isCover) ?? photos[0];
  return mediaUrl(cover?.url);
}

function AnnoncesContent() {
  const searchParams = useSearchParams();
  const unfoldProgress = useHeroUnfold();

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [loaOnly, setLoaOnly] = useState(false);
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("recent");
  const [page, setPage] = useState(1);

  // Données
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categorySlugParam = searchParams.get("category") ?? "";

  // Chargement des catégories (une fois) + mapping du slug ?category= vers un id
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ categories: Category[] }>("/categories", undefined, false)
      .then((res) => {
        if (cancelled) return;
        setCategories(res.data.categories);
        if (categorySlugParam && VISIBLE_CATEGORY_SLUGS.has(categorySlugParam)) {
          const match = res.data.categories.find((cat) => cat.slug === categorySlugParam);
          if (match) setCategoryId(match.id);
        }
      })
      .catch(() => {
        // Les chips de catégories restent vides, la liste fonctionne quand même.
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlugParam]);

  // Recherche débouncée pour éviter un appel par frappe
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Chargement des annonces
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
    });
    api
      .getPaginated<Listing>(
        "/listings",
        {
          q: debouncedSearch.slice(0, 100) || undefined,
          categoryId: categoryId || undefined,
          isLoa: loaOnly ? true : undefined,
          city: city.trim() || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          sort,
          page,
          limit: PAGE_SIZE,
        },
        false,
      )
      .then((res) => {
        if (cancelled) return;
        setListings(res.data);
        setMeta(res.meta);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Impossible de charger les annonces. Vérifiez que le serveur est démarré.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, categoryId, loaOnly, city, minPrice, maxPrice, sort, page]);

  const heroCenter = (HERO_LETTERS.length - 1) / 2;
  const categoryChips = useMemo(
    () => categories
      .filter((cat) => VISIBLE_CATEGORY_SLUGS.has(cat.slug))
      .map((cat) => ({ id: cat.id, name: cat.name })),
    [categories],
  );
  const otherCategories = useMemo(
    () => categories.filter((cat) => !VISIBLE_CATEGORY_SLUGS.has(cat.slug)),
    [categories],
  );

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
              placeholder="Titre ou description"
              value={searchTerm}
              maxLength={100}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <div className={styles.filterGroup} aria-label="Filtrer par catégorie">
            <details className={styles.filterDropdown}>
              <summary
                className={categoryId === "" ? styles.activeFilter : undefined}
                onClick={() => {
                  setCategoryId("");
                  setPage(1);
                }}
              >
                Toutes
              </summary>
              <div className={`${styles.filterDropdownPanel} ${styles.categoryDropdownPanel}`}>
                <button
                  type="button"
                  className={categoryId === "" ? styles.activeFilter : undefined}
                  onClick={(event) => {
                    setCategoryId("");
                    setPage(1);
                    event.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                >
                  Toutes les catégories
                </button>
                {otherCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={categoryId === cat.id ? styles.activeFilter : undefined}
                    onClick={(event) => {
                      setCategoryId(cat.id);
                      setPage(1);
                      event.currentTarget.closest("details")?.removeAttribute("open");
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </details>
            {categoryChips.map((cat) => (
              <button
                key={cat.id || "all"}
                type="button"
                className={categoryId === cat.id ? styles.activeFilter : undefined}
                onClick={() => {
                  setCategoryId(cat.id);
                  setPage(1);
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className={`${styles.filterGroup} ${styles.filterActions}`} aria-label="Filtrer et trier">
            <details className={styles.filterDropdown}>
              <summary>
                Ville &amp; prix
                {(city || minPrice || maxPrice) && <span className={styles.filterCount}>●</span>}
              </summary>
              <div className={styles.filterDropdownPanel}>
                <label className={styles.filterField}>
                  <span>Ville</span>
                  <input
                    type="text"
                    placeholder="Ex. Cotonou"
                    value={city}
                    onChange={(event) => { setCity(event.target.value); setPage(1); }}
                  />
                </label>
                <div className={styles.priceFields}>
                  <label className={styles.filterField}>
                    <span>Prix minimum</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 FCFA"
                      value={minPrice}
                      onChange={(event) => { setMinPrice(event.target.value); setPage(1); }}
                    />
                  </label>
                  <label className={styles.filterField}>
                    <span>Prix maximum</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Sans limite"
                      value={maxPrice}
                      onChange={(event) => { setMaxPrice(event.target.value); setPage(1); }}
                    />
                  </label>
                </div>
              </div>
            </details>
            <button
              type="button"
              className={loaOnly ? styles.activeFilter : undefined}
              onClick={() => {
                setLoaOnly((current) => !current);
                setPage(1);
              }}
            >
              Achat / Vente (LOA)
            </button>
            <details className={`${styles.filterDropdown} ${styles.sortDropdown}`}>
              <summary>
                Trier : {SORTS.find((item) => item.value === sort)?.label ?? "Récentes"}
              </summary>
              <div className={`${styles.filterDropdownPanel} ${styles.sortOptions}`}>
                {SORTS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={sort === item.value ? styles.activeSort : undefined}
                    onClick={(event) => {
                      setSort(item.value);
                      setPage(1);
                      event.currentTarget.closest("details")?.removeAttribute("open");
                    }}
                  >
                    <span>{item.label}</span>
                    {sort === item.value && <span aria-hidden>✓</span>}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>

        <div className={styles.resultsHeader}>
          <span>
            {isLoading
              ? "Chargement…"
              : `${meta.total} résultat${meta.total > 1 ? "s" : ""}`}
          </span>
          <span>Bénin</span>
        </div>

        {error && <p className={styles.stateMessage}>{error}</p>}
        {!error && !isLoading && listings.length === 0 && (
          <p className={styles.stateMessage}>Aucune annonce ne correspond à votre recherche.</p>
        )}

        <div className={styles.grid}>
          {listings.map((listing, index) => (
            <Link
              key={listing.id}
              href={`/annonces/${listing.id}`}
              className={`${styles.card} ${index % 2 === 0 ? styles.darkCard : styles.lightCard}`}
            >
              <div className={styles.imageWrap}>
                <Image
                  src={coverUrl(listing)}
                  alt={listing.title}
                  fill
                  sizes="(max-width: 900px) 90vw, 25vw"
                />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <span>{listing.category?.name ?? "Annonce"}</span>
                  <span>{listing.isLoa ? "Achat / Vente" : "Location"}</span>
                </div>
                <h2>{listing.title}</h2>
                <strong className={styles.price}>
                  {formatPrice(listing.rentalPrice)} / {RENTAL_PERIOD_LABELS[listing.rentalPeriod]}
                </strong>
              </div>
            </Link>
          ))}
        </div>

        {meta.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ← Précédente
            </button>
            <span>
              Page {meta.page} / {meta.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= meta.totalPages || isLoading}
              onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
            >
              Suivante →
            </button>
          </div>
        )}
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
