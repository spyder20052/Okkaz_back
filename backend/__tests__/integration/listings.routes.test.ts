import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanupDatabase } from './cleanup';

const app = createApp();

describe('Listings Routes (Integration)', () => {
  let sellerToken: string;
  let adminToken: string;
  let categoryId: string;
  let listingId: string;

  const testUser = {
    email: 'seller_test@example.com',
    password: 'Password123!',
    firstName: 'Seller',
    lastName: 'Tester',
    phone: '229988776655',
  };

  const testAdmin = {
    email: 'admin_listing@example.com',
    password: 'Password123!',
    role: 'ADMIN',
  };

  beforeAll(async () => {
    // Nettoyage
    await cleanupDatabase();

    // Créer un vendeur et approuver son KYC
    const sellerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, role: 'SELLER' });
    sellerToken = sellerRes.body.data.tokens.accessToken;
    const sellerId = sellerRes.body.data.user.id;
    await prisma.user.update({
      where: { id: sellerId },
      data: { kycStatus: 'APPROVED', status: 'ACTIVE' },
    });

    // Créer un admin
    await prisma.user.create({
      data: {
        email: testAdmin.email,
        passwordHash: await require('bcrypt').hash(testAdmin.password, 10),
        firstName: 'Admin',
        lastName: 'Listing',
        phone: '11122233344',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testAdmin.email, password: testAdmin.password });
    adminToken = adminRes.body.data.tokens.accessToken;

    // Créer une catégorie
    const cat = await prisma.category.create({
      data: { name: 'Véhicules', slug: 'vehicules' },
    });
    categoryId = cat.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/listings', () => {
    it('doit creer une nouvelle annonce', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Toyota Corolla 2022',
          description: 'Magnifique voiture en parfait état de marche.',
          categoryId,
          rentalPrice: 50000,
          rentalPeriod: 'DAY',
          condition: 'GOOD',
          locationCity: 'Cotonou',
          contactPhone: '229988776655',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listing.title).toBe('Toyota Corolla 2022');
      listingId = res.body.data.listing.id;

      // Manuellement passer en ACTIVE pour les tests suivants (simulation validation admin)
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: 'ACTIVE' },
      });
    });

    it('doit echouer si des champs requis manquent', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Short' });
      expect(res.status).toBe(422);
    });

    it('doit echouer avec 400 si la categorie est invalide', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: `Voiture additionnelle`,
          description: 'Magnifique voiture.',
          categoryId: '00000000-0000-0000-0000-000000000000',
          rentalPrice: 50000,
          rentalPeriod: 'DAY',
          condition: 'GOOD',
          locationCity: 'Cotonou',
          contactPhone: '229988776655',
        });
      expect(res.status).toBe(400); // INVALID_CATEGORY
    });

    it('doit echouer avec 403 si un SELLER tente de creer une LOA', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: `Voiture en LOA`,
          description: 'Magnifique voiture.',
          categoryId,
          rentalPrice: 50000,
          rentalPeriod: 'DAY',
          condition: 'GOOD',
          locationCity: 'Cotonou',
          contactPhone: '229988776655',
          isLoa: true,
          loaDurationMonths: 12
        });
      expect(res.status).toBe(403); // LOA_PRO_ONLY
    });
  });

  describe('GET /api/v1/listings', () => {
    it('doit retourner la liste des annonces', async () => {
      const res = await request(app).get('/api/v1/listings');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('doit filtrer par categorie', async () => {
      const res = await request(app).get(`/api/v1/listings?categoryId=${categoryId}`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].categoryId).toBe(categoryId);
    });
  });

  describe('GET /api/v1/listings/:id', () => {
    it('doit retourner les details dune annonce', async () => {
      const res = await request(app).get(`/api/v1/listings/${listingId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.listing.id).toBe(listingId);
    });

    it('doit retourner 404 pour une annonce inexistante', async () => {
      const res = await request(app).get('/api/v1/listings/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/listings/:id', () => {
    it('doit mettre a jour lannonce', async () => {
      const res = await request(app)
        .patch(`/api/v1/listings/${listingId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Toyota Corolla 2022 Modifiée' });

      expect(res.status).toBe(200);
      expect(res.body.data.listing.title).toBe('Toyota Corolla 2022 Modifiée');
    });

    it('doit renvoyer 404 pour une annonce inexistante', async () => {
      const res = await request(app)
        .patch('/api/v1/listings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Titre' });
      expect(res.status).toBe(404);
    });

    it('doit renvoyer 403 si l on modifie une annonce ne nous appartenant pas', async () => {
      // Admin should not be able to update seller listing via this endpoint (as it is protected by isOwner)
      // or we can create another seller token. Admin bypasses isOwner? Wait, isOwner checks the role if it's admin, admin can do it?
      // Actually let's create a second seller and test.
      const hackerRes = await request(app).post('/api/v1/auth/register').send({
        email: 'hacker@example.com',
        password: 'Password123!',
        firstName: 'Hacker',
        lastName: 'Boy',
        phone: '22990000000',
        role: 'SELLER'
      });
      const hackerToken = hackerRes.body.data.tokens.accessToken;
      
      const res = await request(app)
        .patch(`/api/v1/listings/${listingId}`)
        .set('Authorization', `Bearer ${hackerToken}`)
        .send({ title: 'HackTitle' });
      expect(res.status).toBe(403);
    });
  });

  describe('PAUSE & RESUME', () => {
    it('doit mettre lannonce en pause', async () => {
      const res = await request(app)
        .patch(`/api/v1/listings/${listingId}/pause`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.listing.status).toBe('PAUSED');
    });

    it('doit reactiver lannonce', async () => {
      const res = await request(app)
        .patch(`/api/v1/listings/${listingId}/resume`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.listing.status).toBe('ACTIVE');
    });
  });

  describe('DELETE /api/v1/listings/:id', () => {
    it('doit supprimer lannonce (soft delete)', async () => {
      const res = await request(app)
        .delete(`/api/v1/listings/${listingId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(204);

      const dbListing = await prisma.listing.findUnique({ where: { id: listingId } });
      expect(dbListing?.deletedAt).not.toBeNull();
    });
  });
});
