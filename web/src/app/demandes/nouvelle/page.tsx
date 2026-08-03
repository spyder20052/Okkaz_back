"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Category, Demand, DemandType, Payment } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import SellerShell from "../../vendeur/SellerShell";
import styles from "../../vendeur/vendeur.module.css";

const TOTAL_STEPS = 4;
const DEMAND_ROLES = ["BUYER", "SELLER", "SELLER_PRO", "ADMIN"];

export default function NewRequestPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
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
        setCategoryId((current) => current || res.data.categories[0]?.id || "");
      })
      .catch(() => setError("Impossible de charger les catégories. Rechargez la page."));
  }, []);

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validateStep = (currentStep: number): string | null => {
    if (currentStep === 2) {
      if (title.trim().length < 5) return "Décrivez votre besoin (5 caractères minimum).";
      if (!categoryId) return "Choisissez une catégorie.";
    }
    if (currentStep === 3 && city.trim().length < 2) {
      return "Indiquez la ville ou zone souhaitée.";
    }
    if (currentStep === 4 && (description.trim() || title.trim()).length < 10) {
      return "Ajoutez quelques détails (10 caractères minimum).";
    }
    return null;
  };

  const next = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  };

  const prev = () => {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  };

  const submit = async () => {
    if (!user) {
      router.push("/connexion?next=/demandes/nouvelle");
      return;
    }

    for (let currentStep = 1; currentStep <= TOTAL_STEPS; currentStep += 1) {
      const validationError = validateStep(currentStep);
      if (validationError) {
        setError(validationError);
        setStep(currentStep);
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        categoryId,
        title: title.trim(),
        description: description.trim() || title.trim(),
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
        setError("Votre compte ne peut pas encore publier une demande.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
      setSubmitting(false);
    }
  };

  const isDone = (number: number) => number < step;
  const isActive = (number: number) => number === step;

  return (
    <SellerShell active="/demandes/nouvelle" allowedRoles={DEMAND_ROLES}>
      <section className={`${styles.spaceContent} ${styles.publishFlowContent}`}>
        <div className={styles.publishTop}>
          <Link href="/demandes" className={styles.publishBack} aria-label="Annuler et retourner à mes demandes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </Link>
          <span className={styles.publishCancel}>Annuler</span>
        </div>

        <div className={styles.requestLayout}>
          <div className={styles.requestColLeft}>
            <span className={styles.publishKicker}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              DÉCRIRE MON BESOIN
            </span>

            <h1 className={styles.publishTitle}>Trouve ce dont <span>tu as besoin.</span></h1>
            <p className={styles.publishDesc}>
              Décris ton besoin en deux mots. La publication d&apos;une demande est payante :
              2 500 FCFA en Standard, 5 000 FCFA minimum en Express.
            </p>

            {!authLoading && !user && <p className={styles.wizardError}>Connectez-vous pour publier une demande.</p>}

            <article className={styles.wizardCard}>
              <span className={styles.wizardTopBar} aria-hidden />

              <ol className={styles.wizardSteps} aria-label="Étapes">
                {[1, 2, 3, 4].map((number, index) => (
                  <li key={number} className={styles.wizardStepItem}>
                    <span className={`${styles.wizardStepDot} ${isDone(number) ? styles.wizardStepDone : isActive(number) ? styles.wizardStepActive : ""}`}>
                      {isDone(number) ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : number}
                    </span>
                    {index < 3 && <span className={`${styles.wizardStepLine} ${isDone(number) ? styles.wizardStepLineDone : ""}`} aria-hidden />}
                  </li>
                ))}
              </ol>

              {step === 1 && (
                <div className={styles.wizardBody}>
                  <header className={styles.wizardStepHeader}>
                    <h2>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Photo de référence <span>(optionnelle)</span>
                    </h2>
                  </header>
                  <div className={styles.wizardPhotoGrid}>
                    {photo ? (
                      <div className={styles.wizardPhotoSlotFilled}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt="Référence" />
                        <button type="button" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }} aria-label="Retirer">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ) : (
                      <button type="button" className={styles.wizardPhotoDropzone} onClick={() => fileRef.current?.click()}>
                        <span className={styles.wizardPhotoDropzoneIcon}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </span>
                        <strong>Ajouter</strong>
                        <small>PNG, JPG, WEBP</small>
                      </button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} hidden />
                  <small style={{ color: "var(--muted)", fontWeight: 650 }}>La photo sert d&apos;aperçu et ne sera pas transmise pour le moment.</small>
                </div>
              )}

              {step === 2 && (
                <div className={styles.wizardBody}>
                  <label className={styles.wizardField}>
                    <span className={styles.wizardFieldLabel}>Que recherches-tu ?</span>
                    <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex : Générateur 5 kVA à louer 3 jours" className={styles.wizardInput} maxLength={255} />
                  </label>
                  <label className={styles.wizardField}>
                    <span className={styles.wizardFieldLabel}>Catégorie</span>
                    <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={styles.wizardSelect}>
                      {categories.length === 0 && <option value="">Chargement...</option>}
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </label>
                </div>
              )}

              {step === 3 && (
                <div className={styles.wizardBody}>
                  <label className={styles.wizardField}>
                    <span className={styles.wizardFieldLabel}>Budget maximum (FCFA, optionnel)</span>
                    <input type="text" inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value.replace(/[^0-9 ]/g, ""))} placeholder="Ex : 90 000" className={styles.wizardInput} />
                  </label>
                  <label className={styles.wizardField}>
                    <span className={styles.wizardFieldLabel}>Ville ou zone</span>
                    <input type="text" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ex : Porto-Novo" className={styles.wizardInput} maxLength={100} />
                  </label>
                  <label className={styles.wizardField}>
                    <span className={styles.wizardFieldLabel}>Priorité</span>
                    <select value={urgency} onChange={(event) => setUrgency(event.target.value as DemandType)} className={styles.wizardSelect}>
                      <option value="STANDARD">Standard - 2 500 FCFA</option>
                      <option value="EXPRESS">Express - min. 5 000 FCFA</option>
                    </select>
                  </label>
                  {urgency === "EXPRESS" && (
                    <label className={styles.wizardField}>
                      <span className={styles.wizardFieldLabel}>Valeur estimée du bien (FCFA, optionnel)</span>
                      <input type="text" inputMode="numeric" value={propertyValue} onChange={(event) => setPropertyValue(event.target.value.replace(/[^0-9 ]/g, ""))} placeholder="Ex : 500 000" className={styles.wizardInput} />
                    </label>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className={styles.wizardBody}>
                  <label className={styles.wizardField}>
                    <span className={styles.wizardFieldLabel}>Détails utiles</span>
                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Durée, livraison, état attendu, contraintes..." className={styles.wizardTextarea} rows={5} maxLength={5000} />
                  </label>
                </div>
              )}

              {error && <p className={styles.wizardError}>{error}</p>}

              <div className={styles.wizardFooter}>
                {step > 1 ? (
                  <button type="button" onClick={prev} className={styles.wizardBackBtn}>Précédent</button>
                ) : (
                  <Link href="/demandes" className={styles.wizardCancelBtn}>Annuler</Link>
                )}
                {step < TOTAL_STEPS ? (
                  <button type="button" onClick={next} className={styles.wizardNextBtn}>
                    Continuer
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                ) : (
                  <button type="button" onClick={submit} disabled={submitting || authLoading} className={styles.wizardNextBtn}>
                    {submitting ? "Création en cours..." : "Continuer vers le paiement"}
                  </button>
                )}
              </div>
            </article>
          </div>
        </div>
      </section>
    </SellerShell>
  );
}
