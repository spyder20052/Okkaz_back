"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api, ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  CONDITION_LABELS,
  formatPrice,
  RENTAL_PERIOD_LABELS,
  type Listing,
  type ReportReason,
  type Review,
} from "@/lib/types";
import styles from "./detail.module.css";

const ROLE_LABELS: Record<string, string> = {
  BUYER: "Membre OKKAZ",
  SELLER: "Vendeur",
  SELLER_PRO: "Vendeur Pro",
  ADMIN: "Équipe OKKAZ",
};

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "FRAUD", label: "Fraude / arnaque" },
  { value: "WRONG_INFO", label: "Informations erronées" },
  { value: "INAPPROPRIATE", label: "Contenu inapproprié" },
  { value: "NO_RESPONSE", label: "Vendeur injoignable" },
  { value: "OTHER", label: "Autre" },
];

interface ContactReveal {
  contactPhone: string;
  isOwnerNumber: boolean;
  watermark?: string;
}

function galleryPhotos(listing: Listing): string[] {
  const photos = [...(listing.photos ?? [])].sort((a, b) => {
    if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
  if (photos.length === 0) return [mediaUrl(null)];
  return photos.map((photo) => mediaUrl(photo.url));
}

function reviewErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Connectez-vous pour laisser un avis.";
    if (err.code === "NO_CONTACT_REVEAL")
      return "Vous devez d'abord consulter le contact du vendeur avant de laisser un avis.";
    if (err.code === "REVIEW_TOO_EARLY")
      return "Un délai de 24h après la consultation du contact est requis avant de laisser un avis.";
    if (err.code === "CANNOT_REVIEW_SELF")
      return "Vous ne pouvez pas laisser un avis sur votre propre annonce.";
    if (err.status === 409) return "Vous avez déjà laissé un avis sur cette annonce.";
    return err.message;
  }
  return "Impossible d'envoyer l'avis. Réessayez plus tard.";
}

function AdDetailContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeImg, setActiveImg] = useState(0);
  const [zoom, setZoom] = useState({
    active: false,
    x: 50,
    y: 50,
    px: 0,
    py: 0,
    width: 0,
    height: 0,
  });

  // Contact
  const [contact, setContact] = useState<ContactReveal | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  // Avis
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 });
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Signalement
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("FRAUD");
  const [reportDescription, setReportDescription] = useState("");
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Annonces similaires
  const [related, setRelated] = useState<Listing[]>([]);

  // Chargement de l'annonce
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setIsLoading(true);
      setNotFound(false);
      setLoadError(null);
    });
    api
      .get<{ listing: Listing }>(`/listings/${id}`, undefined, false)
      .then((res) => {
        if (cancelled) return;
        setListing(res.data.listing);
        setActiveImg(0);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setLoadError("Impossible de charger l'annonce. Vérifiez que le serveur est démarré.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Avis de l'annonce
  const loadReviews = useCallback(() => {
    if (!id) return;
    api
      .get<{ reviews: Review[]; stats: { average: number; count: number } }>(
        `/reviews/listing/${id}`,
        undefined,
        false,
      )
      .then((res) => {
        setReviews(res.data.reviews);
        setReviewStats(res.data.stats);
      })
      .catch(() => {
        // Section avis silencieuse en cas d'erreur réseau.
      });
  }, [id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Annonces similaires (même catégorie)
  useEffect(() => {
    if (!listing?.categoryId) return;
    let cancelled = false;
    api
      .getPaginated<Listing>(
        "/listings",
        { categoryId: listing.categoryId, limit: 5, sort: "recent" },
        false,
      )
      .then((res) => {
        if (cancelled) return;
        setRelated(res.data.filter((item) => item.id !== listing.id).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });
    return () => {
      cancelled = true;
    };
  }, [listing?.categoryId, listing?.id]);

  const backHref = searchParams.get("from") === "admin-annonces" ? "/admin/annonces" : "/annonces";
  const backLabel =
    searchParams.get("from") === "admin-annonces" ? "Retour admin annonces" : "Retour aux annonces";

  const handleZoomMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const py = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
    const x = (px / rect.width) * 100;
    const y = (py / rect.height) * 100;

    setZoom({
      active: true,
      x,
      y,
      px,
      py,
      width: rect.width,
      height: rect.height,
    });
  };

  const handleRevealContact = useCallback(async () => {
    if (!listing) return;
    setIsRevealing(true);
    setContactError(null);
    try {
      const res = await api.post<ContactReveal>(`/listings/${listing.id}/contact`);
      setContact(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setContactError("Connectez-vous pour voir le numéro de contact.");
        else if (err.code === "INSUFFICIENT_ROLE")
          setContactError("Votre compte ne peut pas encore accéder à cette mise en relation.");
        else setContactError(err.message);
      } else {
        setContactError("Impossible de récupérer le contact. Réessayez plus tard.");
      }
    } finally {
      setIsRevealing(false);
    }
  }, [listing]);

  useEffect(() => {
    if (!user || !listing || contact || contactError || isRevealing) return;
    const timer = window.setTimeout(() => void handleRevealContact(), 0);
    return () => window.clearTimeout(timer);
  }, [contact, contactError, handleRevealContact, isRevealing, listing, user]);

  const handleSubmitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!listing) return;
    setReviewError(null);
    setReviewSuccess(null);
    if (reviewRating < 1) {
      setReviewError("Choisissez une note entre 1 et 5 étoiles.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      await api.post("/reviews", {
        listingId: listing.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSuccess("Merci ! Votre avis a bien été enregistré.");
      setReviewRating(0);
      setReviewComment("");
      loadReviews();
    } catch (err) {
      setReviewError(reviewErrorMessage(err));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSubmitReport = async (event: FormEvent) => {
    event.preventDefault();
    if (!listing) return;
    setReportMessage(null);
    setIsSubmittingReport(true);
    try {
      await api.post("/reports", {
        listingId: listing.id,
        reason: reportReason,
        description: reportDescription.trim() || undefined,
      });
      setReportMessage("Signalement envoyé. Notre équipe va l'examiner.");
      setShowReport(false);
      setReportDescription("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setReportMessage("Connectez-vous pour signaler une annonce.");
      } else {
        setReportMessage(
          err instanceof ApiError ? err.message : "Impossible d'envoyer le signalement.",
        );
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (isLoading) {
    return (
      <main className={styles.missing}>
        <p>Chargement de l&apos;annonce…</p>
      </main>
    );
  }

  if (notFound || loadError || !listing) {
    return (
      <main className={styles.missing}>
        <h1>{notFound ? "Annonce introuvable" : "Une erreur est survenue"}</h1>
        {loadError && <p>{loadError}</p>}
        <Link href="/annonces" className={styles.backLink}>← Retour</Link>
      </main>
    );
  }

  const gallery = galleryPhotos(listing);
  const activeSrc = gallery[Math.min(activeImg, gallery.length - 1)];
  const ownerName = listing.owner
    ? `${listing.owner.firstName} ${listing.owner.lastName}`
    : "Vendeur OKKAZ";
  const ownerRole = listing.owner ? ROLE_LABELS[listing.owner.role] ?? listing.owner.role : "";
  const periodLabel = RENTAL_PERIOD_LABELS[listing.rentalPeriod];
  const averageStars = Math.round(reviewStats.average);
  const whatsappNumber = contact ? contact.contactPhone.replace(/\D/g, "") : null;

  return (
    <main className={styles.page}>
      <Link href={backHref} className={styles.backLink} aria-label={backLabel}>
        <span aria-hidden>←</span>
        {backLabel}
      </Link>

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/">Accueil</Link>
        <span>/</span>
        <Link href={backHref}>
          {searchParams.get("from") === "admin-annonces" ? "Admin annonces" : "Annonces"}
        </Link>
        <span>/</span>
        <span>{listing.category?.name ?? "Catégorie"}</span>
        <span>/</span>
        <span className={styles.breadcrumbCurrent}>{listing.title}</span>
      </nav>

      <div className={styles.layout}>

        {/* ── Galerie ── */}
        <div className={styles.galleryCol}>
          <div
            className={styles.galleryMain}
            onMouseEnter={handleZoomMove}
            onMouseMove={handleZoomMove}
            onMouseLeave={() => setZoom((current) => ({ ...current, active: false }))}
          >
            <Image
              className={styles.galleryImage}
              src={activeSrc}
              alt={listing.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 55vw"
            />
            <span
              className={`${styles.imageMagnifier} ${zoom.active ? styles.imageMagnifierVisible : ""}`}
              aria-hidden
              style={{
                left: `${zoom.x}%`,
                top: `${zoom.y}%`,
                ["--zoom-x" as string]: `${zoom.px}px`,
                ["--zoom-y" as string]: `${zoom.py}px`,
                ["--zoom-width" as string]: `${zoom.width}px`,
                ["--zoom-height" as string]: `${zoom.height}px`,
              }}
            >
              <Image
                className={styles.imageMagnifierImg}
                src={activeSrc}
                alt=""
                width={1200}
                height={960}
                aria-hidden
              />
            </span>
            {listing.isLoa && <span className={styles.loaBadge}>Achat / Vente (LOA)</span>}
          </div>
          {gallery.length > 1 && (
            <div className={styles.thumbs}>
              {gallery.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.thumb} ${i === activeImg ? styles.thumbActive : ""}`}
                  onClick={() => setActiveImg(i)}
                >
                  <Image src={src} alt={`${listing.title} ${i + 1}`} fill sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Panel infos ── */}
        <aside className={styles.panel}>

          <div className={styles.panelTop}>
            <div className={styles.tags}>
              <span>{listing.category?.name ?? "Catégorie"}</span>
              <span>{CONDITION_LABELS[listing.condition]}</span>
            </div>
            <p className={styles.ref}>
              {listing.viewsCount} vue{listing.viewsCount > 1 ? "s" : ""}
            </p>
          </div>

          <h1 className={styles.title}>{listing.title}</h1>

          <div className={styles.ratingRow}>
            <span className={styles.stars}>
              {"★".repeat(averageStars)}{"☆".repeat(5 - averageStars)}
            </span>
            <span className={styles.ratingCount}>
              {reviewStats.count} avis
            </span>
            <span className={styles.dot}>·</span>
            <span className={styles.location}>
              {listing.locationCity}
              {listing.locationAddress ? ` — ${listing.locationAddress}` : ""}
            </span>
          </div>

          <div className={styles.priceBlock}>
            <strong className={styles.price}>{formatPrice(listing.rentalPrice)}</strong>
            <span className={styles.pricePer}>/{periodLabel}</span>
            {listing.purchasePrice != null && (
              <span className={styles.totalPrice}>
                Prix d&apos;achat : {formatPrice(listing.purchasePrice)}
              </span>
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span>État</span>
              <strong>{CONDITION_LABELS[listing.condition]}</strong>
            </div>
            <div className={styles.infoItem}>
              <span>Ville</span>
              <strong>{listing.locationCity}</strong>
            </div>
            <div className={styles.infoItem}>
              <span>Formule</span>
              <strong>
                {listing.isLoa
                  ? `Location avec option d'achat${listing.loaDurationMonths ? ` (${listing.loaDurationMonths} mois)` : ""}`
                  : "Location"}
              </strong>
            </div>
            <div className={styles.infoItem}>
              <span>Mises en relation</span>
              <strong>{listing.contactsCount}</strong>
            </div>
          </div>

          {/* ── Contact ── */}
          {!user ? (
            <>
              <div className={styles.actions}>
                <Link href="/connexion" className={styles.btnPrimary} style={{ width: "100%" }}>
                  Se connecter pour contacter le vendeur
                </Link>
              </div>
            </>
          ) : contact ? (
            <>
              <div className={styles.contactBlock}>
                <p className={styles.contactPhoneLabel}>
                  {contact.isOwnerNumber
                    ? "📞 Numéro direct du vendeur"
                    : "📞 Numéro de mise en relation OKKAZ"}
                </p>
                <div className={styles.phoneBox}>
                  <strong>{contact.contactPhone}</strong>
                </div>
              </div>
              <div className={styles.actions}>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnPrimary}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "3.2rem", borderRadius: "12px", textDecoration: "none", fontWeight: 760, width: "100%" }}
                >
                  Contacter sur WhatsApp
                </a>
              </div>
              {!contact.isOwnerNumber && (
                <p className={styles.lockedContact}>
                  Ce numéro est le numéro de mise en relation OKKAZ : la plateforme sécurise
                  l&apos;échange avec le vendeur.
                </p>
              )}
            </>
          ) : (
            <p className={styles.lockedContact}>Chargement du contact...</p>
          )}
          {contactError && <p className={styles.formError}>{contactError}</p>}

          <div className={styles.sellerRow}>
            <div className={styles.sellerAvatar}>{ownerName[0]}</div>
            <div>
              <p className={styles.sellerName}>
                {listing.owner?.id ? <Link href={`/vendeurs/${listing.owner.id}`}>{ownerName}</Link> : ownerName}
              </p>
              <p className={styles.sellerMeta}>
                {ownerRole}
                {listing.owner?.city ? ` · ${listing.owner.city}` : ""}
              </p>
            </div>
          </div>

          {/* ── Signalement ── */}
          <div>
            <button
              type="button"
              className={styles.reportToggle}
              onClick={() => {
                setShowReport((current) => !current);
                setReportMessage(null);
              }}
            >
              🚩 Signaler cette annonce
            </button>
            {showReport && (
              user ? (
                <form className={styles.reportForm} onSubmit={handleSubmitReport}>
                  <label>
                    Motif
                    <select
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value as ReportReason)}
                    >
                      {REPORT_REASONS.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Précisez le problème (optionnel)"
                    value={reportDescription}
                    onChange={(event) => setReportDescription(event.target.value)}
                  />
                  <button type="submit" disabled={isSubmittingReport}>
                    {isSubmittingReport ? "Envoi…" : "Envoyer le signalement"}
                  </button>
                </form>
              ) : (
                <p className={styles.lockedContact}>
                  <Link href="/connexion">Connectez-vous</Link> pour signaler cette annonce.
                </p>
              )
            )}
            {reportMessage && <p className={styles.formInfo}>{reportMessage}</p>}
          </div>

        </aside>
      </div>

      {/* ── Bas de page ── */}
      <div className={styles.details}>

        <section className={styles.detailBlock}>
          <h2>Description</h2>
          <p>{listing.description}</p>
        </section>

        {/* Avis */}
        <section className={styles.reviewsSection}>
          <h2 className={styles.sectionTitle}>Avis sur cette annonce</h2>
          <div className={styles.sellerReviewHeader}>
            <div className={styles.sellerReviewAvatar}>{ownerName[0]}</div>
            <div>
              <p className={styles.sellerReviewName}>{ownerName}</p>
              <p className={styles.sellerReviewMeta}>{ownerRole}</p>
            </div>
            <div className={styles.sellerScore}>
              <strong>{reviewStats.count > 0 ? reviewStats.average.toFixed(1) : "—"}</strong>
              <span>{"★".repeat(averageStars)}{"☆".repeat(5 - averageStars)}</span>
              <span className={styles.sellerScoreCount}>{reviewStats.count} avis</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <p className={styles.reviewText}>Aucun avis pour le moment.</p>
          ) : (
            <div className={styles.reviewsList}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewItem}>
                  <div className={styles.reviewTop}>
                    <span className={styles.reviewName}>
                      {review.reviewer
                        ? `${review.reviewer.firstName} ${review.reviewer.lastName}`
                        : "Utilisateur OKKAZ"}
                    </span>
                    <span className={styles.reviewStars}>
                      {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                    </span>
                  </div>
                  {review.comment && <p className={styles.reviewText}>{review.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {user ? (
            <form className={styles.reviewForm} onSubmit={handleSubmitReview}>
              <p className={styles.reviewFormTitle}>Laisser un avis</p>
              <div className={styles.reviewFormStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={styles.starBtn}
                    aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
                    onClick={() => setReviewRating(star)}
                  >
                    {star <= reviewRating ? "★" : "☆"}
                  </button>
                ))}
              </div>
              <textarea
                className={styles.reviewTextarea}
                placeholder="Votre avis sur cette annonce..."
                rows={3}
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
              />
              {reviewError && <p className={styles.formError}>{reviewError}</p>}
              {reviewSuccess && <p className={styles.formInfo}>{reviewSuccess}</p>}
              <button type="submit" className={styles.reviewSubmit} disabled={isSubmittingReview}>
                {isSubmittingReview ? "Envoi…" : "Publier l'avis"}
              </button>
            </form>
          ) : (
            <p className={styles.reviewText}>
              <Link href="/connexion">Connectez-vous</Link> pour laisser un avis.
            </p>
          )}
        </section>

        {/* Dans la même catégorie */}
        {related.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.sectionTitle}>Dans la même catégorie</h2>
            <div className={styles.relatedGrid}>
              {related.map((item, index) => {
                const photos = item.photos ?? [];
                const cover = photos.find((photo) => photo.isCover) ?? photos[0];
                return (
                  <Link
                    href={`/annonces/${item.id}`}
                    key={item.id}
                    className={`${styles.card} ${index % 2 === 0 ? styles.darkCard : styles.lightCard}`}
                  >
                    <div className={styles.cardImageWrap}>
                      <Image
                        src={mediaUrl(cover?.url)}
                        alt={item.title}
                        fill
                        sizes="(max-width: 900px) 90vw, 25vw"
                      />
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTop}>
                        <span>{item.category?.name ?? "Annonce"}</span>
                        <span>{item.isLoa ? "Achat / Vente" : "Location"}</span>
                      </div>
                      <h2>{item.title}</h2>
                      <strong className={styles.cardPrice}>
                        {formatPrice(item.rentalPrice)} / {RENTAL_PERIOD_LABELS[item.rentalPeriod]}
                      </strong>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

      </div>

    </main>
  );
}

export default function AdDetailPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.missing}>
          <p>Chargement de l&apos;annonce…</p>
        </main>
      }
    >
      <AdDetailContent />
    </Suspense>
  );
}
