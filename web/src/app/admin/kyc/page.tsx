"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, mediaUrl, readAuth } from "@/lib/api";
import type { KycDocument, KycDocumentType } from "@/lib/types";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

type KycFilter = "PENDING" | "APPROVED" | "REJECTED";
type Meta = { page: number; limit: number; total: number; totalPages: number };

const FILTER_LABELS: Record<KycFilter, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvés",
  REJECTED: "Rejetés",
};

const DOC_LABELS: Record<KycDocumentType, string> = {
  ID_CARD: "CNI",
  PASSPORT: "Passeport",
  DRIVER_LICENSE: "Permis de conduire",
};

function submittedAgo(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "moins d'1h";
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

export default function AdminKycPage() {
  const [docs, setDocs] = useState<KycDocument[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [filter, setFilter] = useState<KycFilter>("PENDING");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPaginated<KycDocument>("/kyc/admin/list", {
        status: filter,
        page,
        limit: 10,
      });
      setDocs(res.data);
      setMeta(res.meta);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Impossible de charger les dossiers KYC.");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const removeDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setMeta((prev) => (prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev));
  };

  const approve = async (doc: KycDocument) => {
    setActingId(doc.id);
    setFeedback(null);
    try {
      await api.patch(`/kyc/admin/${doc.id}/approve`);
      removeDoc(doc.id);
      setFeedback(`Dossier de ${doc.user?.firstName ?? ""} ${doc.user?.lastName ?? ""} approuvé.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors de l'approbation.");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (doc: KycDocument) => {
    const reason = prompt(
      `Motif du rejet du dossier de ${doc.user?.firstName ?? ""} ${doc.user?.lastName ?? ""} (5 caractères minimum) :`,
    );
    if (reason === null) return;
    if (reason.trim().length < 5) {
      setFeedback("Le motif de rejet doit contenir au moins 5 caractères.");
      return;
    }
    setActingId(doc.id);
    setFeedback(null);
    try {
      await api.patch(`/kyc/admin/${doc.id}/reject`, { rejectionReason: reason.trim() });
      removeDoc(doc.id);
      setFeedback(`Dossier de ${doc.user?.firstName ?? ""} ${doc.user?.lastName ?? ""} rejeté.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors du rejet.");
    } finally {
      setActingId(null);
    }
  };

  // Les pièces KYC stockées en base (/files/...) sont privées : le serveur
  // exige le token admin. On les télécharge donc avec l'en-tête d'auth puis
  // on ouvre le blob ; les anciennes URLs publiques s'ouvrent directement.
  const openAuthenticated = async (url: string) => {
    const absolute = mediaUrl(url);
    if (!url.startsWith("/files/")) {
      window.open(absolute, "_blank", "noopener");
      return;
    }
    try {
      const stored = readAuth();
      const res = await fetch(absolute, {
        headers: stored?.tokens?.accessToken
          ? { Authorization: `Bearer ${stored.tokens.accessToken}` }
          : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank", "noopener");
    } catch {
      setFeedback("Impossible d'ouvrir la pièce (session expirée ? rechargez la page).");
    }
  };

  const viewDocument = (doc: KycDocument) => {
    void openAuthenticated(doc.frontUrl);
    if (doc.backUrl) {
      void openAuthenticated(doc.backUrl);
    }
  };

  return (
    <AdminShell active="/admin/kyc">
      <section className={styles.spaceContent}>
        <div className={styles.adminPageHeader}>
          <Link href="/admin" className={styles.adminBackBtn} aria-label="Retour au dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <header className={styles.spaceHeader}>
            <h1>Vérification identité</h1>
            <p>Approuvez les pièces d&apos;identité avant publication. Délai cible : 24h.</p>
          </header>
        </div>

        <div className={styles.statTilesGrid}>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconOrange}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
            <small>{FILTER_LABELS[filter].toUpperCase()}</small>
            <strong>{meta?.total ?? "…"}</strong>
            <p>dossiers dans ce filtre</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconBlue}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
            </span>
            <small>PAGE COURANTE</small>
            <strong>{docs.length}</strong>
            <p>dossiers affichés</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconViolet}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M14 10h4M14 14h4M5 18h14"/></svg>
            </span>
            <small>RECTO + VERSO</small>
            <strong>{docs.filter((d) => d.backUrl).length}</strong>
            <p>pièces complètes</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconGreen}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <small>PAGES</small>
            <strong>{meta?.totalPages ?? "…"}</strong>
            <p>de résultats</p>
          </div>
        </div>

        <div className={styles.adminFilterBar}>
          {(Object.keys(FILTER_LABELS) as KycFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.adminFilterPill} ${filter === f ? styles.adminFilterPillActive : ""}`}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        <h2 className={styles.spaceSectionTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M14 10h4M14 14h4M5 18h14"/></svg>
          Pièces {FILTER_LABELS[filter].toLowerCase()} <span className={styles.adminModerationCount}>{meta?.total ?? 0}</span>
        </h2>

        {feedback ? <p className={styles.adminModerationEmpty}>{feedback}</p> : null}

        {loading ? (
          <p className={styles.adminModerationEmpty}>Chargement des dossiers...</p>
        ) : docs.length === 0 ? (
          <p className={styles.adminModerationEmpty}>Aucun dossier {FILTER_LABELS[filter].toLowerCase()}.</p>
        ) : (
          <ul className={styles.adminModerationList}>
            {docs.map((doc) => (
              <li key={doc.id} className={styles.adminModerationItem}>
                <span className={`${styles.adminModerationRef} ${styles.adminModerationRef_blue}`}>
                  {DOC_LABELS[doc.documentType]}
                </span>
                <div>
                  <strong>
                    {doc.user ? `${doc.user.firstName} ${doc.user.lastName}` : "Utilisateur inconnu"}
                  </strong>
                  <p>
                    {doc.user?.email ?? "email inconnu"} · {DOC_LABELS[doc.documentType]} · soumis {submittedAgo(doc.createdAt)}
                    {doc.rejectionReason ? ` · Motif : ${doc.rejectionReason}` : ""}
                  </p>
                </div>
                <div className={styles.adminModerationActions}>
                  <button type="button" className={styles.adminActionSecondary} onClick={() => viewDocument(doc)}>
                    Voir pièce{doc.backUrl ? "s" : ""}
                  </button>
                  {doc.status !== "APPROVED" ? (
                    <button
                      type="button"
                      className={`${styles.adminActionPrimary} ${styles.adminActionPrimary_blue}`}
                      disabled={actingId === doc.id}
                      onClick={() => void approve(doc)}
                    >
                      Approuver
                    </button>
                  ) : null}
                  {doc.status !== "REJECTED" ? (
                    <button
                      type="button"
                      className={`${styles.adminActionPrimary} ${styles.adminActionPrimary_red}`}
                      disabled={actingId === doc.id}
                      onClick={() => void reject(doc)}
                    >
                      Rejeter
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
    </AdminShell>
  );
}
