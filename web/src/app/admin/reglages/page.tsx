"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { SystemSetting } from "@/lib/types";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

export default function AdminReglagesPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ settings: SystemSetting[] }>("/admin/settings");
      setSettings(res.data.settings);
      setValues(Object.fromEntries(res.data.settings.map((s) => [s.key, s.value])));
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Impossible de charger les réglages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async (setting: SystemSetting) => {
    const value = (values[setting.key] ?? "").trim();
    if (!value) {
      setFeedback("La valeur ne peut pas être vide.");
      return;
    }
    setSavingKey(setting.key);
    setFeedback(null);
    try {
      await api.patch(`/admin/settings/${setting.key}`, { value });
      setSettings((prev) => prev.map((s) => (s.key === setting.key ? { ...s, value } : s)));
      setFeedback(`Paramètre "${setting.key}" enregistré.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSavingKey(null);
    }
  };

  const visibleSettings = settings.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${s.key} ${s.description ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <AdminShell active="/admin/reglages">
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>Reglages</h1>
            <p>Paramètres système de la plateforme : tarifs, délais et seuils.</p>
          </div>
          <label className={styles.search}>
            <span>Search</span>
            <input
              type="search"
              placeholder="Parametre"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className={styles.avatar}>R</div>
        </header>

        {feedback ? <p className={styles.adminModerationEmpty}>{feedback}</p> : null}

        {loading ? (
          <p className={styles.adminModerationEmpty}>Chargement des réglages...</p>
        ) : (
          <section className={styles.settingsGrid}>
            {visibleSettings.map((setting) => (
              <article className={styles.simulator} key={setting.key}>
                <h2>{setting.key}</h2>
                <label>
                  {setting.description ?? "Valeur du paramètre"}
                  <input
                    type="text"
                    value={values[setting.key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                    }
                  />
                </label>
                <button
                  type="button"
                  disabled={savingKey === setting.key || values[setting.key] === setting.value}
                  onClick={() => void save(setting)}
                >
                  {savingKey === setting.key ? "Enregistrement..." : "Enregistrer"}
                </button>
              </article>
            ))}
          </section>
        )}

        <article className={styles.simulator} style={{ marginTop: 24 }}>
          <h2>Roles admin</h2>
          <p
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(234, 179, 8, 0.12)",
              color: "#92400e",
              fontWeight: 700,
              fontSize: "0.84rem",
            }}
          >
            Fonctionnalité non disponible : le backend ne propose pas d&apos;endpoint
            d&apos;invitation de membres d&apos;équipe. Utilisez PATCH /admin/users/:id/role
            depuis la page Utilisateurs pour promouvoir un compte existant.
          </p>
        </article>
      </section>
    </AdminShell>
  );
}
