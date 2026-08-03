/**
 * @module modules/listings/listings.service
 * @description Logique métier des annonces (§4.5, §6.1).
 *   - SELLER simple : 4 photos max, contact affiché = WCC.
 *   - SELLER_PRO : photos illimitées, contact personnel, is_featured=true.
 *   - Le contact réel est chiffré au repos (AES-256-GCM) et n'est jamais
 *     renvoyé au front pour les lectures publiques.
 *
 * @author KOUTON Spynel
 */

import {
  ListingStatus,
  Prisma,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { parsePagination, buildPaginationMeta } from "../../utils/pagination";
import { encrypt, decrypt, buildWatermark } from "../../utils/crypto";
import { uniqueSlug } from "../../utils/slug";
import { assertUserKycApproved } from "../kyc/kyc.service";
import { getSettingNumber } from "../../services/settings.service";
import { uploadAsset } from "../../services/storage.service";

/**
 * Sélection publique : inclut photos, catégorie, propriétaire
 * mais jamais `contactPhone` (chiffré en DB).
 * @private
 */
const publicListingInclude = {
  photos: { orderBy: { sortOrder: "asc" as const } },
  category: { select: { id: true, name: true, slug: true } },
  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      profilePhotoUrl: true,
      city: true,
    },
  },
};

/**
 * Sélection allégée pour les listes : inclut uniquement la photo de couverture
 * pour optimiser les performances.
 * @private
 */
const listListingInclude = {
  ...publicListingInclude,
  photos: {
    where: { isCover: true },
    take: 1,
  },
};


/**
 * Supprime le champ `contactPhone` (chiffré) d'un objet listing
 * avant retour HTTP. Ne renvoie jamais le contact réel au front.
 * @private
 */
function stripPrivateFields<T extends { contactPhone?: string }>(
  listing: T,
): Omit<T, "contactPhone"> {
  const { contactPhone: _c, ...rest } = listing;
  return rest;
}

/**
 * Crée une nouvelle annonce en statut `PENDING`.
 *
 * Flux :
 * 1. Vérifie que le KYC de l'utilisateur est approuvé.
 * 2. Vérifie que l'option LOA est réservée aux SELLER_PRO.
 * 3. Valide la catégorie.
 * 4. Génère un slug unique à partir du titre.
 * 5. Chiffre le numéro de contact avec AES-256-GCM.
 *
 * @param userId - ID de l'utilisateur (SELLER/SELLER_PRO).
 * @param role   - Rôle de l'utilisateur.
 * @param data   - Données de l'annonce (titre, prix, catégorie, etc.).
 * @returns L'annonce créée (sans `contactPhone`).
 * @throws {AppError} 403 si KYC non approuvé ou LOA demandée par un SELLER.
 * @throws {AppError} 400 si la catégorie est invalide.
 */
export async function createListing(
  userId: string,
  role: UserRole,
  data: {
    title: string;
    description: string;
    categoryId: string;
    rentalPrice: number;
    rentalPeriod: "DAY" | "WEEK" | "MONTH";
    condition: "NEW" | "GOOD" | "FAIR";
    locationCity: string;
    locationAddress?: string;
    contactPhone: string;
    purchasePrice?: number;
    isLoa?: boolean;
    loaDurationMonths?: number;
  },
) {
  await assertUserKycApproved(userId);

  // §6.1 : LOA réservée aux SELLER_PRO.
  if (data.isLoa && role !== UserRole.SELLER_PRO) {
    throw AppError.forbidden(
      "LOA_PRO_ONLY",
      "L'option LOA est réservée aux abonnés Pro.",
    );
  }

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId, isActive: true },
  });
  if (!category)
    throw AppError.badRequest(
      "INVALID_CATEGORY",
      "Catégorie invalide ou inactive.",
    );

  const slug = uniqueSlug(data.title);
  const listing = await prisma.listing.create({
    data: {
      userId,
      categoryId: data.categoryId,
      title: data.title,
      slug,
      description: data.description,
      rentalPrice: new Prisma.Decimal(data.rentalPrice),
      rentalPeriod: data.rentalPeriod,
      condition: data.condition,
      locationCity: data.locationCity,
      locationAddress: data.locationAddress ?? null,
      contactPhone: encrypt(data.contactPhone),
      contactPhoneWcc: env.WCC_PHONE_NUMBER,
      purchasePrice:
        data.purchasePrice != null
          ? new Prisma.Decimal(data.purchasePrice)
          : null,
      isLoa: data.isLoa ?? false,
      loaDurationMonths: data.loaDurationMonths ?? null,
      status: ListingStatus.PENDING,
      isFeatured: role === UserRole.SELLER_PRO,
    },
  });

  logger.info(
    { listingId: listing.id, userId, role },
    "🟢 Listing created (PENDING)",
  );
  return stripPrivateFields(listing);
}

