"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category, Listing, ListingCondition, RentalPeriod } from "@/lib/types";
import SellerShell from "../SellerShell";
import styles from "../vendeur.module.css";

const TOTAL_STEPS = 4;
// Limite du compte SELLER gratuit (le backend renvoie PHOTO_LIMIT_EXCEEDED au-delà).
const MAX_PHOTOS = 4;

const PERIODS: { value: RentalPeriod; label: string }[] = [
  { value: "DAY", label: "Par jour" },
  { value: "WEEK", label: "Par semaine" },
  { value: "MONTH", label: "Par mois" },
];

const CONDITIONS: { value: ListingCondition; label: string }[] = [
  { value: "NEW", label: "Neuf" },
  { value: "GOOD", label: "Bon état" },
  { value: "FAIR", label: "État correct" },
];

const PHONE_REGEX = /^\+?\d{8,15}$/;

interface NewPhoto {
  file: File;
  preview: string;
}

function formatValidationDetails(details: unknown): string {
  if (Array.isArray(details)) {
    return details
      .map((d) => {
        if (typeof d === "string") return d;
        if (d && typeof d === "object") {
          const obj = d as Record<string, unknown>;
          const field = obj.field ?? obj.path ?? obj.param;
          const msg = obj.message ?? obj.msg;
          return field ? `${String(field)} : ${String(msg ?? "invalide")}` : String(msg ?? JSON.stringify(d));
        }
        return String(d);
      })
      .join(" · ");
  }
  if (details && typeof details === "object") {
    return Object.entries(details as Record<string, unknown>)
      .map(([field, msg]) => `${field} : ${String(msg)}`)
      .join(" · ");
  }
  return "";
}

function PublishForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const editId = searchParams.get("modifier");
  const isEditing = !!editId;
  const isPro = user?.role === "SELLER_PRO";

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);

  // Photos : existantes (mode édition, lecture seule) + nouvelles (fichiers à uploader)
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string }[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>("DAY");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [condition, setCondition] = useState<ListingCondition | "">("");
  const [isLoa, setIsLoa] = useState(false);
  const [loaDuration, setLoaDuration] = useState("");
  const [city, setCity] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  // null = non modifié → pré-rempli avec le téléphone du compte.
  const [contactPhoneInput, setContactPhoneInput] = useState<string | null>(null);
  const contactPhone = contactPhoneInput ?? user?.phone?.replace(/\s/g, "") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [kycBlocked, setKycBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalPhotoCount = existingPhotos.length + newPhotos.length;

  // Catégories réelles.
  useEffect(() => {
    api
      .get<{ categories: Category[] }>("/categories", undefined, false)
      .then((res) => setCategories(res.data.categories))
      .catch(() => setError("Impossible de charger les catégories. Rechargez la page."));
  }, []);

  // Mode édition : préremplissage via GET /listings/:id.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    api
      .get<{ listing: Listing }>(`/listings/${editId}`)
      .then((res) => {
        if (cancelled) return;
        const l = res.data.listing;
        setTitle(l.title);
        setDescription(l.description);
        setCategoryId(l.categoryId);
        setPrice(String(Number(l.rentalPrice)));
        setRentalPeriod(l.rentalPeriod);
        setPurchasePrice(l.purchasePrice ? String(Number(l.purchasePrice)) : "");
        setCondition(l.condition);
        setIsLoa(l.isLoa);
        setLoaDuration(l.loaDurationMonths ? String(l.loaDurationMonths) : "");
        setCity(l.locationCity);
        setAddressDetail(l.locationAddress ?? "");
        // Écart backend : l'API ne renvoie jamais le vrai contactPhone (contactPhoneDisplayed
        // est masqué en +22900000000 sans Premium, même pour le propriétaire) → on préremplit
        // avec le téléphone du compte plutôt qu'avec la valeur masquée.
        setExistingPhotos((l.photos ?? []).map((p) => ({ id: p.id, url: p.url })));
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger l'annonce à modifier.");
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = MAX_PHOTOS - totalPhotoCount;
    const toAdd = Array.from(files).slice(0, remaining);
    Promise.all(
      toAdd.map(
        (file) =>
          new Promise<NewPhoto>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ file, preview: reader.result as string });
            reader.readAsDataURL(file);
          }),
      ),
    ).then((items) => setNewPhotos((prev) => [...prev, ...items]));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeNewPhoto = (index: number) => setNewPhotos((prev) => prev.filter((_, i) => i !== index));

  const validateStep = (s: number): string | null => {
    if (s === 1 && totalPhotoCount === 0) return "Au moins 1 photo requise pour continuer";
    if (s === 2) {
      if (title.trim().length < 5) return "Le titre doit contenir au moins 5 caractères";
      if (description.trim().length < 10) return "La description doit contenir au moins 10 caractères";
      if (!categoryId) return "Choisis une catégorie";
    }
    if (s === 3) {
      const value = Number(price.replace(/\s/g, ""));
      if (!value || value <= 0) return "Indique un prix de location valide";
      if (purchasePrice && Number(purchasePrice.replace(/\s/g, "")) <= 0) return "Le prix d'achat doit être supérieur à 0";
      if (!condition) return "Choisis l'état du bien";
      if (isLoa && (!loaDuration || Number(loaDuration) <= 0)) return "Indique la durée LOA en mois";
    }
    if (s === 4) {
      if (city.trim().length < 2) return "Indique ta ville";
      if (!PHONE_REGEX.test(contactPhone.trim())) return "Numéro de contact invalide (format attendu : +22997000001, sans espaces)";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const prev = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async () => {
    for (let s = 1; s <= TOTAL_STEPS; s += 1) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }
    setError(null);
    setKycBlocked(false);
    setSubmitting(true);

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      categoryId,
      rentalPrice: Number(price.replace(/\s/g, "")),
      rentalPeriod,
      condition,
      locationCity: city.trim(),
      contactPhone: contactPhone.trim(),
    };
    if (addressDetail.trim()) body.locationAddress = addressDetail.trim();
    if (purchasePrice.trim()) body.purchasePrice = Number(purchasePrice.replace(/\s/g, ""));
    if (isPro) {
      body.isLoa = isLoa;
      if (isLoa && loaDuration) body.loaDurationMonths = Number(loaDuration);
    }

    try {
      let listingId = editId;
      if (isEditing && editId) {
        await api.patch<{ listing: Listing }>(`/listings/${editId}`, body);
      } else {
        const res = await api.post<{ listing: Listing }>("/listings", body);
        listingId = res.data.listing.id;
      }

      if (listingId && newPhotos.length > 0) {
        const formData = new FormData();
        newPhotos.forEach(({ file }) => formData.append("photos", file));
        if (existingPhotos.length === 0) formData.append("coverIndex", "0");
        try {
          await api.upload(`/listings/${listingId}/photos`, formData);
        } catch (photoErr) {
          if (photoErr instanceof ApiError && photoErr.code === "PHOTO_LIMIT_EXCEEDED") {
            setError("Annonce enregistrée, mais 4 photos maximum en compte gratuit — passez Premium pour en ajouter davantage.");
          } else {
            setError(
              `Annonce enregistrée, mais l'envoi des photos a échoué : ${photoErr instanceof ApiError ? photoErr.message : "erreur inconnue"}`,
            );
          }
          setSubmitting(false);
          return;
        }
      }

      router.push("/vendeur?publie=success");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "KYC_NOT_APPROVED") {
          setKycBlocked(true);
          setError("Votre identité doit être vérifiée avant de publier une annonce.");
        } else if (err.code === "PHOTO_LIMIT_EXCEEDED") {
          setError("4 photos maximum en compte gratuit — passez Premium pour en ajouter davantage.");
        } else if (err.code === "LOA_PRO_ONLY") {
          setError("L'option LOA est réservée aux vendeurs Pro.");
        } else if (err.code === "VALIDATION_ERROR") {
          const detailText = formatValidationDetails(err.details);
          setError(detailText ? `Champs invalides — ${detailText}` : err.message);
        } else {
          setError(err.message);
        }
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
      setSubmitting(false);
    }
  };

  const isDone = (n: number) => n < step;
  const isActive = (n: number) => n === step;

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "—";

  if (loadingEdit) {
    return (
      <section className={styles.spaceContent}>
        <div style={{ padding: 60, textAlign: "center" }}>Chargement de l&apos;annonce...</div>
      </section>
    );
  }

  return (
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>
            {isEditing ? "MODIFIER L'ANNONCE" : "CRÉER UNE ANNONCE"}
          </span>

          <h1 className={styles.publishTitle}>
            {isEditing ? <>Mets à jour <span>ton annonce.</span></> : <>Publie ton <span>bien.</span></>}
          </h1>
          <p className={styles.publishDesc}>
            {isEditing
              ? "Modifie les informations de ton annonce. Les changements seront re-validés par OKKAZ avant publication."
              : "Donne une seconde vie à ton bien et trouve des clients sur OKKAZ. C'est simple, rapide et sécurisé."}
          </p>
      <Link href="/faq" className={styles.publishRules}>
        <span className={styles.publishRulesIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </span>
        Consulter les règles de diffusion
      </Link>

      <article className={styles.wizardCard}>
        <span className={styles.wizardTopBar} aria-hidden />

        <ol className={styles.wizardSteps} aria-label="Étapes">
          {[1, 2, 3, 4].map((n, idx) => (
            <li key={n} className={styles.wizardStepItem}>
              <span
                className={`${styles.wizardStepDot} ${
                  isDone(n) ? styles.wizardStepDone : isActive(n) ? styles.wizardStepActive : ""
                }`}
              >
                {isDone(n) ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  n
                )}
              </span>
              {idx < 3 && (
                <span className={`${styles.wizardStepLine} ${isDone(n) ? styles.wizardStepLineDone : ""}`} aria-hidden />
              )}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <div className={styles.wizardBody}>
            <header className={styles.wizardStepHeader}>
              <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Photos <span>(Max {MAX_PHOTOS} en compte gratuit)</span>
              </h2>
              <span className={styles.wizardCounter}>{totalPhotoCount} / {MAX_PHOTOS}</span>
            </header>

            <div className={styles.wizardPhotoGrid}>
              {existingPhotos.map((photo, idx) => (
                <div key={photo.id} className={styles.wizardPhotoSlotFilled}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(photo.url)} alt={`Photo existante ${idx + 1}`} />
                  {idx === 0 && <span className={styles.wizardPhotoMain}>Principale</span>}
                </div>
              ))}
              {newPhotos.map((photo, idx) => (
                <div key={idx} className={styles.wizardPhotoSlotFilled}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt={`Photo ${idx + 1}`} />
                  <button type="button" onClick={() => removeNewPhoto(idx)} aria-label="Retirer">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {existingPhotos.length === 0 && idx === 0 && <span className={styles.wizardPhotoMain}>Principale</span>}
                </div>
              ))}
              {totalPhotoCount < MAX_PHOTOS && (
                <button type="button" className={styles.wizardPhotoDropzone} onClick={() => fileRef.current?.click()}>
                  <span className={styles.wizardPhotoDropzoneIcon}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </span>
                  <strong>Ajouter</strong>
                  <small>PNG, JPG, WEBP</small>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} style={{ display: "none" }} />
          </div>
        )}

        {step === 2 && (
          <div className={styles.wizardBody}>
            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Titre de l&apos;annonce
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Mercedes-Benz Classe G - Cotonou"
                className={styles.wizardInput}
                maxLength={255}
              />
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décris ton bien : état, points forts, conditions..."
                className={styles.wizardTextarea}
                rows={4}
                maxLength={5000}
              />
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Catégorie</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={styles.wizardSelect}
              >
                <option value="">Choisir...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className={styles.wizardBody}>
            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Prix de location (FCFA)
              </span>
              <div className={styles.wizardPriceInput}>
                <span>F</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9 ]/g, ""))}
                  placeholder="0"
                />
                <span className={styles.wizardPriceArrows}>
                  <svg width="10" height="14" viewBox="0 0 24 24" fill="currentColor"><polyline points="18 15 12 9 6 15" fill="none" stroke="currentColor" strokeWidth="3"/><polyline points="18 17 12 23 6 17" fill="none" stroke="currentColor" strokeWidth="3"/></svg>
                </span>
              </div>
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Période de location</span>
              <select
                value={rentalPeriod}
                onChange={(e) => setRentalPeriod(e.target.value as RentalPeriod)}
                className={styles.wizardSelect}
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Prix d&apos;achat (FCFA, optionnel)</span>
              <input
                type="text"
                inputMode="numeric"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value.replace(/[^0-9 ]/g, ""))}
                placeholder="Laisser vide si location uniquement"
                className={styles.wizardInput}
              />
            </label>

            <div className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>État</span>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ListingCondition)}
                className={styles.wizardSelect}
              >
                <option value="">Choisir...</option>
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {isPro && (
              <>
                <label className={styles.wizardToggleRow}>
                  <span className={styles.wizardToggleSwitch}>
                    <input type="checkbox" checked={isLoa} onChange={(e) => setIsLoa(e.target.checked)} />
                    <span />
                  </span>
                  <div>
                    <strong>Location avec option d&apos;achat (LOA)</strong>
                    <small>Réservé aux vendeurs Pro.</small>
                  </div>
                </label>
                {isLoa && (
                  <label className={styles.wizardField}>
                    <span className={styles.wizardFieldLabel}>Durée LOA (mois)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={loaDuration}
                      onChange={(e) => setLoaDuration(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Ex: 12"
                      className={styles.wizardInput}
                    />
                  </label>
                )}
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className={styles.wizardBody}>
            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Ville
              </span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Cotonou"
                className={styles.wizardInput}
                maxLength={100}
              />
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Quartier / adresse (optionnel)</span>
              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="Ex: Fidjrosse"
                className={styles.wizardInput}
                maxLength={500}
              />
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Téléphone de contact
              </span>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhoneInput(e.target.value.replace(/\s/g, ""))}
                placeholder="+22997000001"
                className={styles.wizardInput}
              />
              <small style={{ color: "var(--muted, #6b7280)", fontWeight: 600 }}>
                Format international sans espaces, ex : +22997000001
              </small>
            </label>

            {/* Écart : l'option payante « Numéro direct » n'existe plus — inclus avec Premium. */}
            <p style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 12, padding: "12px 16px", fontSize: "0.82rem", fontWeight: 600 }}>
              Numéro direct visible par les acheteurs : inclus avec l&apos;abonnement Premium. Sans Premium, un numéro OKKAZ est affiché.
            </p>

            <article className={styles.wizardRecap}>
              <h3>Récapitulatif</h3>
              <dl>
                <div><dt>Photos</dt><dd>{totalPhotoCount}</dd></div>
                <div><dt>Titre</dt><dd>{title || "—"}</dd></div>
                <div><dt>Catégorie</dt><dd>{categoryName}</dd></div>
                <div><dt>Prix</dt><dd>{price ? `${price} FCFA / ${PERIODS.find((p) => p.value === rentalPeriod)?.label.toLowerCase()}` : "—"}</dd></div>
                {purchasePrice && <div><dt>Prix d&apos;achat</dt><dd>{purchasePrice} FCFA</dd></div>}
                <div><dt>État</dt><dd>{CONDITIONS.find((c) => c.value === condition)?.label ?? "—"}</dd></div>
                <div><dt>Contact</dt><dd>{contactPhone || "—"}</dd></div>
              </dl>
            </article>

            <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.8rem", fontWeight: 600 }}>
              Après {isEditing ? "modification" : "publication"}, l&apos;annonce est envoyée en validation admin (statut « en attente ») avant d&apos;être visible publiquement.
            </p>
          </div>
        )}

        {error && (
          <p className={styles.wizardError}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {error}
            {kycBlocked && (
              <>
                {" "}
                <Link href="/vendeur" style={{ fontWeight: 800, textDecoration: "underline" }}>
                  Vérifier mon identité dans les paramètres
                </Link>
              </>
            )}
          </p>
        )}

        <div className={styles.wizardFooter}>
          {step > 1 && (
            <button type="button" onClick={prev} className={styles.wizardBackBtn}>
              Précédent
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={next} className={styles.wizardNextBtn}>
              Continuer
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} className={styles.wizardNextBtn}>
              {submitting ? "Envoi en cours..." : isEditing ? "Mettre à jour" : "Publier"}
            </button>
          )}
        </div>
        </article>
        </div>

        <aside className={styles.requestColSide} aria-hidden>
          <div className={styles.requestBubble}>
            <strong>Astuce</strong>
            <p>Mets de belles photos et un titre clair. Tes annonces sont validées en 72h max par notre équipe.</p>
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
  );
}

export default function PublishPage() {
  return (
    <SellerShell active="/vendeur/publier">
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>}>
        <PublishForm />
      </Suspense>
    </SellerShell>
  );
}
