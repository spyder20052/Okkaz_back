"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice, type Demand } from "@/lib/types";
import common from "../espace.module.css";

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

  if (authLoading) return <section className={common.page}><div className={common.shell}><p>Chargement de votre espace…</p></div></section>;

  if (!user) {
    return <section className={common.page}><div className={common.shell}>
      <header className={common.header}><div><h1>Mes demandes</h1><p>Connectez-vous pour retrouver les biens que vous recherchez.</p></div></header>
      <div className={common.row}><Link className={common.button} href="/connexion?next=/demandes">Se connecter</Link><Link className={common.secondary} href="/demandes/nouvelle">Créer une demande</Link></div>
    </div></section>;
  }

  return <section className={common.page}><div className={common.shell}>
    <header className={common.header}><div><h1>Mes demandes</h1><p>Suivez vos recherches et fermez celles qui ne sont plus nécessaires.</p></div><Link className={common.button} href="/demandes/nouvelle">Nouvelle demande</Link></header>
    {error && <p className={common.error} role="alert">{error}</p>}
    {loading ? <p>Chargement de vos demandes…</p> : demands.length === 0 ? (
      <div className={common.message}><p>Vous n’avez encore publié aucune demande.</p><Link className={common.button} href="/demandes/nouvelle">Décrire mon besoin</Link></div>
    ) : <div className={common.list}>{demands.map((demand) => <article className={common.item} key={demand.id}>
      <div className={common.row}><span className={common.badge}>{demand.type}</span><span className={common.badge}>{demand.status}</span></div>
      <h2>{demand.title}</h2><p>{demand.description}</p>
      <p className={common.muted}>{demand.city} · {new Date(demand.createdAt).toLocaleDateString("fr-FR")}</p>
      {demand.maxBudget != null && <p className={common.price}>Budget max. {formatPrice(demand.maxBudget)}</p>}
      {demand.status === "ACTIVE" && <button className={common.secondary} type="button" disabled={closingId === demand.id} onClick={() => void closeDemand(demand.id)}>{closingId === demand.id ? "Fermeture…" : "Fermer la demande"}</button>}
    </article>)}</div>}
  </div></section>;
}