/**
 * Met à jour une annonce existante.
 *
 * Règles :
 * - Seul le propriétaire ou un admin peut modifier.
 * - SELLER simple → modification repasse en `PENDING` (§6.1).
 * - Si `contactPhone` est modifié, il est re-chiffré.
 *
 * @param listingId - UUID de l'annonce.
 * @param userId    - ID de l'utilisateur.
 * @param role      - Rôle de l'utilisateur.
 * @param data      - Champs à mettre à jour (tous optionnels).
 * @returns L'annonce mise à jour (sans `contactPhone`).
 * @throws {AppError} 404 si l'annonce n'existe pas.
 * @throws {AppError} 403 si l'utilisateur n'est pas propriétaire.
 */
export async function updateListing(
  listingId: string,
  userId: string,
  role: UserRole,
  data: Partial<{
    title: string;
    description: string;
    categoryId: string;
    rentalPrice: number;
    rentalPeriod: "DAY" | "WEEK" | "MONTH";
    condition: "NEW" | "GOOD" | "FAIR";
    locationCity: string;
    locationAddress: string;
    contactPhone: string;
    purchasePrice: number;
    isLoa: boolean;
    loaDurationMonths: number;
  }>,
) {
  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
  });
  if (!existing || existing.deletedAt)
    throw AppError.notFound("LISTING_NOT_FOUND", "Annonce introuvable.");
  if (existing.userId !== userId && role !== UserRole.ADMIN) {
    throw AppError.forbidden(
      "NOT_OWNER",
      "Vous n'êtes pas propriétaire de cette annonce.",
    );
  }

  // §6.1 : SELLER simple → modification repasse en PENDING.
  const backToPending = role === UserRole.SELLER;

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      ...(data.rentalPrice !== undefined
        ? { rentalPrice: new Prisma.Decimal(data.rentalPrice) }
        : {}),
      ...(data.rentalPeriod !== undefined
        ? { rentalPeriod: data.rentalPeriod }
        : {}),
      ...(data.condition !== undefined ? { condition: data.condition } : {}),
      ...(data.locationCity !== undefined
        ? { locationCity: data.locationCity }
        : {}),
      ...(data.locationAddress !== undefined
        ? { locationAddress: data.locationAddress }
        : {}),
      ...(data.contactPhone !== undefined
        ? { contactPhone: encrypt(data.contactPhone) }
        : {}),
      ...(data.purchasePrice !== undefined
        ? { purchasePrice: new Prisma.Decimal(data.purchasePrice) }
        : {}),
      ...(data.isLoa !== undefined ? { isLoa: data.isLoa } : {}),
      ...(data.loaDurationMonths !== undefined
        ? { loaDurationMonths: data.loaDurationMonths }
        : {}),
      ...(backToPending ? { status: ListingStatus.PENDING } : {}),
    },
  });

  return stripPrivateFields(updated);
}

/**
 * Supprime une annonce (soft delete : `deletedAt` + statut `DELETED`).
 *
 * @param listingId - UUID de l'annonce.
 * @param userId    - ID de l'utilisateur.
 * @param role      - Rôle de l'utilisateur.
 * @throws {AppError} 404 si l'annonce n'existe pas.
 * @throws {AppError} 403 si l'utilisateur n'est pas propriétaire.
 */
