import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { UserRole, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { generateAccessToken } from '../../src/utils/jwt';

const app = createApp();

describe('Subscriptions Routes Integration Tests', () => {
  let sellerToken: string;
  let sellerProToken: string;
  let buyerToken: string;

  let sellerId: string;
  let sellerProId: string;

  beforeAll(async () => {
    // Initialiser les utilisateurs
    const seller = await prisma.user.create({
      data: {
        email: 'seller-subs-fix@test.com',
        passwordHash: 'hashed',
        firstName: 'Seller',
        lastName: 'Subs',
        phone: '5544332211',
        role: UserRole.SELLER,
        isEmailVerified: true,
      },
    });
    sellerId = seller.id;
    sellerToken = generateAccessToken({ userId: seller.id, role: seller.role });

    const sellerPro = await prisma.user.create({
      data: {
        email: 'sellerpro-subs-fix@test.com',
        passwordHash: 'hashed',
        firstName: 'SellerPro',
        lastName: 'Subs',
        phone: '5544332222',
        role: UserRole.SELLER_PRO,
        isEmailVerified: true,
      },
    });
    sellerProId = sellerPro.id;
    sellerProToken = generateAccessToken({ userId: sellerPro.id, role: sellerPro.role });

    const buyer = await prisma.user.create({
      data: {
        email: 'buyer-subs-fix@test.com',
        passwordHash: 'hashed',
        firstName: 'Buyer',
        lastName: 'Subs',
        phone: '5544332233',
        role: UserRole.SELLER,
        isEmailVerified: true,
      },
    });
    buyerToken = generateAccessToken({ userId: buyer.id, role: buyer.role });

    // Créer un paiement pour l'abonnement
    const subPayment = await prisma.payment.create({
      data: {
        userId: sellerProId,
        type: 'SUBSCRIPTION',
        amount: 10000,
        currency: 'XOF',
        method: 'MOBILE_MONEY',
        status: 'SUCCESS',
        providerRef: 'SUB_PAY_FIX_1',
      }
    });

    // Créer un abonnement actif pour le sellerPro pour tester GET /me et POST /cancel
    await prisma.subscription.create({
      data: {
        userId: sellerProId,
        plan: SubscriptionPlan.MONTHLY,
        amount: 10000,
        paymentId: subPayment.id,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 86400000), // expire dans 30j
      },
    });
  });

  afterAll(async () => {
    // Nettoie par email : couvre les trois comptes créés par la suite (le
    // troisième n'a pas d'id capturé mais peut avoir des paiements).
    const emails = ['seller-subs-fix@test.com', 'sellerpro-subs-fix@test.com', 'buyer-subs-fix@test.com'];
    await prisma.subscription.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.demandListing.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.payment.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['seller-subs-fix@test.com', 'sellerpro-subs-fix@test.com', 'buyer-subs-fix@test.com'] },
      },
    });
  });

  describe('GET /api/v1/subscriptions/plans', () => {
    it('doit renvoyer les plans (200 OK)', async () => {
      const res = await request(app).get('/api/v1/subscriptions/plans');
      
      expect(res.status).toBe(200);
      expect(res.body.data.plans).toBeInstanceOf(Array);
      expect(res.body.data.plans.length).toBe(2);
      expect(res.body.data.plans[0]).toHaveProperty('plan');
      expect(res.body.data.plans[0]).toHaveProperty('price');
    });
  });

  describe('POST /api/v1/subscriptions/subscribe', () => {
    it('doit autoriser un membre standard à souscrire', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          plan: 'MONTHLY',
          method: 'MOBILE_MONEY'
        });
      
      expect(res.status).toBe(201);
    });

    it('doit creer une transaction dabonnement (201 Created) pour un SELLER sans abo actif', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          plan: 'WEEKLY',
          method: 'MOBILE_MONEY'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.data.payment.id).toBeDefined();
      expect(res.body.data.plan).toBe('WEEKLY');
    });

    it('doit echouer (409) si SELLER a deja un abo actif', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${sellerProToken}`)
        .send({
          plan: 'MONTHLY',
          method: 'MOBILE_MONEY'
        });
      
      expect(res.status).toBe(409); // SUBSCRIPTION_ALREADY_ACTIVE
    });
  });

  describe('GET /api/v1/subscriptions/me', () => {
    it('doit recuperer labonnement actif (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/me')
        .set('Authorization', `Bearer ${sellerProToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.subscription).toBeDefined();
      expect(res.body.data.subscription.plan).toBe('MONTHLY');
      expect(res.body.data.subscription.status).toBe('ACTIVE');
    });

    it('doit renvoyer null si pas dabonnement', async () => {
      // Un seller qui n'a pas d'abonnement ACTIF (le payment est en pending pour sellerToken)
      const anotherSeller = await prisma.user.create({
        data: {
          email: 'seller-subs-empty@test.com',
          passwordHash: 'hashed',
          firstName: 'Seller',
          lastName: 'Empty',
          phone: '1122339999',
          role: UserRole.SELLER,
          isEmailVerified: true,
        },
      });
      const emptyToken = generateAccessToken({ userId: anotherSeller.id, role: anotherSeller.role });

      const res = await request(app)
        .get('/api/v1/subscriptions/me')
        .set('Authorization', `Bearer ${emptyToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.subscription).toBeNull();

      await prisma.user.delete({ where: { id: anotherSeller.id } });
    });
  });

  describe('POST /api/v1/subscriptions/cancel', () => {
    it('doit desactiver le renouvellement automatique (200 OK)', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/cancel')
        .set('Authorization', `Bearer ${sellerProToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.subscription.autoRenew).toBe(false);
    });

    it('doit echouer (404) si plus dabonnement avec autoRenew', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/cancel')
        .set('Authorization', `Bearer ${sellerProToken}`);
      
      expect(res.status).toBe(404); // SUBSCRIPTION_NOT_FOUND
    });
  });
});
