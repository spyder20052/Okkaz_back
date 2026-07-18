"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError, mediaUrl } from "@/lib/api";
import {
  formatPrice,
  LISTING_STATUS_LABELS,
  RENTAL_PERIOD_LABELS,
  type DashboardStats,
  type Listing,
  type ListingStatus,
} from "@/lib/types";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

type Meta = { page: number; limit: number; total: number; totalPages: number };

const STATUS_FILTERS: ListingStatus[] = ["PENDING", "ACTIVE", "REJECTED", "PAUSED"];
const PAGE_SIZE = 10;

function submittedAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "moins d'1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}j`;
}

export default function AdminAnnoncesPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [status, setStatus] = useState<ListingStatus>("PENDING");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPaginated<Listing>("/admin/listings", {
        status,
        page,
        limit: PAGE_SIZE,
      });
      setListings(res.data);
      setMeta(res.meta);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Impossible de charger les annonces.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    api
      .get<DashboardStats>("/admin/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch(() => undefined);
  }, []);

  const removeFromList = (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
    setMeta((prev) => (prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev));
  };

  const approve = async (listing: Listing) => {
    setActingId(listing.id);
    setFeedback(null);
    try {
      await api.patch(`/admin/listings/${listing.id}/validate`);
      removeFromList(listing.id);
      setFeedback(`Annonce "${listing.title}" validée et publiée.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors de la validation.");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (listing: Listing) => {
    const reason = prompt(`Motif du rejet de "${listing.title}" (3 caractères minimum) :`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setFeedback("Le motif de rejet doit contenir au moins 3 caractères.");
      return;
    }
    setActingId(listing.id);
    setFeedback(null);
    try {
      await api.patch(`/admin/listings/${listing.id}/reject`, { rejectionReason: reason.trim() });
      removeFromList(listing.id);
      setFeedback(`Annonce "${listing.title}" rejetée.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors du rejet.");
    } finally {
      setActingId(null);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visibleAds = listings.filter((ad) => {
    if (!normalizedQuery) return true;
    return [ad.title, ad.category?.name ?? "", ad.locationCity, ad.owner?.firstName ?? "", ad.owner?.lastName ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
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
            <strong>{stats?.pendingListingsCount ?? "…"}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.icon}>V</span>
            <h2>Actives</h2>
            <p>Annonces publiées</p>
            <strong>{stats?.totalActiveListings ?? "…"}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.icon}>T</span>
            <h2>Total</h2>
            <p>Annonces sur la plateforme</p>
            <strong>{stats?.totalListings ?? "…"}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.icon}>F</span>
            <h2>Filtre actuel</h2>
            <p>{LISTING_STATUS_LABELS[status]}</p>
            <strong>{meta?.total ?? "…"}</strong>
          </div>
        </div>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <div>
              <h2>File de validation <span className={styles.adminModerationCount}>{meta?.total ?? 0}</span></h2>
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
                placeholder="Titre, catégorie, ville, vendeur..."
              />
            </label>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                className={`${styles.adminFilterPill} ${status === s ? styles.adminFilterPillActive : ""}`}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
              >
                {LISTING_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {feedback ? <p className={styles.adminModerationEmpty}>{feedback}</p> : null}

          {loading ? (
            <p className={styles.adminModerationEmpty}>Chargement des annonces...</p>
          ) : visibleAds.length === 0 ? (
            <p className={styles.adminModerationEmpty}>Aucune annonce ne correspond aux filtres.</p>
          ) : (
            <ul className={styles.adminAdsList}>
              {visibleAds.map((ad) => (
                <li key={ad.id} className={styles.adminAdItem}>
                  <Image
                    src={mediaUrl(ad.photos?.[0]?.url)}
                    alt={ad.title}
                    width={84}
                    height={84}
                    className={styles.adminAdItemImg}
                    unoptimized
                  />
                  <div className={styles.adminAdMain}>
                    <div className={styles.adminAdTitleRow}>
                      <strong>{ad.title}</strong>
                      <span className={`${styles.adminAdDelay} ${ad.isUrgent ? styles.adminAdDelay_urgent : ""}`}>
                        {ad.isUrgent ? "Urgent" : LISTING_STATUS_LABELS[ad.status]}
                      </span>
                    </div>
                    <p>
                      {ad.category?.name ?? "Sans catégorie"} · {ad.locationCity}
                      {ad.owner ? ` · ${ad.owner.firstName} ${ad.owner.lastName}` : ""}
                    </p>
                    <div className={styles.adminAdMetaGrid}>
                      <span>
                        <small>Prix</small>
                        {formatPrice(ad.rentalPrice)} / {RENTAL_PERIOD_LABELS[ad.rentalPeriod]}
                      </span>
                      <span>
                        <small>Soumission</small>
                        Il y a {submittedAgo(ad.createdAt)}
                      </span>
                      <span>
                        <small>Mode</small>
                        {ad.purchasePrice ? "Location / Achat" : "Location"}
                      </span>
                    </div>
                  </div>
                  <div className={styles.adminModerationActions}>
                    <Link href={`/annonces/${ad.id}?from=admin-annonces`} className={styles.adminActionSecondary}>Voir</Link>
                    {ad.status !== "ACTIVE" ? (
                      <button
                        type="button"
                        className={`${styles.adminActionPrimary} ${styles.adminActionPrimary_blue}`}
                        disabled={actingId === ad.id}
                        onClick={() => void approve(ad)}
                      >
                        Valider
                      </button>
                    ) : null}
                    {ad.status !== "REJECTED" ? (
                      <button
                        type="button"
                        className={`${styles.adminActionPrimary} ${styles.adminActionPrimary_red}`}
                        disabled={actingId === ad.id}
                        onClick={() => void reject(ad)}
                      >
                        Refuser
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {meta && meta.totalPages > 1 ? (
            <div className={styles.buttonRow} style={{ marginTop: 16 }}>
              <button
                type="button"
                className={styles.adminActionSecondary}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Page précédente
              </button>
              <span style={{ alignSelf: "center", fontWeight: 800, fontSize: "0.82rem" }}>
                Page {meta.page} / {meta.totalPages}
              </span>
              <button
                type="button"
                className={styles.adminActionSecondary}
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Page suivante
              </button>
            </div>
          ) : null}
        </section>
      </section>
    </AdminShell>
  );
}
