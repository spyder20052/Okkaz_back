import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { UserRole, ReportStatus, ReportReason } from '@prisma/client';
import { generateAccessToken } from '../../src/utils/jwt';

const app = createApp();

describe('Reports Routes Integration Tests', () => {
  let buyerToken: string;
  let adminToken: string;

  let buyerId: string;
  let adminId: string;
  
  let sellerId: string;

  let reportId: string;

  beforeAll(async () => {
    // 1. Initialiser les utilisateurs
    const buyer = await prisma.user.create({
      data: {
        email: 'buyer-reports@test.com',
        passwordHash: 'hashed',
        firstName: 'Buyer',
        lastName: 'Test',
        phone: '1122334466',
        role: UserRole.BUYER,
        isEmailVerified: true,
      },
    });
    buyerId = buyer.id;
    buyerToken = generateAccessToken({ userId: buyer.id, role: buyer.role });

    const seller = await prisma.user.create({
      data: {
        email: 'seller-reports@test.com',
        passwordHash: 'hashed',
        firstName: 'Seller',
        lastName: 'Test',
        phone: '1122334477',
        role: UserRole.SELLER,
        isEmailVerified: true,
      },
    });
    sellerId = seller.id;

    const admin = await prisma.user.create({
      data: {
        email: 'admin-reports@test.com',
        passwordHash: 'hashed',
        firstName: 'Admin',
        lastName: 'Test',
        phone: '1122334488',
        role: UserRole.ADMIN,
        isEmailVerified: true,
      },
    });
    adminId = admin.id;
    adminToken = generateAccessToken({ userId: admin.id, role: admin.role });

    // 2. Créer un report simulé pour les tests admin
    const rep = await prisma.report.create({
      data: {
        reporterId: buyerId,
        reportedUserId: sellerId,
        reason: ReportReason.FRAUD,
        description: 'Fausses annonces répétées',
        status: ReportStatus.OPEN,
      },
    });
    reportId = rep.id;
  });

  afterAll(async () => {
    await prisma.report.deleteMany({
      where: { reporterId: buyerId },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['buyer-reports@test.com', 'seller-reports@test.com', 'admin-reports@test.com'] },
      },
    });
  });

  describe('POST /api/v1/reports', () => {
    it('doit creer un signalement (201)', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          reportedUserId: sellerId,
          reason: 'OTHER',
          description: 'Spam intensif en messages',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.data.report.id).toBeDefined();
    });

    it('doit echouer (400) si on se signale soi-meme', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          reportedUserId: buyerId,
          reason: 'INAPPROPRIATE',
        });
      
      expect(res.status).toBe(400); // CANNOT_REPORT_SELF
    });

    it('doit echouer (404) si l annonce n existe pas', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: '11111111-1111-1111-1111-111111111111',
          reason: 'FRAUD',
        });
      
      expect(res.status).toBe(404); // LISTING_NOT_FOUND
    });
  });

  describe('GET /api/v1/reports/admin/:id', () => {
    it('doit echouer (403) si non admin', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/admin/${reportId}`)
        .set('Authorization', `Bearer ${buyerToken}`);
      
      expect(res.status).toBe(403);
    });

    it('doit renvoyer 404 si signalement introuvable', async () => {
      const res = await request(app)
        .get('/api/v1/reports/admin/11111111-1111-1111-1111-111111111111')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(404); // REPORT_NOT_FOUND
    });

    it('doit reussir (200) pour un admin', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/admin/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.report.id).toBe(reportId);
    });
  });

  describe('PATCH /api/v1/reports/admin/:id/review', () => {
    it('doit renvoyer 404 si signalement introuvable', async () => {
      const res = await request(app)
        .patch('/api/v1/reports/admin/11111111-1111-1111-1111-111111111111/review')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'REVIEWED',
          adminNote: 'Traitement OK'
        });
      
      expect(res.status).toBe(404); // REPORT_NOT_FOUND
    });

    it('doit mettre a jour le status', async () => {
      const res = await request(app)
        .patch(`/api/v1/reports/admin/${reportId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'CLOSED',
          adminNote: 'Non lieu'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data.report.status).toBe('CLOSED');
      expect(res.body.data.report.adminNote).toBe('Non lieu');
    });
  });
});
