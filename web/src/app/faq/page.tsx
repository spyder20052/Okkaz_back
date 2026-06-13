import Image from "next/image";
import Link from "next/link";
import styles from "./faq.module.css";

const FAQS = [
  [
    "Comment réserver un bien ?",
    "Ouvrez l'annonce, vérifiez les détails, puis contactez OKKAZ pour confirmer les conditions avec le propriétaire.",
  ],
  [
    "L'option Achat / Vente est-elle disponible pour tous les biens ?",
    "L'option Achat / Vente dépend du type de bien, du propriétaire et de la validation du profil demandeur.",
  ],
  [
    "Comment publier un bien sur OKKAZ ?",
    "Depuis l'espace publication, ajoutez les photos, le prix, les disponibilités et les conditions de location.",
  ],
  [
    "Comment OKKAZ sécurise les échanges ?",
    "Nous cadrons les informations importantes avant la mise en relation et accompagnons les étapes sensibles.",
  ],
  [
    "Puis-je contacter un conseiller directement ?",
    "Oui, vous pouvez nous écrire par WhatsApp, email ou via le formulaire de contact.",
  ],
];

const CONTACTS = [
  { label: "WhatsApp", href: "https://wa.me/22900000000" },
  { label: "Instagram", href: "https://www.instagram.com" },
  { label: "Email", href: "mailto:contact@okkaz.bj" },
];

export default function FaqPage() {
  return (
    <main className={styles.page}>
      <section className={styles.faqPanel} aria-labelledby="faq-title">
        <header className={styles.header}>
          <h1 id="faq-title">FAQ</h1>
          <p>Questions fréquentes</p>
        </header>

        <div className={styles.questions}>
          {FAQS.map(([question, answer]) => (
            <details className={styles.question} key={question}>
              <summary>
                <span className={styles.spark} aria-hidden>
                  +
                </span>
                <span>{question}</span>
                <span className={styles.plus} aria-hidden>
                  +
                </span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.contactPanel} aria-label="Contacts OKKAZ">
        <div className={styles.contactTop}>
          <span>Social Media</span>
          <span>Information</span>
        </div>
        <div className={styles.stickerCloud} aria-hidden>
          <span className={`${styles.contactSticker} ${styles.stickerImpact}`}>Impact local</span>
          <span className={`${styles.contactSticker} ${styles.stickerGood}`}>Location simple</span>
          <span className={`${styles.contactSticker} ${styles.stickerThumb}`}>+</span>
          <span className={`${styles.contactSticker} ${styles.stickerChange}`}>Achat / Vente</span>
          <span className={`${styles.contactSticker} ${styles.stickerCall}`}>Call me!</span>
        </div>
        <h2>CONTACTS</h2>

        <div className={styles.contactLinks}>
          {CONTACTS.map((contact) => (
            <Link href={contact.href} key={contact.label}>
              <span aria-hidden>→</span>
              <strong>{contact.label}</strong>
              <span aria-hidden>+</span>
            </Link>
          ))}
        </div>

        <div className={styles.emailRow}>
          <span>Mail</span>
          <Link href="mailto:contact@okkaz.bj">contact@okkaz.bj</Link>
        </div>
      </section>

      <section className={styles.cta} aria-label="Contact rapide">
        <div className={styles.ctaMark} aria-hidden />
        <Image
          src="/lifestyle.png"
          alt=""
          width={180}
          height={180}
          className={styles.ctaImage}
          aria-hidden
        />
        <Link href="/contact" className={styles.ctaPrimary}>
          Parler à OKKAZ
        </Link>
        <Link href="/annonces" className={styles.ctaSecondary}>
          Voir les biens <span aria-hidden>✦</span>
        </Link>
      </section>
    </main>
  );
}
