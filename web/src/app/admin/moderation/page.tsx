"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Report, ReportReason, Review } from "@/lib/types";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

type ReportStatus = "OPEN" | "REVIEWED" | "CLOSED";
type Meta = { page: number; limit: number; total: number; totalPages: number };

const STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: "Ouverts",
  REVIEWED: "Examinés",
  CLOSED: "Clos",
};

const REASON_LABELS: Record<ReportReason, string> = {
  FRAUD: "Fraude",
  WRONG_INFO: "Infos erronées",
  INAPPROPRIATE: "Inapproprié",
  NO_RESPONSE: "Sans réponse",
  OTHER: "Autre",
};

export default function AdminModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [filter, setFilter] = useState<ReportStatus>("OPEN");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsFeedback, setReviewsFeedback] = useState<string | null>(null);
  const [reviewListingId, setReviewListingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPaginated<Report>("/reports/admin/list", {
        status: filter,
        page,
        limit: 10,
      });
      setReports(res.data);
      setMeta(res.meta);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Impossible de charger les signalements.");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const loadReviewsForListing = async (selectedListingId?: string) => {
    const listingId = (selectedListingId ?? reviewListingId).trim();
    if (!listingId) {
      setReviewsFeedback("Saisissez l’identifiant complet d’une annonce.");
      return;
    }
    setReviewListingId(listingId);
    setReviewsLoading(true);
    setReviewsFeedback(null);
    try {
      const res = await api.get<{ reviews: Review[] }>(`/reviews/listing/${encodeURIComponent(listingId)}`);
      setReviews(res.data.reviews);
      if (res.data.reviews.length === 0) setReviewsFeedback("Cette annonce ne contient aucun avis visible.");
    } catch (err) {
      setReviews([]);
      setReviewsFeedback(err instanceof ApiError ? err.message : "Impossible de charger les avis.");
    } finally {
      setReviewsLoading(false);
    }
  };

  const moderateReview = async (review: Review) => {
    setActingId(review.id); setReviewsFeedback(null);
    try {
      await api.patch(`/reviews/${review.id}/moderate`, { isModerated: !review.isModerated });
      setReviews((items) => items.map((item) => item.id === review.id ? { ...item, isModerated: !item.isModerated } : item));
    } catch (err) { setReviewsFeedback(err instanceof ApiError ? err.message : "Modération impossible."); }
    finally { setActingId(null); }
  };

  const deleteReview = async (review: Review) => {
    if (!confirm("Supprimer définitivement cet avis ?")) return;
    setActingId(review.id); setReviewsFeedback(null);
    try {
      await api.delete(`/reviews/${review.id}`);
      setReviews((items) => items.filter((item) => item.id !== review.id));
    } catch (err) { setReviewsFeedback(err instanceof ApiError ? err.message : "Suppression impossible."); }
    finally { setActingId(null); }
  };

  const review = async (report: Report, status: "REVIEWED" | "CLOSED") => {
    let adminNote: string | undefined;
    if (status === "REVIEWED") {
      const note = prompt("Note admin (optionnelle) :");
      if (note === null) return;
      adminNote = note.trim() || undefined;
    }
    setActingId(report.id);
    setFeedback(null);
    try {
      await api.patch(`/reports/admin/${report.id}/review`, { status, adminNote });
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      setMeta((prev) => (prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev));
      setFeedback(status === "REVIEWED" ? "Signalement marqué comme examiné." : "Signalement clos.");
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors du traitement.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <AdminShell active="/admin/moderation">
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>Moderation</h1>
            <p>Traitement des signalements : annonces, utilisateurs et contenus.</p>
          </div>
          <div className={styles.avatar}>M</div>
        </header>

        <div className={styles.adminFilterBar}>
          {(Object.keys(STATUS_LABELS) as ReportStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.adminFilterPill} ${filter === s ? styles.adminFilterPillActive : ""}`}
              onClick={() => {
                setFilter(s);
                setPage(1);
              }}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {feedback ? <p className={styles.adminModerationEmpty}>{feedback}</p> : null}

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>
              Signalements {STATUS_LABELS[filter].toLowerCase()}{" "}
              <span className={styles.adminModerationCount}>{meta?.total ?? 0}</span>
            </h2>
          </div>
          {loading ? (
            <p className={styles.adminModerationEmpty}>Chargement des signalements...</p>
          ) : reports.length === 0 ? (
            <p className={styles.adminModerationEmpty}>Aucun signalement {STATUS_LABELS[filter].toLowerCase()}.</p>
          ) : (
            <div className={styles.actionList}>
              {reports.map((report) => (
                <div className={styles.actionItem} key={report.id}>
                  <span>{REASON_LABELS[report.reason]}</span>
                  <div>
                    <strong>
                      {report.listing
                        ? `Annonce : ${report.listing.title}`
                        : report.reportedUser
                          ? `Utilisateur : ${report.reportedUser.firstName} ${report.reportedUser.lastName}`
                          : "Cible inconnue"}
                    </strong>
                    <p>
                      Signalé par{" "}
                      {report.reporter
                        ? `${report.reporter.firstName} ${report.reporter.lastName}`
                        : "inconnu"}{" "}
                      le {new Date(report.createdAt).toLocaleDateString("fr-FR")}
                      {report.description ? ` — ${report.description}` : ""}
                      {report.adminNote ? ` — Note admin : ${report.adminNote}` : ""}
                    </p>
                  </div>
                  {filter !== "CLOSED" ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      {report.listing ? (
                        <button
                          type="button"
                          disabled={reviewsLoading}
                          onClick={() => void loadReviewsForListing(report.listing?.id)}
                        >
                          Voir les avis
                        </button>
                      ) : null}
                      {filter === "OPEN" ? (
                        <button
                          type="button"
                          disabled={actingId === report.id}
                          onClick={() => void review(report, "REVIEWED")}
                        >
                          Examiner
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={actingId === report.id}
                        onClick={() => void review(report, "CLOSED")}
                      >
                        Clore
                      </button>
                    </div>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
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
        </article>
        <article className={styles.card}>
          <div className={styles.cardHeader}><div><h2>Modération des avis</h2><p>Recherchez les avis à partir de l’identifiant d’une annonce.</p></div></div>
          <div className={styles.adminFilterBar}>
            <label className={styles.adminSearchInline}>
              <input
                type="text"
                value={reviewListingId}
                onChange={(event) => setReviewListingId(event.target.value)}
                placeholder="Identifiant complet de l’annonce"
              />
            </label>
            <button type="button" className={styles.adminFilterPill} onClick={() => void loadReviewsForListing()}>
              Charger les avis
            </button>
          </div>
          {reviewsFeedback && <p className={styles.adminModerationEmpty}>{reviewsFeedback}</p>}
          {reviewsLoading ? <p className={styles.adminModerationEmpty}>Chargement des avis…</p> :
            reviews.length === 0 ? <p className={styles.adminModerationEmpty}>Saisissez une annonce pour afficher ses avis.</p> :
            <div className={styles.actionList}>{reviews.map((review) => <div className={styles.actionItem} key={review.id}>
              <span>{review.rating}/5</span>
              <div><strong>{review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : "Utilisateur"}</strong><p>{review.comment || "Sans commentaire"} · {review.isModerated ? "Masqué" : "Visible"}</p></div>
              <div style={{ display: "grid", gap: 6 }}>
                <button disabled={actingId === review.id} onClick={() => void moderateReview(review)}>{review.isModerated ? "Rendre visible" : "Masquer"}</button>
                <button disabled={actingId === review.id} onClick={() => void deleteReview(review)}>Supprimer</button>
              </div>
            </div>)}</div>}
        </article>
      </section>
    </AdminShell>
  );
}
