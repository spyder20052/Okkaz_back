"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { mockAds } from "@/lib/data";
import { pushPlatformEvent } from "@/lib/platformEvents";
import { pushSearchRequest } from "@/lib/searchRequests";
import styles from "./paiement.module.css";

const PENDING_SEARCH_REQUEST_KEY = "okkaz_pending_search_request";

const savedProfile = {
  firstName: "Jean",
  lastName: "Dupont",
  phone: "+229 01 00 00 00 00",
  card: "Carte bancaire enregistrée •••• 2842",
};

function PaiementContent() {
  const searchParams = useSearchParams();
  const paymentType = searchParams.get("type");
  const plan = searchParams.get("plan") ?? "Premium mois";
  const ad = mockAds.find((item) => item.id === searchParams.get("annonce")) ?? mockAds[0];
  const [isPaid, setIsPaid] = useState(false);
  const isSubscription = paymentType === "abonnement";
  const isBoost = paymentType === "boost";
  const isSearchUrgency = paymentType === "recherche";
  const isDirectNumber = paymentType === "direct_number";
  const subscriptionAmount = plan.includes("semaine") ? 3000 : plan.includes("beneficiaire") ? 1000 : 10000;
  const boostAmount = 5000;
  const searchAmount = searchParams.get("urgence") === "Express" ? 5000 : 2500;
  const directNumberAmount = 2500;
  const total = isSubscription
    ? subscriptionAmount
    : isBoost
    ? boostAmount
    : isSearchUrgency
    ? searchAmount
    : isDirectNumber
    ? directNumberAmount
    : ad.price + ad.deposit;
  const backHref = isSubscription || isBoost || isDirectNumber ? "/vendeur" : isSearchUrgency ? "/vendeur/recherches/nouvelle" : "/annonces";
  const backLabel = isSubscription || isBoost || isDirectNumber ? "Retour au dashboard" : isSearchUrgency ? "Retour au formulaire" : "Retour aux annonces";
  const secureCopy = isSubscription
    ? "Paiement sécurisé par OKKAZ. L'abonnement est accordé depuis le back-office après validation."
    : isBoost
    ? "Paiement sécurisé par OKKAZ. Le boost est appliqué uniquement à cette annonce après validation admin."
    : isSearchUrgency
    ? "Paiement sécurisé par OKKAZ. La demande Express est publiée après confirmation."
    : isDirectNumber
    ? "Paiement sécurisé par OKKAZ. L'affichage de votre numéro direct sera activé après confirmation."
    : "Paiement sécurisé par OKKAZ. Votre réservation est enregistrée en toute sécurité.";

  const confirmPayment = () => {
    setIsPaid(true);
    if (isSearchUrgency) {
      const raw = window.localStorage.getItem(PENDING_SEARCH_REQUEST_KEY);
      if (raw) {
        const request = pushSearchRequest(JSON.parse(raw));
        window.localStorage.removeItem(PENDING_SEARCH_REQUEST_KEY);
        pushPlatformEvent({
          type: "search_request",
          title: "Demande Je recherche Express payee",
          detail: `${request.requester} recherche ${request.title} à ${request.location}.`,
          amount: total,
          status: "done",
        });
      }
      return;
    }
    if (isBoost) {
      pushPlatformEvent({
        type: "boost_payment",
        title: "Boost annonce payé",
        detail: `${savedProfile.firstName} ${savedProfile.lastName} a payé le boost pour ${ad.title}.`,
        amount: total,
        status: "pending",
      });
      return;
    }
    if (isDirectNumber) {
      pushPlatformEvent({
        type: "direct_number_payment",
        title: "Option numéro direct payée",
        detail: `${savedProfile.firstName} ${savedProfile.lastName} a payé l'option numéro direct pour ${ad.title}.`,
        amount: total,
        status: "done",
      });
      return;
    }
    pushPlatformEvent({
      type: isSubscription ? "subscription_payment" : "booking_payment",
      title: isSubscription ? `Paiement abonnement ${plan}` : "Réservation de bien confirmée",
      detail: isSubscription
        ? `${savedProfile.firstName} ${savedProfile.lastName} a paye ${plan}. Activation admin requise.`
        : `${savedProfile.firstName} ${savedProfile.lastName} a paye pour reserver ${ad.title}.`,
      amount: total,
      status: isSubscription ? "pending" : "done",
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>

        <div className={styles.left}>
          <Link href={backHref} className={styles.back} aria-label={backLabel}>
            <span aria-hidden>←</span>
            {backLabel}
          </Link>
          <h1 className={styles.title}>{isSubscription ? "Payer un abonnement" : isBoost ? "Booster cette annonce" : isSearchUrgency ? "Payer l'urgence" : isDirectNumber ? "Dévoiler son numéro (Vendeur)" : "Réserver ce bien"}</h1>
          <p className={styles.subtitle}>
            {isBoost
              ? "Le boost est attaché à cette annonce précise. Après paiement, l'admin reçoit la demande et active la mise en avant."
              : isSearchUrgency
              ? "Le paiement Express publie votre demande Je recherche en priorité auprès des vendeurs concernés."
              : isSubscription
              ? "Après paiement, l'admin reçoit une notification et active votre offre premium."
              : isDirectNumber
              ? "En tant que vendeur, payez cette option pour dévoiler directement votre numéro de téléphone sur l'annonce au lieu du numéro d'OKKAZ."
              : "Vos informations de profil sont déjà enregistrées. Après paiement de la réservation, le vendeur sera averti."}
          </p>

          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); confirmPayment(); }}>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Profil utilisé</p>
              <div className={styles.profileCard}>
                <div>
                  <span>Nom et prénoms</span>
                  <strong>{savedProfile.firstName} {savedProfile.lastName}</strong>
                </div>
                <div>
                  <span>Numéro du compte</span>
                  <strong>{savedProfile.phone}</strong>
                </div>
                <div>
                  <span>Moyen enregistré</span>
                  <strong>{savedProfile.card}</strong>
                </div>
              </div>
            </div>

            {!isSubscription && !isBoost && !isSearchUrgency && !isDirectNumber && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Durée de location</p>
              <div className={styles.durationBtns}>
                <button type="button" className={styles.durationActive}>{ad.minimumDuration}</button>
                <button type="button" className={styles.duration}>3 mois</button>
                <button type="button" className={styles.duration}>6 mois</button>
                <button type="button" className={styles.duration}>Sur mesure</button>
              </div>
            </div>
            )}

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Mode de paiement</p>
              <div className={styles.paymentMethods}>
                <label className={styles.paymentOption}>
                  <input type="radio" name="payment" defaultChecked />
                  <span>Mobile Money</span>
                </label>
                <label className={styles.paymentOption}>
                  <input type="radio" name="payment" />
                  <span>Carte bancaire enregistrée</span>
                </label>
                <label className={styles.paymentOption}>
                  <input type="radio" name="payment" />
                  <span>Virement bancaire</span>
                </label>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn}>
              {isPaid ? "Paiement confirmé" : isSubscription ? "Payer l'abonnement" : isBoost ? "Payer le boost" : isSearchUrgency ? "Payer et publier en Express" : isDirectNumber ? "Payer et dévoiler son numéro" : "Réserver ce bien"}
            </button>

            {isPaid && !isSubscription && !isBoost && !isSearchUrgency && !isDirectNumber && (
              <div className={styles.revealBox}>
                <span>Réservation confirmée !</span>
                <strong>{ad.directNumber ? ad.ownerPhone : "+229 01 00 00 00 00"}</strong>
                <p>Votre paiement a été validé. Vous pouvez contacter le vendeur ou notre équipe intermédiaire.</p>
                <Link href="/chat" className={styles.chatLink}>Ouvrir le chat OKKAZ</Link>
              </div>
            )}

            {isPaid && isBoost && (
              <div className={styles.revealBox}>
                <span>Boost payé</span>
                <strong>{ad.title}</strong>
                <p>OKKAZ a reçu la demande. L&apos;annonce sera mise en avant après validation admin.</p>
                <Link href="/vendeur" className={styles.chatLink}>Retour à mes annonces</Link>
              </div>
            )}

            {isPaid && isDirectNumber && (
              <div className={styles.revealBox}>
                <span>Option activée !</span>
                <strong>Numéro direct visible</strong>
                <p>Votre numéro direct est maintenant visible de tous sur la page de l&apos;annonce.</p>
                <Link href="/vendeur" className={styles.chatLink}>Retour à mon espace</Link>
              </div>
            )}

            {isPaid && isSearchUrgency && (
              <div className={styles.revealBox}>
                <span>Demande Express publiée</span>
                <strong>Les vendeurs sont notifiés</strong>
                <p>Votre demande apparaît dans Annonces &gt; Je recherche et dans le back-office admin.</p>
                <Link href="/annonces?category=Je recherche" className={styles.chatLink}>Voir ma demande</Link>
              </div>
            )}

            {isPaid && isSubscription && (
              <div className={styles.revealBox}>
                <span>Abonnement payé</span>
                <strong>Activation en attente admin</strong>
                <p>OKKAZ a reçu la notification de paiement. Votre abonnement sera accordé depuis le back-office.</p>
                <Link href="/vendeur" className={styles.chatLink}>Retour à mon espace</Link>
              </div>
            )}

          </form>
        </div>

        <div className={styles.right}>
          <div className={styles.summary}>
            <p className={styles.summaryLabel}>Récapitulatif</p>
            {!isSubscription && !isSearchUrgency && (
              <div className={styles.summaryImg}>
                <Image src={ad.image} alt={ad.title} fill sizes="380px" />
              </div>
            )}
            <p className={styles.summaryTitle}>{isSubscription ? "Abonnement compte" : isBoost ? `Boost · ${ad.title}` : isSearchUrgency ? "Publication Je recherche Express" : isDirectNumber ? `Dévoiler son numéro · ${ad.title}` : ad.title}</p>
            <p className={styles.summaryOwner}>{isSubscription ? plan : isBoost || isDirectNumber ? `${ad.reference} · ${ad.location}` : isSearchUrgency ? "Alerte prioritaire vendeurs" : `${ad.owner} · ${ad.location}`}</p>

            <div className={styles.summaryLines}>
              {!isSubscription && !isBoost && !isSearchUrgency && !isDirectNumber && <div className={styles.summaryLine}>
                <span>Loyer</span>
                <strong>{ad.price.toLocaleString("fr-FR")} FCFA</strong>
              </div>}
              {!isSubscription && !isBoost && !isSearchUrgency && !isDirectNumber && <div className={styles.summaryLine}>
                <span>Caution</span>
                <strong>{ad.deposit.toLocaleString("fr-FR")} FCFA</strong>
              </div>}
              <div className={styles.summaryLine}>
                <span>{isSubscription ? "Plan" : isBoost ? "Service" : isSearchUrgency ? "Service" : isDirectNumber ? "Option" : "Durée"}</span>
                <strong>{isSubscription ? plan : isBoost ? "Boost annonce 7 jours" : isSearchUrgency ? "Je recherche Express" : isDirectNumber ? "Dévoilement numéro vendeur" : ad.minimumDuration}</strong>
              </div>
            </div>

            <div className={styles.summaryTotal}>
              <span>Total à régler</span>
              <strong>{total.toLocaleString("fr-FR")} FCFA</strong>
            </div>

            <div className={styles.secureNote}>
              <span className={styles.secureDot} />
              {secureCopy}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}

export default function PaiementPage() {
  return (
    <Suspense fallback={<main className={styles.page}>Chargement du paiement...</main>}>
      <PaiementContent />
    </Suspense>
  );
}