export async function softDeleteListing(
  listingId: string,
  userId: string,
  role: UserRole,
): Promise<void> {
  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
  });
  if (!existing || existing.deletedAt)
    throw AppError.notFound("LISTING_NOT_FOUND", "Annonce introuvable.");
  if (existing.userId !== userId && role !== UserRole.ADMIN) {
    throw AppError.forbidden(
      "NOT_OWNER",
      "Vous n'êtes pas propriétaire de cette annonce.",
    );
  }
  await prisma.listing.update({
    where: { id: listingId },
    data: { deletedAt: new Date(), status: ListingStatus.DELETED },
  });
}

/**
 * Liste les annonces actives publiques avec filtres et pagination.
 *
 * Filtres : `categoryId`, `city`, `isLoa`, `minPrice`/`maxPrice`, `q`, `sort`.
 * Les annonces `isFeatured` apparaissent en premier par défaut.
 *
 * @param query - Query string avec filtres et pagination.
 * @returns `{ items, meta }` — annonces paginées (sans `contactPhone`).
 */
export async function listPublic(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);

  const where: Prisma.ListingWhereInput = {
    status: ListingStatus.ACTIVE,
    deletedAt: null,
    ...(query.categoryId ? { categoryId: String(query.categoryId) } : {}),
    ...(query.city
      ? { locationCity: { equals: String(query.city), mode: "insensitive" } }
      : {}),
    ...(query.isLoa !== undefined
      ? { isLoa: query.isLoa === true || query.isLoa === "true" }
      : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          rentalPrice: {
            ...(query.minPrice !== undefined
              ? { gte: new Prisma.Decimal(Number(query.minPrice)) }
              : {}),
            ...(query.maxPrice !== undefined
              ? { lte: new Prisma.Decimal(Number(query.maxPrice)) }
              : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: String(query.q), mode: "insensitive" } },
            { description: { contains: String(query.q), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ListingOrderByWithRelationInput[] = (() => {
    switch (query.sort) {
      case "price_asc":
        return [{ rentalPrice: "asc" }];
      case "price_desc":
        return [{ rentalPrice: "desc" }];
      case "featured":
        return [{ isFeatured: "desc" }, { createdAt: "desc" }];
      default:
        return [{ isFeatured: "desc" }, { createdAt: "desc" }];
    }
  })();

  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: listListingInclude,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    items: rows.map(stripPrivateFields),
    meta: buildPaginationMeta(page, limit, total),
  };
}

/**
 * Liste les 20 annonces mises en avant (SELLER_PRO) les plus récentes.
 *
 * @returns Tableau d'annonces featured (sans `contactPhone`).
 */
export async function listFeatured() {
  const rows = await prisma.listing.findMany({
    where: { status: ListingStatus.ACTIVE, isFeatured: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: listListingInclude,
  });
  return rows.map(stripPrivateFields);
}

/**
 * Récupère le détail d'une annonce active.
 *
 * Incrémente le compteur de vues (fire-and-forget).
 * Le `contactPhone` chiffré est remplacé par `contactPhoneDisplayed` (numéro WCC).
 *
 * @param listingId - UUID de l'annonce.
 * @returns L'annonce détaillée avec photos, catégorie et propriétaire.
 * @throws {AppError} 404 si l'annonce n'existe pas ou n'est pas active.
 */
export async function getDetail(listingId: string) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null, status: ListingStatus.ACTIVE },
    include: publicListingInclude,
  });
  if (!listing)
    throw AppError.notFound("LISTING_NOT_FOUND", "Annonce introuvable.");

  // Incrémente le compteur de vues (non bloquant).
  prisma.listing
    .update({
      where: { id: listingId },
      data: { viewsCount: { increment: 1 } },
    })
    .catch((err) => logger.warn({ err, listingId }, "view increment failed"));

  // Ne renvoie jamais contactPhone en clair ici. Affiche uniquement le WCC.
  // Le numéro réel (si l'annonceur est abonné) n'est dévoilé que par
  // `revealContact` (POST /:id/contact).
  return {
    ...stripPrivateFields(listing),
    contactPhoneDisplayed: listing.contactPhoneWcc,
  };
}

