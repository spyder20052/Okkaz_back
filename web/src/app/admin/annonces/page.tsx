"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { mockAds } from "@/lib/data";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

type AdRow = (typeof mockAds)[number] & { delay?: string };
type Filter = "all" | "urgent" | "recent";

const INITIAL: AdRow[] = mockAds.slice(0, 6).map((ad, i) => ({
  ...ad,
  delay: ["6h", "14h", "22h", "1j", "2j (urgent)", "3j (urgent)"][i],
}));

export default function AdminAnnoncesPage() {
  const [pending, setPending] = useState<AdRow[]>(INITIAL);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const stats = {
    pending: pending.length,
    urgent: pending.filter((a) => a.delay?.includes("urgent")).length,
    today: 12,
    rejected: 3,
  };

  const approve = (id: string) => setPending((p) => p.filter((a) => a.id !== id));
  const reject = (id: string) => setPending((p) => p.filter((a) => a.id !== id));
  const normalizedQuery = query.trim().toLowerCase();
  const visibleAds = pending.filter((ad) => {
    const matchesQuery = !normalizedQuery || [ad.title, ad.category, ad.location, ad.reference]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
    const matchesFilter =
      filter === "all" ||
      (filter === "urgent" && ad.delay?.includes("urgent")) ||
      (filter === "recent" && ["6h", "14h", "22h"].includes(ad.delay ?? ""));

    return matchesQuery && matchesFilter;
  });

  return (
    <AdminShell active="/admin/annonces">
      <section className={styles.content}>
        <div className={styles.adminPageHeader}>
          <Link href="/admin" className={styles.adminBackBtn} aria-label="Retour au dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <header className={styles.pageHeaderTitle}>
            <h1>Validation annonces</h1>
            <p>File de modération avant publication. Délai cible : sous 72h.</p>
          </header>
          <Link href="/annonces" className={styles.headerCta}>
            Voir le public
          </Link>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.icon}>A</span>
            <h2>En attente</h2>
            <p>Annonces à valider</p>
            <strong>{stats.pending}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.icon}>!</span>
            <h2>Urgentes</h2>
            <p>Dépassent 48h</p>
            <strong>{stats.urgent}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.icon}>V</span>
            <h2>Validées</h2>
            <p>Aujourd&apos;hui</p>
            <strong>{stats.today}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.icon}>R</span>
            <h2>Refusées</h2>
            <p>Cette semaine</p>
            <strong>{stats.rejected}</strong>
          </div>
        </div>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <div>
              <h2>File de validation <span className={styles.adminModerationCount}>{visibleAds.length}</span></h2>
              <p>Recherchez, priorisez puis validez les annonces prêtes à publier.</p>
            </div>
          </header>

          <div className={styles.adminFilterBar}>
            <label className={styles.adminSearchInline}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Titre, catégorie, ville, référence..."
              />
            </label>
            <button type="button" className={`${styles.adminFilterPill} ${filter === "all" ? styles.adminFilterPillActive : ""}`} onClick={() => setFilter("all")}>
              Toutes
            </button>
            <button type="button" className={`${styles.adminFilterPill} ${filter === "urgent" ? styles.adminFilterPillActive : ""}`} onClick={() => setFilter("urgent")}>
              Urgentes
            </button>
            <button type="button" className={`${styles.adminFilterPill} ${filter === "recent" ? styles.adminFilterPillActive : ""}`} onClick={() => setFilter("recent")}>
              Récentes
            </button>
          </div>

          {visibleAds.length === 0 ? (
            <p className={styles.adminModerationEmpty}>Aucune annonce ne correspond aux filtres.</p>
          ) : (
            <ul className={styles.adminAdsList}>
              {visibleAds.map((ad) => (
                <li key={ad.id} className={styles.adminAdItem}>
                  <Image src={ad.image} alt={ad.title} width={84} height={84} className={styles.adminAdItemImg} />
                  <div className={styles.adminAdMain}>
                    <div className={styles.adminAdTitleRow}>
                      <strong>{ad.title}</strong>
                      <span className={`${styles.adminAdDelay} ${ad.delay?.includes("urgent") ? styles.adminAdDelay_urgent : ""}`}>
                        {ad.delay?.includes("urgent") ? "Urgent" : "En attente"}
                      </span>
                    </div>
                    <p>{ad.category} · {ad.location} · {ad.reference}</p>
                    <div className={styles.adminAdMetaGrid}>
                      <span>
                        <small>Prix</small>
                        {ad.price.toLocaleString("fr-FR")} FCFA
                      </span>
                      <span>
                        <small>Soumission</small>
                        Il y a {ad.delay}
                      </span>
                      <span>
                        <small>Mode</small>
                        {ad.loaPossible ? "Achat / Vente" : "Location"}
                      </span>
                    </div>
                  </div>
                  <div className={styles.adminModerationActions}>
                    <Link href={`/annonces/${ad.id}?from=admin-annonces`} className={styles.adminActionSecondary}>Voir</Link>
                    <button type="button" className={`${styles.adminActionPrimary} ${styles.adminActionPrimary_blue}`} onClick={() => approve(ad.id)}>
                      Valider
                    </button>
                    <button type="button" className={`${styles.adminActionPrimary} ${styles.adminActionPrimary_red}`} onClick={() => reject(ad.id)}>
                      Refuser
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </AdminShell>
  );
}
