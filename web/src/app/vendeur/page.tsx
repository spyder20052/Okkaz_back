"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  LISTING_STATUS_LABELS,
  RENTAL_PERIOD_LABELS,
  formatPrice,
  type KycDocument,
  type KycDocumentType,
  type KycStatus,
  type Listing,
  type ListingStatus,
  type Payment,
  type Subscription,
} from "@/lib/types";
import SellerShell from "./SellerShell";
import styles from "./vendeur.module.css";

type Tab = "overview" | "settings";
type ContactRevealHistory = {
  id: string;
  createdAt: string;
  phone?: string;
  contactPhone?: string;
  listing?: Pick<Listing, "id" | "title">;
};

const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  NONE: "Identité non vérifiée",
  PENDING: "Vérification en cours",
  APPROVED: "Identité vérifiée",
  REJECTED: "Vérification refusée",
};

const KYC_DOC_LABELS: Record<KycDocumentType, string> = {
  ID_CARD: "Carte d'identité",
  PASSPORT: "Passeport",
  DRIVER_LICENSE: "Permis de conduire",
};

const PAYMENT_TYPE_LABELS: Record<Payment["type"], string> = {
  SUBSCRIPTION: "Abonnement Premium",
  DEMAND_LISTING: "Demande standard",
  EXPRESS_DEMAND: "Demande express",
};

const PAYMENT_STATUS_LABELS: Record<Payment["status"], string> = {
  SUCCESS: "Réussi",
  PENDING: "En attente",
  FAILED: "Échec",
  REFUNDED: "Remboursé",
};

const STATUS_BADGE_STYLE: Record<ListingStatus, React.CSSProperties> = {
  ACTIVE: { background: "#dcfce7", color: "#15803d" },
  PENDING: { background: "#fef3c7", color: "#b45309" },
  REJECTED: { background: "#fee2e2", color: "#b91c1c" },
  PAUSED: { background: "#e5e7eb", color: "#374151" },
  DELETED: { background: "#e5e7eb", color: "#6b7280" },
};

