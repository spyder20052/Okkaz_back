/**
 * @module utils/crypto
 * @description Utilitaires cryptographiques bas-niveau.
 *
 *   - **AES-256-GCM** : chiffrement symétrique pour les données sensibles
 *     stockées en base (numéros de téléphone de contact, données KYC…).
 *   - **HMAC-SHA256** : signature de messages pour vérifier l'intégrité
 *     des webhooks et générer des watermarks anti-capture.
 *
 *   La clé de chiffrement (`ENCRYPTION_KEY`) et la clé HMAC (`HMAC_SECRET`)
 *   sont chargées depuis les variables d'environnement validées par Zod.
 *   Elles doivent être des chaînes hexadécimales de 64 caractères (32 octets).
 *
 * @see https://nodejs.org/api/crypto.html
 * @author KOUTON Spynel
 */

import crypto from "crypto";
import { env } from "../config/env";

/** Algorithme de chiffrement symétrique utilisé. */
const ALGORITHM = "aes-256-gcm";

/** Longueur du vecteur d'initialisation (IV) en octets. */
const IV_LENGTH = 16;

/** Longueur du tag d'authentification GCM en octets. */
const AUTH_TAG_LENGTH = 16;

/** Clé de chiffrement AES-256 dérivée de la variable d'environnement. */
const KEY = Buffer.from(env.ENCRYPTION_KEY, "base64");

/**
 * Chiffre un texte en clair avec AES-256-GCM.
 *
 * Le résultat est une chaîne hexadécimale au format `iv:authTag:ciphertext`
 * qui peut être stockée en toute sécurité en base de données.
 *
 * @param plaintext - Le texte en clair à chiffrer.
 * @returns Chaîne hexadécimale `iv:authTag:ciphertext`.
 * @throws {Error} Si la clé de chiffrement est invalide ou corrompue.
 *
 * @example
 * ```ts
 * const encrypted = encrypt('+22991234567');
 * // → "a1b2c3...:d4e5f6...:78901234..."
 * ```
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(
    ":",
  );
}

/**
 * Déchiffre une chaîne précédemment chiffrée par {@link encrypt}.
 *
 * Vérifie l'intégrité du message via le tag d'authentification GCM.
 * Si les données ont été altérées, une exception est levée.
 *
 * @param ciphertext - Chaîne hexadécimale au format `iv:authTag:ciphertext`.
 * @returns Le texte en clair original.
 * @throws {Error} Si le tag d'authentification est invalide (données corrompues/altérées).
 *
 * @example
 * ```ts
 * const phone = decrypt(listing.contactPhone);
 * // → "+22991234567"
 * ```
 */
export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex!, "hex");
  const tag = Buffer.from(tagHex!, "hex");
  const enc = Buffer.from(encHex!, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8",
  );
}

/**
 * Génère un hash HMAC-SHA256 d'un message donné.
 *
 * Utilisé pour :
 * - Vérifier la signature des webhooks KKiapay.
 * - Construire des watermarks anti-capture d'écran (cf. `buildWatermark`).
 *
 * @param message - Le message à signer.
 * @returns Hash HMAC-SHA256 encodé en hexadécimal (64 caractères).
 *
 * @example
 * ```ts
 * const signature = hmacSha256(rawBody);
 * if (signature !== headerSignature) throw new Error('Invalid signature');
 * ```
 */
export function hmacSha256(message: string): string {
  return crypto
    .createHmac("sha256", env.HMAC_SECRET ?? env.JWT_SECRET)
    .update(message)
    .digest("hex");
}

/**
 * Génère un watermark unique lié à un utilisateur (anti-capture d'écran, §5.4).
 *
 * Retourné au frontend lorsqu'un numéro de contact réel est affiché, pour
 * superposition discrète. Ne constitue pas une protection technique mais un
 * frein psychologique et une piste d'audit.
 *
 * @param userId - ID de l'utilisateur qui consulte le contact.
 * @returns Chaîne de watermark horodatée `OKKAZ-USER-<hash>-<ts>`.
 */
export function buildWatermark(userId: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const short = hmacSha256(`${userId}:${ts}`).slice(0, 10);
  return `OKKAZ-USER-${short}-${ts}`;
}
