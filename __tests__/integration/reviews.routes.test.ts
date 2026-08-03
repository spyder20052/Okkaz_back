import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { UserRole, ListingCondition, ListingStatus, RentalPeriod } from '@prisma/client';
import { generateAccessToken } from '../../src/utils/jwt';

const app = createApp();

describe('Reviews Routes Integration Tests', () => {
  let buyerToken: string;
  let sellerToken: string;
  let adminToken: string;

  let buyerId: string;
  let sellerId: string;
  let adminId: string;

  let categoryId: string;
  let listingId: string;
  let reviewId: string;

  beforeAll(async () => {
    // 1. Initialiser les utilisateurs
    const buyer = await prisma.user.create({
      data: {
        email: 'buyer-reviews-fix@test.com',
        passwordHash: 'hashed',
        firstName: 'Buyer',
        lastName: 'Reviews',
        phone: '1122334411',
        role: UserRole.BUYER,
        isEmailVerified: true,
      },
    });
    buyerId = buyer.id;
    buyerToken = generateAccessToken({ userId: buyer.id, role: buyer.role });

    const seller = await prisma.user.create({
      data: {
        email: 'seller-reviews-fix@test.com',
        passwordHash: 'hashed',
        firstName: 'Seller',
        lastName: 'Reviews',
        phone: '1122334422',
        role: UserRole.SELLER,
        isEmailVerified: true,
      },
    });
    sellerId = seller.id;
    sellerToken = generateAccessToken({ userId: seller.id, role: seller.role });

    const admin = await prisma.user.create({
      data: {
        email: 'admin-reviews-fix@test.com',
        passwordHash: 'hashed',
        firstName: 'Admin',
        lastName: 'Reviews',
        phone: '1122334433',
        role: UserRole.ADMIN,
        isEmailVerified: true,
      },
    });
    adminId = admin.id;
    adminToken = generateAccessToken({ userId: admin.id, role: admin.role });

    // 2. Créer une catégorie
    const cat = await prisma.category.create({
      data: {
        name: 'Auto Reviews',
        slug: 'auto-reviews',
        description: 'Auto category for reviews',
      },
    });
    categoryId = cat.id;

    // 3. Créer une annonce
    const listing = await prisma.listing.create({
      data: {
        userId: sellerId,
        categoryId,
        title: 'Voiture test review',
        slug: 'voiture-test-review',
        description: 'Voiture pour test',
        rentalPrice: 50000,
        rentalPeriod: RentalPeriod.DAY,
        purchasePrice: 1000000,
        condition: ListingCondition.NEW,
        locationCity: 'Cotonou',
        contactPhone: 'encrypted',
        contactPhoneWcc: '229900000',
        status: ListingStatus.ACTIVE,
      },
    });
    listingId = listing.id;

    // 4. Créer un paiement pour contact access
    const payment = await prisma.payment.create({
      data: {
        userId: buyerId,
        type: 'CONTACT_ACCESS',
        amount: 500,
        currency: 'XOF',
        method: 'MOBILE_MONEY',
        status: 'SUCCESS',
        providerRef: 'PAY_REV_1',
      }
    });

    // 5. Créer un accès contact pour le buyer sur cette annonce
    await prisma.contactAccess.create({
      data: {
        userId: buyerId,
        listingId,
        isActive: true,
        contactPhoneRevealed: '1122334455',
        amountPaid: 500,
        paymentId: payment.id,
        expiresAt: new Date(Date.now() + 86400000), // expire demain
      },
    });
  });

  afterAll(async () => {
    await prisma.review.deleteMany({
      where: { listingId },
    });
    await prisma.contactAccess.deleteMany({
      where: { listingId },
    });
    await prisma.payment.deleteMany({
      where: { userId: buyerId },
    });
    await prisma.listing.deleteMany({
      where: { id: listingId },
    });
    await prisma.category.deleteMany({ where: { slug: 'auto-reviews' } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['buyer-reviews-fix@test.com', 'seller-reviews-fix@test.com', 'admin-reviews-fix@test.com'] },
      },
    });
  });

  describe('POST /api/v1/reviews', () => {
    it('doit creer un avis (201 Created)', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId,
          rating: 4,
          comment: 'Très bonne affaire, vendeur sympa.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.review.id).toBeDefined();
      reviewId = res.body.data.review.id;
    });

    it('doit echouer (403) si non BUYER (SELLER n\'a pas acces normalement, mais le test est pour un user sans acces)', async () => {
      // Un autre buyer qui n'a pas l'accès contact
      const anotherBuyer = await prisma.user.create({
        data: {
          email: 'buyer-reviews-2-fix@test.com',
          passwordHash: 'hashed',
          firstName: 'Buyer',
          lastName: 'Reviews 2',
          phone: '1122334444',
          role: UserRole.BUYER,
          isEmailVerified: true,
        },
      }); 
      const anotherBuyerToken = generateAccessToken({ userId: anotherBuyer.id, role: anotherBuyer.role });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${anotherBuyerToken}`)
        .send({
          listingId,
          rating: 5,
        });

      expect(res.status).toBe(403);

      await prisma.user.delete({ where: { id: anotherBuyer.id } });
    });
  });

  describe('GET /api/v1/reviews/listing/:listing_id', () => {
    it('doit recuperer les avis dune annonce (200 OK)', async () => {
      const res = await request(app).get(`/api/v1/reviews/listing/${listingId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reviews).toBeInstanceOf(Array);
      expect(res.body.data.reviews.length).toBeGreaterThan(0);
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.average).toBe(4);
      expect(res.body.data.stats.count).toBe(1);
    });
  });

  describe('DELETE /api/v1/reviews/:id', () => {
    it('doit echouer (403) si non admin', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${buyerToken}`);
      
      expect(res.status).toBe(403);
    });

    it('doit echouer (404) si avis introuvable', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(404);
    });

    it('doit supprimer lavis (204) si admin', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(204);

      // Verifier que ça a disparu
      const resCheck = await request(app).get(`/api/v1/reviews/listing/${listingId}`);
      expect(resCheck.body.data.stats.count).toBe(0);
    });
  });
});
