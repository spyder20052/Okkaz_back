import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanupDatabase } from './cleanup';
import bcrypt from 'bcrypt';

const app = createApp();

// L'endpoint tokeninfo de Google est stubé : on contrôle le payload renvoyé.
const realFetch = global.fetch;
function stubTokeninfo(payload: Record<string, unknown> | null, status = 200) {
  global.fetch = jest.fn(async () =>
    new Response(JSON.stringify(payload ?? {}), { status }),
  ) as unknown as typeof fetch;
}

const GOOGLE_SUB = 'google-sub-0001';
const TOKEN_INFO = {
  aud: 'test-google-client-id', // = GOOGLE_CLIENT_ID de .env.test
  sub: GOOGLE_SUB,
  email: 'google.user@test.com',
  email_verified: 'true',
  given_name: 'Awa',
  family_name: 'Google',
};

describe('POST /api/v1/auth/oauth/google (Integration)', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('crée un compte SELLER actif à la première connexion Google', async () => {
    stubTokeninfo(TOKEN_INFO);

    const res = await request(app)
      .post('/api/v1/auth/oauth/google')
      .send({ idToken: 'stubbed-google-id-token' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('google.user@test.com');
    expect(res.body.data.user.role).toBe('SELLER');
    expect(res.body.data.user.isEmailVerified).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();

    const user = await prisma.user.findUnique({ where: { email: 'google.user@test.com' } });
    expect(user?.googleId).toBe(GOOGLE_SUB);
    expect(user?.passwordHash).toBeNull();
    expect(user?.phone).toBeNull();
  });

  it('reconnecte le même compte (pas de doublon) à la 2e connexion', async () => {
    stubTokeninfo(TOKEN_INFO);

    const res = await request(app)
      .post('/api/v1/auth/oauth/google')
      .send({ idToken: 'stubbed-google-id-token' });

    expect(res.status).toBe(200);
    const count = await prisma.user.count({ where: { email: 'google.user@test.com' } });
    expect(count).toBe(1);
  });

  it('lie le googleId à un compte classique existant (même email)', async () => {
    const passwordHash = await bcrypt.hash('Password1', 12);
    await prisma.user.create({
      data: {
        email: 'classic@test.com',
        phone: '+22940000001',
        passwordHash,
        firstName: 'Classic',
        lastName: 'User',
        role: 'SELLER',
        status: 'ACTIVE',
      },
    });
    stubTokeninfo({ ...TOKEN_INFO, sub: 'google-sub-0002', email: 'classic@test.com' });

    const res = await request(app)
      .post('/api/v1/auth/oauth/google')
      .send({ idToken: 'stubbed-google-id-token' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('SELLER'); // rôle conservé

    const user = await prisma.user.findUnique({ where: { email: 'classic@test.com' } });
    expect(user?.googleId).toBe('google-sub-0002');
    expect(user?.passwordHash).not.toBeNull(); // le mot de passe local reste utilisable
  });

  it('rejette un token dont l\'audience ne correspond pas (401)', async () => {
    stubTokeninfo({ ...TOKEN_INFO, aud: 'another-app-client-id' });

    const res = await request(app)
      .post('/api/v1/auth/oauth/google')
      .send({ idToken: 'stubbed-google-id-token' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('GOOGLE_TOKEN_INVALID');
  });

  it('rejette un token refusé par Google (401)', async () => {
    stubTokeninfo({ error: 'invalid_token' }, 400);

    const res = await request(app)
      .post('/api/v1/auth/oauth/google')
      .send({ idToken: 'bad-token-refused-by-google' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('GOOGLE_TOKEN_INVALID');
  });

  it('un compte Google ne peut pas se connecter par mot de passe (PASSWORD_NOT_SET)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'google.user@test.com', password: 'Whatever1' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('PASSWORD_NOT_SET');
  });
});