/**
 * Dévoile (gratuitement) les coordonnées d'une annonce à un locataire et
 * enregistre la consultation (§3.7, §4.6, §6.3).
 *
 * Règle d'affichage :
 *   - Annonceur avec abonnement ACTIF → son numéro réel (déchiffré).
 *   - Sinon → numéro intermédiaire de la plateforme (`contactPhoneWcc`).
 *
 * La consultation est tracée une seule fois par couple (utilisateur, annonce)
 * — elle conditionne la possibilité de laisser un avis (cf. reviews.service).
 * La première consultation incrémente `contactsCount`.
 *
 * @param userId    - ID du locataire (BUYER) qui consulte.
 * @param listingId - UUID de l'annonce.
 * @returns `{ contactPhone, isOwnerNumber, watermark }`.
 * @throws {AppError} 404 si l'annonce est introuvable/inactive.
 */
export async function revealContact(userId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null, status: ListingStatus.ACTIVE },
  });
  if (!listing)
    throw AppError.notFound("LISTING_NOT_FOUND", "Annonce introuvable.");

  // Le propriétaire consulte sa propre annonce : on lui renvoie son vrai
  // numéro sans enregistrer de consultation (ne fausse pas contacts_count
  // et n'ouvre pas le droit à un avis — de toute façon bloqué par
  // CANNOT_REVIEW_SELF).
  if (listing.userId === userId) {
    return {
      contactPhone: decrypt(listing.contactPhone),
      isOwnerNumber: true,
      watermark: buildWatermark(userId),
    };
  }

  // L'annonceur a-t-il un abonnement actif ?
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId: listing.userId,
      status: SubscriptionStatus.ACTIVE,
      endsAt: { gt: new Date() },
    },
  });
  const isOwnerNumber = Boolean(activeSubscription);
  const contactPhone = isOwnerNumber
    ? decrypt(listing.contactPhone)
    : listing.contactPhoneWcc;

  // Enregistre la consultation (idempotent : une entrée par (user, listing)).
  const existing = await prisma.contactReveal.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });
  if (!existing) {
    await prisma.$transaction([
      prisma.contactReveal.create({ data: { userId, listingId } }),
      prisma.listing.update({
        where: { id: listingId },
        data: { contactsCount: { increment: 1 } },
      }),
    ]);
  }

  return { contactPhone, isOwnerNumber, watermark: buildWatermark(userId) };
}

// --- Photos ------------------------------------------------------------------

/**
 * Ajoute des photos à une annonce.
 *
 * Règles :
 * - SELLER : max 4 photos (configurable via `seller_free_max_photos`).
 * - SELLER_PRO / ADMIN : pas de limite.
 * - `coverIndex` désigne la photo couverture (0-based).
 *
 * @param listingId  - UUID de l'annonce.
 * @param userId     - ID du propriétaire.
 * @param role       - Rôle de l'utilisateur.
 * @param files      - Fichiers multer à uploader.
 * @param coverIndex - Index de la photo couverture (optionnel).
 * @returns Tableau des photos créées.
 * @throws {AppError} 404 si l'annonce n'existe pas.
 * @throws {AppError} 403 si l'utilisateur n'est pas propriétaire.
 * @throws {AppError} 400 si la limite de photos est dépassée.
 */
