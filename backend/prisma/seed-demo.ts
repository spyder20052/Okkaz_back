/**
 * @module prisma/seed-demo
 * @description Peuple la base avec des données de DÉMONSTRATION pour le
 *   développement frontend : un vendeur KYC approuvé, un membre standard, et des
 *   annonces actives. Idempotent (relançable sans doublons).
 *
 * Prérequis : `npm run seed` (catégories, settings, admin).
 * Exécution : `npm run seed:demo` (tsx prisma/seed-demo.ts).
 *
 * Comptes créés :
 *   - seller.demo@okkaz.bj / Seller@2026  (SELLER, KYC approuvé, annonces actives)
 *   - member.demo@okkaz.bj / Member@2026  (SELLER, sans KYC)
 *
 * @author KOUTON Spynel
 */

import {
  KycDocumentStatus,
  KycDocumentType,
  ListingCondition,
  ListingStatus,
  PrismaClient,
  RentalPeriod,
  UserRole,
  UserStatus,
  KycStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { encrypt } from "../src/utils/crypto";
import { env } from "../src/config/env";

/** Slug déterministe (sans suffixe aléatoire) pour que le seed soit relançable. */
function demoSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-demo`;
}

const prisma = new PrismaClient();

const SELLER = {
  email: "seller.demo@okkaz.bj",
  phone: "+22997000001",
  password: "Seller@2026",
  firstName: "Emma",
  lastName: "Todedji",
  city: "Cotonou",
};

const MEMBER = {
  email: "member.demo@okkaz.bj",
  phone: "+22997000002",
  password: "Member@2026",
  firstName: "Jean",
  lastName: "Hounsou",
  city: "Porto-Novo",
};

const LISTINGS: Array<{
  title: string;
  description: string;
  categorySlug: string;
  rentalPrice: number;
  rentalPeriod: RentalPeriod;
  condition: ListingCondition;
  locationCity: string;
  purchasePrice?: number;
}> = [
  {
    title: "Toyota RAV4 2022 propre",
    description:
      "SUV Toyota RAV4 en excellent état, entretien à jour, disponible pour location longue durée à Cotonou.",
    categorySlug: "automobiles",
    rentalPrice: 45000,
    rentalPeriod: RentalPeriod.DAY,
    condition: ListingCondition.GOOD,
    locationCity: "Cotonou",
    purchasePrice: 18500000,
  },
  {
    title: "iPhone 14 Pro 256Go",
    description:
      "iPhone 14 Pro en très bon état avec accessoires, idéal pour usage pro ou création de contenu.",
    categorySlug: "electronique",
    rentalPrice: 15000,
    rentalPeriod: RentalPeriod.WEEK,
    condition: ListingCondition.GOOD,
    locationCity: "Cotonou",
  },
  {
    title: "Villa meublée 3 chambres Calavi",
    description:
      "Villa moderne meublée avec jardin, idéale famille ou expatriés, quartier calme à Abomey-Calavi.",
    categorySlug: "immobilier",
    rentalPrice: 350000,
    rentalPeriod: RentalPeriod.MONTH,
    condition: ListingCondition.NEW,
    locationCity: "Abomey-Calavi",
  },
  {
    title: "Groupe électrogène 20kVA",
    description:
      "Groupe électrogène fiable pour événements et chantiers, livraison possible sur Porto-Novo et environs.",
    categorySlug: "outils-de-travail",
    rentalPrice: 60000,
    rentalPeriod: RentalPeriod.WEEK,
    condition: ListingCondition.FAIR,
    locationCity: "Porto-Novo",
  },
];

async function upsertUser(
  data: typeof SELLER,
  role: UserRole,
  kycStatus: KycStatus,
): Promise<string> {
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: { status: UserStatus.ACTIVE, kycStatus },
    create: {
      email: data.email,
      phone: data.phone,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      city: data.city,
      role,
      status: UserStatus.ACTIVE,
      kycStatus,
      isEmailVerified: true,
    },
  });
  // eslint-disable-next-line no-console
  console.log(`✓ ${role} ${data.email} / ${data.password}`);
  return user.id;
}

async function ensureKycDocument(userId: string): Promise<void> {
  const existing = await prisma.kycDocument.findFirst({ where: { userId } });
  if (existing) return;
  await prisma.kycDocument.create({
    data: {
      userId,
      documentType: KycDocumentType.ID_CARD,
      frontUrl: "/uploads/kyc/demo/cni-demo.png",
      status: KycDocumentStatus.APPROVED,
      reviewedAt: new Date(),
    },
  });
  // eslint-disable-next-line no-console
  console.log("✓ Document KYC de démo (APPROVED).");
}

async function seedListings(sellerId: string): Promise<void> {
  for (const item of LISTINGS) {
    const category = await prisma.category.findUnique({
      where: { slug: item.categorySlug },
    });
    if (!category) {
      // eslint-disable-next-line no-console
      console.warn(`⚠ Catégorie ${item.categorySlug} absente — lancez npm run seed d'abord.`);
      continue;
    }
    const slug = demoSlug(item.title);
    await prisma.listing.upsert({
      where: { slug },
      update: { status: ListingStatus.ACTIVE },
      create: {
        userId: sellerId,
        categoryId: category.id,
        title: item.title,
        slug,
        description: item.description,
        rentalPrice: item.rentalPrice,
        rentalPeriod: item.rentalPeriod,
        purchasePrice: item.purchasePrice,
        condition: item.condition,
        locationCity: item.locationCity,
        contactPhone: encrypt(SELLER.phone),
        contactPhoneWcc: env.WCC_PHONE_NUMBER,
        status: ListingStatus.ACTIVE,
        validatedAt: new Date(),
      },
    });
    // eslint-disable-next-line no-console
    console.log(`✓ Annonce ACTIVE : ${item.title}`);
  }
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("▶ Seeding demo data…");
  const sellerId = await upsertUser(SELLER, UserRole.SELLER, KycStatus.APPROVED);
  await ensureKycDocument(sellerId);
  await upsertUser(MEMBER, UserRole.SELLER, KycStatus.NONE);
  await seedListings(sellerId);
  // eslint-disable-next-line no-console
  console.log("✓ Demo seed complete.");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("✗ Demo seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
