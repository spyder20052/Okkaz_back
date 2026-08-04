import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanupDatabase } from './cleanup';
import { env } from '../../src/config/env';
import { signAccessToken } from '../../src/utils/jwt';
import bcrypt from 'bcrypt';

const app = createApp();

describe('Payments Routes (Integration)', () => {
  let sellerToken: string;
  let sellerId: string;

  beforeAll(async () => {
    try {
      await cleanupDatabase();
    } catch (e) {
      console.error('cleanupDatabase failed:', e);
    }

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const seller = await prisma.user.upsert({
      where: { email: 'seller_pay@example.com' },
      update: { passwordHash, kycStatus: 'APPROVED', status: 'ACTIVE', role: 'SELLER' },
      create: {
        email: 'seller_pay@example.com',
        phone: '22922222222',
        passwordHash,
        firstName: 'Seller',
        lastName: 'Pay',
        role: 'SELLER',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        isEmailVerified: true,
      },
    });
    sellerId = seller.id;
    sellerToken = signAccessToken(seller.id, 'SELLER');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/payments/:payment_id/status', () => {
    it("doit retourner le statut d'un paiement de l'utilisateur", async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: sellerId,
          type: 'SUBSCRIPTION',
          amount: 10000,
          currency: 'XOF',
          method: 'MOBILE_MONEY',
          status: 'PENDING',
          providerRef: 'pay_status_1',
        },
      });

      const res = await request(app)
        .get(`/api/v1/payments/${payment.id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.payment.id).toBe(payment.id);
      expect(res.body.data.payment.status).toBe('PENDING');
    });

    it('doit retourner 404 pour un paiement inexistant', async () => {
      const res = await request(app)
        .get('/api/v1/payments/00000000-0000-0000-0000-000000000000/status')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    it('doit activer un abonnement et passer le rôle à SELLER_PRO', async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: sellerId,
          type: 'SUBSCRIPTION',
          amount: 10000,
          currency: 'XOF',
          method: 'MOBILE_MONEY',
          status: 'PENDING',
          providerRef: 'sub_webhook_1',
          metadata: { plan: 'MONTHLY' },
        },
      });

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-kkiapay-secret', env.KKIAPAY_WEBHOOK_SECRET!)
        .set('Content-Type', 'application/json')
        .send({
          transactionId: 'kkSubTx1',
          isPaymentSucces: true,
          event: 'transaction.success',
          method: 'MOBILE_MONEY',
          amount: 10000,
          partnerId: 'sub_webhook_1',
          performedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(updated?.status).toBe('SUCCESS');

      const sub = await prisma.subscription.findFirst({ where: { paymentId: payment.id } });
      expect(sub).not.toBeNull();
      expect(sub?.status).toBe('ACTIVE');

      const user = await prisma.user.findUnique({ where: { id: sellerId } });
      expect(user?.role).toBe('SELLER_PRO');
    });

    it('doit rester idempotent / sans erreur pour une référence inconnue', async () => {
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-kkiapay-secret', env.KKIAPAY_WEBHOOK_SECRET!)
        .set('Content-Type', 'application/json')
        .send({ transactionId: 'unknown_ref', isPaymentSucces: true, partnerId: 'unknown_ref' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
