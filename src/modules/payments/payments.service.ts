/**
 * @module modules/payments/payments.service
 * @description Paiements & accès contacts (§4.6, §5.3, §5.4, §6.3).
 *
 *   Flux initiate-contact-access :
 *     1. Vérifie qu'aucun accès actif n'existe déjà.
 *     2. Crée un Payment PENDING (2 500 FCFA par défaut).
 *     3. Retourne une référence à utiliser côté frontend avec le SDK KKiapay.
 *
 *   Flux webhook :
 *     1. Signature HMAC vérifiée en amont (middleware).
 *     2. Marque le Payment SUCCESS/FAILED.
 *     3. Si SUCCESS et type=CONTACT_ACCESS → crée un ContactAccess chiffré.
 *     4. Si SUCCESS et type=SUBSCRIPTION → active l'abonnement et passe le
 *        rôle à SELLER_PRO.
 *     5. Si SUCCESS et type=DEMAND_LISTING/EXPRESS_DEMAND → active la demande.
 *
 *   Sécurité (§5.3) : le numéro de l'annonce est chiffré AES-256. Lorsqu'on
 *   crée un ContactAccess, on stocke aussi une copie chiffrée du numéro pour
 *   audit et traçabilité (le numéro du listing peut être mis à jour plus
 *   tard sans invalider les accès historiques).
 *
 * @author KOUTON Spynel
 */

import { randomUUID } from "crypto";
import {
  PaymentMethod,
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
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { encrypt, decrypt, hmacSha256 } from "../../utils/crypto";
import { getSettingNumber } from "../../services/settings.service";

interface InitiateContactAccessInput {
  userId: string;
  listingId: string;
  method: PaymentMethod;
  provider?: string;
}

interface InitiateContactAccessResult {
  payment: {
    id: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    providerRef: string;
  };
  checkoutHint: {
    kkiapayPublicKey?: string;
    sandbox: boolean;
    listingTitle: string;
  };
}

export async function initiateContactAccess(
  input: InitiateContactAccessInput,
): Promise<InitiateContactAccessResult> {
  const listing = await prisma.listing.findFirst({
    where: { id: input.listingId, deletedAt: null, status: "ACTIVE" },
  });
  if (!listing)
    throw AppError.notFound(
      "LISTING_NOT_FOUND",
      "Annonce introuvable ou inactive.",
    );

  const existingAccess = await prisma.contactAccess.findFirst({
    where: {
      userId: input.userId,
      listingId: input.listingId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
  });
  if (existingAccess) {
    throw AppError.conflict(
      "CONTACT_ACCESS_ALREADY_ACTIVE",
      "Vous avez déjà un accès actif à ce contact.",
    );
  }

  const amount = await getSettingNumber("contact_access_price", 2500);
  const providerRef = `ca_${randomUUID()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      type: PaymentType.CONTACT_ACCESS,
      amount: amount,
      currency: "XOF",
      method: input.method,
      provider: input.provider ?? null,
      providerRef,
      status: PaymentStatus.PENDING,
      metadata: { listingId: input.listingId },
    },
  });

  logger.info(
    { paymentId: payment.id, userId: input.userId, listingId: input.listingId },
    "🟢 Contact access payment initiated",
  );

  return {
    payment: {
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      providerRef: payment.providerRef!,
    },
    checkoutHint: {
      kkiapayPublicKey: env.KKIAPAY_PUBLIC_KEY,
      sandbox: env.KKIAPAY_SANDBOX,
      listingTitle: listing.title,
    },
  };
}

export interface KkiapayWebhookBody {
  status?: "SUCCESS" | "FAILED";
  transactionId?: string;
  reference?: string;
  providerRef?: string;
  data?: Record<string, unknown>;
}

/**
 * Traite un webhook KKiapay : met à jour le Payment et déclenche les effets
 * de bord métier (ContactAccess, Subscription, DemandListing).
 */
export async function handleWebhook(body: KkiapayWebhookBody): Promise<void> {
  const ref = body.providerRef ?? body.reference ?? body.transactionId;
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

  const newStatus =
    body.status === "SUCCESS" ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

  const existingMeta =
    (payment.metadata as Record<string, unknown> | null) ?? {};
  const updatedMeta = {
    ...existingMeta,
    webhook: body.data ?? null,
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
    case PaymentType.CONTACT_ACCESS:
      await grantContactAccess(payment.id);
      break;
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

async function grantContactAccess(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return;
  const meta = payment.metadata as { listingId?: string } | null;
  if (!meta?.listingId) return;

  const listing = await prisma.listing.findUnique({
    where: { id: meta.listingId },
  });
  if (!listing) return;

  const durationHours = await getSettingNumber(
    "contact_access_duration_hours",
    48,
  );
  const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000);

  await prisma.$transaction([
    prisma.contactAccess.create({
      data: {
        userId: payment.userId,
        listingId: listing.id,
        paymentId: payment.id,
        // Re-chiffré dans l'enregistrement d'accès (audit).
        contactPhoneRevealed: encrypt(decrypt(listing.contactPhone)),
        amountPaid: payment.amount,
        expiresAt,
        isActive: true,
      },
    }),
    prisma.listing.update({
      where: { id: listing.id },
      data: { contactsCount: { increment: 1 } },
    }),
  ]);
}

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

async function activateDemand(paymentId: string): Promise<void> {
  await prisma.demandListing.updateMany({
    where: { paymentId },
    data: { status: DemandStatus.ACTIVE },
  });
}

// --- Consultations ----------------------------------------------------------

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

/**
 * §5.3 — Ne retourne le contact réel qu'en présence d'un accès actif.
 * §5.4 — Inclut un `watermark` anti-capture d'écran.
 */
export async function getContactAccess(userId: string, listingId: string) {
  const access = await prisma.contactAccess.findFirst({
    where: { userId, listingId, isActive: true, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!access) {
    throw AppError.forbidden(
      "NO_ACTIVE_ACCESS",
      "Aucun accès actif à ce contact. Payez pour accéder.",
    );
  }
  const contactPhone = decrypt(access.contactPhoneRevealed);
  const watermark = buildWatermark(userId);

  return {
    contactPhone,
    watermark,
    expiresAt: access.expiresAt.toISOString(),
  };
}

function buildWatermark(userId: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const short = hmacSha256(`${userId}:${ts}`).slice(0, 10);
  return `OKKAZ-USER-${short}-${ts}`;
}
