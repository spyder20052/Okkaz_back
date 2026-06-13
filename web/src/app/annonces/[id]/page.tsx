"use client";

import { use, useState } from "react";
import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { mockAds } from "@/lib/data";
import styles from "./detail.module.css";

export default function AdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const ad = mockAds.find((item) => item.id === id);
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

  if (!ad) {
    return (
      <main className={styles.missing}>
        <h1>Annonce introuvable</h1>
        <Link href="/annonces" className={styles.backLink}>← Retour</Link>
      </main>
    );
  }

  const categoryImages: Record<string, string[]> = {
    Véhicules: [ad.image, "/cat_vehicules.png", "/vehicules.png"],
    Immobilier: [ad.image, "/cat_immo.png", "/hero.PNG"],
    Électronique: [ad.image, "/electronique.png", "/cat_pro.png"],
    "Équipements Pro": [ad.image, "/equipements-pro.png", "/equipement-pro.png"],
  };
  const gallery = (categoryImages[ad.category] ?? [ad.image, ad.image, ad.image]).slice(0, 3);
  const backHref = searchParams.get("from") === "admin-annonces" ? "/admin/annonces" : "/annonces";
  const backLabel = searchParams.get("from") === "admin-annonces" ? "Retour admin annonces" : "Retour aux annonces";

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
        <Link href={backHref}>{searchParams.get("from") === "admin-annonces" ? "Admin annonces" : "Annonces"}</Link>
        <span>/</span>
        <span>{ad.category}</span>
        <span>/</span>
        <span className={styles.breadcrumbCurrent}>{ad.title}</span>
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
              src={gallery[activeImg]}
              alt={ad.title}
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
                src={gallery[activeImg]}
                alt=""
                width={1200}
                height={960}
                aria-hidden
              />
            </span>
            {ad.loaPossible && <span className={styles.loaBadge}>Achat / Vente</span>}
          </div>
          <div className={styles.thumbs}>
            {gallery.map((src, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.thumb} ${i === activeImg ? styles.thumbActive : ""}`}
                onClick={() => setActiveImg(i)}
              >
                <Image src={src} alt={`${ad.title} ${i + 1}`} fill sizes="80px" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Panel infos ── */}
        <aside className={styles.panel}>

          <div className={styles.panelTop}>
            <div className={styles.tags}>
              <span>{ad.category}</span>
              <span>{ad.condition}</span>
            </div>
            <p className={styles.ref}>Réf. {ad.reference}</p>
          </div>

          <h1 className={styles.title}>{ad.title}</h1>

          <div className={styles.ratingRow}>
            <span className={styles.stars}>★★★★★</span>
            <span className={styles.ratingCount}>10 avis</span>
            <span className={styles.dot}>·</span>
            <span className={styles.location}>{ad.location}</span>
          </div>

          <div className={styles.priceBlock}>
            <strong className={styles.price}>{ad.price.toLocaleString("fr-FR")} FCFA</strong>
            <span className={styles.pricePer}>/mois</span>
            {ad.totalPrice && (
              <span className={styles.totalPrice}>Prix total : {ad.totalPrice.toLocaleString("fr-FR")} FCFA</span>
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.optionRow}>
            <p className={styles.optionLabel}>Durée</p>
            <div className={styles.optionBtns}>
              <button type="button" className={styles.optionBtnActive}>{ad.minimumDuration}</button>
              {ad.loaPossible && <button type="button" className={styles.optionBtn}>Achat / Vente — {ad.loaDuration}</button>}
              <button type="button" className={styles.optionBtn}>Sur mesure</button>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span>Caution</span>
              <strong>{ad.deposit.toLocaleString("fr-FR")} FCFA</strong>
            </div>
          </div>

          <div className={styles.contactBlock}>
            <p className={styles.contactPhoneLabel}>
              {ad.directNumber ? "📞 Numéro direct du vendeur" : "📞 Numéro intermédiaire OKKAZ"}
            </p>
            <div className={styles.phoneBox}>
              <strong>{ad.directNumber ? ad.ownerPhone : "+229 01 00 00 00 00"}</strong>
            </div>
          </div>

          <div className={styles.actions}>
            <a
              href={`https://wa.me/${(ad.directNumber ? ad.ownerPhone : "+229 01 00 00 00 00").replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnPrimary}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "3.2rem", borderRadius: "12px", textDecoration: "none", fontWeight: 760 }}
            >
              Contacter sur WhatsApp
            </a>
          </div>

          <p className={styles.lockedContact}>
            {ad.directNumber ? (
              "Ce vendeur a payé l'option Premium pour afficher son numéro direct."
            ) : (
              "Numéro intermédiaire OKKAZ affiché. OKKAZ sécurise la mise en relation et la transaction."
            )}
          </p>

          <div className={styles.verifiedRow}>
            <span className={styles.verifiedDot} />
            <span>{ad.verifiedAt}</span>
          </div>

          <div className={styles.sellerRow}>
            <div className={styles.sellerAvatar}>{ad.owner[0]}</div>
            <div>
              <p className={styles.sellerName}>{ad.owner}</p>
              <p className={styles.sellerMeta}>{ad.ownerType} · {ad.ownerResponseTime}</p>
            </div>
          </div>

        </aside>
      </div>

      {/* ── Bas de page ── */}
      <div className={styles.details}>

        <section className={styles.detailBlock}>
          <h2>Description</h2>
          <p>{ad.description}</p>
        </section>

        {/* Avis vendeur */}
        <section className={styles.reviewsSection}>
          <h2 className={styles.sectionTitle}>Avis sur le vendeur</h2>
          <div className={styles.sellerReviewHeader}>
            <div className={styles.sellerReviewAvatar}>{ad.owner[0]}</div>
            <div>
              <p className={styles.sellerReviewName}>{ad.owner}</p>
              <p className={styles.sellerReviewMeta}>{ad.ownerType}</p>
            </div>
            <div className={styles.sellerScore}>
              <strong>4.8</strong>
              <span>★★★★★</span>
              <span className={styles.sellerScoreCount}>10 avis</span>
            </div>
          </div>
          <div className={styles.reviewsList}>
            {[
              { name: "Kofi A.", note: "Vendeur très réactif, article conforme à l'annonce.", stars: 5 },
              { name: "Mariama D.", note: "Bonne expérience, livraison rapide et bien emballé.", stars: 5 },
              { name: "Sènan B.", note: "Professionnel et honnête, je recommande.", stars: 4 },
            ].map((review) => (
              <div key={review.name} className={styles.reviewItem}>
                <div className={styles.reviewTop}>
                  <span className={styles.reviewName}>{review.name}</span>
                  <span className={styles.reviewStars}>{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</span>
                </div>
                <p className={styles.reviewText}>{review.note}</p>
              </div>
            ))}
          </div>

          <form className={styles.reviewForm} onSubmit={(e) => e.preventDefault()}>
            <p className={styles.reviewFormTitle}>Laisser un avis</p>
            <div className={styles.reviewFormStars}>
              {[1,2,3,4,5].map((s) => (
                <button key={s} type="button" className={styles.starBtn}>☆</button>
              ))}
            </div>
            <textarea className={styles.reviewTextarea} placeholder="Votre avis sur le vendeur..." rows={3} />
            <button type="submit" className={styles.reviewSubmit}>Publier l&apos;avis</button>
          </form>
        </section>

        {/* Dans la même catégorie */}
        <section className={styles.relatedSection}>
          <h2 className={styles.sectionTitle}>Dans la même catégorie</h2>
          <div className={styles.relatedGrid}>
            {(mockAds.filter((a) => a.category === ad.category && a.id !== ad.id).length > 0
              ? mockAds.filter((a) => a.category === ad.category && a.id !== ad.id)
              : mockAds.filter((a) => a.id !== ad.id).slice(0, 3)
            ).map((a, index) => (
              <Link
                href={`/annonces/${a.id}`}
                key={a.id}
                className={`${styles.card} ${index % 2 === 0 ? styles.darkCard : styles.lightCard}`}
              >
                <div className={styles.cardImageWrap}>
                  <Image src={a.image} alt={a.title} fill sizes="(max-width: 900px) 90vw, 25vw" />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <span>{a.category}</span>
                    <span>{a.loaPossible ? "Achat / Vente" : "Location"}</span>
                  </div>
                  <h2>{a.title}</h2>
                  <strong className={styles.cardPrice}>{a.price.toLocaleString("fr-FR")} FCFA / mois</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>

    </main>
  );
}
