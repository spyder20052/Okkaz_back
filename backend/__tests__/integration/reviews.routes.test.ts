import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { UserRole, ListingCondition, ListingStatus, RentalPeriod } from '@prisma/client';
import { generateAccessToken } from '../../src/utils/jwt';

const app = createApp();

/** 2 jours en ms — au-delà du délai par défaut (review_min_delay_hours = 24). */
const TWO_DAYS_MS = 2 * 24 * 3600 * 1000;

describe('Reviews Routes Integration Tests', () => {
  let buyerToken: string;
  let adminToken: string;

  let buyerId: string;
  let sellerId: string;

  let categoryId: string;
  let listingId: string;
  let reviewId: string;

  beforeAll(async () => {
    // 1. Utilisateurs
    const buyer = await prisma.user.create({
      data: {
        email: 'buyer-reviews-fix@test.com',
        passwordHash: 'hashed',
        firstName: 'Buyer',
        lastName: 'Reviews',
        phone: '1122334411',
        role: UserRole.SELLER,
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
    adminToken = generateAccessToken({ userId: admin.id, role: admin.role });

    // 2. Catégorie
    const cat = await prisma.category.create({
      data: { name: 'Auto Reviews', slug: 'auto-reviews', description: 'Auto category for reviews' },
    });
    categoryId = cat.id;

    // 3. Annonce
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

    // 4. Consultation du contact (gratuite) — antidatée pour passer le délai minimal.
    await prisma.contactReveal.create({
      data: {
        userId: buyerId,
        listingId,
        createdAt: new Date(Date.now() - TWO_DAYS_MS),
      },
    });
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { listingId } });
    await prisma.contactReveal.deleteMany({ where: { listingId } });
    await prisma.listing.deleteMany({ where: { id: listingId } });
    await prisma.category.deleteMany({ where: { slug: 'auto-reviews' } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['buyer-reviews-fix@test.com', 'seller-reviews-fix@test.com', 'admin-reviews-fix@test.com'] },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/reviews', () => {
    it('doit creer un avis (201) apres consultation et delai ecoule', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ listingId, rating: 4, comment: 'Très bonne affaire, vendeur sympa.' });

      expect(res.status).toBe(201);
      expect(res.body.data.review.id).toBeDefined();
      reviewId = res.body.data.review.id;
    });

    it('doit echouer (403) si aucune consultation du contact', async () => {
      const other = await prisma.user.create({
        data: {
          email: 'buyer-no-reveal@test.com',
          passwordHash: 'hashed',
          firstName: 'Buyer',
          lastName: 'NoReveal',
          phone: '1122334444',
          role: UserRole.SELLER,
          isEmailVerified: true,
        },
      });
      const token = generateAccessToken({ userId: other.id, role: other.role });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ listingId, rating: 5 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NO_CONTACT_REVEAL');

      await prisma.user.delete({ where: { id: other.id } });
    });

    it('doit echouer (403) si le delai depuis la consultation nest pas ecoule', async () => {
      const recent = await prisma.user.create({
        data: {
          email: 'buyer-recent@test.com',
          passwordHash: 'hashed',
          firstName: 'Buyer',
          lastName: 'Recent',
          phone: '1122334455',
          role: UserRole.SELLER,
          isEmailVerified: true,
        },
      });
      const token = generateAccessToken({ userId: recent.id, role: recent.role });
      // Consultation à l'instant → délai non écoulé.
      await prisma.contactReveal.create({ data: { userId: recent.id, listingId } });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ listingId, rating: 5 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('REVIEW_TOO_EARLY');

      await prisma.contactReveal.deleteMany({ where: { userId: recent.id } });
      await prisma.user.delete({ where: { id: recent.id } });
    });
  });

  describe('GET /api/v1/reviews/listing/:listing_id', () => {
    it('doit recuperer les avis dune annonce (200 OK)', async () => {
      const res = await request(app).get(`/api/v1/reviews/listing/${listingId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reviews).toBeInstanceOf(Array);
      expect(res.body.data.stats.average).toBe(4);
      expect(res.body.data.stats.count).toBe(1);
    });
  });

  describe('PATCH /api/v1/reviews/:id/moderate', () => {
    it('doit echouer (403) si non admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ isModerated: true });

      expect(res.status).toBe(403);
    });

    it('doit masquer un avis (200) et lexclure du public', async () => {
      const res = await request(app)
        .patch(`/api/v1/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isModerated: true });

      expect(res.status).toBe(200);

      const pub = await request(app).get(`/api/v1/reviews/listing/${listingId}`);
      expect(pub.body.data.stats.count).toBe(0);
    });

    it('doit reafficher un avis (modération réversible)', async () => {
      const res = await request(app)
        .patch(`/api/v1/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isModerated: false });

      expect(res.status).toBe(200);

      const pub = await request(app).get(`/api/v1/reviews/listing/${listingId}`);
      expect(pub.body.data.stats.count).toBe(1);
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

      const check = await request(app).get(`/api/v1/reviews/listing/${listingId}`);
      expect(check.body.data.stats.count).toBe(0);
    });
  });
});
