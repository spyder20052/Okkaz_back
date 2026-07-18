"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import {
  formatPrice,
  type DashboardStats,
  type Payment,
  type PaymentStatus,
} from "@/lib/types";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

type Meta = { page: number; limit: number; total: number; totalPages: number };
type PaymentType = Payment["type"];

const TYPE_LABELS: Record<PaymentType, string> = {
  SUBSCRIPTION: "Abonnement",
  DEMAND_LISTING: "Demande",
  EXPRESS_DEMAND: "Demande express",
};

const TYPE_COLOR: Record<PaymentType, "violet" | "blue" | "orange"> = {
  SUBSCRIPTION: "violet",
  DEMAND_LISTING: "blue",
  EXPRESS_DEMAND: "orange",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "En attente",
  SUCCESS: "Encaissé",
  FAILED: "Échec",
  REFUNDED: "Remboursé",
};

const STATUS_STYLE: Record<PaymentStatus, "ok" | "wait" | "fail"> = {
  SUCCESS: "ok",
  PENDING: "wait",
  FAILED: "fail",
  REFUNDED: "wait",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function exportCsv(payments: Payment[]) {
  const header = ["Reference", "Type", "Utilisateur", "Email", "Methode", "Statut", "Montant", "Devise", "Date"];
  const rows = payments.map((p) => [
    p.id,
    TYPE_LABELS[p.type],
    p.user ? `${p.user.firstName} ${p.user.lastName}` : "",
    p.user?.email ?? "",
    p.method,
    STATUS_LABELS[p.status],
    String(p.amount),
    p.currency,
    p.createdAt,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `paiements-okkaz-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPaiementsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [typeFilter, setTypeFilter] = useState<PaymentType | "">("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [methodFilter, setMethodFilter] = useState<Payment["method"] | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPaginated<Payment>("/admin/payments", {
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        method: methodFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 15,
      });
      setPayments(res.data);
      setMeta(res.meta);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Impossible de charger les paiements.");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, methodFilter, dateFrom, dateTo, page]);

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

  return (
    <AdminShell active="/admin/paiements">
      <section className={styles.spaceContent}>
        <div className={styles.adminPageHeader}>
          <Link href="/admin" className={styles.adminBackBtn} aria-label="Retour au dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <header className={styles.spaceHeader}>
            <h1>Revenus &amp; transactions</h1>
            <p>Toutes les recettes encaissées par OKKAZ — Mobile Money &amp; carte bancaire.</p>
          </header>
        </div>

        <div className={styles.statTilesGrid}>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconGreen}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
            <small>REVENU TOTAL</small>
            <strong>{stats ? (stats.totalRevenue).toLocaleString("fr-FR") : "…"}<em>F</em></strong>
            <p>encaissé sur la plateforme</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconBlue}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </span>
            <small>TRANSACTIONS</small>
            <strong>{stats?.totalTransactions ?? "…"}</strong>
            <p>paiements réussis</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconOrange}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
            <small>EN ATTENTE</small>
            <strong>{payments.filter((p) => p.status === "PENDING").length}</strong>
            <p>sur cette page</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconViolet}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
            <small>RÉSULTATS</small>
            <strong>{meta?.total ?? "…"}</strong>
            <p>pour les filtres actifs</p>
          </div>
        </div>

        <div className={styles.adminFilterBar}>
          <button type="button" className={`${styles.adminFilterPill} ${methodFilter === "" ? styles.adminFilterPillActive : ""}`} onClick={() => { setMethodFilter(""); setPage(1); }}>Toutes méthodes</button>
          <button type="button" className={`${styles.adminFilterPill} ${methodFilter === "MOBILE_MONEY" ? styles.adminFilterPillActive : ""}`} onClick={() => { setMethodFilter("MOBILE_MONEY"); setPage(1); }}>Mobile Money</button>
          <button type="button" className={`${styles.adminFilterPill} ${methodFilter === "CARD" ? styles.adminFilterPillActive : ""}`} onClick={() => { setMethodFilter("CARD"); setPage(1); }}>Carte</button>
          <label>Du <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} /></label>
          <label>Au <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} /></label>
        </div>
        <div className={styles.adminFilterBar}>
          <button
            type="button"
            className={`${styles.adminFilterPill} ${typeFilter === "" ? styles.adminFilterPillActive : ""}`}
            onClick={() => { setTypeFilter(""); setPage(1); }}
          >
            Tous types
          </button>
          {(Object.keys(TYPE_LABELS) as PaymentType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.adminFilterPill} ${typeFilter === t ? styles.adminFilterPillActive : ""}`}
              onClick={() => { setTypeFilter(t); setPage(1); }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
          <button
            type="button"
            className={styles.adminFilterExport}
            onClick={() => exportCsv(payments)}
            disabled={payments.length === 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exporter
          </button>
        </div>
        <div className={styles.adminFilterBar}>
          <button
            type="button"
            className={`${styles.adminFilterPill} ${statusFilter === "" ? styles.adminFilterPillActive : ""}`}
            onClick={() => { setStatusFilter(""); setPage(1); }}
          >
            Tous statuts
          </button>
          {(Object.keys(STATUS_LABELS) as PaymentStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.adminFilterPill} ${statusFilter === s ? styles.adminFilterPillActive : ""}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <h2 className={styles.spaceSectionTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
          {meta?.total ?? 0} transaction{(meta?.total ?? 0) > 1 ? "s" : ""}
        </h2>

        {feedback ? <p className={styles.adminModerationEmpty}>{feedback}</p> : null}

        {loading ? (
          <p className={styles.adminModerationEmpty}>Chargement des paiements...</p>
        ) : payments.length === 0 ? (
          <p className={styles.adminModerationEmpty}>Aucun paiement ne correspond aux filtres.</p>
        ) : (
          <ul className={styles.adminModerationList}>
            {payments.map((t) => (
              <li key={t.id} className={styles.adminModerationItem}>
                <span className={`${styles.adminModerationRef} ${styles[`adminModerationRef_${TYPE_COLOR[t.type] === "violet" ? "blue" : TYPE_COLOR[t.type]}`]}`}>
                  {t.id.slice(0, 8)}
                </span>
                <div>
                  <strong>{t.user ? `${t.user.firstName} ${t.user.lastName}` : "Utilisateur inconnu"}</strong>
                  <p>
                    <em className={`${styles.adminTxService} ${styles[`adminTxService_${TYPE_COLOR[t.type]}`]}`}>{TYPE_LABELS[t.type]}</em>
                    {" · "}{t.method === "MOBILE_MONEY" ? "Mobile Money" : "Carte"}
                    {t.provider ? ` (${t.provider})` : ""} · {formatDate(t.createdAt)}
                  </p>
                </div>
                <div className={styles.adminModerationActions}>
                  <span className={`${styles.adminUserStatus} ${styles[`adminUserStatus_${STATUS_STYLE[t.status]}`]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                  <strong className={styles.adminTxAmount}>{formatPrice(t.amount)}</strong>
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
