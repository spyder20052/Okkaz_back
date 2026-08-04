import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { UserRole, DemandType, DemandStatus, PaymentMethod } from '@prisma/client';
import { generateAccessToken } from '../../src/utils/jwt';

const app = createApp();

describe('Demands Routes Integration Tests', () => {
  let buyerToken: string;
  let sellerToken: string;
  let proToken: string;
  let adminToken: string;

  let buyerId: string;
  let sellerId: string;
  let proId: string;
  let adminId: string;

  let categoryId: string;
  let standardDemandId: string;
  let expressDemandId: string;

  beforeAll(async () => {
    // 1. Initialiser les utilisateurs
    const buyer = await prisma.user.create({
      data: {
        email: 'buyer-demands@test.com',
        passwordHash: 'hashed',
        firstName: 'Buyer',
        lastName: 'Test',
        phone: '1122334455',
        role: UserRole.SELLER,
        isEmailVerified: true,
      },
    });
    buyerId = buyer.id;
    buyerToken = generateAccessToken({ userId: buyer.id, role: buyer.role });

    const seller = await prisma.user.create({
      data: {
        email: 'seller-demands@test.com',
        passwordHash: 'hashed',
        firstName: 'Seller',
        lastName: 'Test',
        phone: '1122334466',
        role: UserRole.SELLER,
        isEmailVerified: true,
      },
    });
    sellerId = seller.id;
    sellerToken = generateAccessToken({ userId: seller.id, role: seller.role });

    const pro = await prisma.user.create({
      data: {
        email: 'pro-demands@test.com',
        passwordHash: 'hashed',
        firstName: 'Pro',
        lastName: 'Test',
        phone: '1122334477',
        role: UserRole.SELLER_PRO,
        isEmailVerified: true,
      },
    });
    proId = pro.id;
    proToken = generateAccessToken({ userId: pro.id, role: pro.role });

    const admin = await prisma.user.create({
      data: {
        email: 'admin-demands@test.com',
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

    // 2. Créer une catégorie
    const cat = await prisma.category.create({
      data: {
        name: 'Auto Demands',
        slug: 'auto-demands',
        description: 'Auto category for demands',
      },
    });
    categoryId = cat.id;

    // 3. Créer des paiements simulés avant les demandes
    const p1 = await prisma.payment.create({
      data: {
        userId: buyerId,
        type: 'DEMAND_LISTING',
        amount: 2500,
        currency: 'XOF',
        method: 'MOBILE_MONEY',
        status: 'SUCCESS',
        providerRef: 'SIM_DMD_1',
      }
    });

    const p2 = await prisma.payment.create({
      data: {
        userId: buyerId,
        type: 'EXPRESS_DEMAND',
        amount: 5000,
        currency: 'XOF',
        method: 'MOBILE_MONEY',
        status: 'SUCCESS',
        providerRef: 'SIM_DMD_2',
      }
    });

    // 4. Créer des demandes (simulées)
    // Demande Standard pour les tests GET /:id
    const d1 = await prisma.demandListing.create({
      data: {
        userId: buyerId,
        categoryId,
        title: 'Recherche Voiture Standard',
        description: 'Standard demand desc',
        city: 'Cotonou',
        type: DemandType.STANDARD,
        status: DemandStatus.ACTIVE,
        paymentId: p1.id,
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    standardDemandId = d1.id;

    // Demande Express
    const d2 = await prisma.demandListing.create({
      data: {
        userId: buyerId,
        categoryId,
        title: 'Recherche Voiture Express',
        description: 'Express demand desc',
        city: 'Cotonou',
        type: DemandType.EXPRESS,
        status: DemandStatus.ACTIVE,
        paymentId: p2.id,
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    expressDemandId = d2.id;
  });

  afterAll(async () => {
    await prisma.demandListing.deleteMany({
      where: { userId: buyerId },
    });
    await prisma.payment.deleteMany({
      where: { userId: buyerId },
    });
    await prisma.category.deleteMany({ where: { slug: 'auto-demands' } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['buyer-demands@test.com', 'seller-demands@test.com', 'pro-demands@test.com', 'admin-demands@test.com'] },
      },
    });
  });

  describe('POST /api/v1/demands/initiate', () => {
    it('doit creer une demande (200 OK) avec paiement', async () => {
      const res = await request(app)
        .post('/api/v1/demands/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          categoryId,
          title: 'Ma Super Demande',
          description: 'Description demand',
          city: 'Cotonou',
          type: 'STANDARD',
          method: 'MOBILE_MONEY',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.data.demand.id).toBeDefined();
    });

    it('doit echouer (400) si categorie invalide', async () => {
      const res = await request(app)
        .post('/api/v1/demands/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          categoryId: '00000000-0000-0000-0000-000000000000',
          title: 'Demande Fail',
          description: 'Description longue pour passer la validation',
          city: 'Cotonou',
          type: 'STANDARD',
          method: 'MOBILE_MONEY',
        });
      if (res.status !== 400) console.error('500 Error body:', res.body);
      expect(res.status).toBe(400); // INVALID_CATEGORY
    });
  });

  describe('GET /api/v1/demands/:id', () => {
    it('doit renvoyer (404) si demande inexistante', async () => {
      const res = await request(app)
        .get('/api/v1/demands/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${sellerToken}`);
      
      expect(res.status).toBe(404);
    });

    it('doit echouer (403) si SELLER tente de lire une demande EXPRESS', async () => {
      const res = await request(app)
        .get(`/api/v1/demands/${expressDemandId}`)
        .set('Authorization', `Bearer ${sellerToken}`);
      
      expect(res.status).toBe(403); // EXPRESS_PRO_ONLY
    });

    it('doit reussir (200) si SELLER_PRO lit une demande EXPRESS', async () => {
      const res = await request(app)
        .get(`/api/v1/demands/${expressDemandId}`)
        .set('Authorization', `Bearer ${proToken}`);
      
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/v1/demands/:id/close', () => {
    it('doit renvoyer (404) si demande introuvable', async () => {
      const res = await request(app)
        .patch(`/api/v1/demands/00000000-0000-0000-0000-000000000000/close`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('doit renvoyer (403) si NON proprietaire et NON admin', async () => {
      // Create a second buyer
      const buyer2 = await prisma.user.create({
        data: {
          email: 'buyer2-demands@test.com',
          passwordHash: 'hashed',
          firstName: 'Buyer2',
          lastName: 'Test',
          phone: '1122334459',
          role: UserRole.SELLER,
          isEmailVerified: true,
        },
      });
      const buyer2Token = generateAccessToken({ userId: buyer2.id, role: buyer2.role });

      const res = await request(app)
        .patch(`/api/v1/demands/${standardDemandId}/close`)
        .set('Authorization', `Bearer ${buyer2Token}`);
      expect(res.status).toBe(403); // NOT_OWNER

      await prisma.user.delete({ where: { id: buyer2.id } });
    });

    it('doit cloturer la demande (200) si proprietaire', async () => {
      const res = await request(app)
        .patch(`/api/v1/demands/${standardDemandId}/close`)
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.demand.status).toBe('CLOSED');
    });
  });
});
