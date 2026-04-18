import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanupDatabase } from './cleanup';
import { createHmac } from 'crypto';
import { env } from '../../src/config/env';
import { encrypt } from '../../src/utils/crypto';

const app = createApp();

describe('Payments Routes (Integration)', () => {
  let buyerToken: string;
  let sellerId: string;
  let listingId: string;
  let buyerId: string;

  const testBuyer = {
    email: 'buyer_pay@example.com',
    password: 'Password123!',
    firstName: 'Buyer',
    lastName: 'Pay',
    phone: '22911111111',
  };

  const testSeller = {
    email: 'seller_pay@example.com',
    password: 'Password123!',
    firstName: 'Seller',
    lastName: 'Pay',
    phone: '22922222222',
  };

  beforeAll(async () => {
    await cleanupDatabase();

    // Create Seller
    const sellerRes = await request(app).post('/api/v1/auth/register').send({ ...testSeller, role: 'SELLER' });
    sellerId = sellerRes.body.data.user.id;
    
    // Approve Seller KYC to allow listing creation
    await prisma.user.update({
      where: { id: sellerId },
      data: { kycStatus: 'APPROVED' },
    });

    // Create Category
    const cat = await prisma.category.create({ data: { name: 'Test Pay', slug: 'test-pay' } });

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

    // Create Buyer
    const buyerRes = await request(app).post('/api/v1/auth/register').send({ ...testBuyer, role: 'BUYER' });
    buyerId = buyerRes.body.data.user.id;
    buyerToken = buyerRes.body.data.tokens.accessToken;
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
      const payload = {
        status: 'SUCCESS',
        providerRef,
        data: { amount: 2500 },
      };
      
      const rawBody = JSON.stringify(payload);
      const signature = createHmac('sha256', env.KKIAPAY_WEBHOOK_SECRET!)
        .update(rawBody)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-kkiapay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

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
