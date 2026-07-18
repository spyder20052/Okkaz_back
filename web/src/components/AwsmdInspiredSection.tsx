"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { api, mediaUrl } from "@/lib/api";
import { formatPrice, RENTAL_PERIOD_LABELS, type Listing } from "@/lib/types";
import styles from "./AwsmdInspiredSection.module.css";

gsap.registerPlugin(ScrollTrigger);

const TONES = [styles.lime, styles.soft, styles.mint, styles.blue];

interface DisplayListing {
  href: string;
  category: string;
  terms: string;
  title: string;
  seller: string;
  location: string;
  price: string;
  image: string;
  tone: string;
}

function toDisplay(listing: Listing, index: number): DisplayListing {
  const photos = listing.photos ?? [];
  const cover = photos.find((photo) => photo.isCover) ?? photos[0];
  return {
    href: `/annonces/${listing.id}`,
    category: listing.category?.name ?? "Annonce",
    terms: listing.isLoa ? "Achat / Vente" : "Location",
    title: listing.title,
    seller: listing.owner
      ? `${listing.owner.firstName} ${listing.owner.lastName}`
      : "Vendeur OKKAZ",
    location: listing.locationCity,
    price: `${formatPrice(listing.rentalPrice)} / ${RENTAL_PERIOD_LABELS[listing.rentalPeriod]}`,
    image: mediaUrl(cover?.url),
    tone: TONES[index % TONES.length],
  };
}

export default function AwsmdInspiredSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleMovingRef = useRef<HTMLSpanElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const listingRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const [listings, setListings] = useState<DisplayListing[]>([]);

  // Annonces en vedette, avec repli sur les annonces récentes si aucune vedette.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const featured = await api.get<{ items: Listing[] }>("/listings/featured", undefined, false);
        let items = featured.data.items;
        if (items.length === 0) {
          const recent = await api.getPaginated<Listing>(
            "/listings",
            { limit: 4, sort: "recent" },
            false,
          );
          items = recent.data;
        }
        if (!cancelled) setListings(items.slice(0, 4).map(toDisplay));
      } catch {
        if (!cancelled) setListings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    gsap.fromTo(
      titleMovingRef.current,
      { yPercent: 18 },
      {
        yPercent: -12,
        ease: "none",
        scrollTrigger: {
          trigger: titleRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.25,
        }
      }
    );

    mm.add("(min-width: 0px)", () => {
      const cards = listingRefs.current.filter((card): card is HTMLAnchorElement => Boolean(card));
      if (cards.length === 0) return;
      const images = cards
        .map((card) => card.querySelector(`.${styles.imageWrap}`))
        .filter((image): image is Element => Boolean(image));

      gsap.set(cards, {
        y: 48,
        autoAlpha: 0,
        scale: 0.985,
        force3D: true,
      });

      gsap.set(images, {
        y: 18,
        scale: 1.04,
        force3D: true,
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: cardsRef.current,
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      })
        .to(cards, {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
        })
        .to(images, {
          y: 0,
          scale: 1,
          duration: 1,
          stagger: 0.08,
          ease: "power3.out",
        }, 0.08);
    });

    const animatedTags = gsap.utils.toArray<HTMLElement>(
      `.${styles.soft} .${styles.cardTop} span, .${styles.blue} .${styles.cardTop} span`
    );

    if (animatedTags.length > 0) {
      gsap.fromTo(
        animatedTags,
        { y: 10, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          stagger: 0.08,
          duration: 0.55,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }

    return () => mm.revert();
  }, { scope: sectionRef, dependencies: [listings.length], revertOnUpdate: true });


  return (
    <section className={styles.shell} ref={sectionRef}>
      <div className={styles.panel}>
        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>Publications vendeurs</p>
            <h2 className={styles.title} ref={titleRef}>
              <span className={styles.staticTitleText}>Des biens vérifiés</span>
              <span className={styles.movingTitleLine}>
                <span className={styles.movingTitleText} ref={titleMovingRef}>
                  prêts à réserver
                </span>
              </span>
            </h2>
          </div>
          <Link href="/annonces" className={styles.seeMoreLink}>
            Voir plus →
          </Link>
        </div>

        <div className={styles.cards} ref={cardsRef} aria-label="Publications des vendeurs OKKAZ">
          {listings.map((listing, index) => (
            <Link
              href={listing.href}
              className={`${styles.card} ${listing.tone}`}
              key={listing.href}
              ref={(el) => { listingRefs.current[index] = el; }}
            >
              <div className={styles.imageWrap}>
                <Image
                  src={listing.image}
                  alt={listing.title}
                  fill
                  sizes="(max-width: 900px) 76vw, 23vw"
                />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <span>{listing.category}</span>
                  <span>{listing.terms}</span>
                </div>
                <h3>{listing.title}</h3>
                <p className={styles.seller}>{listing.seller}</p>
                <p className={styles.meta}>{listing.location}</p>
                <strong className={styles.price}>{listing.price}</strong>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
