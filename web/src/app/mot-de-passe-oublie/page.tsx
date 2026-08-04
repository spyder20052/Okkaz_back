"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";
import styles from "../connexion/connexion.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    try {
      const response = await api.post<unknown>("/auth/forgot-password", { email }, false);
      setMessage(response.message || "Si ce compte existe, un lien de réinitialisation a été envoyé.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’envoyer la demande.");
    } finally { setLoading(false); }
  }

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <Image
          src="/IMG_0537.PNG"
          alt="Illustration Okkaz"
          width={900}
          height={900}
          className={styles.heroPicture}
          priority
        />
      </div>
      <section className={`${styles.card} ${styles.forgotCard}`}>
        <Image
          src="/IMG_0537.PNG"
          alt=""
          width={520}
          height={520}
          className={styles.cardPicture}
          aria-hidden
        />

        <div className={styles.text}>
          <h1 className={styles.title}>Mot de passe oublié ?</h1>
          <p className={styles.subtitle}>
            Saisissez votre adresse email. Nous vous enverrons un lien de réinitialisation.
          </p>
        </div>

        {message && <p className={styles.success}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}

        {!message && (
          <form className={styles.form} onSubmit={submit}>
            <label className={styles.field}>
              <span className={styles.label}>Adresse email</span>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@exemple.com"
                autoComplete="email"
                required
              />
            </label>
            <button className={styles.btnApple} disabled={loading}>
              {loading ? "Envoi en cours…" : "Envoyer le lien"}
            </button>
          </form>
        )}

        <Link href="/connexion" className={styles.switchMode}>
          ← Retour à la connexion
        </Link>
      </section>
    </main>
  );
}