export async function addPhotos(
  listingId: string,
  userId: string,
  role: UserRole,
  files: Express.Multer.File[],
  coverIndex?: number,
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { photos: true },
  });
  if (!listing || listing.deletedAt)
    throw AppError.notFound("LISTING_NOT_FOUND", "Annonce introuvable.");
  if (listing.userId !== userId && role !== UserRole.ADMIN) {
    throw AppError.forbidden(
      "NOT_OWNER",
      "Vous n'êtes pas propriétaire de cette annonce.",
    );
  }

  if (role === UserRole.SELLER) {
    const maxPhotos = await getSettingNumber("seller_free_max_photos", 4);
    const total = listing.photos.length + files.length;
    if (total > maxPhotos) {
      throw AppError.badRequest(
        "PHOTO_LIMIT_EXCEEDED",
        `Vous ne pouvez uploader que ${maxPhotos} photos au total (compte gratuit).`,
      );
    }
  }

  const baseOrder = listing.photos.length;
  const uploaded = await Promise.all(
    files.map((file, i) =>
      uploadAsset(file, `listings/${listingId}`).then((a) => ({
        ...a,
        idx: i,
      })),
    ),
  );

  const created = await prisma.$transaction(
    uploaded.map((u) =>
      prisma.listingPhoto.create({
        data: {
          listingId,
          url: u.url,
          sortOrder: baseOrder + u.idx,
          isCover:
            coverIndex !== undefined
              ? coverIndex === u.idx
              : baseOrder + u.idx === 0,
        },
      }),
    ),
  );

  // S'il y a exactement une nouvelle couverture → défait les autres.
  if (coverIndex !== undefined) {
    await prisma.listingPhoto.updateMany({
      where: {
        listingId,
        id: { notIn: created.filter((p) => p.isCover).map((p) => p.id) },
      },
      data: { isCover: false },
    });
  }

  return created;
}

/**
 * Supprime une photo d'une annonce.
 *
 * @param listingId - UUID de l'annonce.
 * @param photoId   - UUID de la photo.
 * @param userId    - ID de l'utilisateur.
 * @param role      - Rôle de l'utilisateur.
 * @throws {AppError} 404 si la photo n'existe pas.
 * @throws {AppError} 403 si l'utilisateur n'est pas propriétaire.
 */
export async function deletePhoto(
  listingId: string,
  photoId: string,
  userId: string,
  role: UserRole,
): Promise<void> {
  const photo = await prisma.listingPhoto.findUnique({
    where: { id: photoId },
    include: { listing: { select: { userId: true } } },
  });
  if (!photo || photo.listingId !== listingId) {
    throw AppError.notFound("PHOTO_NOT_FOUND", "Photo introuvable.");
  }
  if (photo.listing.userId !== userId && role !== UserRole.ADMIN) {
    throw AppError.forbidden(
      "NOT_OWNER",
      "Vous n'êtes pas propriétaire de cette annonce.",
    );
  }
  await prisma.listingPhoto.delete({ where: { id: photoId } });
}

// --- Pause / Resume ----------------------------------------------------------

/**
 * Met une annonce en pause (statut `PAUSED`).
 *
 * @param listingId - UUID de l'annonce.
 * @param userId    - ID de l'utilisateur.
 * @param role      - Rôle de l'utilisateur.
 * @returns L'annonce mise à jour.
 * @throws {AppError} 404/403.
 */
export async function pauseListing(
  listingId: string,
  userId: string,
  role: UserRole,
) {
  return setStatus(listingId, userId, role, ListingStatus.PAUSED);
}

/**
 * Réactive une annonce en pause (retour au statut `ACTIVE`).
 *
 * @param listingId - UUID de l'annonce.
 * @param userId    - ID de l'utilisateur.
 * @param role      - Rôle de l'utilisateur.
 * @returns L'annonce mise à jour.
 * @throws {AppError} 404/403.
 */
export async function resumeListing(
  listingId: string,
  userId: string,
  role: UserRole,
) {
  return setStatus(listingId, userId, role, ListingStatus.ACTIVE);
}

/**
 * Change le statut d'une annonce après vérification de la propriété.
 * @param listingId - UUID de l'annonce.
 * @param userId    - ID de l'utilisateur.
 * @param role      - Rôle de l'utilisateur.
 * @param status    - Nouveau statut.
 * @returns L'annonce mise à jour (sans `contactPhone`).
 * @private
 */
async function setStatus(
  listingId: string,
  userId: string,
  role: UserRole,
  status: ListingStatus,
) {
  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
  });
  if (!existing || existing.deletedAt)
    throw AppError.notFound("LISTING_NOT_FOUND", "Annonce introuvable.");
  if (existing.userId !== userId && role !== UserRole.ADMIN) {
    throw AppError.forbidden(
      "NOT_OWNER",
      "Vous n'êtes pas propriétaire de cette annonce.",
    );
  }
  return stripPrivateFields(
    await prisma.listing.update({ where: { id: listingId }, data: { status } }),
  );
}
