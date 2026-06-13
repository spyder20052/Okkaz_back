"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readPlatformEvents, type PlatformEvent } from "@/lib/platformEvents";
import AdminShell from "./AdminShell";
import styles from "./admin.module.css";

type Tab = "overview" | "settings";

type Pending = {
  id: string;
  title: string;
  meta: string;
};

const INITIAL_ADS: Pending[] = [
  { id: "AN-2401", title: "Toyota Hilux 2018 - Cotonou", meta: "Vehicules · Soumis il y a 14h" },
  { id: "AN-2400", title: "Studio meuble Akpakpa", meta: "Immobilier · Soumis il y a 22h" },
  { id: "AN-2398", title: "MacBook Pro M2 16''", meta: "Electronique · Soumis il y a 2j (urgent)" },
];

const INITIAL_KYC: Pending[] = [
  { id: "KYC-487", title: "Emma TODEDJI", meta: "CNI · Particulier · Soumis il y a 6h" },
  { id: "KYC-486", title: "Immo Benin SARL", meta: "RCCM · Pro · Soumis il y a 1j" },
];

const INITIAL_CATEGORIES = [
  "Vehicules",
  "Immobilier",
  "Electronique",
  "Equipements Pro",
  "Evenementiel",
  "Mobilier",
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [newCategory, setNewCategory] = useState("");
  const [contactPrice, setContactPrice] = useState("2500");
  const [adminName, setAdminName] = useState("Admin OKKAZ");
  const [adminEmail, setAdminEmail] = useState("admin@okkaz.bj");
  const [events, setEvents] = useState<PlatformEvent[]>([]);

  useEffect(() => {
    const syncEvents = () => setEvents(readPlatformEvents());

    syncEvents();
    window.addEventListener("okkaz-events-updated", syncEvents);
    window.addEventListener("storage", syncEvents);

    return () => {
      window.removeEventListener("okkaz-events-updated", syncEvents);
      window.removeEventListener("storage", syncEvents);
    };
  }, []);

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories((prev) => [...prev, trimmed]);
    setNewCategory("");
  };

  const removeCategory = (cat: string) => {
    if (confirm(`Supprimer la categorie "${cat}" ?`)) {
      setCategories((prev) => prev.filter((c) => c !== cat));
    }
  };

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
                  <strong>{INITIAL_ADS.length + INITIAL_KYC.length + events.filter((event) => event.status === "pending").length}</strong>
                  actions ouvertes
                </span>
                <span>
                  <strong>{events.filter((event) => event.status === "pending").length}</strong>
                  paiements a accorder
                </span>
                <span>
                  <strong>98%</strong>
                  paiements OK
                </span>
              </div>
            </section>

            <div className={styles.stats}>
              <Link href="/admin/annonces" className={styles.statCard}>
                <span className={styles.icon}>A</span>
                <h2>Annonces</h2>
                <p>A valider sous 72h</p>
                <strong>{INITIAL_ADS.length}</strong>
              </Link>
              <Link href="/admin/kyc" className={styles.statCard}>
                <span className={styles.icon}>K</span>
                <h2>Identités</h2>
                <p>Comptes à vérifier</p>
                <strong>{INITIAL_KYC.length}</strong>
              </Link>
              <Link href="/admin/paiements" className={styles.statCard}>
                <span className={styles.icon}>F</span>
                <h2>Revenu</h2>
                <p>Collecte ce mois</p>
                <strong>{events.reduce((sum, event) => sum + (event.amount ?? 0), 0).toLocaleString("fr-FR")}</strong>
              </Link>
              <Link href="/admin/utilisateurs" className={styles.statCard}>
                <span className={styles.icon}>U</span>
                <h2>Utilisateurs</h2>
                <p>Actifs cette semaine</p>
                <strong>184</strong>
              </Link>
            </div>

            <div className={styles.adminDashboardFocus}>
              <section className={styles.card}>
                <header className={styles.cardHeader}>
                  <div>
                    <h2>Revenus plateforme</h2>
                    <p>
                      Tendance des encaissements OKKAZ, <span>7 derniers jours</span>
                    </p>
                  </div>
                  <Link href="/admin/paiements">Details</Link>
                </header>
                <div className={styles.chart} aria-label="Graphique revenus hebdomadaires">
                  <span style={{ height: "46%" }} />
                  <span style={{ height: "62%" }} />
                  <span style={{ height: "54%" }} />
                  <span style={{ height: "78%" }} />
                  <span style={{ height: "68%" }} />
                  <span style={{ height: "84%" }} />
                  <span style={{ height: "92%" }} />
                </div>
                <div className={styles.chartLabels}>
                  <span>Lun</span>
                  <span>Mar</span>
                  <span>Mer</span>
                  <span>Jeu</span>
                  <span>Ven</span>
                  <span>Sam</span>
                  <span>Dim</span>
                </div>
              </section>

              <section className={styles.card}>
                <header className={styles.cardHeader}>
                  <div>
                    <h2>Alertes</h2>
                    <p>Points qui demandent une decision rapide.</p>
                  </div>
                </header>
                <div className={styles.notifList}>
                  {events.slice(0, 4).map((event) => (
                    <Link
                      href={event.type === "subscription_payment" ? "/admin/abonnements" : "/admin/paiements"}
                      key={event.id}
                      className={`${styles.notifItem} ${event.status === "pending" ? styles.notif_warning : styles.notif_info}`}
                    >
                      <span className={styles.notifDot} />
                      <span>
                        <strong>{event.title}</strong>
                        <p>{event.detail}</p>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : (
          <>
            <div className={styles.settingsGrid}>
              <article className={styles.adminSettingCard}>
                <h2 className={styles.spaceSectionTitle}>Tarification Option Numéro Direct</h2>
                <p className={styles.adminSettingLead}>
                  Montant payé par le vendeur pour afficher directement son numéro sur l&apos;annonce. Cet argent est encaissé par OKKAZ.
                </p>
                <div className={styles.adminSettingRow}>
                  <label className={styles.adminSettingField}>
                    <span>Prix (FCFA)</span>
                    <input type="number" value={contactPrice} onChange={(e) => setContactPrice(e.target.value)} />
                  </label>
                </div>
              </article>

              <article className={styles.adminSettingCard}>
                <h2 className={styles.spaceSectionTitle}>Compte administrateur</h2>
                <div className={styles.adminSettingRow}>
                  <label className={styles.adminSettingField}>
                    <span>Nom complet</span>
                    <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                  </label>
                  <label className={styles.adminSettingField}>
                    <span>Email</span>
                    <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                  </label>
                </div>
                <label className={styles.adminSettingField}>
                  <span>Mot de passe</span>
                  <input type="password" defaultValue="********" />
                </label>
              </article>
            </div>

            <article className={styles.adminSettingCard}>
              <h2 className={styles.spaceSectionTitle}>Categories d&apos;annonces</h2>
              <p className={styles.adminSettingLead}>Categories visibles dans le formulaire de publication et les filtres.</p>
              <ul className={styles.adminCategoryList}>
                {categories.map((cat) => (
                  <li key={cat} className={styles.adminCategoryChip}>
                    {cat}
                    <button type="button" onClick={() => removeCategory(cat)} aria-label={`Supprimer ${cat}`}>
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
                      addCategory();
                    }
                  }}
                />
                <button type="button" onClick={addCategory}>
                  Ajouter
                </button>
              </div>
            </article>

            <button type="button" className={styles.adminSettingSave}>
              Enregistrer les modifications
            </button>
          </>
        )}
      </section>
    </AdminShell>
  );
}
