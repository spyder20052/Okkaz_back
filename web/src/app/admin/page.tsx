"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import {
  formatPrice,
  type Category,
  type DashboardStats,
  type Payment,
  type SystemSetting,
} from "@/lib/types";
import AdminShell from "./AdminShell";
import styles from "./admin.module.css";

type Tab = "overview" | "settings";

type RevenueRow = { date: string; amount: number | string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

const PAYMENT_TYPE_LABELS: Record<Payment["type"], string> = {
  SUBSCRIPTION: "Abonnement",
  DEMAND_LISTING: "Demande",
  EXPRESS_DEMAND: "Demande express",
};

const PAYMENT_STATUS_LABELS: Record<Payment["status"], string> = {
  PENDING: "En attente",
  SUCCESS: "Encaissé",
  FAILED: "Échec",
  REFUNDED: "Remboursé",
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([]);
  const [lastPayments, setLastPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Onglet paramètres
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, revenueRes, paymentsRes] = await Promise.all([
        api.get<DashboardStats>("/admin/dashboard/stats"),
        api.get<{ rows: RevenueRow[] }>("/admin/dashboard/revenue", { period: "month" }),
        api.getPaginated<Payment>("/admin/payments", { limit: 5, page: 1 }),
      ]);
      setStats(statsRes.data);
      setRevenueRows(revenueRes.data.rows ?? []);
      setLastPayments(paymentsRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger le dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const [settingsRes, categoriesRes] = await Promise.all([
        api.get<{ settings: SystemSetting[] }>("/admin/settings"),
        api.get<{ categories: Category[] }>("/categories", undefined, false),
      ]);
      setSettings(settingsRes.data.settings);
      setSettingValues(
        Object.fromEntries(settingsRes.data.settings.map((s) => [s.key, s.value])),
      );
      setCategories(categoriesRes.data.categories);
    } catch (err) {
      setSettingsFeedback(
        err instanceof ApiError ? err.message : "Impossible de charger les paramètres.",
      );
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOverview();
      void loadSettings();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOverview, loadSettings]);

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsFeedback(null);
    const dirty = settings.filter((s) => settingValues[s.key] !== undefined && settingValues[s.key] !== s.value);
    if (dirty.length === 0) {
      setSettingsFeedback("Aucune modification à enregistrer.");
      setSavingSettings(false);
      return;
    }
    try {
      for (const setting of dirty) {
        await api.patch(`/admin/settings/${setting.key}`, { value: settingValues[setting.key] });
      }
      setSettings((prev) => prev.map((s) => ({ ...s, value: settingValues[s.key] ?? s.value })));
      setSettingsFeedback(`${dirty.length} paramètre(s) enregistré(s).`);
    } catch (err) {
      setSettingsFeedback(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSavingSettings(false);
    }
  };

  const addCategory = async () => {
    const trimmed = newCategory.trim();
    if (trimmed.length < 2) return;
    try {
      const res = await api.post<{ category: Category }>("/categories", {
        name: trimmed,
        slug: slugify(trimmed),
      });
      setCategories((prev) => [...prev, res.data.category]);
      setNewCategory("");
      setSettingsFeedback(`Catégorie "${trimmed}" créée.`);
    } catch (err) {
      setSettingsFeedback(err instanceof ApiError ? err.message : "Erreur lors de la création.");
    }
  };

  const removeCategory = async (cat: Category) => {
    if (!confirm(`Désactiver la catégorie "${cat.name}" ?`)) return;
    try {
      await api.delete(`/categories/${cat.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setSettingsFeedback(`Catégorie "${cat.name}" désactivée.`);
    } catch (err) {
      setSettingsFeedback(err instanceof ApiError ? err.message : "Erreur lors de la désactivation.");
    }
  };

  const maxRevenue = Math.max(...revenueRows.map((r) => Number(r.amount) || 0), 1);
  const openActions = stats
    ? stats.pendingListingsCount + stats.pendingKycCount + stats.openReportsCount
    : 0;

  return (
    <AdminShell active="/admin">
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>Dashboard admin</h1>
            <p>Vue operationnelle OKKAZ : annonces, identites, paiements et abonnements.</p>
          </div>

          <label className={styles.search}>
            <span>Recherche</span>
            <input type="search" placeholder="Annonce, utilisateur, reference..." />
          </label>

          <Link href="/admin/profil" className={styles.avatar} aria-label="Profil admin">
            OK
          </Link>
        </header>

        <div className={styles.tabSwitcher} role="tablist" aria-label="Sections dashboard">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "overview"}
            className={`${styles.tabSwitcherBtn} ${tab === "overview" ? styles.tabSwitcherActive : ""}`}
            onClick={() => setTab("overview")}
          >
            Vue d&apos;ensemble
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "settings"}
            className={`${styles.tabSwitcherBtn} ${tab === "settings" ? styles.tabSwitcherActive : ""}`}
            onClick={() => setTab("settings")}
          >
            Parametres
          </button>
        </div>

        {tab === "overview" ? (
          <>
            {error ? <p className={styles.adminModerationEmpty}>{error}</p> : null}
            <section className={styles.adminHero}>
              <div>
                <span className={styles.adminHeroKicker}>Pilotage temps reel</span>
                <h2>Operations OKKAZ sous controle</h2>
                <p>
                  Les files critiques sont regroupees au meme endroit pour traiter plus vite les annonces,
                  les identites et les signalements.
                </p>
              </div>
              <div className={styles.adminHeroMetrics} aria-label="Resume operationnel">
                <span>
                  <strong>{loading ? "…" : openActions}</strong>
                  actions ouvertes
                </span>
                <span>
                  <strong>{loading ? "…" : stats?.totalUsers ?? 0}</strong>
                  utilisateurs inscrits
                </span>
                <span>
                  <strong>{loading ? "…" : stats?.totalActiveListings ?? 0}</strong>
                  annonces actives
                </span>
              </div>
            </section>

            <div className={styles.stats}>
              <Link href="/admin/annonces" className={styles.statCard}>
                <span className={styles.icon}>A</span>
                <h2>Annonces</h2>
                <p>En attente de validation</p>
                <strong>{loading ? "…" : stats?.pendingListingsCount ?? 0}</strong>
              </Link>
              <Link href="/admin/kyc" className={styles.statCard}>
                <span className={styles.icon}>K</span>
                <h2>Identités</h2>
                <p>Dossiers KYC à vérifier</p>
                <strong>{loading ? "…" : stats?.pendingKycCount ?? 0}</strong>
              </Link>
              <Link href="/admin/moderation" className={styles.statCard}>
                <span className={styles.icon}>S</span>
                <h2>Signalements</h2>
                <p>Dossiers ouverts</p>
                <strong>{loading ? "…" : stats?.openReportsCount ?? 0}</strong>
              </Link>
              <Link href="/admin/paiements" className={styles.statCard}>
                <span className={styles.icon}>F</span>
                <h2>Revenu</h2>
                <p>Total encaissé (FCFA)</p>
                <strong>{loading ? "…" : (stats?.totalRevenue ?? 0).toLocaleString("fr-FR")}</strong>
              </Link>
            </div>

            <div className={styles.adminDashboardFocus}>
              <section className={styles.card}>
                <header className={styles.cardHeader}>
                  <div>
                    <h2>Revenus plateforme</h2>
                    <p>
                      Encaissements OKKAZ, <span>30 derniers jours</span>
                    </p>
                  </div>
                  <Link href="/admin/paiements">Details</Link>
                </header>
                {revenueRows.length === 0 ? (
                  <p className={styles.adminModerationEmpty}>Aucun encaissement sur la période.</p>
                ) : (
                  <>
                    <div className={styles.chart} aria-label="Graphique revenus du mois">
                      {revenueRows.map((row) => (
                        <span
                          key={row.date}
                          title={`${shortDate(row.date)} : ${formatPrice(row.amount)}`}
                          style={{ height: `${Math.max(6, Math.round((Number(row.amount) / maxRevenue) * 100))}%` }}
                        />
                      ))}
                    </div>
                    <div className={styles.chartLabels}>
                      {revenueRows.map((row) => (
                        <span key={row.date}>{shortDate(row.date)}</span>
                      ))}
                    </div>
                  </>
                )}
              </section>

              <section className={styles.card}>
                <header className={styles.cardHeader}>
                  <div>
                    <h2>Derniers paiements</h2>
                    <p>Les 5 dernières transactions enregistrées.</p>
                  </div>
                </header>
                <div className={styles.notifList}>
                  {lastPayments.length === 0 ? (
                    <p className={styles.adminModerationEmpty}>Aucun paiement enregistré.</p>
                  ) : (
                    lastPayments.map((payment) => (
                      <Link
                        href="/admin/paiements"
                        key={payment.id}
                        className={`${styles.notifItem} ${payment.status === "PENDING" ? styles.notif_warning : styles.notif_info}`}
                      >
                        <span className={styles.notifDot} />
                        <span>
                          <strong>
                            {PAYMENT_TYPE_LABELS[payment.type]} · {formatPrice(payment.amount)}
                          </strong>
                          <p>
                            {payment.user ? `${payment.user.firstName} ${payment.user.lastName} · ` : ""}
                            {PAYMENT_STATUS_LABELS[payment.status]} · {shortDate(payment.createdAt)}
                          </p>
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </div>
          </>
        ) : (
          <>
            {settingsFeedback ? (
              <p className={styles.adminModerationEmpty}>{settingsFeedback}</p>
            ) : null}
            <div className={styles.settingsGrid}>
              {settings.map((setting) => (
                <article className={styles.adminSettingCard} key={setting.key}>
                  <h2 className={styles.spaceSectionTitle}>{setting.key}</h2>
                  <p className={styles.adminSettingLead}>{setting.description ?? "Paramètre système."}</p>
                  <div className={styles.adminSettingRow}>
                    <label className={styles.adminSettingField}>
                      <span>Valeur</span>
                      <input
                        type="text"
                        value={settingValues[setting.key] ?? setting.value}
                        onChange={(e) =>
                          setSettingValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>

            <article className={styles.adminSettingCard}>
              <h2 className={styles.spaceSectionTitle}>Categories d&apos;annonces</h2>
              <p className={styles.adminSettingLead}>
                Categories visibles dans le formulaire de publication et les filtres. La désactivation est
                définitive côté admin (les catégories inactives ne sont plus listées par l&apos;API).
              </p>
              <ul className={styles.adminCategoryList}>
                {categories.map((cat) => (
                  <li key={cat.id} className={styles.adminCategoryChip}>
                    {cat.name}
                    <button type="button" onClick={() => removeCategory(cat)} aria-label={`Désactiver ${cat.name}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
              <div className={styles.adminCategoryAdd}>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Ajouter une categorie..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addCategory();
                    }
                  }}
                />
                <button type="button" onClick={() => void addCategory()}>
                  Ajouter
                </button>
              </div>
            </article>

            <button
              type="button"
              className={styles.adminSettingSave}
              disabled={savingSettings}
              onClick={() => void saveSettings()}
            >
              {savingSettings ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </>
        )}
      </section>
    </AdminShell>
  );
}