function statusBadge(listing: Listing) {
  return (
    <span
      style={{
        ...STATUS_BADGE_STYLE[listing.status],
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: "0.7rem",
        fontWeight: 800,
        display: "inline-block",
      }}
      title={listing.status === "REJECTED" && listing.rejectionReason ? `Motif : ${listing.rejectionReason}` : undefined}
    >
      {LISTING_STATUS_LABELS[listing.status]}
    </span>
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Une erreur est survenue. Réessayez.";
}

function UserSpaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPublished = searchParams.get("publie") === "success";
  const { user, refreshUser, logout } = useAuth();
  const [tab, setTab] = useState<Tab>(() =>
    searchParams.get("onglet") === "parametres" ? "settings" : "overview",
  );

  useEffect(() => {
    if (searchParams.get("onglet") !== "parametres") return;
    const frame = requestAnimationFrame(() => {
      document.getElementById("verification-identite")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [searchParams]);

  // --- Annonces du vendeur ---
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // --- Abonnement ---
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [contactHistory, setContactHistory] = useState<ContactRevealHistory[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);

  // --- KYC ---
  const [kycStatus, setKycStatus] = useState<KycStatus>(user?.kycStatus ?? "NONE");
  const [kycDocument, setKycDocument] = useState<KycDocument | null>(null);
  const [kycDocType, setKycDocType] = useState<KycDocumentType>("ID_CARD");
  const [kycFront, setKycFront] = useState<File | null>(null);
  const [kycBack, setKycBack] = useState<File | null>(null);
  const [kycUploading, setKycUploading] = useState(false);
  const [kycFeedback, setKycFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // --- Profil (Paramètres) ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<string | null>(null); // preview locale uniquement (pas d'upload avatar côté API)
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Mot de passe ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Pas de setState synchrone : appelable depuis un effet (l'état initial est déjà "chargement").
  const loadListings = useCallback(
    () =>
      api
        .getPaginated<Listing>("/users/me/listings", { limit: 50 })
        .then((res) => {
          setListings(res.data);
          setListingsError(null);
        })
        .catch((err) => setListingsError(errorMessage(err)))
        .finally(() => setListingsLoading(false)),
    [],
  );

  const retryListings = () => {
    setListingsLoading(true);
    setListingsError(null);
    loadListings();
  };

  const loadKyc = useCallback(
    () =>
      api
        .get<{ kycStatus: KycStatus; latestDocument: KycDocument | null }>("/kyc/status")
        .then((res) => {
          setKycStatus(res.data.kycStatus);
          setKycDocument(res.data.latestDocument);
        })
        .catch(() => {
          // statut du profil utilisé par défaut
        }),
    [],
  );

  useEffect(() => {
    refreshUser();
    loadListings();
    loadKyc();
    api
      .get<{ subscription: Subscription | null }>("/subscriptions/me")
      .then((res) => setSubscription(res.data.subscription))
      .catch(() => setSubscription(null));
    api
      .getPaginated<ContactRevealHistory>("/users/me/contact-reveals", { page: 1, limit: 20 })
      .then((res) => setContactHistory(res.data))
      .catch(() => setContactHistory([]));
    api
      .getPaginated<Payment>("/users/me/payments", { page: 1, limit: 20 })
      .then((res) => setPaymentHistory(res.data))
      .catch(() => setPaymentHistory([]));
  }, [refreshUser, loadListings, loadKyc]);

  // Synchronise le formulaire Paramètres avec le profil (ajustement pendant le rendu,
  // une seule fois par utilisateur connecté).
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  if (user && user.id !== syncedUserId) {
    setSyncedUserId(user.id);
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setCity(user.city ?? "");
    setAddress(user.address ?? "");
  }

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
  const activeListings = listings.filter((l) => l.status === "ACTIVE");
  const pendingListings = listings.filter((l) => l.status === "PENDING");
  const stats = {
    contacts: listings.reduce((sum, l) => sum + (l.contactsCount ?? 0), 0),
    vues: listings.reduce((sum, l) => sum + (l.viewsCount ?? 0), 0),
    enAttente: pendingListings.length,
    enLigne: activeListings.length,
  };
  const contactedListings = listings.filter((l) => (l.contactsCount ?? 0) > 0);

  const coverUrl = (listing: Listing): string => {
    const cover = listing.photos?.find((p) => p.isCover) ?? listing.photos?.[0];
    return mediaUrl(cover?.url);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const togglePause = async (listing: Listing) => {
    const action = listing.status === "ACTIVE" ? "pause" : "resume";
    setActionBusyId(listing.id);
    try {
      const res = await api.patch<{ listing: Listing }>(`/listings/${listing.id}/${action}`);
      const updated = res.data?.listing;
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id
            ? { ...l, status: updated?.status ?? (action === "pause" ? "PAUSED" : "ACTIVE") }
            : l,
        ),
      );
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setActionBusyId(null);
    }
  };

  const deleteListing = async (listing: Listing) => {
    if (!confirm("Supprimer définitivement cette annonce ?")) return;
    setActionBusyId(listing.id);
    try {
      await api.delete(`/listings/${listing.id}`);
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setActionBusyId(null);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveFeedback(null);
    try {
      await api.patch<{ user: unknown }>("/users/me", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city: city.trim() || undefined,
        address: address.trim() || undefined,
      });
      await refreshUser();
      setSaveFeedback({ ok: true, text: "Profil mis à jour avec succès." });
    } catch (err) {
      setSaveFeedback({ ok: false, text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const submitKyc = async () => {
    if (!kycFront) {
      setKycFeedback({ ok: false, text: "La photo recto de la pièce est obligatoire (JPEG, PNG ou WEBP, 5 Mo max)." });
      return;
    }
    setKycUploading(true);
    setKycFeedback(null);
    try {
      const formData = new FormData();
      formData.append("documentType", kycDocType);
      formData.append("front_file", kycFront);
      if (kycBack) formData.append("back_file", kycBack);
      await api.upload<{ document: KycDocument }>("/kyc/upload", formData);
      setKycFront(null);
      setKycBack(null);
      setKycFeedback({ ok: true, text: "Document envoyé. Votre identité est en cours de vérification." });
      await loadKyc();
      await refreshUser();
    } catch (err) {
      setKycFeedback({ ok: false, text: errorMessage(err) });
    } finally {
      setKycUploading(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordFeedback({ ok: false, text: "Renseignez le mot de passe actuel et le nouveau mot de passe." });
      return;
    }
    setPasswordBusy(true);
    setPasswordFeedback(null);
    try {
      await api.patch("/users/me/password", { currentPassword, newPassword });
      setPasswordFeedback({ ok: true, text: "Mot de passe modifié. Toutes vos sessions ont été déconnectées, reconnectez-vous." });
      setTimeout(async () => {
        await logout();
        router.push("/connexion");
      }, 2500);
    } catch (err) {
      setPasswordFeedback({ ok: false, text: errorMessage(err) });
    } finally {
      setPasswordBusy(false);
    }
  };

  const feedbackStyle = (ok: boolean): React.CSSProperties => ({
    background: ok ? "var(--green-soft, #dcfce7)" : "#fee2e2",
    color: ok ? "var(--green, #15803d)" : "#b91c1c",
    padding: "12px 16px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: "0.85rem",
  });

  return (
    <SellerShell active="/vendeur">
      <section className={styles.spaceContent}>
        {isPublished && (
          <div style={{ background: "var(--green-soft)", color: "var(--green)", padding: "16px 20px", borderRadius: "18px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 6px 18px rgba(22, 163, 74, 0.08)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Annonce envoyée ! Elle sera visible publiquement après validation par l&apos;équipe OKKAZ (statut : en attente).
          </div>
        )}
        <div className={styles.spaceTopRow}>
          <header className={styles.spaceHeader}>
            <h1>Mon Espace</h1>
            <p>Bon retour, {displayName || "vendeur"}</p>
          </header>

          <div className={styles.tabSwitcher} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "overview"}
              className={`${styles.tabSwitcherBtn} ${tab === "overview" ? styles.tabSwitcherActive : ""}`}
              onClick={() => setTab("overview")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              Vue d&apos;ensemble
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "settings"}
              className={`${styles.tabSwitcherBtn} ${tab === "settings" ? styles.tabSwitcherActive : ""}`}
              onClick={() => setTab("settings")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Paramètres
            </button>
          </div>
        </div>

        {tab === "overview" ? (
          <>
            <h2 className={styles.spaceSectionTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              Tableau de bord
            </h2>

            <div className={styles.statTilesGrid}>
              <article className={styles.statTile}>
                <span className={`${styles.statTileIcon} ${styles.statTileIconGreen}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </span>
                <small>CONTACTS</small>
                <strong>{stats.contacts}</strong>
                <p>Contacts consultés</p>
              </article>

              <article className={styles.statTile}>
                <span className={`${styles.statTileIcon} ${styles.statTileIconBlue}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </span>
                <small>VUES</small>
                <strong>{stats.vues.toLocaleString("fr-FR")}</strong>
                <p>Toutes annonces</p>
              </article>

              <article className={styles.statTile}>
                <span className={`${styles.statTileIcon} ${styles.statTileIconOrange}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <small>EN ATTENTE</small>
                <strong>{stats.enAttente}</strong>
                <p>validation admin</p>
              </article>

              <article className={styles.statTile}>
                <span className={`${styles.statTileIcon} ${styles.statTileIconViolet}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                </span>
                <small>EN LIGNE</small>
                <strong>{stats.enLigne}</strong>
                <p>annonces actives</p>
              </article>
            </div>

            <div className={styles.spaceColumns}>
              <div className={styles.spaceColMain}>
                <header className={styles.spaceAdsHeader}>
                  <h2>Mes Annonces <span className={styles.spaceAdsCount}>{listings.length}</span></h2>
                  <div className={styles.spaceAdsHeaderActions}>
                    <Link href="/vendeur/publier" className={styles.spaceVendreBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                      </svg>
                      Publier
                    </Link>
                  </div>
                </header>

                {listingsLoading ? (
                  <p className={styles.spaceAdsEmpty}>Chargement de vos annonces...</p>
                ) : listingsError ? (
                  <p className={styles.spaceAdsEmpty}>
                    {listingsError}{" "}
                    <button type="button" onClick={retryListings} style={{ border: "none", background: "none", color: "var(--green, #15803d)", fontWeight: 800, cursor: "pointer" }}>
                      Réessayer
                    </button>
                  </p>
                ) : listings.length === 0 ? (
                  <p className={styles.spaceAdsEmpty}>Aucune annonce. <Link href="/vendeur/publier">Publier la première</Link></p>
                ) : (
                  <ul className={styles.spaceAdsList}>
                    {listings.map((listing) => (
                      <li key={listing.id} className={`${styles.spaceAdCard} ${listing.status === "PAUSED" ? styles.spaceAdCardPaused : ""}`}>
                        <div className={styles.spaceAdImage}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={coverUrl(listing)} alt={listing.title} width={88} height={88} style={{ objectFit: "cover" }} />
                          {listing.status === "PAUSED" && <span className={styles.spaceAdPausedBadge}>En pause</span>}
                        </div>
                        <div className={styles.spaceAdBody}>
                          <strong>{listing.title}</strong>
                          <em>{formatPrice(listing.rentalPrice)} / {RENTAL_PERIOD_LABELS[listing.rentalPeriod]}</em>
                          <span>{listing.category?.name ?? "—"}</span>
                          {statusBadge(listing)}
                          {listing.status === "REJECTED" && listing.rejectionReason && (
                            <small style={{ color: "#b91c1c", fontWeight: 700 }}>Motif : {listing.rejectionReason}</small>
                          )}
                        </div>
                        <div className={styles.spaceAdActions}>
                          <Link href={`/annonces/${listing.id}`} className={`${styles.spaceAdActionBtn} ${styles.spaceAdActionBoost}`} aria-label="Voir l'annonce publique" title="Voir">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </Link>
                          <Link href={`/vendeur/publier?modifier=${listing.id}`} className={`${styles.spaceAdActionBtn} ${styles.spaceAdActionEdit}`} aria-label="Modifier" title="Modifier">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </Link>
                          {/* Écart backend : pas de boost par annonce — seul l'abonnement Premium met en avant. */}
                          <Link href="/paiement?type=abonnement" className={`${styles.spaceAdActionBtn} ${styles.spaceAdActionPremium}`} aria-label="Passer Premium pour mettre en avant" title="Passer Premium">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>
                          </Link>
                          {(listing.status === "ACTIVE" || listing.status === "PAUSED") && (
                            <button
                              type="button"
                              onClick={() => togglePause(listing)}
                              disabled={actionBusyId === listing.id}
                              className={`${styles.spaceAdActionBtn} ${styles.spaceAdActionPause}`}
                              aria-label={listing.status === "PAUSED" ? "Reprendre" : "Mettre en pause"}
                              title={listing.status === "PAUSED" ? "Reprendre" : "Pause"}
                            >
                              {listing.status === "PAUSED" ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                              )}
                            </button>
                          )}
                          <button type="button" onClick={() => deleteListing(listing)} disabled={actionBusyId === listing.id} className={`${styles.spaceAdActionBtn} ${styles.spaceAdActionDelete}`} aria-label="Supprimer" title="Supprimer">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.spaceColSide}>
                <h2 className={styles.spaceSectionTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  Contacts par annonce
                </h2>
                {contactedListings.length === 0 ? (
                  <p className={styles.spaceAdsEmpty}>Aucun contact consulté pour vos annonces.</p>
                ) : (
                  <ul className={styles.revealsList}>
                    {contactedListings.map((listing) => (
                      <li key={listing.id} className={styles.revealItem}>
                        <div className={styles.revealItemImage}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={coverUrl(listing)} alt={listing.title} width={56} height={56} style={{ objectFit: "cover" }} />
                        </div>
                        <div className={styles.revealItemBody}>
                          <strong>{listing.title}</strong>
                          <small>{listing.category?.name ?? "—"}</small>
                        </div>
                        <span className={styles.revealItemCount}>
                          {listing.contactsCount} {listing.contactsCount === 1 ? "contact" : "contacts"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Encart abonnement Premium */}
                <div className={styles.paidOffersGrid} style={{ marginTop: 18 }}>
                  {subscription && subscription.status === "ACTIVE" ? (
                    <div className={styles.paidOfferCard}>
                      <span>Premium actif</span>
                      <strong>{subscription.plan === "WEEKLY" ? "Abonnement hebdomadaire" : "Abonnement mensuel"}</strong>
                      <p>Vos annonces sont mises en avant et votre numéro direct est visible des acheteurs.</p>
                      <em>Expire le {new Date(subscription.endsAt).toLocaleDateString("fr-FR")}</em>
                    </div>
                  ) : (
                    <Link href="/paiement?type=abonnement" className={styles.paidOfferCard}>
                      <span>Premium</span>
                      <strong>Passer Premium</strong>
                      <p>Mettez vos annonces en avant et affichez votre numéro direct aux acheteurs.</p>
                      <em>Dès 3 000 FCFA / semaine</em>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <section className={styles.historyGrid}>
              <article className={styles.historyCard}>
                <header className={styles.historyHeader}>
                  <span className={`${styles.historyIcon} ${styles.historyIconBlue}`} aria-hidden>↗</span>
                  <div>
                    <small>Mes recherches</small>
                    <h2>Contacts que j&apos;ai consultés</h2>
                  </div>
                  <strong>{contactHistory.length}</strong>
                </header>
                {contactHistory.length === 0 ? (
                  <p className={styles.historyEmpty}>Aucun contact consulté pour le moment.</p>
                ) : (
                  <ul className={styles.historyList}>
                    {contactHistory.map((item) => (
                      <li key={item.id} className={styles.historyItem}>
                        <div className={styles.historyItemMain}>
                          <Link className={styles.historyItemTitle} href={item.listing ? `/annonces/${item.listing.id}` : "/annonces"}>
                            {item.listing?.title ?? "Annonce consultée"}
                          </Link>
                          <p>Consulté le {new Date(item.createdAt).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <span className={styles.historyContact}>{item.phone ?? item.contactPhone ?? "Numéro sécurisé"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className={styles.historyCard}>
                <header className={styles.historyHeader}>
                  <span className={`${styles.historyIcon} ${styles.historyIconGreen}`} aria-hidden>₣</span>
                  <div>
                    <small>Mon activité</small>
                    <h2>Historique des paiements</h2>
                  </div>
                  <strong>{paymentHistory.length}</strong>
                </header>
                {paymentHistory.length === 0 ? (
                  <p className={styles.historyEmpty}>Aucun paiement pour le moment.</p>
                ) : (
                  <ul className={styles.historyList}>
                    {paymentHistory.map((payment) => (
                      <li key={payment.id} className={styles.historyItem}>
                        <div className={styles.historyItemMain}>
                          <b className={styles.historyItemTitle}>{PAYMENT_TYPE_LABELS[payment.type]}</b>
                          <p>{new Date(payment.createdAt).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <div className={styles.historyPaymentMeta}>
                          <span className={`${styles.historyStatus} ${styles[`historyStatus_${payment.status.toLowerCase()}`]}`}>
                            {PAYMENT_STATUS_LABELS[payment.status]}
                          </span>
                          <strong>{formatPrice(payment.amount)}</strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>
          </>
        ) : (
          <>
            <article className={styles.spaceProfileCard}>
              <div className={styles.spaceProfileCover} aria-hidden />
              <div className={styles.spaceProfileAvatarWrap}>
                <div className={styles.spaceProfileAvatar}>
                  {photo || user?.profilePhotoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={photo ?? mediaUrl(user?.profilePhotoUrl)} alt="Profil" />
                  ) : (
                    <span>{(displayName || "OK").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <button type="button" className={styles.spaceProfileUploadBtn} onClick={() => fileRef.current?.click()} aria-label="Changer la photo">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
              </div>
              <span className={styles.spaceProfileBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>
                {user?.role === "SELLER_PRO" ? "Vendeur Pro" : "OKKAZ Member"}
              </span>
              <div className={styles.spaceProfileTitleWrap}>
                <h2>Photo de profil</h2>
                <p>Aperçu local uniquement — l&apos;envoi de photo de profil n&apos;est pas encore disponible.</p>
              </div>
            </article>

            {/* Identité + coordonnées */}
            <div className={styles.settingsForm2}>
              <label className={styles.settingsField}>
                <span className={styles.settingsLabel}>Prénom</span>
                <input className={styles.settingsInput} type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>

              <label className={styles.settingsField}>
                <span className={styles.settingsLabel}>Nom</span>
                <input className={styles.settingsInput} type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>

              <label className={styles.settingsField}>
                <span className={styles.settingsLabel}>Adresse email</span>
                <div className={styles.settingsInputIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input type="email" value={user?.email ?? ""} disabled readOnly />
                </div>
                <small className={styles.settingsHint}>L&apos;email n&apos;est pas modifiable depuis cet espace.</small>
              </label>

              <label className={styles.settingsField}>
                <span className={styles.settingsLabel}>Numéro de téléphone</span>
                <div className={styles.settingsInputIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <input type="tel" value={user?.phone ?? ""} disabled readOnly />
                </div>
                <small className={styles.settingsHint}>Le numéro de compte n&apos;est pas modifiable depuis cet espace.</small>
              </label>
            </div>

            {/* Localisation */}
            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>Localisation</h3>
              <div className={styles.settingsRow2}>
                <label className={styles.settingsField}>
                  <span className={styles.settingsLabel}>Ville</span>
                  <div className={styles.settingsInputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Cotonou" maxLength={100} />
                  </div>
                </label>
                <label className={styles.settingsField}>
                  <span className={styles.settingsLabel}>Adresse</span>
                  <input className={styles.settingsInput} type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quartier, rue..." maxLength={500} />
                </label>
              </div>
            </section>

            {saveFeedback && <p style={feedbackStyle(saveFeedback.ok)}>{saveFeedback.text}</p>}

            <button type="button" className={styles.spaceSettingsSave} onClick={saveProfile} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>

            {/* Vérification d'identité (KYC) */}
            <section id="verification-identite" className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>
                <span className={`${styles.settingsSectionIcon} ${styles.iconBlue}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M14 10h4M14 14h4M5 18h14"/></svg>
                </span>
                Vérification d&apos;identité (KYC)
              </h3>
              <p className={styles.settingsSectionLead}>
                Votre identité doit être vérifiée pour publier des annonces.
              </p>

              <p
                style={{
                  ...(kycStatus === "APPROVED"
                    ? { background: "#dcfce7", color: "#15803d" }
                    : kycStatus === "PENDING"
                    ? { background: "#fef3c7", color: "#b45309" }
                    : kycStatus === "REJECTED"
                    ? { background: "#fee2e2", color: "#b91c1c" }
                    : { background: "#e5e7eb", color: "#374151" }),
                  display: "inline-block",
                  borderRadius: 999,
                  padding: "6px 14px",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                }}
              >
                {KYC_STATUS_LABELS[kycStatus]}
              </p>
              {kycDocument && (
                <p className={styles.settingsHint} style={{ display: "block", marginTop: 6 }}>
                  Dernier document : {KYC_DOC_LABELS[kycDocument.documentType]} —{" "}
                  {kycDocument.status === "PENDING" ? "en cours d'examen" : kycDocument.status === "APPROVED" ? "approuvé" : "refusé"}
                  {kycDocument.status === "REJECTED" && kycDocument.rejectionReason ? ` (motif : ${kycDocument.rejectionReason})` : ""}
                </p>
              )}

              {kycStatus !== "APPROVED" && kycStatus !== "PENDING" && (
                <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                  <label className={styles.settingsField}>
                    <span className={styles.settingsLabel}>Type de document</span>
                    <select className={styles.settingsInput} value={kycDocType} onChange={(e) => setKycDocType(e.target.value as KycDocumentType)}>
                      <option value="ID_CARD">Carte d&apos;identité</option>
                      <option value="PASSPORT">Passeport</option>
                      <option value="DRIVER_LICENSE">Permis de conduire</option>
                    </select>
                  </label>
                  <div className={styles.settingsRow2}>
                    <label className={styles.documentUpload}>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setKycFront(e.target.files?.[0] ?? null)} />
                      <span>Recto (obligatoire)</span>
                      <strong>{kycFront?.name ?? "Déposer le recto de la pièce"}</strong>
                      <small>JPEG, PNG ou WEBP · 5 Mo max</small>
                    </label>
                    <label className={styles.documentUpload}>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setKycBack(e.target.files?.[0] ?? null)} />
                      <span>Verso (optionnel)</span>
                      <strong>{kycBack?.name ?? "Déposer le verso de la pièce"}</strong>
                      <small>JPEG, PNG ou WEBP · 5 Mo max</small>
                    </label>
                  </div>
                  <button type="button" className={styles.spaceSettingsSave} onClick={submitKyc} disabled={kycUploading} style={{ justifySelf: "start" }}>
                    {kycUploading ? "Envoi en cours..." : "Envoyer pour vérification"}
                  </button>
                </div>
              )}
              {kycFeedback && <p style={{ ...feedbackStyle(kycFeedback.ok), marginTop: 10 }}>{kycFeedback.text}</p>}
            </section>

            {/* Abonnement */}
            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>
                <span className={`${styles.settingsSectionIcon} ${styles.iconOrange}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>
                </span>
                Abonnement Premium
              </h3>
              {subscription && subscription.status === "ACTIVE" ? (
                <p className={styles.settingsSectionLead}>
                  Abonnement <strong>{subscription.plan === "WEEKLY" ? "hebdomadaire" : "mensuel"}</strong> actif jusqu&apos;au{" "}
                  <strong>{new Date(subscription.endsAt).toLocaleDateString("fr-FR")}</strong>. Vos annonces sont mises en avant et votre numéro direct est visible.
                </p>
              ) : (
                <>
                  <p className={styles.settingsSectionLead}>
                    Aucun abonnement actif. Le Premium met vos annonces en avant et affiche votre numéro direct aux acheteurs.
                  </p>
                  <div className={styles.paidOffersGrid}>
                    <Link href="/paiement?type=abonnement" className={styles.paidOfferCard}>
                      <span>Premium</span>
                      <strong>Souscrire un abonnement</strong>
                      <p>Hebdomadaire 3 000 FCFA ou mensuel 10 000 FCFA. Paiement via KKiaPay.</p>
                      <em>Voir les formules</em>
                    </Link>
                  </div>
                </>
              )}
            </section>

            {/* Mot de passe */}
            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>Changer le mot de passe</h3>
              <p className={styles.settingsSectionLead}>
                8 caractères minimum avec majuscule, minuscule et chiffre. Toutes vos sessions seront déconnectées.
              </p>
              <div className={styles.settingsRow2}>
                <label className={styles.settingsField}>
                  <span className={styles.settingsLabel}>Mot de passe actuel</span>
                  <input className={styles.settingsInput} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                </label>
                <label className={styles.settingsField}>
                  <span className={styles.settingsLabel}>Nouveau mot de passe</span>
                  <input className={styles.settingsInput} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                </label>
              </div>
              {passwordFeedback && <p style={{ ...feedbackStyle(passwordFeedback.ok), marginTop: 10 }}>{passwordFeedback.text}</p>}
              <button type="button" className={styles.spaceSettingsSave} onClick={changePassword} disabled={passwordBusy} style={{ marginTop: 12 }}>
                {passwordBusy ? "Modification..." : "Modifier le mot de passe"}
              </button>
            </section>

            <p className={styles.settingsHint} style={{ display: "block" }}>
              Les options pseudo, notifications WhatsApp, numéro de retrait MoMo et bio ne sont pas encore disponibles sur OKKAZ.
            </p>
          </>
        )}
      </section>
    </SellerShell>
  );
}

export default function UserSpacePage() {
  return (
    <Suspense fallback={<div>Chargement de l&apos;espace vendeur...</div>}>
      <UserSpaceContent />
    </Suspense>
  );
}
