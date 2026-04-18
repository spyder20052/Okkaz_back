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
 * Sélectionne le driver de stockage en fonction de `STORAGE_DRIVER`.
 * @returns L'implémentation du driver.
 * @private
 */
function pickDriver(): StorageDriver {
  switch (env.STORAGE_DRIVER) {
    case "local":
      return localDriver;
    case "s3":
    case "cloudinary":
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
