"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatPrice, type Demand } from "@/lib/types";
import common from "../../espace.module.css";

export default function DemandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [demand, setDemand] = useState<Demand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ demand: Demand }>(`/demands/${encodeURIComponent(id)}`)
      .then((response) => setDemand(response.data.demand))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger cette demande."))
      .finally(() => setLoading(false));
  }, [id]);

  return <section className={common.page}><div className={common.shell}>
    <header className={common.header}><div><h1>Détail de la demande</h1><p>Informations transmises par l’acheteur.</p></div><Link className={common.secondary} href="/vendeur/recherches">Retour aux demandes</Link></header>
    {loading && <p>Chargement de la demande…</p>}
    {error && <p className={common.error} role="alert">{error}</p>}
    {!loading && !error && !demand && <p className={common.message}>Cette demande est introuvable.</p>}
    {demand && <article className={common.item}>
      <div className={common.row}><span className={common.badge}>{demand.type}</span><span className={common.badge}>{demand.status}</span></div>
      <h2>{demand.title}</h2><p>{demand.description}</p>
      <p className={common.muted}>{demand.city} · publiée le {new Date(demand.createdAt).toLocaleDateString("fr-FR")}</p>
      {demand.category && <p>Catégorie : {demand.category.name}</p>}
      {demand.maxBudget != null && <p className={common.price}>Budget max. {formatPrice(demand.maxBudget)}</p>}
    </article>}
  </div></section>;
}
