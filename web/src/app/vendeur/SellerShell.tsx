"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import styles from "./vendeur.module.css";

const SELLER_ROLES = ["SELLER", "SELLER_PRO", "ADMIN"];

type SellerShellProps = {
  active: string;
  children: React.ReactNode;
  allowedRoles?: string[];
};

export default function SellerShell({ children, allowedRoles = SELLER_ROLES }: SellerShellProps) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || !allowedRoles.includes(user.role))) {
      router.push("/connexion");
    }
  }, [allowedRoles, isLoading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/connexion");
  };

  if (isLoading || !user || !allowedRoles.includes(user.role)) {
    return (
      <main className={styles.profilePage}>
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted, #6b7280)" }}>
          Vérification de votre session...
        </div>
      </main>
    );
  }

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "OK";

  return (
    <main className={styles.profilePage}>
      <header className={styles.profileTopBar}>
        <Link href="/" className={styles.profileBrand}>
          <Image src="/okazz-logo-final.png" alt="OKKAZ" width={6250} height={6250} priority />
        </Link>

        <label className={styles.profileSearch}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="search" placeholder="Rechercher une annonce..." />
        </label>

        <div className={styles.profileTopActions}>
          <Link href="/annonces" className={styles.profileIconBtn} aria-label="Panier">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </Link>
          {/* Écart backend : pas d'API notifications → badge retiré, cloche décorative. */}
          <button type="button" className={`${styles.profileIconBtn} ${styles.profileBellBtn}`} aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          <Link href="/faq" className={styles.profileIconBtn} aria-label="Aide">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </Link>
          <Link href="/vendeur" className={styles.profileAvatarBtn} aria-label="Mon profil">
            <span>{initials}</span>
          </Link>
          <button type="button" onClick={handleLogout} className={styles.profileLogoutBtn} style={{ border: "none", cursor: "pointer" }} aria-label="Déconnexion" title="Déconnexion">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </header>
      {children}
      <button type="button" className={styles.profileChatFab} aria-label="Chat support">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </main>
  );
}
