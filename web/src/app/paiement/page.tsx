"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openKkiapay, pollPaymentStatus } from "@/lib/kkiapay";
import type { Payment, Subscription, SubscriptionPlan, SubscriptionPlanInfo } from "@/lib/types";
import styles from "./paiement.module.css";

type Phase = "idle" | "initiating" | "widget" | "polling" | "success" | "pending" | "failed";

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  WEEKLY: "Premium hebdomadaire",
  MONTHLY: "Premium mensuel",
};

function fcfa(value: number | string): string {
  return `${Number(value).toLocaleString("fr-FR")} FCFA`;
}

// Écran de statut post-widget partagé entre les flux.
function PaymentStatusBox({ phase, backHref }: { phase: Phase; backHref: string }) {
  if (phase === "polling") {
    return (
      <div className={styles.revealBox}>
        <span>Vérification en cours...</span>
        <strong>Paiement transmis à KKiaPay</strong>
        <p>Nous vérifions la confirmation du paiement auprès du serveur (quelques secondes).</p>
      </div>
    );
  }
  if (phase === "success") {
    return (
      <div className={styles.revealBox}>
        <span>Paiement confirmé !</span>
        <strong>Merci, votre paiement a été validé.</strong>
        <p>Le service est activé sur votre compte.</p>
        <Link href={backHref} className={styles.chatLink}>Retour à mon espace</Link>
      </div>
    );
  }
  if (phase === "pending") {
    return (
      <div className={styles.revealBox}>
        <span>Paiement transmis</span>
        <strong>Confirmation en attente</strong>
        <p>
          Le paiement a bien été transmis. La confirmation finale arrive via le webhook KKiaPay
          (non joignable en environnement local, le statut reste donc « en attente » en développement).
          Le service sera activé dès réception de la confirmation.
        </p>
        <Link href={backHref} className={styles.chatLink}>Retour à mon espace</Link>
      </div>
    );
  }
  if (phase === "failed") {
    return (
      <div className={styles.revealBox}>
        <span>Paiement échoué</span>
        <strong>Le paiement n&apos;a pas abouti</strong>
        <p>Aucun montant n&apos;a été débité. Vous pouvez réessayer.</p>
      </div>
    );
  }
  return null;
}

