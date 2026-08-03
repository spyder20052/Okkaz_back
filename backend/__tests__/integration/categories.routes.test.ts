import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import { cleanupDatabase } from './cleanup';

const app = createApp();
let adminToken: string;
let buyerToken: string;
let categoryId: string;
let categorySlug: string;

beforeAll(async () => {
  await cleanupDatabase();

  // Create ADMIN
  const adminPwd = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin_cat@example.com',
      passwordHash: adminPwd,
      firstName: 'Admin',
      lastName: 'Sys',
      role: 'ADMIN',
      isEmailVerified: true,
      city: 'Paris',
      phone: '0000000000',
    },
  });

  // Create BUYER
  const buyerPwd = await bcrypt.hash('Buyer@123', 10);
  const buyer = await prisma.user.create({
    data: {
      email: 'buyer_cat@example.com',
      passwordHash: buyerPwd,
      firstName: 'Buyer',
      lastName: 'User',
      role: 'BUYER',
      isEmailVerified: true,
      city: 'Paris',
      phone: '1111111111',
    },
  });

  // Login both to get tokens
  const resAdmin = await request(app).post('/api/v1/auth/login').send({ email: 'admin_cat@example.com', password: 'Admin@123' });
  adminToken = resAdmin.body.data.tokens.accessToken;

  const resBuyer = await request(app).post('/api/v1/auth/login').send({ email: 'buyer_cat@example.com', password: 'Buyer@123' });
  buyerToken = resBuyer.body.data.tokens.accessToken;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Categories Routes (Integration)', () => {
  describe('POST /api/v1/categories', () => {
    it('doit rejeter la creation sans token', async () => {
      const res = await request(app).post('/api/v1/categories').send({ name: 'Vehicles' });
      expect(res.status).toBe(401);
    });

    it('doit rejeter la creation si l utilisateur n est pas ADMIN', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ name: 'Vehicles' });
      expect(res.status).toBe(403);
    });

    it('doit creer une categorie si ADMIN', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Vehicles', slug: 'vehicles', description: 'All vehicles' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.name).toBe('Vehicles');
      expect(res.body.data.category.slug).toBe('vehicles');
      categoryId = res.body.data.category.id;
      categorySlug = res.body.data.category.slug;
    });

    it('doit echouer si le nom existe deja', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Vehicles', slug: 'vehicles' });
      expect(res.status).toBe(409); // CATEGORY_EXISTS
    });
  });

  describe('GET /api/v1/categories', () => {
    it('doit retourner la liste des categories actives (public)', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.categories[0].name).toBe('Vehicles');
    });
  });

  describe('GET /api/v1/categories/:slug', () => {
    it('doit retourner la categorie avec ses descendants', async () => {
      const res = await request(app).get(`/api/v1/categories/${categorySlug}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.name).toBe('Vehicles');
      expect(Array.isArray(res.body.data.category.children)).toBe(true);
    });

    it('doit retourner 404 si la categorie n existe pas', async () => {
      const res = await request(app).get('/api/v1/categories/unknown-slug');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/categories/:id', () => {
    it('doit mettre a jour une categorie', async () => {
      const res = await request(app)
        .patch(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Véhicules Mis a Jour', slug: 'vehicules-mis-a-jour', isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.name).toBe('Véhicules Mis a Jour');
      expect(res.body.data.category.slug).toBe('vehicules-mis-a-jour');
      expect(res.body.data.category.isActive).toBe(false);
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('doit soft-delete la categorie en la rendant inactive', async () => {
      const res = await request(app)
        .delete(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const dbCat = await prisma.category.findUnique({ where: { id: categoryId } });
      expect(dbCat?.isActive).toBe(false);
    });
  });
});
