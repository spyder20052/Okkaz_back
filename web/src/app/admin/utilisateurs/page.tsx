"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import {
  formatPrice,
  type ApiUser,
  type KycDocument,
  type Listing,
  type Payment,
  type Subscription,
  type UserRole,
  type UserStatus,
} from "@/lib/types";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

type Meta = { page: number; limit: number; total: number; totalPages: number };

type UserDetail = ApiUser & {
  kycDocuments?: KycDocument[];
  listings?: Listing[];
  payments?: Payment[];
  subscriptions?: Subscription[];
};

const ROLE_LABELS: Record<UserRole, string> = {
  BUYER: "Acheteur",
  SELLER: "Vendeur",
  SELLER_PRO: "Vendeur Pro",
  ADMIN: "Admin",
};

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  BLOCKED: "Bloqué",
  PENDING_KYC: "KYC en attente",
};

const STATUS_STYLE: Record<UserStatus, "ok" | "fail" | "wait"> = {
  ACTIVE: "ok",
  SUSPENDED: "fail",
  BLOCKED: "fail",
  PENDING_KYC: "wait",
};

export default function AdminUtilisateursPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Recherche avec debounce simple
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedQuery(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPaginated<ApiUser>("/admin/users", {
        q: appliedQuery || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setUsers(res.data);
      setMeta(res.meta);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, roleFilter, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const patchUser = (id: string, patch: Partial<ApiUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const suspend = async (user: ApiUser) => {
    const reason = prompt(`Motif de suspension de ${user.firstName} ${user.lastName} (3 caractères minimum) :`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setFeedback("Le motif doit contenir au moins 3 caractères.");
      return;
    }
    setActingId(user.id);
    try {
      await api.patch(`/admin/users/${user.id}/suspend`, { reason: reason.trim() });
      patchUser(user.id, { status: "SUSPENDED" });
      setFeedback(`Compte de ${user.firstName} ${user.lastName} suspendu.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors de la suspension.");
    } finally {
      setActingId(null);
    }
  };

  const block = async (user: ApiUser) => {
    const reason = prompt(`Motif de blocage de ${user.firstName} ${user.lastName} (3 caractères minimum) :`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setFeedback("Le motif doit contenir au moins 3 caractères.");
      return;
    }
    setActingId(user.id);
    try {
      await api.patch(`/admin/users/${user.id}/block`, { reason: reason.trim() });
      patchUser(user.id, { status: "BLOCKED" });
      setFeedback(`Compte de ${user.firstName} ${user.lastName} bloqué.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors du blocage.");
    } finally {
      setActingId(null);
    }
  };

  const activate = async (user: ApiUser) => {
    setActingId(user.id);
    try {
      await api.patch(`/admin/users/${user.id}/activate`);
      patchUser(user.id, { status: "ACTIVE" });
      setFeedback(`Compte de ${user.firstName} ${user.lastName} réactivé.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors de la réactivation.");
    } finally {
      setActingId(null);
    }
  };

  const toggleProfile = async (user: ApiUser) => {
    if (expandedId === user.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(user.id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.get<{ user: UserDetail }>(`/admin/users/${user.id}`);
      setDetail(res.data.user);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Impossible de charger le profil.");
      setExpandedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <AdminShell active="/admin/utilisateurs">
      <section className={styles.spaceContent}>
        <div className={styles.adminPageHeader}>
          <Link href="/admin" className={styles.adminBackBtn} aria-label="Retour au dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <header className={styles.spaceHeader}>
            <h1>Utilisateurs</h1>
            <p>Gestion des comptes : acheteurs, vendeurs, vendeurs pro et admins.</p>
          </header>
        </div>

        <div className={styles.statTilesGrid}>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconViolet}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </span>
            <small>RÉSULTATS</small>
            <strong>{meta?.total ?? "…"}</strong>
            <p>comptes trouvés</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconGreen}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <small>ACTIFS</small>
            <strong>{users.filter((u) => u.status === "ACTIVE").length}</strong>
            <p>sur cette page</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconOrange}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </span>
            <small>KYC EN ATTENTE</small>
            <strong>{users.filter((u) => u.kycStatus === "PENDING").length}</strong>
            <p>sur cette page</p>
          </div>
          <div className={styles.statTile}>
            <span className={`${styles.statTileIcon} ${styles.statTileIconBlue}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </span>
            <small>SUSPENDUS / BLOQUÉS</small>
            <strong>{users.filter((u) => u.status === "SUSPENDED" || u.status === "BLOCKED").length}</strong>
            <p>sur cette page</p>
          </div>
        </div>

        <div className={styles.adminFilterBar}>
          <label className={styles.adminSearchInline}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" placeholder="Nom, email..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`${styles.adminFilterPill} ${roleFilter === r ? styles.adminFilterPillActive : ""}`}
              onClick={() => {
                setRoleFilter((prev) => (prev === r ? "" : r));
                setPage(1);
              }}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <div className={styles.adminFilterBar}>
          {(Object.keys(STATUS_LABELS) as UserStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.adminFilterPill} ${statusFilter === s ? styles.adminFilterPillActive : ""}`}
              onClick={() => {
                setStatusFilter((prev) => (prev === s ? "" : s));
                setPage(1);
              }}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <h2 className={styles.spaceSectionTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {meta?.total ?? 0} {(meta?.total ?? 0) > 1 ? "comptes" : "compte"}
        </h2>

        {feedback ? <p className={styles.adminModerationEmpty}>{feedback}</p> : null}

        {loading ? (
          <p className={styles.adminModerationEmpty}>Chargement des utilisateurs...</p>
        ) : users.length === 0 ? (
          <p className={styles.adminModerationEmpty}>Aucun compte ne correspond aux filtres.</p>
        ) : (
          <ul className={styles.adminModerationList}>
            {users.map((user) => (
              <li key={user.id} className={styles.adminModerationItem} style={{ flexWrap: "wrap" }}>
                <span className={`${styles.adminModerationRef} ${styles.adminModerationRef_blue}`}>
                  {ROLE_LABELS[user.role]}
                </span>
                <div>
                  <strong>{user.firstName} {user.lastName}</strong>
                  <p>
                    {user.email} · {user.phone} · KYC {user.kycStatus} ·{" "}
                    <em className={`${styles.adminUserStatus} ${styles[`adminUserStatus_${STATUS_STYLE[user.status]}`]}`}>
                      {STATUS_LABELS[user.status]}
                    </em>
                  </p>
                </div>
                <div className={styles.adminModerationActions}>
                  <button type="button" className={styles.adminActionSecondary} onClick={() => void toggleProfile(user)}>
                    {expandedId === user.id ? "Fermer" : "Profil"}
                  </button>
                  {user.status === "SUSPENDED" || user.status === "BLOCKED" ? (
                    <button
                      type="button"
                      className={`${styles.adminActionPrimary} ${styles.adminActionPrimary_blue}`}
                      disabled={actingId === user.id}
                      onClick={() => void activate(user)}
                    >
                      Réactiver
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`${styles.adminActionPrimary} ${styles.adminActionPrimary_orange}`}
                        disabled={actingId === user.id || user.role === "ADMIN"}
                        onClick={() => void suspend(user)}
                      >
                        Suspendre
                      </button>
                      <button
                        type="button"
                        className={`${styles.adminActionPrimary} ${styles.adminActionPrimary_red}`}
                        disabled={actingId === user.id || user.role === "ADMIN"}
                        onClick={() => void block(user)}
                      >
                        Bloquer
                      </button>
                    </>
                  )}
                </div>
                {expandedId === user.id ? (
                  <div style={{ flexBasis: "100%", padding: "12px 4px 4px", fontSize: "0.82rem" }}>
                    {detailLoading ? (
                      <p>Chargement du profil...</p>
                    ) : detail ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        <p>
                          <strong>Ville :</strong> {detail.city ?? "—"} · <strong>Adresse :</strong> {detail.address ?? "—"} ·{" "}
                          <strong>Inscrit le :</strong>{" "}
                          {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString("fr-FR") : "—"} ·{" "}
                          <strong>Signalements :</strong> {detail.reportsCount ?? 0}
                        </p>
                        <p>
                          <strong>KYC :</strong> {detail.kycDocuments?.length ?? 0} document(s) ·{" "}
                          <strong>Annonces :</strong> {detail.listings?.length ?? 0} ·{" "}
                          <strong>Paiements :</strong> {detail.payments?.length ?? 0} ·{" "}
                          <strong>Abonnements :</strong> {detail.subscriptions?.length ?? 0}
                        </p>
                        {detail.listings && detail.listings.length > 0 ? (
                          <p>
                            <strong>Dernières annonces :</strong>{" "}
                            {detail.listings.slice(0, 3).map((l) => l.title).join(" · ")}
                          </p>
                        ) : null}
                        {detail.payments && detail.payments.length > 0 ? (
                          <p>
                            <strong>Derniers paiements :</strong>{" "}
                            {detail.payments
                              .slice(0, 3)
                              .map((p) => `${formatPrice(p.amount)} (${p.status})`)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p>Profil indisponible.</p>
                    )}
                  </div>
                ) : null}
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
