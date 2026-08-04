/**
 * @module services/storage.service
 * @description Abstraction d'upload de fichiers. Trois drivers :
 *   - `local` : stockage disque (dossier `uploads/`) — dev uniquement.
 *   - `s3` et `cloudinary` : à implémenter avec les SDK officiels.
 *
 *   Les URLs retournées sont celles qui seront persistées en base (S3 public
 *   URL, Cloudinary secure URL, ou URL signée pour les documents KYC).
 *
 * @author KOUTON Spynel
 */

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";

/** Résultat d'un upload de fichier. */
export interface UploadedAsset {
  /** URL publique ou relative du fichier uploadé. */
  url: string;
  /** Clé de stockage (chemin relatif au bucket/dossier). */
  key: string;
}

/** Interface de driver de stockage (local, S3, Cloudinary). */
export interface StorageDriver {
  /** Upload un fichier dans le dossier spécifié. */
  upload(file: Express.Multer.File, folder: string): Promise<UploadedAsset>;
  /** Génère une URL signée temporaire (pour documents KYC). */
  signedUrl?(key: string, expiresInSec?: number): Promise<string>;
}

const localDriver: StorageDriver = {
  async upload(file, folder) {
    const dir = path.resolve(process.cwd(), "uploads", folder);
    await fs.mkdir(dir, { recursive: true });
    const ext = path.extname(file.originalname) || ".bin";
    const filename = `${randomUUID()}${ext}`;
    const fullPath = path.join(dir, filename);
    await fs.writeFile(fullPath, file.buffer);
    const key = `${folder}/${filename}`;
    const url = `/uploads/${key}`;
    return { url, key };
  },
};

const unimplemented: StorageDriver = {
  async upload() {
    throw AppError.internal(
      "STORAGE_UNCONFIGURED",
      "Driver de stockage non configuré (S3/Cloudinary).",
    );
  },
};

/**
 * Driver base de données (production — fichiers stockés dans Neon/PostgreSQL).
 *
 * - Photos d'annonces (`listings/...`) : publiques, servies par
 *   `GET /files/:id` sans authentification (cache long).
 * - Pièces KYC (`kyc/<userId>/...`) : privées — `GET /files/:id` exige un
 *   token ADMIN ou celui du propriétaire du document.
 *
 * Avantages : un seul fournisseur (Neon), contrôle d'accès réel sur les
 * documents d'identité. Limites : quota de stockage du plan Neon, et
 * fichiers ≤ ~4,5 Mo sur Vercel (limite des corps de requête/réponse).
 */
const dbDriver: StorageDriver = {
  async upload(file, folder) {
    const isPrivate = folder.startsWith("kyc");
    // Convention d'appel : kyc/<userId> — le propriétaire est encodé dans le
    // dossier par kyc.service.
    const ownerId = isPrivate ? (folder.split("/")[1] ?? null) : null;
    const stored = await prisma.storedFile.create({
      data: {
        mime: file.mimetype,
        data: file.buffer,
        folder,
        isPrivate,
        ownerId,
      },
      select: { id: true },
    });
    return { url: `/files/${stored.id}`, key: stored.id };
  },
};

/**
 * Driver Cloudinary (option CDN externe).
 *
 * - Photos d'annonces (`listings/...`) : upload public, URL `https` stockée
 *   telle quelle en base.
 * - Pièces KYC (`kyc/...`) : upload en mode `authenticated` — le fichier
 *   n'est PAS accessible par URL devinable ; l'URL stockée est signée
 *   (signature permanente, non falsifiable, non énumérable).
 *
 * Configuration : variable `CLOUDINARY_URL` (cloudinary://key:secret@cloud).
 * Le SDK la lit automatiquement ; on vérifie seulement sa présence.
 */
const cloudinaryDriver: StorageDriver = {
  async upload(file, folder) {
    const isPrivate = folder.startsWith("kyc");
    const publicId = randomUUID();

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `okkaz/${folder}`,
          public_id: publicId,
          resource_type: "image",
          type: isPrivate ? "authenticated" : "upload",
          overwrite: false,
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(
              AppError.internal(
                "STORAGE_UPLOAD_FAILED",
                `Upload Cloudinary échoué : ${error?.message ?? "réponse vide"}`,
              ),
            );
            return;
          }
          resolve(uploaded);
        },
      );
      stream.end(file.buffer);
    });

    const key = result.public_id;
    const url = isPrivate
      ? cloudinary.url(key, {
          type: "authenticated",
          sign_url: true,
          secure: true,
          format: result.format,
        })
      : result.secure_url;
    return { url, key };
  },

  async signedUrl(key) {
    return cloudinary.url(key, {
      type: "authenticated",
      sign_url: true,
      secure: true,
    });
  },
};

/**
 * Sélectionne le driver de stockage en fonction de `STORAGE_DRIVER`.
 * @returns L'implémentation du driver.
 * @private
 */
function pickDriver(): StorageDriver {
  switch (env.STORAGE_DRIVER) {
    case "local":
      return localDriver;
    case "db":
      return dbDriver;
    case "cloudinary":
      if (!env.CLOUDINARY_URL) {
        logger.error(
          "STORAGE_DRIVER=cloudinary mais CLOUDINARY_URL est vide — uploads refusés.",
        );
        return unimplemented;
      }
      return cloudinaryDriver;
    case "s3":
      logger.warn(
        { driver: env.STORAGE_DRIVER },
        "Storage driver non implémenté, fallback non-op.",
      );
      return unimplemented;
    default:
      return localDriver;
  }
}

export const storage: StorageDriver = pickDriver();

/**
 * Upload un fichier via le driver configuré.
 *
 * @param file   - Fichier Multer.
 * @param folder - Sous-dossier de destination (ex: `kyc`, `listings`).
 * @returns `{ url, key }` du fichier uploadé.
 */
export async function uploadAsset(
  file: Express.Multer.File,
  folder: string,
): Promise<UploadedAsset> {
  return storage.upload(file, folder);
}
