"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import styles from "../../espace.module.css";

export default function ResetPasswordPage() {
  const token = String(useParams<{ token: string }>().token ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true); setError(null);
    try {
      const response = await api.post<unknown>(`/auth/reset-password/${encodeURIComponent(token)}`, { newPassword: password }, false);
      setMessage(response.message || "Mot de passe modifié.");
    } catch (err) { setError(err instanceof ApiError ? err.message : "Lien invalide ou expiré."); }
    finally { setLoading(false); }
  }
  return <main className={styles.page}><section className={`${styles.narrow} ${styles.card}`}>
    <h1>Nouveau mot de passe</h1>
    {message ? <><p className={styles.message}>{message}</p><Link className={styles.button} href="/connexion">Se connecter</Link></> :
      <form className={styles.form} onSubmit={submit}>
        {error && <p className={styles.error}>{error}</p>}
        <label className={styles.field}>Mot de passe<input className={styles.input} type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <label className={styles.field}>Confirmation<input className={styles.input} type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
        <button className={styles.button} disabled={loading}>{loading ? "Modification…" : "Modifier le mot de passe"}</button>
      </form>}
  </section></main>;
}
