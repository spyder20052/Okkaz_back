/**
 * @module prisma/seed
 * @description Peuple la base avec les données initiales requises par le
 *   cahier des charges : catégories racine (§3.3), paramètres système (§3.12),
 *   et un compte ADMIN de démarrage.
 *
 * Exécution : `npm run seed` (tsx prisma/seed.ts).
 *
 * @author KOUTON Spynel
 */

import { PrismaClient, UserRole, UserStatus, KycStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const CATEGORIES: Array<{
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}> = [
  {
    name: "Automobiles",
    slug: "automobiles",
    description: "Voitures, motos, scooters, utilitaires à louer.",
    sortOrder: 10,
  },
  {
    name: "Électroménager",
    slug: "electromenager",
    description:
      "Appareils domestiques : réfrigérateurs, machines à laver, climatiseurs.",
    sortOrder: 20,
  },
  {
    name: "Électronique",
    slug: "electronique",
    description: "TV, consoles, ordinateurs, smartphones, matériel audio.",
    sortOrder: 30,
  },
  {
    name: "Immobilier",
    slug: "immobilier",
    description: "Appartements, maisons, bureaux, espaces événementiels.",
    sortOrder: 40,
  },
  {
    name: "Outils de travail",
    slug: "outils-de-travail",
    description: "Outillage, équipements BTP, matériel professionnel.",
    sortOrder: 50,
  },
  {
    name: "Prestation de services",
    slug: "prestation-de-services",
    description: "Services ponctuels à la demande.",
    sortOrder: 60,
  },
  {
    name: "Vêtements & accessoires",
    slug: "vetements-accessoires",
    description: "Tenues, bijoux, accessoires pour événements.",
    sortOrder: 70,
  },
  {
    name: "Divertissement",
    slug: "divertissement",
    description: "Sonorisation, éclairage, jeux, équipements de loisirs.",
    sortOrder: 80,
  },
  {
    name: "Animaux",
    slug: "animaux",
    description: "Services et équipements liés aux animaux.",
    sortOrder: 90,
  },
];

const SETTINGS: Array<{ key: string; value: string; description: string }> = [
  {
    key: "review_min_delay_hours",
    value: "24",
    description:
      "Délai minimal (heures) entre la consultation du contact et le dépôt d'un avis",
  },
  {
    key: "review_reminder_delay_hours",
    value: "48",
    description:
      "Délai (heures) après la consultation avant l'envoi du rappel d'avis par email",
  },
  {
    key: "max_reports_before_suspend",
    value: "5",
    description: "Nombre de signalements avant suspension auto",
  },
  {
    key: "kyc_validation_delay_hours",
    value: "72",
    description: "Délai max de validation KYC (heures)",
  },
  {
    key: "seller_free_max_photos",
    value: "4",
    description: "Nombre max de photos pour un SELLER simple",
  },
  {
    key: "subscription_weekly_price",
    value: "3000",
    description: "Prix abonnement hebdomadaire (FCFA)",
  },
  {
    key: "subscription_monthly_price",
    value: "10000",
    description: "Prix abonnement mensuel (FCFA)",
  },
  {
    key: "demand_listing_price",
    value: "2500",
    description: "Prix d'une annonce Je recherche (FCFA)",
  },
  {
    key: "express_demand_min_price",
    value: "5000",
    description: "Prix minimum d'une demande Express (FCFA)",
  },
  {
    key: "express_demand_percent",
    value: "3",
    description: "Pourcentage de la valeur du bien (Express)",
  },
];

async function seedCategories(): Promise<void> {
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sortOrder: cat.sortOrder,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`✓ ${CATEGORIES.length} categories seeded.`);
}

async function seedSystemSettings(): Promise<void> {
  for (const s of SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`✓ ${SETTINGS.length} system settings seeded.`);
}

async function seedAdminUser(): Promise<void> {
  const email = "admin@okkaz.bj";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log("✓ Admin user already exists, skipping.");
    return;
  }

  // NOTE: Mot de passe initial — à changer dès la première connexion.
  const passwordHash = await bcrypt.hash("Admin@OKKAZ2026", 12);

  await prisma.user.create({
    data: {
      email,
      phone: "+22900000001",
      passwordHash,
      firstName: "Admin",
      lastName: "OKKAZ",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.APPROVED,
      isEmailVerified: true,
    },
  });
  // eslint-disable-next-line no-console
  console.log("✓ Admin user created (admin@okkaz.bj / Admin@OKKAZ2026).");
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("▶ Seeding OKKAZ database…");
  await seedCategories();
  await seedSystemSettings();
  await seedAdminUser();
  // eslint-disable-next-line no-console
  console.log("✓ Seed complete.");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("✗ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
