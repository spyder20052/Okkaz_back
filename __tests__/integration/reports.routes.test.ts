import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanupDatabase } from './cleanup';
import { encrypt } from '../../src/utils/crypto';

const app = createApp();

describe('Reports Routes (Integration)', () => {
  let adminToken: string;
  let reporterToken: string;
  let sellerId: string;
  let listingId: string;

  const testAdmin = {
    email: 'admin_report@okkaz.bj',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'Report',
    phone: '22900000000',
  };

  const testReporter = {
    email: 'reporter@example.com',
    password: 'Password123!',
    firstName: 'Reporter',
    lastName: 'User',
    phone: '22911111111',
  };

  const testSeller = {
    email: 'reported_seller@example.com',
    password: 'Password123!',
    firstName: 'Seller',
    lastName: 'Bad',
    phone: '22922222222',
  };

  beforeAll(async () => {
    await cleanupDatabase();

    // Create Admin (register as BUYER then upgrade to ADMIN in DB bypass validator)
    await request(app).post('/api/v1/auth/register').send({ ...testAdmin, role: 'BUYER' });
    const admin = await prisma.user.findUnique({ where: { email: testAdmin.email } });
    await prisma.user.update({ where: { id: admin!.id }, data: { role: 'ADMIN' } });
    
    // Login to get a token with ADMIN role
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: testAdmin.email,
      password: testAdmin.password,
    });
    adminToken = loginRes.body.data.tokens.accessToken;

    // Create Reporter
    const reporterRes = await request(app).post('/api/v1/auth/register').send({ ...testReporter, role: 'BUYER' });
    reporterToken = reporterRes.body.data.tokens.accessToken;

    // Create Seller
    const sellerRes = await request(app).post('/api/v1/auth/register').send({ ...testSeller, role: 'SELLER' });
    sellerId = sellerRes.body.data.user.id;

    // Create Category & Listing
    const cat = await prisma.category.create({ 
      data: { name: 'Report Test', slug: 'report-test' } 
    });
    const listing = await prisma.listing.create({
      data: {
        userId: sellerId,
        categoryId: cat.id,
        title: 'Shady Listing',
        slug: 'shady-listing-' + Date.now(),
        description: 'Suspicious description',
        rentalPrice: 1,
        rentalPeriod: 'DAY',
        condition: 'FAIR',
        locationCity: 'Cotonou',
        status: 'ACTIVE',
        contactPhone: encrypt('22900000000'),
        contactPhoneWcc: '22900000000',
      },
    });
    listingId = listing.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Report Management', () => {
    let reportId: string;

    it('doit permettre de signaler une annonce', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          listingId,
          reason: 'FRAUD',
          description: 'This looks like a scam.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      reportId = res.body.data.report.id;

      const user = await prisma.user.findUnique({ where: { id: sellerId } });
      expect(user?.reportsCount).toBe(1);
    });

    it('doit lister les signalements pour ladministrateur', async () => {
      const res = await request(app)
        .get('/api/v1/reports/admin/list')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].reason).toBe('FRAUD');
    });

    it('doit permettre de traiter un signalement', async () => {
      const res = await request(app)
        .patch(`/api/v1/reports/admin/${reportId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'REVIEWED',
          adminNote: 'Confirmed fraud attempt.',
        });

      expect(res.status).toBe(200);
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      expect(report?.status).toBe('REVIEWED');
    });

    it('doit suspendre un utilisateur après 5 signalements', async () => {
      // already has 1. Need 4 more.
      for (let i = 0; i < 4; i++) {
        // We use different reporters to be realistic, or not.
        // The service doesn't care who reports, it just increments.
        await request(app)
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${reporterToken}`)
          .send({
            reportedUserId: sellerId,
            reason: 'INAPPROPRIATE',
          });
      }

      const user = await prisma.user.findUnique({ where: { id: sellerId } });
      expect(user?.reportsCount).toBe(5);
      expect(user?.status).toBe('SUSPENDED');
    });
  });
});