function PaiementContent() {
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const paymentType = searchParams.get("type");
  const isSubscription = paymentType === "abonnement";
  const isSearchDemand = paymentType === "recherche";

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  // --- Flux abonnement ---
  const [plans, setPlans] = useState<SubscriptionPlanInfo[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("MONTHLY");
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);

  // --- Flux demande "Je recherche" (paramètres posés par la page de demande) ---
  const demandPaymentId = searchParams.get("paymentId");
  const demandAmount = Number(searchParams.get("amount") ?? 0);
  const demandRef = searchParams.get("ref") ?? "";

  useEffect(() => {
    if (!isSubscription) return;
    api
      .get<{ plans: SubscriptionPlanInfo[] }>("/subscriptions/plans", undefined, false)
      .then((res) => setPlans(res.data.plans))
      .catch(() => setError("Impossible de charger les formules d'abonnement."));
  }, [isSubscription]);

  useEffect(() => {
    if (!isSubscription || !user) return;
    api
      .get<{ subscription: Subscription | null }>("/subscriptions/me")
      .then((res) => setCurrentSub(res.data.subscription))
      .catch(() => setCurrentSub(null));
  }, [isSubscription, user]);

  const startPolling = async (paymentId: string) => {
    setPhase("polling");
    const { status } = await pollPaymentStatus(paymentId);
    if (status === "SUCCESS") setPhase("success");
    else if (status === "FAILED") setPhase("failed");
    else setPhase("pending");
  };

  const launchWidget = async (payment: { id: string; amount: number | string; providerRef?: string | null }) => {
    setPhase("widget");
    try {
      await openKkiapay({
        amount: Number(payment.amount),
        providerRef: payment.providerRef ?? "",
        onSuccess: () => startPolling(payment.id),
        onFailed: () => setPhase("failed"),
      });
    } catch {
      setPhase("idle");
      setError("Impossible d'ouvrir le widget de paiement KKiaPay. Vérifiez votre connexion et réessayez.");
    }
  };

  const paySubscription = async () => {
    setError(null);
    setPhase("initiating");
    try {
      const res = await api.post<{ payment: Payment; plan: SubscriptionPlanInfo }>("/subscriptions/subscribe", {
        plan: selectedPlan,
        method: "MOBILE_MONEY",
      });
      await launchWidget(res.data.payment);
    } catch (err) {
      setPhase("idle");
      if (err instanceof ApiError && err.code === "SUBSCRIPTION_ALREADY_ACTIVE") {
        setError("Vous avez déjà un abonnement Premium actif.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
    }
  };

  const payDemand = async () => {
    if (!demandPaymentId) return;
    setError(null);
    await launchWidget({ id: demandPaymentId, amount: demandAmount, providerRef: demandRef });
  };

  const busy = phase === "initiating" || phase === "widget" || phase === "polling";
  const finished = phase === "success" || phase === "pending";

  // --- Services sans backend : boost, direct_number, réservation par défaut ---
  if (!isSubscription && !isSearchDemand) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.left}>
            <Link href="/vendeur" className={styles.back} aria-label="Retour à mon espace">
              <span aria-hidden>←</span>
              Retour à mon espace
            </Link>
            <h1 className={styles.title}>Ce service n&apos;est pas encore disponible</h1>
            <p className={styles.subtitle}>
              {paymentType === "boost"
                ? "Le boost par annonce n'existe pas encore. Pour mettre vos annonces en avant, souscrivez un abonnement Premium."
                : paymentType === "direct_number"
                ? "L'option « numéro direct » payante n'existe plus : l'affichage de votre numéro direct est inclus avec l'abonnement Premium."
                : "La réservation en ligne n'est pas encore disponible. La consultation des contacts vendeurs est gratuite depuis la page d'une annonce."}
            </p>
            <div className={styles.section}>
              <Link href="/paiement?type=abonnement" className={styles.submitBtn} style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}>
                Découvrir l&apos;abonnement Premium
              </Link>
            </div>
            <div className={styles.secureNote}>
              <span className={styles.secureDot} />
              Paiements sécurisés par KKiaPay. Seuls l&apos;abonnement Premium et les demandes « Je recherche » sont payants pour le moment.
            </div>
          </div>
        </div>
      </main>
    );
  }

  const backHref = "/vendeur";
  const selectedPlanInfo = plans.find((p) => p.plan === selectedPlan);
  const total = isSubscription ? selectedPlanInfo?.price ?? 0 : demandAmount;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>

        <div className={styles.left}>
          <Link href={isSubscription ? "/vendeur" : "/vendeur/recherches/nouvelle"} className={styles.back} aria-label="Retour">
            <span aria-hidden>←</span>
            {isSubscription ? "Retour à mon espace" : "Retour au formulaire"}
          </Link>
          <h1 className={styles.title}>{isSubscription ? "Souscrire un abonnement Premium" : "Payer ma demande « Je recherche »"}</h1>
          <p className={styles.subtitle}>
            {isSubscription
              ? "L'abonnement Premium met vos annonces en avant et affiche votre numéro direct aux acheteurs. Paiement via KKiaPay (Mobile Money ou carte)."
              : "Votre demande a été créée. Réglez-la via KKiaPay pour qu'elle soit publiée auprès des vendeurs."}
          </p>

          {!authLoading && !user && (
            <p style={{ background: "#fef3c7", color: "#b45309", padding: "12px 16px", borderRadius: 12, fontWeight: 700 }}>
              Connectez-vous pour effectuer un paiement. <Link href="/connexion" style={{ textDecoration: "underline" }}>Se connecter</Link>
            </p>
          )}

          <div className={styles.form}>
            {isSubscription && (
              <>
                {currentSub && currentSub.status === "ACTIVE" && (
                  <p style={{ background: "#dcfce7", color: "#15803d", padding: "12px 16px", borderRadius: 12, fontWeight: 700 }}>
                    Vous avez déjà un abonnement {currentSub.plan === "WEEKLY" ? "hebdomadaire" : "mensuel"} actif
                    jusqu&apos;au {new Date(currentSub.endsAt).toLocaleDateString("fr-FR")}.
                  </p>
                )}

                <div className={styles.section}>
                  <p className={styles.sectionLabel}>Choisissez votre formule</p>
                  <div className={styles.durationBtns}>
                    {plans.length === 0 && <span>Chargement des formules...</span>}
                    {plans.map((p) => (
                      <button
                        key={p.plan}
                        type="button"
                        onClick={() => setSelectedPlan(p.plan)}
                        className={selectedPlan === p.plan ? styles.durationActive : styles.duration}
                        disabled={busy || finished}
                      >
                        {PLAN_LABELS[p.plan]} · {fcfa(p.price)} / {p.durationDays} jours
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {isSearchDemand && !demandPaymentId && (
              <p style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", borderRadius: 12, fontWeight: 700 }}>
                Référence de paiement introuvable. Repassez par le formulaire{" "}
                <Link href="/vendeur/recherches/nouvelle" style={{ textDecoration: "underline" }}>Je recherche</Link>.
              </p>
            )}

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Mode de paiement</p>
              <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.85rem", fontWeight: 600 }}>
                Mobile Money ou carte bancaire — le choix se fait directement dans la fenêtre sécurisée KKiaPay.
              </p>
            </div>

            {error && (
              <p style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", borderRadius: 12, fontWeight: 700 }}>
                {error}
              </p>
            )}

            {!finished && (
              <button
                type="button"
                className={styles.submitBtn}
                onClick={isSubscription ? paySubscription : payDemand}
                disabled={
                  busy ||
                  !user ||
                  (isSubscription && (!selectedPlanInfo || (currentSub?.status === "ACTIVE"))) ||
                  (isSearchDemand && !demandPaymentId)
                }
              >
                {phase === "initiating"
                  ? "Initialisation du paiement..."
                  : phase === "widget"
                  ? "Fenêtre KKiaPay ouverte..."
                  : phase === "polling"
                  ? "Vérification du paiement..."
                  : `Payer ${total ? fcfa(total) : ""} avec KKiaPay`}
              </button>
            )}

            <PaymentStatusBox phase={phase} backHref={backHref} />

            {phase === "failed" && (
              <button type="button" className={styles.submitBtn} onClick={isSubscription ? paySubscription : payDemand} disabled={!user}>
                Réessayer le paiement
              </button>
            )}
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.summary}>
            <p className={styles.summaryLabel}>Récapitulatif</p>
            <p className={styles.summaryTitle}>
              {isSubscription ? PLAN_LABELS[selectedPlan] : "Publication demande « Je recherche »"}
            </p>
            <p className={styles.summaryOwner}>
              {isSubscription
                ? "Abonnement compte vendeur"
                : demandRef
                ? `Référence : ${demandRef}`
                : "Alerte prioritaire vendeurs"}
            </p>

            <div className={styles.summaryLines}>
              <div className={styles.summaryLine}>
                <span>Service</span>
                <strong>
                  {isSubscription
                    ? selectedPlanInfo
                      ? `${selectedPlanInfo.durationDays} jours de visibilité Premium`
                      : "—"
                    : "Diffusion de la demande"}
                </strong>
              </div>
              <div className={styles.summaryLine}>
                <span>Paiement</span>
                <strong>KKiaPay (MoMo / carte)</strong>
              </div>
            </div>

            <div className={styles.summaryTotal}>
              <span>Total à régler</span>
              <strong>{fcfa(total)}</strong>
            </div>

            <div className={styles.secureNote}>
              <span className={styles.secureDot} />
              Paiement sécurisé par KKiaPay. La confirmation finale est transmise par webhook au serveur OKKAZ.
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
