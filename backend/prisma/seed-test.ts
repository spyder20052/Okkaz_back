/**
 * @module prisma/seed-test
 * @description Données de TEST pour exercer le flux de paiement (accès contact).
 *   Crée un acheteur, un vendeur KYC-approuvé et une annonce ACTIVE prête à
 *   être "débloquée". À NE PAS utiliser en production.
 *
 * Exécution : npx tsx prisma/seed-test.ts
 */

import { PrismaClient, UserRole, UserStatus, KycStatus, ListingStatus, RentalPeriod, ListingCondition } from "@prisma/client";
import bcrypt from "bcrypt";
import { encrypt } from "../src/utils/crypto";
import { env } from "../src/config/env";

const prisma = new PrismaClient();
const PASSWORD = "Test@1234";

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // 1) Compte standard — il consulte le contact comme tout membre connecté.
  const buyer = await prisma.user.upsert({
    where: { email: "buyer@okkaz.test" },
    update: {},
    create: {
      email: "buyer@okkaz.test",
      phone: "+22996000001",
      passwordHash,
      firstName: "Bob",
      lastName: "Buyer",
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  // 2) Vendeur (SELLER) déjà KYC-approuvé pour pouvoir publier.
  const seller = await prisma.user.upsert({
    where: { email: "seller@okkaz.test" },
    update: { kycStatus: KycStatus.APPROVED, status: UserStatus.ACTIVE },
    create: {
      email: "seller@okkaz.test",
      phone: "+22996000002",
      passwordHash,
      firstName: "Sam",
      lastName: "Seller",
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.APPROVED,
      isEmailVerified: true,
    },
  });

  // 3) Une annonce ACTIVE, contact chiffré (AES-256-GCM).
  const category = await prisma.category.findFirst({ where: { slug: "automobiles" } });
  if (!category) throw new Error("Catégorie 'automobiles' absente — lance d'abord `npm run seed`.");

  const slug = "toyota-corolla-test";
  const listing = await prisma.listing.upsert({
    where: { slug },
    update: { status: ListingStatus.ACTIVE },
    create: {
      userId: seller.id,
      categoryId: category.id,
      title: "Toyota Corolla (annonce de test)",
      slug,
      description: "Annonce de test pour exercer le flux de paiement.",
      rentalPrice: 15000,
      rentalPeriod: RentalPeriod.DAY,
      condition: ListingCondition.GOOD,
      locationCity: "Cotonou",
      contactPhone: encrypt("+22997123456"), // numéro RÉEL chiffré
      contactPhoneWcc: env.WCC_PHONE_NUMBER, // numéro affiché publiquement
      status: ListingStatus.ACTIVE,
    },
  });

  // eslint-disable-next-line no-console
  console.log("✓ Données de test prêtes :");
  // eslint-disable-next-line no-console
  console.log(`  Acheteur : buyer@okkaz.test / ${PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(`  Vendeur  : seller@okkaz.test / ${PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(`  Listing ID (ACTIVE) : ${listing.id}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error("✗ seed-test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
