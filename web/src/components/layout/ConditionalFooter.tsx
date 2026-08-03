"use client";

import { usePathname } from "next/navigation";
import FooterMotionPath from "@/components/FooterMotionPath";
import Footer from "@/components/layout/Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();

  const shouldShowFooter =
    pathname !== "/connexion" &&
    pathname !== "/mot-de-passe-oublie" &&
    !pathname.startsWith("/reset-password/") &&
    !pathname.startsWith("/reinitialiser-mot-de-passe/") &&
    !pathname.startsWith("/verify-email/") &&
    !pathname.startsWith("/verifier-email/") &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/vendeur") &&
    !pathname.startsWith("/demandes") &&
    !pathname.startsWith("/paiement") &&
    !pathname.startsWith("/annonces/");

  if (!shouldShowFooter) return null;

  return (
    <>
      <FooterMotionPath />
      <Footer />
    </>
  );
}
