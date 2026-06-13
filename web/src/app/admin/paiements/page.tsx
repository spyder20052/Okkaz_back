"use client";

import { useState } from "react";
import Link from "next/link";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

type ServiceKey = "Option Numéro Direct" | "Boost" | "Abonnement";

const SERVICE_COLOR: Record<ServiceKey, "blue" | "orange" | "violet"> = {
  "Option Numéro Direct": "blue",
  "Boost": "orange",
  "Abonnement": "violet",
};

type Transaction = {
  ref: string;
  service: ServiceKey;
  user: string;
  target: string;
  method: string;
  date: string;
  amount: number;
  status: "Encaissé" | "En attente" | "Échec";
};

const transactions: Transaction[] = [
  { ref: "DIR-9981", service: "Option Numéro Direct", user: "Yann A.", target: "Mercedes-Benz Classe G", method: "MTN MoMo", date: "23/05 14:32", amount: 2500, status: "Encaissé" },
  { ref: "DIR-9978", service: "Option Numéro Direct", user: "Carine T.", target: "iPhone 15 Pro Max", method: "Carte Visa", date: "23/05 12:08", amount: 2500, status: "Encaissé" },
  { ref: "BST-204", service: "Boost", user: "Adrien K.", target: "Generatrice 5 kVA", method: "Moov Money", date: "23/05 11:22", amount: 5000, status: "Encaissé" },
  { ref: "DIR-9974", service: "Option Numéro Direct", user: "Saliou D.", target: "Studio Fidjrosse", method: "MTN MoMo", date: "23/05 09:47", amount: 2500, status: "Encaissé" },
  { ref: "ABO-127", service: "Abonnement", user: "Immo Bénin", target: "Mensuel mai 2026", method: "Carte Visa", date: "22/05 18:12", amount: 10000, status: "Encaissé" },
  { ref: "BST-088", service: "Boost", user: "Lara D.", target: "Bureau Akpakpa", method: "MTN MoMo", date: "22/05 16:40", amount: 5000, status: "Encaissé" },
  { ref: "DIR-9962", service: "Option Numéro Direct", user: "Patrice N.", target: "Camionnette 3T", method: "Moov Money", date: "22/05 11:03", amount: 2500, status: "En attente" },
  { ref: "DIR-9951", service: "Option Numéro Direct", user: "Mireille O.", target: "Climatiseur split", method: "Carte Visa", date: "21/05 13:18", amount: 2500, status: "Échec" },
];

type Filter = "all" | "direct" | "boost" | "abo";

const FILTER_LABEL: Record<Filter, string> = {
  all: "Toutes",
  direct: "Option Numéro Direct",
  boost: "Boost",
  abo: "Abonnements",
};

export default function AdminPaiementsPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const matched = (t: Transaction) => {
    if (filter === "all") return true;
    if (filter === "direct") return t.service === "Option Numéro Direct";
    if (filter === "boost") return t.service === "Boost";
    if (filter === "abo") return t.service === "Abonnement";
    return true;
  };

  const filtered = transactions.filter(matched);
  const ok = transactions.filter((t) => t.status === "Encaissé");
  const totalRevenue = ok.reduce((s, t) => s + t.amount, 0);
  const counts = {
    direct: ok.filter((t) => t.service === "Option Numéro Direct").length,
    boost: ok.filter((t) => t.service === "Boost").length,
    abo: ok.filter((t) => t.service === "Abonnement").length,
  };

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
            <small>REVENU</small>
            <strong>{totalRevenue.toLocaleString("fr-FR")}<em>F</em></strong>
            <p>30 derniers jours</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconBlue}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </span>
            <small>NUMÉRO DIRECT</small>
            <strong>{counts.direct}</strong>
            <p>2 500 FCFA / option</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconOrange}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </span>
            <small>BOOSTS</small>
            <strong>{counts.boost}</strong>
            <p>5 000 FCFA / boost</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconViolet}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
            <small>PREMIUM</small>
            <strong>{counts.abo}</strong>
            <p>abonnements actifs</p>
          </div>
        </div>

        <div className={styles.adminFilterBar}>
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.adminFilterPill} ${filter === f ? styles.adminFilterPillActive : ""}`}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
          <button type="button" className={styles.adminFilterExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exporter
          </button>
        </div>

        <h2 className={styles.spaceSectionTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
          {filtered.length} transaction{filtered.length > 1 ? "s" : ""}
        </h2>

        <ul className={styles.adminModerationList}>
          {filtered.map((t) => (
            <li key={t.ref} className={styles.adminModerationItem}>
              <span className={`${styles.adminModerationRef} ${styles[`adminModerationRef_${SERVICE_COLOR[t.service]}`]}`}>{t.ref}</span>
              <div>
                <strong>{t.user}</strong>
                <p>
                  <em className={`${styles.adminTxService} ${styles[`adminTxService_${SERVICE_COLOR[t.service]}`]}`}>{t.service}</em>
                  {" · "}{t.target} · {t.method} · {t.date}
                </p>
              </div>
              <div className={styles.adminModerationActions}>
                <span className={`${styles.adminUserStatus} ${styles[`adminUserStatus_${t.status === "Encaissé" ? "ok" : t.status === "En attente" ? "wait" : "fail"}`]}`}>
                  {t.status}
                </span>
                <strong className={styles.adminTxAmount}>{t.amount.toLocaleString("fr-FR")} F</strong>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
