import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanupDatabase } from './cleanup';
import { env } from '../../src/config/env';
import { encrypt } from '../../src/utils/crypto';
import { signAccessToken } from '../../src/utils/jwt';
import bcrypt from 'bcrypt';

const app = createApp();

describe('Payments Routes (Integration)', () => {
  let buyerToken: string;
  let sellerId: string;
  let listingId: string;
  let buyerId: string;

  beforeAll(async () => {
    try {
      await cleanupDatabase();
    } catch (e) {
      console.error('cleanupDatabase failed:', e);
    }

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // Create Seller directly via Prisma (upsert to handle existing data)
    const seller = await prisma.user.upsert({
      where: { email: 'seller_pay@example.com' },
      update: { passwordHash, kycStatus: 'APPROVED', status: 'ACTIVE' },
      create: {
        email: 'seller_pay@example.com',
        phone: '22922222222',
        passwordHash,
        firstName: 'Seller',
        lastName: 'Pay',
        role: 'SELLER',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        isEmailVerified: true,
      },
    });
    sellerId = seller.id;

    // Create Category
    let cat = await prisma.category.findFirst({ where: { slug: 'test-pay' } });
    if (!cat) {
      cat = await prisma.category.create({ data: { name: 'Test Pay', slug: 'test-pay' } });
    }

    // Create Listing
    const listing = await prisma.listing.create({
      data: {
        userId: sellerId,
        categoryId: cat.id,
        title: 'Listing for Payment Test',
        slug: 'listing-pay-' + Date.now(),
        description: 'Test payment flow',
        rentalPrice: 10000,
        rentalPeriod: 'DAY',
        condition: 'GOOD',
        locationCity: 'Cotonou',
        status: 'ACTIVE',
        contactPhone: encrypt('22990000000'), 
        contactPhoneWcc: '22990000000',
      },
    });
    listingId = listing.id;

    // Create Buyer directly via Prisma (upsert)
    const buyer = await prisma.user.upsert({
      where: { email: 'buyer_pay@example.com' },
      update: { passwordHash, status: 'ACTIVE' },
      create: {
        email: 'buyer_pay@example.com',
        phone: '22911111111',
        passwordHash,
        firstName: 'Buyer',
        lastName: 'Pay',
        role: 'SELLER',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });
    buyerId = buyer.id;
    buyerToken = signAccessToken(buyer.id, buyer.role);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Contact Access Flow', () => {
    let paymentId: string;
    let providerRef: string;

    it('doit initier un achat dacces contact', async () => {
      const res = await request(app)
        .post('/api/v1/payments/initiate-contact-access')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId,
          method: 'MOBILE_MONEY',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment).toHaveProperty('id');
      paymentId = res.body.data.payment.id;
      providerRef = res.body.data.payment.providerRef;
    });

    it('doit confirmer le paiement via webhook', async () => {
      // Payload conforme à la doc KKiapay v1
      const payload = {
        transactionId: 'kkTestTx123',
        isPaymentSucces: true,
        event: 'transaction.success',
        account: '22996000000',
        method: 'MOBILE_MONEY',
        amount: 2500,
        fees: 19,
        partnerId: providerRef, // Notre providerRef envoyé via le SDK
        performedAt: new Date().toISOString(),
        stateData: {},
      };

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-kkiapay-secret', env.KKIAPAY_WEBHOOK_SECRET!)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe('SUCCESS');
    });

    it('doit retourner les coordonnees une fois paye', async () => {
      // Note: listing.contactPhone in DB was a placeholder, 
      // service.getContactAccess will decrypt whatever is in ContactAccess.contactPhoneRevealed
      // In this test, grantContactAccess used the encrypted value from the listing.
      
      const res = await request(app)
        .get(`/api/v1/payments/contact-access/${listingId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('contactPhone');
      expect(res.body.data).toHaveProperty('watermark');
    });

    it('doit échouer si le paiement n\'est pas effectué', async () => {
       // Créer une nouvelle annonce non payée
       const listing2 = await prisma.listing.create({
        data: {
          userId: sellerId,
          categoryId: (await prisma.category.findFirst())?.id || '',
          title: 'Unpaid Listing',
          slug: 'unpaid-listing-' + Date.now(),
          description: 'No pay',
          rentalPrice: 5000,
          rentalPeriod: 'DAY',
          condition: 'GOOD',
          locationCity: 'Porto-Novo',
          status: 'ACTIVE',
          contactPhone: encrypt('22990000001'),
          contactPhoneWcc: '22990000001',
        },
      });

      const res = await request(app)
        .get(`/api/v1/payments/contact-access/${listing2.id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NO_ACTIVE_ACCESS');
    });
  });
});
