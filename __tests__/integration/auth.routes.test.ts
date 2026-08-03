import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import { cleanupDatabase } from './cleanup';

const app = createApp();

describe('Auth Routes (Integration)', () => {
  const testUser = {
    email: 'auth_test@example.com',
    password: 'Password123!',
    firstName: 'Auth',
    lastName: 'Tester',
    phone: '9988776655',
  };

  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('doit creer un nouvel utilisateur', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          role: 'BUYER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.tokens).toBeDefined();

      const dbUser = await prisma.user.findUnique({ where: { email: testUser.email } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.isEmailVerified).toBe(false);
    });

    it('doit echouer si lemail existe deja', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          role: 'BUYER',
        });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('doit retourner des jetons pour des identifiants valides', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('doit echouer avec un mauvais mot de passe', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });
      refreshToken = res.body.data.tokens.refreshToken;
    });

    it('doit renouveler les jetons', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(refreshToken); // Rotation
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });
      accessToken = res.body.data.tokens.accessToken;
      refreshToken = res.body.data.tokens.refreshToken;
    });

    it('doit invalider le refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);

      // Verifier que le refresh ne marche plus
      const resRefresh = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });
      expect(resRefresh.status).toBe(401);
    });
  });

  describe('Mot de passe oublié & Réinitialisation', () => {
    it('doit generer un jeton de reinitialisation', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);

      const dbUser = await prisma.user.findUnique({ where: { email: testUser.email } });
      expect(dbUser?.resetPasswordToken).toBeDefined();
    });

    it('doit reinitialiser le mot de passe avec un jeton valide', async () => {
      const dbUser = await prisma.user.findUnique({ where: { email: testUser.email } });
      const token = dbUser?.resetPasswordToken;

      const res = await request(app)
        .post(`/api/v1/auth/reset-password/${token}`)
        .send({ newPassword: 'NewPassword123!' });

      expect(res.status).toBe(200);

      // Verifier la connexion avec le nouveau mot de passe
      const resLogin = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: 'NewPassword123!',
      });
      expect(resLogin.status).toBe(200);
    });
  });
});
