"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Report, ReportReason } from "@/lib/types";
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

        <p
          style={{
            margin: "12px 0",
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(234, 179, 8, 0.12)",
            color: "#92400e",
            fontWeight: 700,
            fontSize: "0.84rem",
          }}
        >
          Note : la modération des AVIS (PATCH /reviews/:id/moderate, DELETE /reviews/:id)
          existe côté backend mais n&apos;a pas encore d&apos;interface ici.
        </p>

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
      </section>
    </AdminShell>
  );
}
