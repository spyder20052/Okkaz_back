import { prisma } from '../../src/config/prisma';

/**
 * Nettoie toutes les tables de la base de données de test dans le bon ordre
 * pour éviter les violations de contraintes de clé étrangère.
 */
export async function cleanupDatabase() {
  // 1. Tables dépendantes des annonces ou des paiements
  await prisma.review.deleteMany();
  await prisma.report.deleteMany();
  await prisma.contactAccess.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.listingPhoto.deleteMany(); // Bien que cascade, securité additionnelle
  
  // 2. Tables dépendantes des utilisateurs
  await prisma.demandListing.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.kycDocument.deleteMany();
  await prisma.refreshToken.deleteMany();
  
  // 3. Tables de base
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();
}
