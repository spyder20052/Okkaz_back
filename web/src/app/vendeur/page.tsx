"use client";

import { Suspense, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { mockAds, type Ad } from "@/lib/data";
import SellerShell from "./SellerShell";
import styles from "./vendeur.module.css";

type Tab = "overview" | "settings";
type AdItem = Ad & { paused?: boolean; reveals?: number };

const INITIAL_ADS: AdItem[] = mockAds.slice(0, 4).map((ad, i) => ({
  ...ad,
  paused: false,
  reveals: [3, 1, 0, 2][i] ?? 0,
}));

function UserSpaceContent() {
  const searchParams = useSearchParams();
  const isPublished = searchParams.get("publie") === "success";
  const [tab, setTab] = useState<Tab>("overview");
  const [name, setName] = useState("Emma TODEDJI");
  const [email, setEmail] = useState("todedjiemma9@gmail.com");
  const [phone, setPhone] = useState("0168678025");
  const [photo, setPhoto] = useState<string | null>(null);
  const [ads, setAds] = useState<AdItem[]>(INITIAL_ADS);
  const [pseudo, setPseudo] = useState("");
  const [showFullName, setShowFullName] = useState(true);
  const [whatsappDisabled, setWhatsappDisabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("68678025");
  const [location, setLocation] = useState("Cotonou, Bénin");
  const [momoOperator, setMomoOperator] = useState<"MTN" | "MOOV">("MOOV");
  const [momoNumber, setMomoNumber] = useState("0168678025");
  const [bio, setBio] = useState("");
  const [identityDoc, setIdentityDoc] = useState("");
  const [businessDoc, setBusinessDoc] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const totalReveals = ads.reduce((sum, a) => sum + (a.reveals ?? 0), 0);
  const stats = {
    contactsDebloques: totalReveals,
    vues: ads.length * 124,
    enLigne: ads.filter((a) => !a.paused).length,
  };
  const revealsByAd = ads.filter((a) => (a.reveals ?? 0) > 0);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const togglePause = (id: string) =>
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, paused: !a.paused } : a)));

  const deleteAd = (id: string) => {
    if (confirm("Supprimer définitivement cette annonce ?")) {
      setAds((prev) => prev.filter((a) => a.id !== id));
    }
  };

  return (
    <SellerShell active="/vendeur">
      <section className={styles.spaceContent}>
        {isPublished && (
          <div style={{ background: "var(--green-soft)", color: "var(--green)", padding: "16px 20px", borderRadius: "18px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 6px 18px rgba(22, 163, 74, 0.08)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Annonce publiée avec succès !
          </div>
        )}
        <div className={styles.spaceTopRow}>
          <header className={styles.spaceHeader}>
            <h1>Mon Espace</h1>
            <p>Bon retour, {name}</p>
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
                <strong>{stats.contactsDebloques}</strong>
                <p>Numéros débloqués</p>
              </article>

              <article className={styles.statTile}>
                <span className={`${styles.statTileIcon} ${styles.statTileIconBlue}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </span>
                <small>VUES</small>
                <strong>{stats.vues.toLocaleString("fr-FR")}</strong>
                <p>30 derniers jours</p>
              </article>

              <article className={styles.statTile}>
                <span className={`${styles.statTileIcon} ${styles.statTileIconOrange}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </span>
                <small>ALERTES</small>
                <strong>0</strong>
                <p>aucune alerte</p>
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
                  <h2>Mes Annonces <span className={styles.spaceAdsCount}>{ads.length}</span></h2>
                  <div className={styles.spaceAdsHeaderActions}>
                    <Link href="/vendeur/publier" className={styles.spaceVendreBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                      </svg>
                      Publier
                    </Link>
                  </div>
                </header>

                {ads.length === 0 ? (
                  <p className={styles.spaceAdsEmpty}>Aucune annonce. <Link href="/vendeur/publier">Publier la première</Link></p>
                ) : (
                  <ul className={styles.spaceAdsList}>
                    {ads.map((ad) => (
                      <li key={ad.id} className={`${styles.spaceAdCard} ${ad.paused ? styles.spaceAdCardPaused : ""}`}>
                        <div className={styles.spaceAdImage}>
                          <Image src={ad.image} alt={ad.title} width={88} height={88} />
                          {ad.paused && <span className={styles.spaceAdPausedBadge}>En pause</span>}
                        </div>
                        <div className={styles.spaceAdBody}>
                          <strong>{ad.title}</strong>
                          <em>{ad.price.toLocaleString("fr-FR")} F</em>
                          <span>{ad.category}</span>
                        </div>
                        <div className={styles.spaceAdActions}>
                          <Link href={`/annonces/${ad.id}`} className={`${styles.spaceAdActionBtn} ${styles.spaceAdActionBoost}`} aria-label="Voir l'annonce publique" title="Voir">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </Link>
                          <Link href={`/vendeur/publier?modifier=${ad.id}`} className={`${styles.spaceAdActionBtn} ${styles.spaceAdActionEdit}`} aria-label="Modifier" title="Modifier">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </Link>
                          <Link href={`/paiement?type=boost&annonce=${ad.id}`} className={`${styles.spaceAdActionBtn} ${styles.spaceAdActionPremium}`} aria-label="Booster cette annonce" title="Booster">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>
                          </Link>
                          <button type="button" onClick={() => togglePause(ad.id)} className={`${styles.spaceAdActionBtn} ${styles.spaceAdActionPause}`} aria-label={ad.paused ? "Reactiver" : "Mettre en pause"} title={ad.paused ? "Réactiver" : "Pause"}>
                            {ad.paused ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                            )}
                          </button>
                          <button type="button" onClick={() => deleteAd(ad.id)} className={`${styles.spaceAdActionBtn} ${styles.spaceAdActionDelete}`} aria-label="Supprimer" title="Supprimer">
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
                  Numéros débloqués
                </h2>
                {revealsByAd.length === 0 ? (
                  <p className={styles.spaceAdsEmpty}>Aucun contact débloqué pour vos annonces.</p>
                ) : (
                  <ul className={styles.revealsList}>
                    {revealsByAd.map((ad) => (
                      <li key={ad.id} className={styles.revealItem}>
                        <div className={styles.revealItemImage}>
                          <Image src={ad.image} alt={ad.title} width={56} height={56} />
                        </div>
                        <div className={styles.revealItemBody}>
                          <strong>{ad.title}</strong>
                          <small>{ad.category}</small>
                        </div>
                        <span className={styles.revealItemCount}>
                          {ad.reveals} {ad.reveals === 1 ? "personne" : "personnes"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}


              </div>
            </div>
          </>
        ) : (
          <>
            <article className={styles.spaceProfileCard}>
              <div className={styles.spaceProfileCover} aria-hidden />
              <div className={styles.spaceProfileAvatarWrap}>
                <div className={styles.spaceProfileAvatar}>
                  {photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={photo} alt="Profil" />
                  ) : (
                    <span>{name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
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
                OKKAZ Member
              </span>
              <div className={styles.spaceProfileTitleWrap}>
                <h2>Photo de profil</h2>
                <p>Prend en charge JPG, PNG et GIF.</p>
              </div>
            </article>

            {/* Nom + Email + Téléphone */}
            <div className={styles.settingsForm2}>
              <label className={styles.settingsField}>
                <span className={styles.settingsLabel}>Nom Complet</span>
                <input className={styles.settingsInput} type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </label>

              <label className={styles.settingsField}>
                <span className={styles.settingsLabel}>Adresse email</span>
                <div className={styles.settingsInputIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <small className={styles.settingsHint}>Si l&apos;email est déjà utilisé par un autre compte, la modification sera refusée.</small>
              </label>

              <label className={styles.settingsField}>
                <span className={styles.settingsLabel}>Numéro de téléphone <em>(Livraison)</em></span>
                <div className={styles.settingsInputIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </label>
            </div>

            {/* Confidentialité */}
            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>
                <span className={`${styles.settingsSectionIcon} ${styles.iconBlue}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </span>
                Confidentialité
              </h3>
              <div className={styles.settingsRow2}>
                <label className={styles.settingsField}>
                  <span className={styles.settingsLabel}>Pseudo</span>
                  <input className={styles.settingsInput} type="text" value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Votre pseudo visible" />
                </label>
                <label className={styles.toggleInline}>
                  <span className={styles.toggleSwitch}>
                    <input type="checkbox" checked={showFullName} onChange={(e) => setShowFullName(e.target.checked)} />
                    <span />
                  </span>
                  Afficher mon nom complet publiquement
                </label>
              </div>
              <small className={styles.settingsHint}>
                Si vous masquez votre nom, votre <strong>pseudo</strong> sera affiché aux autres utilisateurs. Le pseudo est obligatoire si le nom est masqué.
              </small>
            </section>

            {/* Notifications WhatsApp */}
            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>
                <span className={`${styles.settingsSectionIcon} ${styles.iconGreen}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </span>
                Notifications WhatsApp
              </h3>
              <p className={styles.settingsSectionLead}>Vos notifications sont envoyées par WhatsApp par défaut sur votre numéro de téléphone.</p>
              <div className={styles.whatsappCard}>
                <div className={styles.whatsappRow}>
                  <span className={`${styles.whatsappRowIcon} ${styles.iconGreen}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  </span>
                  <div>
                    <strong>WhatsApp activé par défaut</strong>
                    <p>Commandes, livraisons, messages et paiements sont envoyés sur votre numéro de téléphone.</p>
                  </div>
                </div>
                <label className={styles.whatsappRow}>
                  <span className={styles.toggleSwitch}>
                    <input type="checkbox" checked={whatsappDisabled} onChange={(e) => setWhatsappDisabled(e.target.checked)} />
                    <span />
                  </span>
                  <div>
                    <strong>Désactiver les notifications WhatsApp</strong>
                    <p>Les notifications seront envoyées par email à la place</p>
                  </div>
                </label>
                <div className={styles.whatsappWarning}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  L&apos;envoi WhatsApp a échoué sur votre numéro. Configurez un numéro WhatsApp différent ci-dessous.
                </div>
                <label className={styles.settingsField}>
                  <span className={styles.settingsLabel}>Numéro WhatsApp pour les notifications</span>
                  <div className={`${styles.settingsInputIcon} ${styles.iconGreen}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
                  </div>
                  <small className={styles.settingsHint}>Laissez vide pour utiliser votre numéro de téléphone principal. Sinon, les notifications seront envoyées sur ce numéro.</small>
                </label>
              </div>
            </section>

            {/* Localisation */}
            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>Localisation</h3>
              <div className={styles.locationRow}>
                <div className={styles.settingsInputIcon} style={{ flex: 1 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Cotonou, Bénin" />
                </div>
                <button type="button" className={styles.locationBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>
                  Ma position
                </button>
              </div>
              <small className={styles.settingsHint}>Utilisé par nos livreurs pour faciliter la livraison de vos achats.</small>
            </section>

            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>
                <span className={`${styles.settingsSectionIcon} ${styles.iconBlue}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M14 10h4M14 14h4M5 18h14"/></svg>
                </span>
                Pièces de vérification
              </h3>
              <p className={styles.settingsSectionLead}>
                Ces documents sont envoyés au back-office pour vérifier votre identité avant publication ou activation premium.
              </p>
              <div className={styles.settingsRow2}>
                <label className={styles.documentUpload}>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setIdentityDoc(e.target.files?.[0]?.name ?? "")} />
                  <span>Identité</span>
                  <strong>{identityDoc || "Déposer une pièce d'identité"}</strong>
                  <small>CNI, passeport ou permis · PDF/JPG/PNG</small>
                </label>
                <label className={styles.documentUpload}>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setBusinessDoc(e.target.files?.[0]?.name ?? "")} />
                  <span>Professionnel</span>
                  <strong>{businessDoc || "Déposer un document professionnel"}</strong>
                  <small>RCCM ou document entreprise si disponible</small>
                </label>
              </div>
            </section>

            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>
                <span className={`${styles.settingsSectionIcon} ${styles.iconOrange}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>
                </span>
                Offres payantes
              </h3>
              <p className={styles.settingsSectionLead}>
                Les paiements premium et boost sont envoyés au back-office. OKKAZ reçoit la notification et accorde l&apos;avantage après validation.
              </p>
              <div className={styles.paidOffersGrid}>
                <Link href="/paiement?type=abonnement&plan=Premium%20mois" className={styles.paidOfferCard}>
                  <span>Premium</span>
                  <strong>Premium mois</strong>
                  <p>Badge Pro, photos illimitées et meilleure visibilité du compte.</p>
                  <em>10 000 FCFA / mois</em>
                </Link>
                <div className={styles.paidOfferCard}>
                  <span>Boost</span>
                  <strong>Attaché à une annonce</strong>
                  <p>Le boost se paie depuis la ligne de l&apos;annonce à promouvoir, pas depuis le compte.</p>
                  <em>5 000 FCFA / annonce</em>
                </div>
              </div>
            </section>

            {/* Numéro de retrait MoMo */}
            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>
                <span className={`${styles.settingsSectionIcon} ${styles.iconOrange}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                </span>
                Numéro de retrait MoMo
              </h3>
              <p className={styles.settingsSectionLead}>
                Ce numéro recevra vos paiements 24h après chaque livraison. <strong className={styles.settingsMandatory}>Obligatoire pour publier.</strong>
              </p>
              <div className={styles.momoRow}>
                <div className={styles.settingsField}>
                  <span className={styles.settingsLabel}>Opérateur</span>
                  <div className={styles.operatorPills}>
                    <button type="button" className={`${styles.operatorPill} ${momoOperator === "MTN" ? styles.operatorPillActive : ""}`} onClick={() => setMomoOperator("MTN")}>
                      MTN MoMo
                    </button>
                    <button type="button" className={`${styles.operatorPill} ${momoOperator === "MOOV" ? styles.operatorPillActive : ""}`} onClick={() => setMomoOperator("MOOV")}>
                      MOOV Money
                    </button>
                  </div>
                </div>
                <label className={styles.settingsField}>
                  <span className={styles.settingsLabel}>Numéro MoMo</span>
                  <div className={styles.settingsInputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <input type="tel" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} />
                  </div>
                </label>
              </div>
            </section>

            {/* Bio */}
            <section className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>Bio / À propos</h3>
              <textarea
                className={styles.bioTextarea}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Dites-en un peu plus sur vous, vos goûts, etc..."
                rows={4}
              />
            </section>

            <button type="button" className={styles.spaceSettingsSave}>Enregistrer les modifications</button>
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
