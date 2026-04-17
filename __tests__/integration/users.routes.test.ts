import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import { cleanupDatabase } from './cleanup';

const app = createApp();

let validBuyerToken: string;
let validSellerToken: string;
let buyerId: string;
let sellerId: string;

beforeAll(async () => {
  await cleanupDatabase();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const buyer = await prisma.user.create({
    data: {
      email: 'buyer@example.com',
      phone: '+22900000001',
      passwordHash,
      firstName: 'Buyer',
      lastName: 'One',
      role: 'BUYER',
      status: 'ACTIVE',
    },
  });
  buyerId = buyer.id;

  const seller = await prisma.user.create({
    data: {
      email: 'seller@example.com',
      phone: '+22900000002',
      passwordHash,
      firstName: 'Seller',
      lastName: 'Two',
      role: 'SELLER',
      status: 'ACTIVE',
    },
  });
  sellerId = seller.id;

  // Login via API to get valid tokens
  const resBuyer = await request(app).post('/api/v1/auth/login').send({
    email: 'buyer@example.com',
    password: 'Password123!'
  });
  validBuyerToken = resBuyer.body.data.tokens.accessToken;

  const resSeller = await request(app).post('/api/v1/auth/login').send({
    email: 'seller@example.com',
    password: 'Password123!'
  });
  validSellerToken = resSeller.body.data.tokens.accessToken;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Users Routes (Integration)', () => {

  describe('GET /api/v1/users/me', () => {
    it('doit rejeter si non authentifié', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });

    it('doit retourner le profil du user connecté', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${validBuyerToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('buyer@example.com');
      expect(res.body.data.user.role).toBe('BUYER');
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('doit mettre à jour le profil', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${validBuyerToken}`)
        .send({ firstName: 'BuyerUpdated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.firstName).toBe('BuyerUpdated');
    });
  });

  describe('PATCH /api/v1/users/me/password', () => {
    it('doit rejeter si le mot de passe actuel est faux', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${validBuyerToken}`)
        .send({ currentPassword: 'WrongPassword123!', newPassword: 'NewPassword123!' });

      expect(res.status).toBe(400); // INVALID_CURRENT_PASSWORD
    });

    it('doit changer le mot de passe avec le bon ancien MDP', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${validBuyerToken}`)
        .send({ currentPassword: 'Password123!', newPassword: 'NewPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('RBAC Routes (Role-based access)', () => {
    it('BUYER ne doit pas accéder aux listings SELLER', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/listings')
        .set('Authorization', `Bearer ${validBuyerToken}`);
      
      expect(res.status).toBe(403);
    });

    it('SELLER doit accéder aux listings', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/listings')
        .set('Authorization', `Bearer ${validSellerToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('SELLER ne doit pas accéder aux contact-accesses (BUYER only)', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/contact-accesses')
        .set('Authorization', `Bearer ${validSellerToken}`);
      
      expect(res.status).toBe(403);
    });

    it('BUYER doit accéder aux contact-accesses', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/contact-accesses')
        .set('Authorization', `Bearer ${validBuyerToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Toute personne connectée peut voir ses paiements', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/payments')
        .set('Authorization', `Bearer ${validSellerToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/users/:id/public', () => {
    it('doit retourner une erreur 404 pour un id inexistant', async () => {
      const res = await request(app).get('/api/v1/users/00000000-0000-0000-0000-000000000000/public');
      expect(res.status).toBe(404);
    });

    it('doit retourner le profil public pour un vendeur valide', async () => {
      const res = await request(app).get(`/api/v1/users/${sellerId}/public`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.id).toBe(sellerId);
      expect(res.body.data.profile.email).toBeUndefined(); // Email public masqué
      expect(res.body.data.profile.firstName).toBe('Seller');
      expect(res.body.data.profile.activeListings).toBeDefined();
    });
  });
});
