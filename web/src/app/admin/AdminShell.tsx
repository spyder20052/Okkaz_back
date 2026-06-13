"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./admin.module.css";

type AdminShellProps = {
  active: string;
  children: React.ReactNode;
};

const menuItems = [
  { href: "/admin", label: "Dashboard", icon: "D" },
  { href: "/admin/annonces", label: "Annonces", icon: "A", badge: "8" },
  { href: "/admin/kyc", label: "Vérifications", icon: "V", badge: "2" },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "U" },
  { href: "/admin/abonnements", label: "Abonnements", icon: "B" },
  { href: "/admin/paiements", label: "Paiements", icon: "P" },
  { href: "/admin/categories", label: "Categories", icon: "C" },
  { href: "/admin/journal", label: "Journal", icon: "J" },
  { href: "/admin/reglages", label: "Reglages", icon: "S" },
];

export default function AdminShell({ active, children }: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className={styles.page}>
      <button
        type="button"
        className={styles.mobileMenuButton}
        aria-label={menuOpen ? "Fermer le menu admin" : "Ouvrir le menu admin"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        )}
      </button>

      <button
        type="button"
        className={`${styles.sidebarOverlay} ${menuOpen ? styles.sidebarOverlayOpen : ""}`}
        aria-label="Fermer le menu admin"
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`} aria-label="Navigation admin">
        <Link href="/" className={styles.brand}>
          <Image
            src="/okazz-logo-final.png"
            alt="OKKAZ"
            width={6250}
            height={6250}
            className={styles.brandLogo}
            priority
          />
        </Link>

        <nav className={styles.menu}>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.menuItem} ${active === item.href ? styles.active : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className={styles.menuIcon}>{item.icon}</span>
              <span className={styles.menuLabel}>{item.label}</span>
              {item.badge ? <em className={styles.menuBadge}>{item.badge}</em> : null}
            </Link>
          ))}
        </nav>

        <Link href="/admin/profil" className={styles.profileCard} onClick={() => setMenuOpen(false)}>
          <span className={styles.profileAvatar}>OK</span>
          <span className={styles.profileText}>
            <strong>Admin OKKAZ</strong>
            <span>Operations</span>
          </span>
          <span className={styles.profileChevron} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </Link>

        <Link href="/connexion" className={styles.logoutButton} onClick={() => setMenuOpen(false)}>
          <span className={styles.logoutIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span>Déconnexion</span>
        </Link>
      </aside>

      {children}
    </main>
  );
}
