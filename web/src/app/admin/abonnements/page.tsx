"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import {
  formatPrice,
  type Payment,
  type SubscriptionPlan,
  type SubscriptionPlanInfo,
} from "@/lib/types";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

type Meta = { page: number; limit: number; total: number; totalPages: number };

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  WEEKLY: "Premium semaine",
  MONTHLY: "Premium mois",
};

const PLAN_SETTING_KEY: Record<SubscriptionPlan, string> = {
  WEEKLY: "subscription_weekly_price",
  MONTHLY: "subscription_monthly_price",
};

const PAYMENT_STATUS_LABELS: Record<Payment["status"], string> = {
  PENDING: "En attente",
  SUCCESS: "Encaissé",
  FAILED: "Échec",
  REFUNDED: "Remboursé",
};

const PAYMENT_STATUS_STYLE: Record<Payment["status"], "ok" | "wait" | "fail"> = {
  SUCCESS: "ok",
  PENDING: "wait",
  FAILED: "fail",
  REFUNDED: "wait",
};

export default function AdminAbonnementsPage() {
  const [plans, setPlans] = useState<SubscriptionPlanInfo[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState<SubscriptionPlan | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const res = await api.get<{ plans: SubscriptionPlanInfo[] }>("/subscriptions/plans", undefined, false);
      setPlans(res.data.plans);
      setPriceDrafts(Object.fromEntries(res.data.plans.map((p) => [p.plan, String(p.price)])));
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Impossible de charger les plans.");
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPaginated<Payment>("/admin/payments", {
        type: "SUBSCRIPTION",
        page,
        limit: 10,
      });
      setPayments(res.data);
      setMeta(res.meta);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Impossible de charger les paiements d'abonnement.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => void loadPlans(), 0);
    return () => clearTimeout(timer);
  }, [loadPlans]);

  useEffect(() => {
    const timer = setTimeout(() => void loadPayments(), 0);
    return () => clearTimeout(timer);
  }, [loadPayments]);

  const savePlanPrice = async (plan: SubscriptionPlanInfo) => {
    const draft = (priceDrafts[plan.plan] ?? "").trim();
    if (!draft || Number.isNaN(Number(draft)) || Number(draft) <= 0) {
      setFeedback("Le tarif doit être un nombre positif.");
      return;
    }
    setSavingPlan(plan.plan);
    setFeedback(null);
    try {
      await api.patch(`/admin/settings/${PLAN_SETTING_KEY[plan.plan]}`, { value: draft });
      setPlans((prev) => prev.map((p) => (p.plan === plan.plan ? { ...p, price: Number(draft) } : p)));
      setFeedback(`Tarif ${PLAN_LABELS[plan.plan]} mis à jour : ${formatPrice(draft)}.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors de la mise à jour du tarif.");
    } finally {
      setSavingPlan(null);
    }
  };

  const successCount = payments.filter((p) => p.status === "SUCCESS").length;

  return (
    <AdminShell active="/admin/abonnements">
      <section className={styles.content}>
        <div className={styles.adminPageHeader}>
          <Link href="/admin" className={styles.adminBackBtn} aria-label="Retour au dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <header className={styles.pageHeaderTitle}>
            <h1>Abonnements</h1>
            <p>Gestion des offres premium vendeur et suivi des paiements d&apos;abonnement.</p>
          </header>
          <Link href="/admin/paiements" className={styles.headerCta}>
            Paiements
          </Link>
        </div>

        {feedback ? <p className={styles.adminModerationEmpty}>{feedback}</p> : null}

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.icon}>P</span>
            <h2>Plans</h2>
            <p>Offres commercialisées</p>
            <strong>{plans.length}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.icon}>A</span>
            <h2>Paiements abo</h2>
            <p>Total enregistrés</p>
            <strong>{meta?.total ?? "…"}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.icon}>F</span>
            <h2>Encaissés</h2>
            <p>Sur cette page</p>
            <strong>{successCount}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.icon}>!</span>
            <h2>En attente</h2>
            <p>Paiements non confirmés</p>
            <strong>{payments.filter((p) => p.status === "PENDING").length}</strong>
          </div>
        </div>

        <section className={styles.subscriptionGrid}>
          <article className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <h2>Plans disponibles</h2>
                <p>Modifiez les tarifs appliqués côté vendeur (réglages système).</p>
              </div>
            </header>

            <div className={styles.planList}>
              {plans.map((plan) => (
                <article className={styles.planCard} key={plan.plan}>
                  <div>
                    <strong>{PLAN_LABELS[plan.plan]}</strong>
                    <p>Durée : {plan.durationDays} jours · devise {plan.currency}</p>
                    <span>{plan.plan === "WEEKLY" ? "Hebdomadaire" : "Mensuel"}</span>
                  </div>
                  <label>
                    Tarif FCFA
                    <input
                      value={priceDrafts[plan.plan] ?? ""}
                      onChange={(event) =>
                        setPriceDrafts((prev) => ({ ...prev, [plan.plan]: event.target.value }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className={`${styles.adminActionPrimary} ${styles.adminActionPrimary_blue}`}
                    disabled={savingPlan === plan.plan}
                    onClick={() => void savePlanPrice(plan)}
                  >
                    {savingPlan === plan.plan ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </article>
              ))}
            </div>
          </article>

          <aside className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <h2>Regles premium</h2>
                <p>Parametres appliques aux abonnements actifs.</p>
              </div>
            </header>
            <div className={styles.stepList}>
              <span>Photos supplémentaires pour les vendeurs abonnés</span>
              <span>Badge visible sur les fiches publiques</span>
              <span>Encaissement abonnement par OKKAZ</span>
              <span>Suspension automatique apres expiration</span>
            </div>
          </aside>
        </section>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <div>
              <h2>Paiements d&apos;abonnement <span className={styles.adminModerationCount}>{meta?.total ?? 0}</span></h2>
              <p style={{ color: "#b45309", fontWeight: 700 }}>
                Liste dérivée des paiements — endpoint abonnements admin manquant côté backend.
              </p>
            </div>
          </header>

          {loading ? (
            <p className={styles.adminModerationEmpty}>Chargement...</p>
          ) : payments.length === 0 ? (
            <p className={styles.adminModerationEmpty}>Aucun paiement d&apos;abonnement enregistré.</p>
          ) : (
            <div className={styles.subscriptionList}>
              {payments.map((payment) => (
                <article className={styles.subscriptionRow} key={payment.id}>
                  <span className={`${styles.adminUserStatus} ${styles[`adminUserStatus_${PAYMENT_STATUS_STYLE[payment.status]}`]}`}>
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </span>
                  <div>
                    <strong>{payment.user ? `${payment.user.firstName} ${payment.user.lastName}` : "Utilisateur inconnu"}</strong>
                    <p>
                      {payment.user?.email ?? ""} · {payment.method === "MOBILE_MONEY" ? "Mobile Money" : "Carte"} ·{" "}
                      {new Date(payment.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <em>{formatPrice(payment.amount)}</em>
                </article>
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
        </section>
      </section>
    </AdminShell>
  );
}
