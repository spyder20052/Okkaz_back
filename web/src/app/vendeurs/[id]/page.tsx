"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError, mediaUrl } from "@/lib/api";
import { formatPrice, RENTAL_PERIOD_LABELS, type ApiUser, type Listing } from "@/lib/types";
import styles from "../../espace.module.css";

type PublicProfile = Pick<ApiUser, "id" | "firstName" | "lastName" | "role" | "profilePhotoUrl" | "city" | "createdAt"> & {
  ratingAverage: number;
  ratingCount: number;
  activeListings: Listing[];
};
export default function PublicSellerPage() {
  const id = String(useParams<{ id: string }>().id ?? "");
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.get<{ profile: PublicProfile }>(`/users/${encodeURIComponent(id)}/public`, undefined, false)
      .then((res) => { if (!cancelled) setProfile(res.data.profile); })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : "Profil indisponible."); });
    return () => { cancelled = true; };
  }, [id]);
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><div><h1>{profile ? `${profile.firstName} ${profile.lastName}` : "Profil vendeur"}</h1><p>{profile?.city ?? "Bénin"} · {profile ? `${profile.ratingAverage.toFixed(1)}/5 (${profile.ratingCount} avis)` : "Vendeur Okkaz"}</p></div><Link className={styles.secondary} href="/annonces">Toutes les annonces</Link></header>
    {error && <p className={styles.error}>{error}</p>}
    {!profile && !error && <p>Chargement…</p>}
    <div className={styles.grid}>{profile?.activeListings.map((listing) => {
      const photo = listing.photos?.find((p) => p.isCover) ?? listing.photos?.[0];
      return <Link className={styles.item} href={`/annonces/${listing.id}`} key={listing.id}>
        <Image src={mediaUrl(photo?.url)} alt={listing.title} width={520} height={300} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12 }} />
        <h2>{listing.title}</h2><p className={styles.price}>{formatPrice(listing.rentalPrice)} / {RENTAL_PERIOD_LABELS[listing.rentalPeriod]}</p>
      </Link>;
    })}</div>
    {profile && profile.activeListings.length === 0 && <p className={styles.message}>Ce vendeur n’a aucune annonce active.</p>}
  </div></main>;
}
