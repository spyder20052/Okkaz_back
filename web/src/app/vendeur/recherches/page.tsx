"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatPrice, type Demand, type DemandType } from "@/lib/types";
import SellerShell from "../SellerShell";
import common from "../../espace.module.css";

export default function SellerDemandsPage() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [type, setType] = useState<DemandType | "">("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const path = type === "STANDARD" ? "/demands/standard" : "/demands";
      const response = await api.getPaginated<Demand>(path, { type: type || undefined, status: "ACTIVE", page, limit: 12 });
      setDemands(response.data); setMeta(response.meta);
    } catch (err) { setError(err instanceof ApiError ? err.message : "Impossible de charger les demandes."); }
    finally { setLoading(false); }
  }, [page, type]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  return <SellerShell active="/vendeur/recherches"><section className={common.page}><div className={common.shell}>
    <header className={common.header}><div><h1>Demandes des acheteurs</h1><p>Consultez les biens recherchés et proposez une annonce adaptée.</p></div><Link className={common.secondary} href="/vendeur">Dashboard</Link></header>
    <div className={common.row}>
      {(["", "STANDARD", "EXPRESS"] as const).map((value) => <button key={value || "ALL"} className={type === value ? common.button : common.secondary} onClick={() => { setType(value); setPage(1); }}>{value === "" ? "Toutes" : value === "STANDARD" ? "Standard" : "Express Pro"}</button>)}
    </div>
    {error && <p className={common.error}>{error}</p>}
    {loading ? <p>Chargement…</p> : <div className={common.list}>{demands.map((demand) => <article className={common.item} key={demand.id}>
      <div className={common.row}><span className={common.badge}>{demand.type}</span><span className={common.badge}>{demand.category?.name ?? "Catégorie"}</span></div>
      <h2>{demand.title}</h2><p>{demand.description}</p>
      <p className={common.muted}>{demand.city} · publiée le {new Date(demand.createdAt).toLocaleDateString("fr-FR")}</p>
      {demand.maxBudget != null && <p className={common.price}>Budget max. {formatPrice(demand.maxBudget)}</p>}
      <Link className={common.secondary} href={`/demandes/${demand.id}`}>Voir le détail</Link>
    </article>)}</div>}
    {!loading && demands.length === 0 && !error && <p className={common.message}>Aucune demande active.</p>}
    {meta.totalPages > 1 && <div className={common.row}><button className={common.secondary} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédente</button><span>Page {meta.page}/{meta.totalPages}</span><button className={common.secondary} disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Suivante</button></div>}
  </div></section></SellerShell>;
}
