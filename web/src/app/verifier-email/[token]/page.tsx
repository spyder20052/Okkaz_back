"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import styles from "../../espace.module.css";

export default function VerifyEmailPage() {
  const token = String(useParams<{ token: string }>().token ?? "");
  const [state, setState] = useState("Vérification de votre adresse email…");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api.get<unknown>(`/auth/verify-email/${encodeURIComponent(token)}`, undefined, false)
      .then((response) => { if (!cancelled) setState(response.message || "Votre adresse email est vérifiée."); })
      .catch((err) => { if (!cancelled) { setFailed(true); setState(err instanceof ApiError ? err.message : "Lien invalide ou expiré."); } });
    return () => { cancelled = true; };
  }, [token]);
  return <main className={styles.page}><section className={`${styles.narrow} ${styles.card}`}>
    <h1>Vérification d’email</h1><p className={failed ? styles.error : styles.message}>{state}</p>
    <Link className={styles.button} href="/connexion">Continuer</Link>
  </section></main>;
}
