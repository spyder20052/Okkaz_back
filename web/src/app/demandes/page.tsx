"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice, type Demand } from "@/lib/types";
import SellerShell from "../vendeur/SellerShell";
import styles from "../vendeur/vendeur.module.css";

const DEMAND_ROLES = ["BUYER", "SELLER", "SELLER_PRO", "ADMIN"];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PENDING: "En attente",
  CLOSED: "Fermée",
  EXPIRED: "Expirée",
};

export default function MyDemandsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.getPaginated<Demand>("/demands/me", { page: 1, limit: 50 });
      setDemands(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger vos demandes.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, load]);

  async function closeDemand(id: string) {
    setClosingId(id);
    setError(null);
    try {
      await api.patch(`/demands/${id}/close`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de fermer cette demande.");
    } finally {
      setClosingId(null);
    }
  }

  return (
    <SellerShell active="/demandes" allowedRoles={DEMAND_ROLES}>
      <section className={`${styles.spaceContent} ${styles.demandsContent}`}>
        <header className={styles.demandsHeader}>
          <div className={styles.demandsHeaderIcon} aria-hidden>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/><path d="M8 11h6M11 8v6"/>
            </svg>
          </div>
          <div className={styles.demandsHeaderText}>
            <span className={styles.publishKicker}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              MES RECHERCHES
            </span>
            <h1>Mes demandes</h1>
            <p>Retrouve tes recherches et suis leur état en un coup d&apos;œil.</p>
          </div>
          <Link href="/demandes/nouvelle" className={styles.spaceVendreBtn}>
            Décrire mon besoin
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </header>

        {error && <p className={styles.demandsError} role="alert">{error}</p>}

        {loading || authLoading ? (
          <div className={styles.demandsEmpty}>Chargement de tes demandes...</div>
        ) : demands.length === 0 ? null
        : (
          <div className={styles.demandsGrid}>
            {demands.map((demand) => (
              <article className={styles.demandCard} key={demand.id}>
                <div className={styles.demandCardTop}>
                  <span className={styles.demandType}>{demand.type === "EXPRESS" ? "Express" : "Standard"}</span>
                  <span className={`${styles.demandStatus} ${demand.status === "ACTIVE" ? styles.demandStatusActive : ""}`}>
                    {STATUS_LABELS[demand.status] ?? demand.status}
                  </span>
                </div>
                <h2>{demand.title}</h2>
                <p className={styles.demandDescription}>{demand.description}</p>
                <dl className={styles.demandMeta}>
                  <div><dt>Zone</dt><dd>{demand.city}</dd></div>
                  <div><dt>Créée le</dt><dd>{new Date(demand.createdAt).toLocaleDateString("fr-FR")}</dd></div>
                  {demand.maxBudget != null && <div><dt>Budget max.</dt><dd>{formatPrice(demand.maxBudget)}</dd></div>}
                </dl>
                {demand.status === "ACTIVE" && (
                  <button className={styles.demandCloseBtn} type="button" disabled={closingId === demand.id} onClick={() => void closeDemand(demand.id)}>
                    {closingId === demand.id ? "Fermeture..." : "Fermer la demande"}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </SellerShell>
  );
}
