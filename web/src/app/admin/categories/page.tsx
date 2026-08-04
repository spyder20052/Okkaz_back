"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/types";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ categories: Category[] }>("/categories", undefined, false);
      setCategories(res.data.categories);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Impossible de charger les catégories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const addCategory = async () => {
    const name = newName.trim();
    if (name.length < 2) {
      setFeedback("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    setActing(true);
    setFeedback(null);
    try {
      const res = await api.post<{ category: Category }>("/categories", {
        name,
        slug: slugify(name),
      });
      setCategories((prev) => [...prev, res.data.category]);
      setNewName("");
      setFeedback(`Catégorie "${name}" créée.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors de la création.");
    } finally {
      setActing(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSortOrder(String(cat.sortOrder));
  };

  const saveEdit = async (cat: Category) => {
    const name = editName.trim();
    if (name.length < 2) {
      setFeedback("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    const sortOrder = Number(editSortOrder);
    setActing(true);
    setFeedback(null);
    try {
      const body: { name: string; sortOrder?: number } = { name };
      if (!Number.isNaN(sortOrder)) body.sortOrder = sortOrder;
      const res = await api.patch<{ category: Category }>(`/categories/${cat.id}`, body);
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, ...res.data.category } : c)));
      setEditingId(null);
      setFeedback(`Catégorie "${name}" mise à jour.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setActing(false);
    }
  };

  const deactivate = async (cat: Category) => {
    if (!confirm(`Désactiver la catégorie "${cat.name}" ? Elle ne sera plus visible sur le site.`)) return;
    setActing(true);
    setFeedback(null);
    try {
      await api.delete(`/categories/${cat.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setFeedback(`Catégorie "${cat.name}" désactivée.`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Erreur lors de la désactivation.");
    } finally {
      setActing(false);
    }
  };

  const visible = categories.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <AdminShell active="/admin/categories">
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>Categories</h1>
            <p>Organise les types de biens, filtres et exigences par categorie.</p>
          </div>
          <label className={styles.search}>
            <span>Search</span>
            <input
              type="search"
              placeholder="Categorie"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className={styles.avatar}>G</div>
        </header>

        <p
          style={{
            margin: "12px 0",
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(234, 179, 8, 0.12)",
            color: "#92400e",
            fontWeight: 700,
            fontSize: "0.84rem",
          }}
        >
          Note : l&apos;API publique ne renvoie que les catégories actives. Une catégorie
          désactivée ne peut pas être consultée ni réactivée depuis cette interface
          (endpoint admin manquant).
        </p>

        {feedback ? <p className={styles.adminModerationEmpty}>{feedback}</p> : null}

        <section className={styles.actionPageGrid}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Categories actives ({visible.length})</h2>
            </div>
            {loading ? (
              <p className={styles.adminModerationEmpty}>Chargement...</p>
            ) : visible.length === 0 ? (
              <p className={styles.adminModerationEmpty}>Aucune catégorie trouvée.</p>
            ) : (
              <div className={styles.actionList}>
                {visible.map((category) => (
                  <div className={styles.actionItem} key={category.id}>
                    <span>#{category.sortOrder}</span>
                    <div>
                      {editingId === category.id ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            aria-label="Nom de la catégorie"
                            style={{ minHeight: 36, border: "1px solid var(--line)", borderRadius: 8, padding: "0 10px", font: "inherit" }}
                          />
                          <input
                            type="number"
                            value={editSortOrder}
                            onChange={(e) => setEditSortOrder(e.target.value)}
                            aria-label="Ordre d'affichage"
                            style={{ minHeight: 36, border: "1px solid var(--line)", borderRadius: 8, padding: "0 10px", font: "inherit" }}
                          />
                        </div>
                      ) : (
                        <>
                          <strong>{category.name}</strong>
                          <p>{category.description ?? `slug : ${category.slug}`}</p>
                        </>
                      )}
                    </div>
                    {editingId === category.id ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        <button type="button" disabled={acting} onClick={() => void saveEdit(category)}>
                          Sauver
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}>
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 6 }}>
                        <button type="button" onClick={() => startEdit(category)}>
                          Editer
                        </button>
                        <button type="button" disabled={acting} onClick={() => void deactivate(category)}>
                          Desactiver
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>

          <aside className={styles.simulator}>
            <h2>Nouvelle categorie</h2>
            <label>
              Nom
              <input
                type="text"
                placeholder="Ex: Materiel agricole"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <label>
              Slug (auto)
              <input type="text" value={slugify(newName) || "—"} readOnly />
            </label>
            <button type="button" disabled={acting} onClick={() => void addCategory()}>
              Ajouter
            </button>
          </aside>
        </section>
      </section>
    </AdminShell>
  );
}
