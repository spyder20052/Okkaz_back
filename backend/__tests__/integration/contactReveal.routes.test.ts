import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanupDatabase } from './cleanup';
import { encrypt } from '../../src/utils/crypto';
import { signAccessToken } from '../../src/utils/jwt';
import { runReviewReminders } from '../../src/jobs/reviewReminder.job';

const app = createApp();

const REAL_PHONE = '22995000000';
const WCC_PHONE = '22990000000';
const THREE_DAYS_MS = 3 * 24 * 3600 * 1000;

describe('Contact reveal & review reminder (Integration)', () => {
  let buyerId: string;
  let buyerToken: string;
  let sellerFreeId: string;
  let sellerFreeToken: string;
  let listingFreeId: string; // annonceur non abonné
  let listingProId: string; // annonceur abonné

  beforeAll(async () => {
    await cleanupDatabase();

    const buyer = await prisma.user.create({
      data: {
        email: 'buyer-reveal@test.com',
        phone: '22930000001',
        passwordHash: 'hashed',
        firstName: 'Buyer',
        lastName: 'Reveal',
        role: 'SELLER',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });
    buyerId = buyer.id;
    buyerToken = signAccessToken(buyer.id, 'SELLER');

    const cat = await prisma.category.create({ data: { name: 'Reveal Cat', slug: 'reveal-cat' } });

    // Annonceur SANS abonnement.
    const sellerFree = await prisma.user.create({
      data: {
        email: 'seller-free@test.com',
        phone: '22930000002',
        passwordHash: 'hashed',
        firstName: 'Seller',
        lastName: 'Free',
        role: 'SELLER',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
      },
    });
    sellerFreeId = sellerFree.id;
    sellerFreeToken = signAccessToken(sellerFree.id, 'SELLER');
    const listingFree = await prisma.listing.create({
      data: {
        userId: sellerFree.id,
        categoryId: cat.id,
        title: 'Annonce non abonnée',
        slug: 'annonce-free',
        description: 'desc',
        rentalPrice: 10000,
        rentalPeriod: 'DAY',
        condition: 'GOOD',
        locationCity: 'Cotonou',
        status: 'ACTIVE',
        contactPhone: encrypt(REAL_PHONE),
        contactPhoneWcc: WCC_PHONE,
      },
    });
    listingFreeId = listingFree.id;

    // Annonceur AVEC abonnement actif.
    const sellerPro = await prisma.user.create({
      data: {
        email: 'seller-pro@test.com',
        phone: '22930000003',
        passwordHash: 'hashed',
        firstName: 'Seller',
        lastName: 'Pro',
        role: 'SELLER_PRO',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
      },
    });
    const subPayment = await prisma.payment.create({
      data: {
        userId: sellerPro.id,
        type: 'SUBSCRIPTION',
        amount: 10000,
        currency: 'XOF',
        method: 'MOBILE_MONEY',
        status: 'SUCCESS',
        providerRef: 'sub_reveal_1',
      },
    });
    await prisma.subscription.create({
      data: {
        userId: sellerPro.id,
        plan: 'MONTHLY',
        amount: 10000,
        status: 'ACTIVE',
        paymentId: subPayment.id,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + THREE_DAYS_MS),
      },
    });
    const listingPro = await prisma.listing.create({
      data: {
        userId: sellerPro.id,
        categoryId: cat.id,
        title: 'Annonce abonnée',
        slug: 'annonce-pro',
        description: 'desc',
        rentalPrice: 20000,
        rentalPeriod: 'DAY',
        condition: 'NEW',
        locationCity: 'Cotonou',
        status: 'ACTIVE',
        contactPhone: encrypt(REAL_PHONE),
        contactPhoneWcc: WCC_PHONE,
      },
    });
    listingProId = listingPro.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/listings/:id/contact', () => {
    it('annonceur non abonné → renvoie le numéro plateforme (WCC) et trace la consultation', async () => {
      const res = await request(app)
        .post(`/api/v1/listings/${listingFreeId}/contact`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOwnerNumber).toBe(false);
      expect(res.body.data.contactPhone).toBe(WCC_PHONE);
      expect(res.body.data.watermark).toBeDefined();

      const reveal = await prisma.contactReveal.findUnique({
        where: { userId_listingId: { userId: buyerId, listingId: listingFreeId } },
      });
      expect(reveal).not.toBeNull();

      const listing = await prisma.listing.findUnique({ where: { id: listingFreeId } });
      expect(listing?.contactsCount).toBe(1);
    });

    it('annonceur abonné → renvoie le vrai numéro déchiffré', async () => {
      const res = await request(app)
        .post(`/api/v1/listings/${listingProId}/contact`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOwnerNumber).toBe(true);
      expect(res.body.data.contactPhone).toBe(REAL_PHONE);
    });

    it('doit rejeter une requête non authentifiée (401)', async () => {
      const res = await request(app).post(`/api/v1/listings/${listingFreeId}/contact`);
      expect(res.status).toBe(401);
    });

    it('un SELLER peut consulter le contact d\'une annonce d\'autrui', async () => {
      const res = await request(app)
        .post(`/api/v1/listings/${listingProId}/contact`)
        .set('Authorization', `Bearer ${sellerFreeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOwnerNumber).toBe(true);
      expect(res.body.data.contactPhone).toBe(REAL_PHONE);

      const reveal = await prisma.contactReveal.findUnique({
        where: { userId_listingId: { userId: sellerFreeId, listingId: listingProId } },
      });
      expect(reveal).not.toBeNull();
    });

    it('le propriétaire consulte sa propre annonce → vrai numéro, sans consultation enregistrée', async () => {
      const before = await prisma.listing.findUnique({ where: { id: listingFreeId } });

      const res = await request(app)
        .post(`/api/v1/listings/${listingFreeId}/contact`)
        .set('Authorization', `Bearer ${sellerFreeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOwnerNumber).toBe(true);
      expect(res.body.data.contactPhone).toBe(REAL_PHONE);

      const reveal = await prisma.contactReveal.findUnique({
        where: { userId_listingId: { userId: sellerFreeId, listingId: listingFreeId } },
      });
      expect(reveal).toBeNull();

      const after = await prisma.listing.findUnique({ where: { id: listingFreeId } });
      expect(after?.contactsCount).toBe(before?.contactsCount);
    });
  });

  describe('Job de rappel d\'avis (runReviewReminders)', () => {
    it('relance une consultation ancienne sans avis, ignore une consultation récente', async () => {
      const old = await prisma.user.create({
        data: { email: 'old-reveal@test.com', phone: '22930000004', passwordHash: 'h', firstName: 'Old', lastName: 'R', role: 'SELLER', isEmailVerified: true },
      });
      const fresh = await prisma.user.create({
        data: { email: 'fresh-reveal@test.com', phone: '22930000005', passwordHash: 'h', firstName: 'Fresh', lastName: 'R', role: 'SELLER', isEmailVerified: true },
      });

      // Consultation ancienne (au-delà de review_reminder_delay_hours par défaut = 48h).
      const oldReveal = await prisma.contactReveal.create({
        data: { userId: old.id, listingId: listingFreeId, createdAt: new Date(Date.now() - THREE_DAYS_MS) },
      });
      // Consultation récente (délai non écoulé).
      const freshReveal = await prisma.contactReveal.create({
        data: { userId: fresh.id, listingId: listingFreeId },
      });

      const sent = await runReviewReminders();
      expect(sent).toBeGreaterThanOrEqual(1);

      const oldAfter = await prisma.contactReveal.findUnique({ where: { id: oldReveal.id } });
      const freshAfter = await prisma.contactReveal.findUnique({ where: { id: freshReveal.id } });
      expect(oldAfter?.reviewReminderSentAt).not.toBeNull();
      expect(freshAfter?.reviewReminderSentAt).toBeNull();
    });
  });
});
