/**
 * @module middlewares/upload
 * @description Configuration de `multer` pour l'upload de fichiers.
 *
 *   - Stockage en mémoire (`memoryStorage`) : les fichiers sont conservés
 *     en buffer avant d'être envoyés au service de stockage (Cloudinary, S3…).
 *   - Taille max : 5 MB par fichier.
 *   - Types MIME autorisés : `image/jpeg`, `image/png`, `image/webp`.
 *
 * @author KOUTON Spynel
 */

import multer from "multer";

/** Taille maximale autorisée par fichier (5 Mo). */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Liste blanche des types MIME acceptés pour les uploads d'images. */
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Instance `multer` pré-configurée pour les uploads d'images.
 *
 * Configuration :
 * - **Stockage** : mémoire (buffer) — les fichiers ne touchent pas le disque.
 * - **Taille** : 5 Mo max par fichier.
 * - **Types** : JPEG, PNG, WebP uniquement.
 * - **Filtre** : rejette les fichiers dont le type MIME n'est pas autorisé.
 *
 * @example
 * ```ts
 * // Upload d'une seule photo de profil :
 * router.patch('/avatar', authenticate, upload.single('avatar'), handler);
 *
 * // Upload de plusieurs photos d'annonce (max 10) :
 * router.post('/listings/:id/photos', authenticate, upload.array('photos', 10), handler);
 * ```
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`));
    }
  },
});
