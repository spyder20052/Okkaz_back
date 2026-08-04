"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import styles from "./connexion.module.css";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import type { ApiUser, UserRole } from "@/lib/types";

type Mode = "login" | "register";

function homeForRole(user: ApiUser): string {
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "SELLER" || user.role === "SELLER_PRO") return "/vendeur";
  return "/demandes";
}

// Reflète les règles du middleware (src/proxy.ts) : qui peut aller où.
function roleAllows(role: UserRole, path: string): boolean {
  if (path.startsWith("/admin")) return role === "ADMIN";
  if (path.startsWith("/vendeur")) return role === "SELLER" || role === "SELLER_PRO" || role === "ADMIN";
  return true;
}

const ROLE_LABELS: Record<UserRole, string> = {
  BUYER: "Acheteur",
  SELLER: "Vendeur",
  SELLER_PRO: "Vendeur Premium",
  ADMIN: "Administrateur",
};

export default function ConnexionPage() {
  const router = useRouter();
  const { user, isLoading, login, register, logout, becomeSeller } = useAuth();

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

  function destinationFor(user: ApiUser): string {
    const requested = new URLSearchParams(window.location.search).get("next");
    return requested?.startsWith("/") && !requested.startsWith("//") ? requested : homeForRole(user);
  }

  // Déjà connecté avec un rôle suffisant pour la destination : on y retourne
  // directement (l'AuthProvider vient de reposer le cookie de session que lit
  // le middleware — couvre les sessions créées avant l'ajout du cookie).
  const connectedDestination = user ? destinationForConnected(user) : null;
  useEffect(() => {
    if (!isLoading && user && connectedDestination) {
      router.replace(connectedDestination);
    }
  }, [isLoading, user, connectedDestination, router]);

  function destinationForConnected(u: ApiUser): string | null {
    const dest = destinationFor(u);
    return roleAllows(u.role, dest) ? dest : null;
  }

  async function handleBecomeSeller() {
    setError(null);
    setIsSubmitting(true);
    try {
      const updated = await becomeSeller();
      router.replace(destinationFor(updated));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Activation impossible. Réessayez.");
      setIsSubmitting(false);
    }
  }

  async function handleSwitchAccount() {
    await logout();
    setError(null);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(identifier, password);
      router.push(destinationFor(user));
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
      router.push(destinationFor(user));
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

      <section className={`${styles.card} ${mode === "register" ? styles.registerCard : ""}`}>
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

        {user && connectedDestination ? (
          // Session valide + rôle suffisant : redirection en cours (useEffect).
          <p className={styles.subtitle}>Reconnexion en cours…</p>
        ) : user ? (
          // Connecté mais rôle insuffisant pour la page demandée (ex. acheteur
          // qui clique « Publier un bien ») : expliquer au lieu de re-demander
          // une connexion.
          <div className={styles.form}>
            <p className={styles.subtitle}>
              Vous êtes connecté en tant que <strong>{user.firstName}</strong> (
              {ROLE_LABELS[user.role]}).
            </p>
            {user.role === "BUYER" ? (
              <>
                <p className={styles.subtitle}>
                  La publication d&apos;annonces nécessite un compte vendeur. Vous pouvez
                  activer le mode vendeur sur ce compte — une vérification d&apos;identité
                  (KYC) vous sera ensuite demandée avant la première publication.
                </p>
                <button
                  type="button"
                  className={styles.btnApple}
                  disabled={isSubmitting}
                  onClick={handleBecomeSeller}
                >
                  {isSubmitting ? "Activation…" : "Activer le mode vendeur"}
                </button>
              </>
            ) : (
              <p className={styles.subtitle}>
                Cette page est réservée à un autre type de compte.
              </p>
            )}
            <button type="button" className={styles.switchMode} onClick={handleSwitchAccount}>
              Se déconnecter et changer de compte
            </button>
          </div>
        ) : mode === "login" ? (
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
            <Link href="/mot-de-passe-oublie" className={styles.switchMode}>
              Mot de passe oublié ?
            </Link>
            <button type="submit" className={styles.btnApple} disabled={isSubmitting}>
              {isSubmitting ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        ) : (
          <form className={`${styles.form} ${styles.registerForm}`} onSubmit={handleRegister}>
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
                Compte personnel
              </button>
              <button
                type="button"
                className={role === "SELLER" ? styles.roleActive : styles.roleBtn}
                onClick={() => setRole("SELLER")}
              >
                Je veux aussi publier
              </button>
            </div>
            <p className={styles.subtitle} style={{ margin: 0 }}>
              Tous les comptes peuvent consulter, demander, contacter et payer. Le compte vendeur ajoute la publication de biens.
            </p>
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
