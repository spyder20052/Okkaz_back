/**
 * @module middlewares/upload
 * @description Uploads multipart via Multer (§5.1).
 *   - Stockage en mémoire (les fichiers sont ensuite envoyés à S3/Cloudinary).
 *   - Taille max 10MB par fichier, types image/PDF uniquement.
 *
 * @author KOUTON Spynel
 */

import multer from "multer";
import { AppError } from "../utils/AppError";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(
        AppError.badRequest(
          "INVALID_FILE_TYPE",
          `Type de fichier non autorisé : ${file.mimetype}`,
        ),
      );
      return;
    }
    cb(null, true);
  },
});
