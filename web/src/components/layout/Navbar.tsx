"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { ApiUser } from "@/lib/types";
import styles from "./Navbar.module.css";

function spaceForRole(user: ApiUser): string {
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "SELLER" || user.role === "SELLER_PRO") return "/vendeur";
  return "/annonces";
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuLinks = [
    { href: "/", label: "Accueil" },
    { href: "/annonces", label: "Biens" },
    { href: "/demandes", label: "Je recherche" },
    { href: "/vendeur", label: "Publier un bien" },
    { href: "/contact", label: "Contact" },
    { href: "/faq", label: "FAQ" },
    user
      ? { href: spaceForRole(user), label: "Mon espace", mobileOnly: true }
      : { href: "/connexion", label: "Connexion", mobileOnly: true },
  ];

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
    router.push("/");
  };

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/vendeur")) {
    return null;
  }

  if (pathname === "/connexion") {
    return (
      <nav className={styles.nav}>
        <div className={styles.container}>
          <div className={styles.left}>
            <Link href="/" className={styles.logo}>
              <Image
                src="/okazz-logo-final.png"
                alt="OKKAZ"
                width={6250}
                height={6250}
                priority
                className={styles.logoImage}
              />
            </Link>
          </div>
          <Link href="/" className={styles.connexionBack}>
            <span aria-hidden style={{ marginRight: 8 }}>←</span> Accueil
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className={styles.nav}>
      {isMenuOpen && (
        <button
          type="button"
          className={styles.menuBackdrop}
          aria-label="Fermer le menu"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
      <div className={styles.container}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/okazz-logo-final.png"
              alt="OKKAZ"
              width={6250}
              height={6250}
              priority
              className={styles.logoImage}
            />
          </Link>
        </div>
        
        <div className={styles.right}>
          {pathname === "/connexion" ? (
            <Link href="/" className={styles.loginBtn}>
              ACCUEIL <span aria-hidden style={{ marginLeft: 8, fontWeight: 900 }}>→</span>
            </Link>
          ) : (
            <Link href="/contact" className={styles.chatBtn}>
              PARLER À OKKAZ <span className={styles.chatIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </span>
            </Link>
          )}

          {user ? (
            <>
              <Link href={spaceForRole(user)} className={styles.loginBtn}>
                MON ESPACE
              </Link>
              <button
                type="button"
                className={styles.loginBtn}
                onClick={handleLogout}
                style={{ cursor: "pointer", fontFamily: "inherit" }}
              >
                DÉCONNEXION
              </button>
            </>
          ) : (
            <Link href="/connexion" className={styles.loginBtn}>
              CONNEXION
            </Link>
          )}
          <div className={styles.menuWrap}>
            <button
              type="button"
              className={styles.menuBtn}
              aria-expanded={isMenuOpen}
              aria-controls="site-menu"
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              <span className={styles.menuLabel}>Menu</span>
              <span className={styles.menuIcon} aria-hidden>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              </span>
            </button>
            <div
              id="site-menu"
              className={`${styles.menuPanel} ${isMenuOpen ? styles.menuPanelOpen : ""}`}
            >
              {menuLinks.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={item.mobileOnly ? styles.mobileOnlyLink : undefined}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {user && (
                <button
                  type="button"
                  className={styles.mobileOnlyLink}
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    minHeight: 58,
                    border: "none",
                    borderRadius: 16,
                    padding: "0 1rem",
                    background: "transparent",
                    color: "#171717",
                    font: "inherit",
                    fontSize: "0.92rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    textAlign: "left",
                    alignItems: "center",
                  }}
                >
                  Déconnexion
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
