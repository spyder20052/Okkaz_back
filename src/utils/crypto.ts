/**
 * @module utils/crypto
 * @description Chiffrement symétrique AES-256-GCM utilisé pour les numéros
 *   de contact stockés dans `listings.contact_phone` et
 *   `contact_accesses.contact_phone_revealed` (§5.3).
 *
 *   Format du ciphertext retourné (base64) : iv(12) | tag(16) | data
 *
 * @author KOUTON Spynel
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
  timingSafeEqual,
} from "crypto";
import { env } from "../config/env";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, "base64");
}

/**
 * Chiffre une chaîne (UTF-8) en base64.
 * @param plaintext - Texte en clair (numéro de téléphone).
 * @returns Chaîne base64 auto-contenue (iv + tag + data).
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Déchiffre une chaîne produite par {@link encrypt}.
 * @throws Si l'intégrité (tag GCM) échoue.
 */
export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

/**
 * Signe un payload en HMAC-SHA256 (utilisé pour le watermark anti-capture
 * d'écran, §5.4).
 */
export function hmacSha256(
  data: string,
  secret: string = env.JWT_SECRET,
): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * Compare deux chaînes en temps constant (évite les attaques timing).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
