/**
 * @module modules/subscriptions/subscriptions.service
 * @description Abonnements Premium SELLER_PRO (§4.7, §6.4).
 */

import { randomUUID } from 'crypto';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';
import { getSettingNumber } from '../../services/settings.service';

export async function getPlans() {
  const [weekly, monthly] = await Promise.all([
    getSettingNumber('subscription_weekly_price', 3000),
    getSettingNumber('subscription_monthly_price', 10000),
  ]);
  return [
    { plan: SubscriptionPlan.WEEKLY, price: weekly, currency: 'XOF', durationDays: 7 },
    { plan: SubscriptionPlan.MONTHLY, price: monthly, currency: 'XOF', durationDays: 30 },
  ];
}

export async function subscribe(input: { userId: string; plan: SubscriptionPlan; method: PaymentMethod; provider?: string }) {
  const active = await prisma.subscription.findFirst({
    where: { userId: input.userId, status: SubscriptionStatus.ACTIVE, endsAt: { gt: new Date() } },
  });
  if (active) throw AppError.conflict('SUBSCRIPTION_ALREADY_ACTIVE', 'Vous avez déjà un abonnement actif.');

  const price = await getSettingNumber(
    input.plan === SubscriptionPlan.WEEKLY ? 'subscription_weekly_price' : 'subscription_monthly_price',
    input.plan === SubscriptionPlan.WEEKLY ? 3000 : 10000,
  );
  const providerRef = `sub_${randomUUID()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      type: PaymentType.SUBSCRIPTION,
      amount: new Prisma.Decimal(price),
      currency: 'XOF',
      method: input.method,
      provider: input.provider ?? null,
      providerRef,
      status: PaymentStatus.PENDING,
      metadata: { plan: input.plan },
    },
  });

  logger.info({ paymentId: payment.id, userId: input.userId, plan: input.plan }, '🟢 Subscription payment initiated');
  return {
    payment: {
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      providerRef: payment.providerRef!,
    },
    plan: input.plan,
  };
}

export async function getMine(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { payment: { select: { status: true, method: true, provider: true } } },
  });
  return sub;
}

export async function cancelAutoRenew(userId: string) {
  const active = await prisma.subscription.findFirst({
    where: { userId, status: SubscriptionStatus.ACTIVE, autoRenew: true },
  });
  if (!active) throw AppError.notFound('SUBSCRIPTION_NOT_FOUND', 'Aucun abonnement à annuler.');
  return prisma.subscription.update({ where: { id: active.id }, data: { autoRenew: false } });
}
