/**
 * @module modules/payments/payments.service
 * @description Paiements (§4.6).
 *
 *   Le client (locataire) ne paie plus pour consulter un contact : la
 *   consultation est gratuite et tracée (cf. listings.revealContact /
 *   ContactReveal). Les paiements restants concernent :
 *     - SUBSCRIPTION       → abonnement annonceur (débloque l'affichage du
 *                            numéro réel sur ses annonces).
 *     - DEMAND_LISTING     → annonce « Je recherche » (standard).
 *     - EXPRESS_DEMAND     → annonce « Je recherche » express.
 *
 *   Flux webhook :
 *     1. Secret `x-kkiapay-secret` vérifié en amont (middleware).
 *     2. Marque le Payment SUCCESS/FAILED.
 *     3. Si SUCCESS et type=SUBSCRIPTION → active l'abonnement et passe le
 *        rôle à SELLER_PRO.
 *     4. Si SUCCESS et type=DEMAND_LISTING/EXPRESS_DEMAND → active la demande.
 *
 * @author KOUTON Spynel
 */

import {
  PaymentStatus,
  PaymentType,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
  DemandStatus,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/AppError";

export interface KkiapayWebhookBody {
  transactionId?: string;
  isPaymentSucces?: boolean; // Typo in Kkiapay's API (Succes instead of Success)
  event?: string; // e.g. "transaction.success" or "transaction.failed"
  account?: string;
  failureCode?: string;
  failureMessage?: string;
  label?: string;
  method?: string;
  amount?: number;
  fees?: number;
  partnerId?: string; // Recommended to pass custom ID via KKiapay SDK
  performedAt?: string;
  stateData?: Record<string, unknown> | string; // Alternative to partnerId
}

/**
 * Traite un webhook KKiapay : met à jour le `Payment` et déclenche les effets
 * de bord métier (Subscription, DemandListing).
 *
 * Idempotent : ignore les paiements déjà traités.
 *
 * @param body - Payload du webhook KKiapay.
 */
export async function handleWebhook(body: KkiapayWebhookBody): Promise<void> {
  // Extract custom providerRef from partnerId or stateData
  let ref = body.partnerId;

  if (!ref && body.stateData) {
    if (typeof body.stateData === "string") {
      try {
        const parsed = JSON.parse(body.stateData);
        ref = parsed.providerRef ?? parsed.orderId;
      } catch {
        ref = body.stateData;
      }
    } else if (typeof body.stateData === "object" && body.stateData !== null) {
      ref = (body.stateData.providerRef as string) ?? (body.stateData.orderId as string);
    }
  }

  // Fallback to transactionId if no custom ref is found
  if (!ref) {
    ref = body.transactionId;
  }

  if (!ref) {
    logger.warn({ body }, "Webhook sans référence de transaction");
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { providerRef: ref },
  });
  if (!payment) {
    logger.warn({ ref }, "Webhook : paiement introuvable");
    return;
  }
  if (payment.status !== PaymentStatus.PENDING) {
    // Idempotence : déjà traité.
    return;
  }

  // Determine status from `isPaymentSucces` boolean or `event` string
  const isSuccess = body.isPaymentSucces === true || body.event === "transaction.success";
  const newStatus = isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

  const existingMeta =
    (payment.metadata as Record<string, unknown> | null) ?? {};
  const updatedMeta = {
    ...existingMeta,
    webhook: {
      transactionId: body.transactionId ?? null,
      event: body.event ?? null,
      method: body.method ?? null,
      amount: body.amount ?? null,
      fees: body.fees ?? null,
      performedAt: body.performedAt ?? null,
      failureCode: body.failureCode ?? null,
      failureMessage: body.failureMessage ?? null,
    },
  } as Prisma.JsonObject;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: newStatus, metadata: updatedMeta },
  });

  if (newStatus !== PaymentStatus.SUCCESS) {
    logger.info({ paymentId: payment.id, ref }, "🟢 Payment FAILED");
    return;
  }

  switch (payment.type) {
    case PaymentType.SUBSCRIPTION:
      await activateSubscription(payment.id);
      break;
    case PaymentType.DEMAND_LISTING:
    case PaymentType.EXPRESS_DEMAND:
      await activateDemand(payment.id);
      break;
  }

  logger.info(
    { paymentId: payment.id, type: payment.type },
    "🟢 Payment SUCCESS processed",
  );
}

/**
 * Active un abonnement SELLER_PRO après paiement réussi.
 *
 * Transactionnel : crée la `Subscription`, passe le rôle à `SELLER_PRO`,
 * et marque toutes les annonces existantes comme `isFeatured`.
 *
 * @param paymentId - UUID du paiement.
 * @private
 */
async function activateSubscription(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return;
  const meta = payment.metadata as { plan?: SubscriptionPlan } | null;
  const plan = meta?.plan ?? SubscriptionPlan.MONTHLY;

  const now = new Date();
  const endsAt = new Date(now);
  if (plan === SubscriptionPlan.WEEKLY) endsAt.setDate(endsAt.getDate() + 7);
  else endsAt.setMonth(endsAt.getMonth() + 1);

  await prisma.$transaction([
    prisma.subscription.create({
      data: {
        userId: payment.userId,
        plan,
        amount: payment.amount,
        status: SubscriptionStatus.ACTIVE,
        paymentId: payment.id,
        startsAt: now,
        endsAt,
      },
    }),
    prisma.user.update({
      where: { id: payment.userId },
      data: { role: UserRole.SELLER_PRO },
    }),
    prisma.listing.updateMany({
      where: { userId: payment.userId, deletedAt: null },
      data: { isFeatured: true },
    }),
  ]);
}

/**
 * Active une demande (DemandListing) après paiement réussi.
 *
 * @param paymentId - UUID du paiement.
 * @private
 */
async function activateDemand(paymentId: string): Promise<void> {
  await prisma.demandListing.updateMany({
    where: { paymentId },
    data: { status: DemandStatus.ACTIVE },
  });
}

// --- Consultations ----------------------------------------------------------

/**
 * Récupère le statut d'un paiement (uniquement les paiements de l'utilisateur).
 *
 * @param paymentId - UUID du paiement.
 * @param userId    - ID de l'utilisateur propriétaire.
 * @returns Informations du paiement (sans metadata).
 * @throws {AppError} 404 si paiement introuvable.
 */
export async function getPaymentStatus(paymentId: string, userId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
    select: {
      id: true,
      type: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      method: true,
      provider: true,
    },
  });
  if (!payment)
    throw AppError.notFound("PAYMENT_NOT_FOUND", "Paiement introuvable.");
  return payment;
}
