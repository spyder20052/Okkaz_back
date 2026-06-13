"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./AwsmdInspiredSection.module.css";

gsap.registerPlugin(ScrollTrigger);

import { mockAds } from "@/lib/data";

const TONES = [styles.lime, styles.soft, styles.mint, styles.blue];

const LISTINGS = mockAds.map((ad, index) => {
  const tone = TONES[index % TONES.length];
  const terms = ad.loaPossible ? "Achat / Vente" : "Location";
  const durationLabel = ad.id === "4" ? "jour" : "mois";

  return {
    href: `/annonces/${ad.id}`,
    category: ad.category,
    terms,
    title: ad.title,
    seller: ad.owner,
    location: ad.location,
    price: `${ad.price.toLocaleString("fr-FR")} FCFA / ${durationLabel}`,
    image: ad.image,
    tone,
  };
});

export default function AwsmdInspiredSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleMovingRef = useRef<HTMLSpanElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const listingRefs = useRef<(HTMLAnchorElement | null)[]>([]);

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

    return () => mm.revert();
  }, { scope: sectionRef });


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
          {LISTINGS.map((listing, index) => (
            <Link
              href={listing.href}
              className={`${styles.card} ${listing.tone}`}
              key={listing.title}
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
