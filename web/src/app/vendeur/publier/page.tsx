"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { mockAds } from "@/lib/data";
import SellerShell from "../SellerShell";
import styles from "../vendeur.module.css";

const TOTAL_STEPS = 4;
const MAX_PHOTOS = 4;

const CATEGORIES = ["Vehicules", "Immobilier", "Electronique", "Equipements Pro", "Evenementiel", "Mobilier"];
const MODES = [
  { value: "location", label: "Location simple" },
  { value: "loa", label: "Achat / Vente" },
  { value: "vente", label: "Vente" },
  { value: "troc", label: "Troc" },
];
const ETATS = ["Neuf", "Excellent etat", "Bon etat", "Etat correct"];

function PublishForm() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("modifier");
  const editingAd = editId ? mockAds.find((a) => a.id === editId) : null;
  const isEditing = !!editingAd;

  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<string[]>(editingAd ? [editingAd.image] : []);
  const [title, setTitle] = useState(editingAd?.title ?? "");
  const [description, setDescription] = useState(editingAd?.description ?? "");
  const [category, setCategory] = useState(editingAd?.category ?? "");
  const [mode, setMode] = useState(editingAd ? (editingAd.loaPossible ? "loa" : "location") : "location");
  const [price, setPrice] = useState(editingAd ? String(editingAd.price) : "");
  const [etat, setEtat] = useState(() => {
    if (!editingAd) return "";
    const matchedEtat = ETATS.find((e) => e.toLowerCase() === editingAd.condition.toLowerCase());
    return matchedEtat ?? "Bon etat";
  });
  const [city, setCity] = useState(() => {
    if (!editingAd) return "";
    const [cityPart] = editingAd.location.split(",").map((s) => s.trim());
    return cityPart ?? "";
  });
  const [neighborhood, setNeighborhood] = useState(() => {
    if (!editingAd) return "";
    const [, neighborhoodPart] = editingAd.location.split(",").map((s) => s.trim());
    return neighborhoodPart ?? "";
  });
  const [validationOkkaz, setValidationOkkaz] = useState(true);
  const [directNumber, setDirectNumber] = useState(editingAd?.directNumber ?? false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (directNumber) {
      const adId = editingAd?.id ?? "1";
      window.location.href = `/paiement?type=direct_number&annonce=${adId}`;
    } else {
      window.location.href = "/vendeur?publie=success";
    }
  };

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = Array.from(files).slice(0, remaining);
    Promise.all(
      toAdd.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(f);
          }),
      ),
    ).then((urls) => setPhotos((prev) => [...prev, ...urls]));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  const validateStep = (s: number): string | null => {
    if (s === 1 && photos.length === 0) return "Au moins 1 photo requise pour continuer";
    if (s === 2) {
      if (!title.trim()) return "Donne un titre a ton annonce";
      if (!category) return "Choisis une categorie";
    }
    if (s === 3) {
      if (!price.toString().trim()) return "Indique un prix";
      if (!etat) return "Choisis l'etat du bien";
    }
    if (s === 4) {
      if (!city.trim()) return "Indique ta ville";
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

  const isDone = (n: number) => n < step;
  const isActive = (n: number) => n === step;

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
                Photos <span>(Max {MAX_PHOTOS})</span>
              </h2>
              <span className={styles.wizardCounter}>{photos.length} / {MAX_PHOTOS}</span>
            </header>

            <div className={styles.wizardPhotoGrid}>
              {photos.map((src, idx) => (
                <div key={idx} className={styles.wizardPhotoSlotFilled}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Photo ${idx + 1}`} />
                  <button type="button" onClick={() => removePhoto(idx)} aria-label="Retirer">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {idx === 0 && <span className={styles.wizardPhotoMain}>Principale</span>}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button type="button" className={styles.wizardPhotoDropzone} onClick={() => fileRef.current?.click()}>
                  <span className={styles.wizardPhotoDropzoneIcon}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </span>
                  <strong>Ajouter</strong>
                  <small>PNG, JPG</small>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} style={{ display: "none" }} />
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
              />
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Catégorie</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={styles.wizardSelect}
              >
                <option value="">Choisir...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
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
                Prix de vente (FCFA)
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
              <span className={styles.wizardFieldLabel}>Mode proposé</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className={styles.wizardSelect}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>

            <div className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>État</span>
              <select
                value={etat}
                onChange={(e) => setEtat(e.target.value)}
                className={styles.wizardSelect}
              >
                <option value="">Choisir...</option>
                {ETATS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
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
              />
            </label>

            <label className={styles.wizardField}>
              <span className={styles.wizardFieldLabel}>Quartier (optionnel)</span>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Fidjrosse"
                className={styles.wizardInput}
              />
            </label>

            <label className={styles.wizardToggleRow}>
              <span className={styles.wizardToggleSwitch}>
                <input
                  type="checkbox"
                  checked={validationOkkaz}
                  onChange={(e) => setValidationOkkaz(e.target.checked)}
                />
                <span />
              </span>
              <div>
                <strong>Validation OKKAZ</strong>
                <small>Notre équipe vérifie ton annonce sous 72h avant publication.</small>
              </div>
            </label>

            <label className={styles.wizardToggleRow}>
              <span className={styles.wizardToggleSwitch}>
                <input
                  type="checkbox"
                  checked={directNumber}
                  onChange={(e) => setDirectNumber(e.target.checked)}
                />
                <span />
              </span>
              <div>
                <strong>Option Numéro Direct (+2 500 FCFA)</strong>
                <small>{"Affiche ton numéro direct sur l'annonce. Sans cette option, c'est le numéro d'OKKAZ qui sera affiché."}</small>
              </div>
            </label>

            <article className={styles.wizardRecap}>
              <h3>Récapitulatif</h3>
              <dl>
                <div><dt>Photos</dt><dd>{photos.length}</dd></div>
                <div><dt>Titre</dt><dd>{title || "—"}</dd></div>
                <div><dt>Catégorie</dt><dd>{category || "—"}</dd></div>
                <div><dt>Mode</dt><dd>{MODES.find((m) => m.value === mode)?.label}</dd></div>
                <div><dt>Prix</dt><dd>{price ? `${price} FCFA` : "—"}</dd></div>
                <div><dt>État</dt><dd>{etat || "—"}</dd></div>
                <div><dt>Numéro direct</dt><dd>{directNumber ? "Oui (+2 500 FCFA)" : "Non (Numéro OKKAZ)"}</dd></div>
              </dl>
            </article>
          </div>
        )}

        {error && (
          <p className={styles.wizardError}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {error}
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
            <button type="button" onClick={submit} className={styles.wizardNextBtn}>
              {isEditing ? "Mettre à jour" : "Publier"}
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
