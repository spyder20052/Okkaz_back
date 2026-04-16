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

export interface UploadedAsset {
  url: string;
  key: string;
}

export interface StorageDriver {
  upload(file: Express.Multer.File, folder: string): Promise<UploadedAsset>;
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

export async function uploadAsset(
  file: Express.Multer.File,
  folder: string,
): Promise<UploadedAsset> {
  return storage.upload(file, folder);
}
