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

import { ListingStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { parsePagination, buildPaginationMeta } from "../../utils/pagination";
import { encrypt } from "../../utils/crypto";
import { uniqueSlug } from "../../utils/slug";
import { assertUserKycApproved } from "../kyc/kyc.service";
import { getSettingNumber } from "../../services/settings.service";
import { uploadAsset } from "../../services/storage.service";

/**
 * Sélection publique d'une annonce : jamais de `contactPhone` (chiffré en DB).
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

function stripPrivateFields<T extends { contactPhone?: string }>(
  listing: T,
): Omit<T, "contactPhone"> {
  const { contactPhone: _c, ...rest } = listing;
  return rest;
}

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
      include: publicListingInclude,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    items: rows.map(stripPrivateFields),
    meta: buildPaginationMeta(page, limit, total),
  };
}

export async function listFeatured() {
  const rows = await prisma.listing.findMany({
    where: { status: ListingStatus.ACTIVE, isFeatured: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: publicListingInclude,
  });
  return rows.map(stripPrivateFields);
}

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
  return {
    ...stripPrivateFields(listing),
    contactPhoneDisplayed: listing.contactPhoneWcc,
  };
}

// --- Photos ------------------------------------------------------------------

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

export async function pauseListing(
  listingId: string,
  userId: string,
  role: UserRole,
) {
  return setStatus(listingId, userId, role, ListingStatus.PAUSED);
}

export async function resumeListing(
  listingId: string,
  userId: string,
  role: UserRole,
) {
  return setStatus(listingId, userId, role, ListingStatus.ACTIVE);
}

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
