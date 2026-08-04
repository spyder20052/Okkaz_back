"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ApiUser } from "@/lib/types";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

const inputStyle: React.CSSProperties = {
  minHeight: 44,
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "0 14px",
  font: "inherit",
};

export default function AdminProfilePage() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    api
      .get<{ user: ApiUser }>("/users/me")
      .then((res) => {
        const user = res.data.user;
        setFirstName(user.firstName ?? "");
        setLastName(user.lastName ?? "");
        setEmail(user.email ?? "");
        setCity(user.city ?? "");
        setAddress(user.address ?? "");
        if (user.profilePhotoUrl) setPhoto(user.profilePhotoUrl);
      })
      .catch((err) => {
        setFeedback(err instanceof ApiError ? err.message : "Impossible de charger le profil.");
      });
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const saveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setFeedback("Le prénom et le nom sont obligatoires.");
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await api.patch("/users/me", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city: city.trim() || undefined,
        address: address.trim() || undefined,
      });
      await refreshUser();
      setFeedback("Profil mis à jour.");
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      setFeedback("Renseignez le mot de passe actuel et le nouveau mot de passe.");
      return;
    }
    if (
      !confirm(
        "Changer le mot de passe déconnectera toutes vos sessions. Vous devrez vous reconnecter. Continuer ?",
      )
    ) {
      return;
    }
    setChangingPassword(true);
    setFeedback(null);
    try {
      await api.patch("/users/me/password", { currentPassword, newPassword });
      await logout();
      router.push("/connexion");
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors du changement de mot de passe.");
      setChangingPassword(false);
    }
  };

  const initials = `${firstName} ${lastName}`
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AdminShell active="/admin/profil">
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>Profil administrateur</h1>
            <p>Identite, photo et securite du compte.</p>
          </div>
          <div className={styles.avatar}>{initials || "OK"}</div>
        </header>

        {feedback ? <p className={styles.adminModerationEmpty}>{feedback}</p> : null}

        <section className={styles.grid} style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Photo de profil</h2>
                <p>
                  Aperçu local uniquement — l&apos;upload de photo de profil n&apos;est pas
                  encore disponible côté backend.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  position: "relative",
                  width: 96,
                  height: 96,
                  border: "3px dashed rgba(59, 130, 246, 0.4)",
                  borderRadius: "50%",
                  background: photo ? "transparent" : "linear-gradient(135deg, #f97316, #fb923c)",
                  color: "#ffffff",
                  fontSize: "1.4rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  overflow: "hidden",
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 8px 22px rgba(249, 115, 22, 0.28)",
                }}
                aria-label="Changer la photo de profil"
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  initials || "OK"
                )}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                style={{ display: "none" }}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    justifySelf: "flex-start",
                    minHeight: 40,
                    padding: "0 18px",
                    border: 0,
                    borderRadius: 999,
                    background: "var(--ink)",
                    color: "#fff",
                    font: "inherit",
                    fontSize: "0.82rem",
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  {photo ? "Changer la photo" : "Importer une photo"}
                </button>
                {photo ? (
                  <button
                    type="button"
                    onClick={handleRemove}
                    style={{
                      minHeight: 40,
                      padding: "0 18px",
                      border: "1px solid var(--line)",
                      borderRadius: 999,
                      background: "transparent",
                      color: "var(--ink)",
                      font: "inherit",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Supprimer
                  </button>
                ) : (
                  <small style={{ color: "var(--muted)", fontSize: "0.74rem", fontWeight: 650 }}>
                    Par defaut, vos initiales sur fond orange.
                  </small>
                )}
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Securite</h2>
                <p>Changement de mot de passe.</p>
              </div>
            </div>
            <p
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(234, 179, 8, 0.12)",
                color: "#92400e",
                fontWeight: 700,
                fontSize: "0.8rem",
              }}
            >
              La liste des sessions actives n&apos;est pas disponible (endpoint manquant côté
              backend). Le changement de mot de passe révoque toutes les sessions.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, fontSize: "0.78rem", fontWeight: 800 }}>
                Mot de passe actuel
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: "0.78rem", fontWeight: 800 }}>
                Nouveau mot de passe
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </label>
              <button
                type="button"
                disabled={changingPassword}
                onClick={() => void changePassword()}
                style={{
                  justifySelf: "start",
                  minHeight: 44,
                  padding: "0 22px",
                  border: 0,
                  borderRadius: 999,
                  background: "#dc2626",
                  color: "#fff",
                  font: "inherit",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {changingPassword ? "Changement..." : "Changer le mot de passe"}
              </button>
            </div>
          </article>
        </section>

        <article className={styles.card} style={{ marginTop: 32 }}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Informations</h2>
              <p>Mettez a jour vos informations de profil.</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <label style={{ display: "grid", gap: 6, fontSize: "0.78rem", fontWeight: 800 }}>
              Prénom
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: "0.78rem", fontWeight: 800 }}>
              Nom
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: "0.78rem", fontWeight: 800 }}>
              Email (non modifiable)
              <input type="email" value={email} readOnly disabled style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: "0.78rem", fontWeight: 800 }}>
              Ville
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: "0.78rem", fontWeight: 800 }}>
              Adresse
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
            </label>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveProfile()}
            style={{
              marginTop: 16,
              justifySelf: "flex-start",
              minHeight: 44,
              padding: "0 22px",
              border: 0,
              borderRadius: 999,
              background: "var(--ink)",
              color: "#fff",
              font: "inherit",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </article>
      </section>
    </AdminShell>
  );
}
