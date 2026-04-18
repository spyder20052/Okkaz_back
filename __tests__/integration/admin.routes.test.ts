import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { UserRole, UserStatus, ListingStatus } from '@prisma/client';
import { generateAccessToken } from '../../src/utils/jwt';

const app = createApp();

describe('Admin Routes Integration Tests', () => {
  let adminToken: string;
  let buyerToken: string;

  let adminId: string;
  let targetUserId: string;
  let targetListingId: string;
  let categoryId: string;

  beforeAll(async () => {
    // 1. Initialiser Admin et Non-Admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin-admin@test.com',
        passwordHash: 'hashed',
        firstName: 'Admin',
        lastName: 'AdminTest',
        phone: '9988776655',
        role: UserRole.ADMIN,
        isEmailVerified: true,
      },
    });
    adminId = admin.id;
    adminToken = generateAccessToken({ userId: admin.id, role: admin.role });

    const buyer = await prisma.user.create({
      data: {
        email: 'buyer-admin@test.com',
        passwordHash: 'hashed',
        firstName: 'Buyer',
        lastName: 'BuyerTest',
        phone: '1122334455',
        role: UserRole.BUYER,
        isEmailVerified: true,
      },
    });
    buyerToken = generateAccessToken({ userId: buyer.id, role: buyer.role });
    targetUserId = buyer.id;

    // 2. Initialiser Category
    const category = await prisma.category.create({
      data: {
        name: 'Admin category test',
        slug: 'admin-category-test',
      },
    });
    categoryId = category.id;

    // 3. Initialiser Listing
    const listing = await prisma.listing.create({
      data: {
        title: 'Admin Listing target',
        slug: 'admin-listing-target',
        description: 'Test target for admin',
        condition: 'NEW',
        rentalPrice: 200,
        rentalPeriod: 'MONTH',
        locationCity: 'Paris',
        contactPhone: '0102030405',
        contactPhoneWcc: '+33102030405',
        status: ListingStatus.PENDING,
        userId: targetUserId,
        categoryId: categoryId,
      },
    });
    targetListingId = listing.id;
  });

  afterAll(async () => {
    await prisma.listing.deleteMany({
      where: { id: targetListingId },
    });
    await prisma.category.deleteMany({
      where: { id: categoryId },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['admin-admin@test.com', 'buyer-admin@test.com'] },
      },
    });
  });

  describe('Authorization', () => {
    it('doit rejeter l acces si non admin (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${buyerToken}`);
      
      expect(res.status).toBe(403);
    });
  });

  describe('Users Operations', () => {
    it('GET /api/v1/admin/users/:id doit renvoyer 404 si introuvable', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users/11111111-1111-1111-1111-111111111111')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(404); // USER_NOT_FOUND
    });

    it('PATCH /api/v1/admin/users/:id/suspend doit suspendre un user', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Suspicious activity' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.user.status).toBe(UserStatus.SUSPENDED);
    });

    it('PATCH /api/v1/admin/users/:id/role doit modifier le role', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'SELLER' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe(UserRole.SELLER);
    });
  });

  describe('Listings Operations', () => {
    it('PATCH /api/v1/admin/listings/:id/validate doit renvoyer 404 si introuvable', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/listings/11111111-1111-1111-1111-111111111111/validate')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(404); // LISTING_NOT_FOUND
    });

    it('PATCH /api/v1/admin/listings/:id/reject doit rejeter l annonce', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/listings/${targetListingId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: 'Non conforme' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.listing.status).toBe(ListingStatus.REJECTED);
      expect(res.body.data.listing.rejectionReason).toBe('Non conforme');
    });

    it('PATCH /api/v1/admin/listings/:id/validate doit valider l annonce', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/listings/${targetListingId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.listing.status).toBe(ListingStatus.ACTIVE);
      expect(res.body.data.listing.validatedBy).toBe(adminId);
    });

    it('DELETE /api/v1/admin/listings/:id doit supprimer l annonce', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/listings/${targetListingId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(204);
      
      const checkRes = await prisma.listing.findMany({ where: { id: targetListingId } });
      expect(checkRes.length).toBe(0);
    });
  });

  describe('Dashboard', () => {
    it('GET /api/v1/admin/dashboard/stats doit renvoyer les stats (200)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('totalListings');
    });
  });
});
