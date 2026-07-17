"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatPrice, type Category, type DashboardStats } from "@/lib/types";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

type RevenueRow = { date: string; amount: number | string };
type GrowthRow = { date: string; count: number };
type TopCategory = { category: Category; count: number };
type TopListing = {
  id: string;
  title: string;
  slug: string;
  viewsCount: number;
  contactsCount: number;
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default function AdminStatistiquesPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([]);
  const [growthRows, setGrowthRows] = useState<GrowthRow[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [topListings, setTopListings] = useState<TopListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, revenueRes, growthRes, topCatRes, topListRes] = await Promise.all([
        api.get<DashboardStats>("/admin/dashboard/stats"),
        api.get<{ rows: RevenueRow[] }>("/admin/dashboard/revenue", { period: "month" }),
        api.get<{ rows: GrowthRow[] }>("/admin/dashboard/users-growth", { period: "month" }),
        api.get<{ items: TopCategory[] }>("/admin/dashboard/top-categories"),
        api.get<{ items: TopListing[] }>("/admin/dashboard/top-listings"),
      ]);
      setStats(statsRes.data);
      setRevenueRows(revenueRes.data.rows ?? []);
      setGrowthRows(growthRes.data.rows ?? []);
      setTopCategories(topCatRes.data.items ?? []);
      setTopListings(topListRes.data.items ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const tiles = [
    { label: "Utilisateurs", value: stats ? String(stats.totalUsers) : "…", meta: "comptes inscrits" },
    { label: "Annonces actives", value: stats ? String(stats.totalActiveListings) : "…", meta: `sur ${stats?.totalListings ?? "…"} au total` },
    { label: "Transactions", value: stats ? String(stats.totalTransactions) : "…", meta: "paiements réussis" },
    { label: "Revenu", value: stats ? formatPrice(stats.totalRevenue) : "…", meta: "encaissé au total" },
  ];

  const maxRevenue = Math.max(...revenueRows.map((r) => Number(r.amount) || 0), 1);
  const maxGrowth = Math.max(...growthRows.map((r) => r.count), 1);
  const maxCategoryCount = Math.max(...topCategories.map((c) => c.count), 1);

  return (
    <AdminShell active="/admin/statistiques">
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>Statistiques</h1>
            <p>Indicateurs de la plateforme OKKAZ, calculés en temps réel.</p>
          </div>
          <div className={styles.avatar}>S</div>
        </header>

        {error ? <p className={styles.adminModerationEmpty}>{error}</p> : null}
        {loading ? <p className={styles.adminModerationEmpty}>Chargement des statistiques...</p> : null}

        <section className={styles.stats}>
          {tiles.map((item) => (
            <article className={styles.statCard} key={item.label}>
              <span className={styles.icon}>{item.label[0]}</span>
              <div>
                <h2>{item.label}</h2>
                <p>{item.meta}</p>
              </div>
              <strong>{item.value}</strong>
            </article>
          ))}
        </section>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Revenus</h2>
              <p><span>30 derniers jours</span> (période mensuelle)</p>
            </div>
          </div>
          {revenueRows.length === 0 ? (
            <p className={styles.adminModerationEmpty}>Aucun encaissement sur la période.</p>
          ) : (
            <>
              <div className={styles.chart} aria-label="Graphique des revenus">
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
        </article>

        <article className={styles.card} style={{ marginTop: 24 }}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Croissance utilisateurs</h2>
              <p>Nouvelles inscriptions, période mensuelle</p>
            </div>
          </div>
          {growthRows.length === 0 ? (
            <p className={styles.adminModerationEmpty}>Aucune inscription sur la période.</p>
          ) : (
            <>
              <div className={styles.chart} aria-label="Graphique de croissance utilisateurs">
                {growthRows.map((row) => (
                  <span
                    key={row.date}
                    title={`${shortDate(row.date)} : ${row.count} inscription(s)`}
                    style={{ height: `${Math.max(6, Math.round((row.count / maxGrowth) * 100))}%` }}
                  />
                ))}
              </div>
              <div className={styles.chartLabels}>
                {growthRows.map((row) => (
                  <span key={row.date}>{shortDate(row.date)}</span>
                ))}
              </div>
            </>
          )}
        </article>

        <section className={styles.actionPageGrid} style={{ marginTop: 24 }}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Top catégories</h2>
            </div>
            {topCategories.length === 0 ? (
              <p className={styles.adminModerationEmpty}>Aucune donnée.</p>
            ) : (
              <div className={styles.actionList}>
                {topCategories.map((item) => (
                  <div className={styles.actionItem} key={item.category.id}>
                    <span>{item.count}</span>
                    <div>
                      <strong>{item.category.name}</strong>
                      <div
                        style={{
                          marginTop: 6,
                          height: 8,
                          borderRadius: 999,
                          background: "rgba(59, 130, 246, 0.15)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round((item.count / maxCategoryCount) * 100)}%`,
                            height: "100%",
                            borderRadius: 999,
                            background: "#3b82f6",
                          }}
                        />
                      </div>
                    </div>
                    <span>{item.count > 1 ? "annonces" : "annonce"}</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Top annonces (vues)</h2>
            </div>
            {topListings.length === 0 ? (
              <p className={styles.adminModerationEmpty}>Aucune donnée.</p>
            ) : (
              <div className={styles.actionList}>
                {topListings.map((listing) => (
                  <div className={styles.actionItem} key={listing.id}>
                    <span>{listing.viewsCount}</span>
                    <div>
                      <strong>{listing.title}</strong>
                      <p>{listing.viewsCount} vue{listing.viewsCount > 1 ? "s" : ""} · {listing.contactsCount} contact{listing.contactsCount > 1 ? "s" : ""}</p>
                    </div>
                    <span>vues</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </section>
    </AdminShell>
  );
}
