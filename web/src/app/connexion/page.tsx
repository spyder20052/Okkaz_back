"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "./connexion.module.css";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import type { ApiUser } from "@/lib/types";

type Mode = "login" | "register";

function homeForRole(user: ApiUser): string {
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "SELLER" || user.role === "SELLER_PRO") return "/vendeur";
  return "/annonces";
}

export default function ConnexionPage() {
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Register
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(identifier, password);
      router.push(homeForRole(user));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === "INVALID_CREDENTIALS"
            ? "Identifiants incorrects."
            : err.message
          : "Connexion impossible. Vérifiez que le serveur est démarré.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await register({
        firstName,
        lastName,
        email,
        phone,
        password: registerPassword,
        role,
      });
      router.push(homeForRole(user));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "USER_ALREADY_EXISTS") {
          setError("Un compte existe déjà avec cet email ou ce téléphone.");
        } else if (err.code === "VALIDATION_ERROR") {
          setError(
            "Vérifiez les champs : téléphone au format +229XXXXXXXX, mot de passe de 8 caractères min. avec majuscule, minuscule et chiffre.",
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Inscription impossible. Vérifiez que le serveur est démarré.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <Image
          src="/IMG_0537.PNG"
          alt="Illustration de connexion"
          width={900}
          height={900}
          className={styles.heroPicture}
          priority
        />
      </div>

      <section className={styles.card}>
        <Image
          src="/IMG_0537.PNG"
          alt=""
          width={520}
          height={520}
          className={styles.cardPicture}
          aria-hidden
        />

        <div className={styles.text}>
          <h1 className={styles.title}>
            {mode === "login" ? "Bon retour" : "Créer un compte"}
          </h1>
          <p className={styles.subtitle}>
            {mode === "login"
              ? "Connectez-vous pour continuer sur Okkaz"
              : "Rejoignez Okkaz pour louer ou publier des biens"}
          </p>
        </div>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        {mode === "login" ? (
          <form className={styles.form} onSubmit={handleLogin}>
            <label className={styles.field}>
              <span className={styles.label}>Email ou téléphone</span>
              <input
                type="text"
                className={styles.input}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="vous@exemple.com ou +229XXXXXXXX"
                autoComplete="username"
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Mot de passe</span>
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                required
              />
            </label>
            <button type="submit" className={styles.btnApple} disabled={isSubmitting}>
              {isSubmitting ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleRegister}>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span className={styles.label}>Prénom</span>
                <input
                  type="text"
                  className={styles.input}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  minLength={2}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Nom</span>
                <input
                  type="text"
                  className={styles.input}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  minLength={2}
                  required
                />
              </label>
            </div>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Téléphone</span>
              <input
                type="tel"
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+22901020304"
                pattern="^\+?\d{8,15}$"
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Mot de passe</span>
              <input
                type="password"
                className={styles.input}
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="8 caractères min., majuscule, minuscule, chiffre"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <div className={styles.roleChoice}>
              <button
                type="button"
                className={role === "BUYER" ? styles.roleActive : styles.roleBtn}
                onClick={() => setRole("BUYER")}
              >
                Je cherche à louer
              </button>
              <button
                type="button"
                className={role === "SELLER" ? styles.roleActive : styles.roleBtn}
                onClick={() => setRole("SELLER")}
              >
                Je veux publier des biens
              </button>
            </div>
            <button type="submit" className={styles.btnApple} disabled={isSubmitting}>
              {isSubmitting ? "Création…" : "Créer mon compte"}
            </button>
          </form>
        )}

        <button
          type="button"
          className={styles.switchMode}
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login"
            ? "Pas encore de compte ? Inscrivez-vous"
            : "Déjà inscrit ? Connectez-vous"}
        </button>
      </section>
    </main>
  );
}
