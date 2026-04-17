import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanupDatabase } from './cleanup';
import bcrypt from 'bcrypt';

const app = createApp();

describe('KYC Routes (Integration)', () => {
  let sellerToken: string;
  let adminToken: string;
  let kycId: string;

  const testSeller = {
    email: 'seller_kyc@example.com',
    password: 'Password123!',
    firstName: 'Seller',
    lastName: 'Kyc',
    phone: '22900000001',
  };

  const testAdmin = {
    email: 'admin_kyc@example.com',
    password: 'Password123!',
  };

  beforeAll(async () => {
    await cleanupDatabase();

    // Create Seller
    await request(app).post('/api/v1/auth/register').send({ ...testSeller, role: 'SELLER' });
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: testSeller.email,
      password: testSeller.password,
    });
    sellerToken = loginRes.body.data.tokens.accessToken;

    // Create Admin
    const adminPwd = await bcrypt.hash(testAdmin.password, 10);
    await prisma.user.create({
      data: {
        email: testAdmin.email,
        passwordHash: adminPwd,
        firstName: 'Admin',
        lastName: 'Kyc',
        phone: '22900000002',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: testAdmin.email,
      password: testAdmin.password,
    });
    adminToken = adminLoginRes.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/kyc/upload', () => {
    it('doit uploader les documents KYC', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/upload')
        .set('Authorization', `Bearer ${sellerToken}`)
        .field('documentType', 'ID_CARD')
        .attach('front_file', Buffer.from('fake image content'), 'front.jpg')
        .attach('back_file', Buffer.from('fake image content'), 'back.jpg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document).toHaveProperty('id');
      kycId = res.body.data.document.id;

      const user = await prisma.user.findUnique({ where: { email: testSeller.email } });
      expect(user?.kycStatus).toBe('PENDING');
    });

    it('doit echouer si le type de document est invalide', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/upload')
        .set('Authorization', `Bearer ${sellerToken}`)
        .field('documentType', 'INVALID_TYPE')
        .attach('front_file', Buffer.from('fake image content'), 'front.jpg');

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/kyc/status', () => {
    it('doit retourner le statut KYC actuel', async () => {
      const res = await request(app)
        .get('/api/v1/kyc/status')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kycStatus).toBe('PENDING');
      expect(res.body.data.latestDocument.id).toBe(kycId);
    });
  });

  describe('Admin KYC Routes', () => {
    it('doit lister les documents KYC pour ladmin', async () => {
      const res = await request(app)
        .get('/api/v1/kyc/admin/list')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(kycId);
    });

    it('doit approuver le KYC', async () => {
      const res = await request(app)
        .patch(`/api/v1/kyc/admin/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.document.status).toBe('APPROVED');

      const user = await prisma.user.findUnique({ where: { email: testSeller.email } });
      expect(user?.kycStatus).toBe('APPROVED');
      expect(user?.status).toBe('ACTIVE');
    });

    it('doit echouer si on tente dapprouver un document deja traite', async () => {
      const res = await request(app)
        .patch(`/api/v1/kyc/admin/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });
  });
});
