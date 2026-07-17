"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Category, Demand, DemandType, Payment } from "@/lib/types";
import SellerShell from "../../SellerShell";
import styles from "../../vendeur.module.css";

export default function NewRequestPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [photo, setPhoto] = useState<string | null>(null); // décoratif : non transmis au backend (pas de champ photo sur les demandes)
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [budget, setBudget] = useState("");
  const [city, setCity] = useState("");
  const [urgency, setUrgency] = useState<DemandType>("STANDARD");
  const [propertyValue, setPropertyValue] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<{ categories: Category[] }>("/categories", undefined, false)
      .then((res) => {
        setCategories(res.data.categories);
        setCategoryId((prev) => prev || res.data.categories[0]?.id || "");
      })
      .catch(() => setError("Impossible de charger les catégories. Rechargez la page."));
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (title.trim().length < 5) {
      setError("Décrivez votre besoin (5 caractères minimum)");
      return;
    }
    if (!categoryId) {
      setError("Choisissez une catégorie");
      return;
    }
    if (city.trim().length < 2) {
      setError("Indiquez la ville ou zone souhaitée");
      return;
    }
    const fullDescription = description.trim() || title.trim();
    if (fullDescription.length < 10) {
      setError("Ajoutez quelques détails (10 caractères minimum)");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        categoryId,
        title: title.trim(),
        description: fullDescription,
        city: city.trim(),
        type: urgency,
        method: "MOBILE_MONEY",
      };
      const budgetValue = Number(budget.replace(/\D/g, ""));
      if (budgetValue > 0) body.maxBudget = budgetValue;
      if (urgency === "EXPRESS") {
        const value = Number(propertyValue.replace(/\D/g, ""));
        if (value > 0) body.propertyValue = value;
      }
      const res = await api.post<{ demand: Demand; payment: Payment }>("/demands/initiate", body);
      const { payment } = res.data;
      const params = new URLSearchParams({
        type: "recherche",
        paymentId: payment.id,
        ref: payment.providerRef ?? "",
        amount: String(Number(payment.amount)),
      });
      router.push(`/paiement?${params.toString()}`);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "INSUFFICIENT_ROLE" || err.status === 403)) {
        // Écart backend : POST /demands/initiate est réservé au rôle BUYER
        // alors que cette page vit dans l'espace vendeur.
        setError("Les demandes « Je recherche » sont réservées aux comptes acheteurs. Connectez-vous avec un compte acheteur pour publier une demande.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
      setSubmitting(false);
    }
  };

  return (
    <SellerShell active="/vendeur/recherches">
      <section className={styles.spaceContent}>
        <div className={styles.publishTop}>
          <Link href="/vendeur" className={styles.publishBack} aria-label="Annuler et retourner au profil">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </Link>
          <span className={styles.publishCancel}>Annuler</span>
        </div>

        <div className={styles.requestLayout}>
          <div className={styles.requestColLeft}>
            <span className={styles.publishKicker}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              JE RECHERCHE
            </span>

            <h1 className={styles.publishTitle}>
              Trouve ce dont <span>tu as besoin.</span>
            </h1>
            <p className={styles.publishDesc}>
              Décris ton besoin en deux mots. La publication d&apos;une demande est payante :
              2 500 FCFA en Standard, 5 000 FCFA minimum en Express.
            </p>

            <article className={styles.wizardCard}>
          <div className={styles.wizardBody}>
            {/* Photo de référence : aperçu local uniquement (le backend ne prend pas de photo sur les demandes). */}
            <div className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Photo de référence <em style={{ color: "var(--muted)", fontStyle: "normal", fontWeight: 700 }}>(optionnel, non transmise pour le moment)</em>
              </span>
              {photo ? (
                <div className={styles.wizardPhotoSlotFilled} style={{ aspectRatio: "16/9", maxWidth: 360 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="Référence" />
                  <button type="button" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }} aria-label="Retirer">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <button type="button" className={styles.wizardPhotoDropzone} onClick={() => fileRef.current?.click()} style={{ aspectRatio: "16/9", maxWidth: 360 }}>
                  <span className={styles.wizardPhotoDropzoneIcon}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </span>
                  <strong>Ajouter une photo</strong>
                  <small>PNG, JPG · facultatif</small>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            </div>

            {/* Titre du besoin */}
            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Que recherches-tu ?
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Générateur 5 kVA à louer 3 jours"
                className={styles.wizardInput}
                maxLength={255}
              />
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Catégorie</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={styles.wizardSelect}>
                {categories.length === 0 && <option value="">Chargement...</option>}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Budget maximum (FCFA, optionnel)</span>
              <input
                type="text"
                inputMode="numeric"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^0-9 ]/g, ""))}
                placeholder="Ex: 90 000"
                className={styles.wizardInput}
              />
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Ville ou zone</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Porto-Novo"
                className={styles.wizardInput}
                maxLength={100}
              />
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Priorité</span>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value as DemandType)} className={styles.wizardSelect}>
                <option value="STANDARD">Standard - 2 500 FCFA</option>
                <option value="EXPRESS">Express - min. 5 000 FCFA (3% de la valeur du bien)</option>
              </select>
            </label>

            {urgency === "EXPRESS" && (
              <label className={styles.wizardField}>
                <span className={styles.wizardFieldLabel}>Valeur estimée du bien (FCFA, optionnel)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={propertyValue}
                  onChange={(e) => setPropertyValue(e.target.value.replace(/[^0-9 ]/g, ""))}
                  placeholder="Ex: 500 000"
                  className={styles.wizardInput}
                />
                <small style={{ color: "var(--muted, #6b7280)", fontWeight: 600 }}>
                  Le tarif Express est de 3% de cette valeur, avec un minimum de 5 000 FCFA.
                </small>
              </label>
            )}

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Détails utiles</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Durée, livraison, état attendu, contraintes..."
                className={styles.wizardTextarea}
                rows={4}
                maxLength={5000}
              />
            </label>
          </div>

          {error && (
            <p className={styles.wizardError}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {error}
            </p>
          )}

          <div className={styles.wizardFooter}>
            <Link href="/vendeur" className={styles.wizardCancelBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Annuler
            </Link>
            <button type="button" onClick={submit} disabled={submitting} className={styles.wizardNextBtn}>
              {submitting ? "Création en cours..." : "Continuer vers le paiement"}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </article>
          </div>

          <aside className={styles.requestColSide} aria-hidden>
            <div className={styles.requestBubble}>
              <strong>Hey !</strong>
              <p>Dis-moi ce que tu cherches et je préviens nos vendeurs vérifiés. Tu reçois leurs offres en quelques heures.</p>
              <span className={styles.requestBubbleTail} aria-hidden />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/18.png?v=20260527-trim"
              alt=""
              width={6250}
              height={6250}
              className={styles.requestMascot}
            />
          </aside>
        </div>
      </section>
    </SellerShell>
  );
}
