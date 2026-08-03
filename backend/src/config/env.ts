/**
 * @module config/env
 * @description Charge, valide (Zod) et expose l'ensemble des variables
 *   d'environnement requises par le cahier des charges (§7.3).
 *   Toute variable manquante ou mal formée fait échouer le démarrage.
 *
 * @author KOUTON Spynel
 */

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // App
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  // Une ou plusieurs origines front autorisées (CORS), séparées par des virgules.
  FRONTEND_URL: z
    .string()
    .default("http://localhost:5173")
    .transform((value) => value.split(",").map((origin) => origin.trim()))
    .pipe(z.array(z.string().url()).min(1)),
  API_PREFIX: z.string().startsWith("/").default("/api/v1"),
  // OAuth Google (Sign in with Google) — vide = fonctionnalité désactivée.
  GOOGLE_CLIENT_ID: z.string().optional(),

  // DB
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // JWT
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  /** @deprecated Utiliser `JWT_ACCESS_EXPIRES_IN` — alias conservé pour compat. */
  JWT_EXPIRES_IN: z.string().default("15m"),

  // Chiffrement numéros de contact
  ENCRYPTION_KEY: z.string().refine((v) => {
    try {
      return Buffer.from(v, "base64").length === 32;
    } catch {
      return false;
    }
  }, "ENCRYPTION_KEY doit être 32 octets encodés en base64"),

  // Storage
  STORAGE_DRIVER: z.enum(["local", "s3", "cloudinary"]).default("local"),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),

  // Paiement
  KKIAPAY_PUBLIC_KEY: z.string().optional(),
  KKIAPAY_PRIVATE_KEY: z.string().optional(),
  KKIAPAY_SECRET_KEY: z.string().optional(),
  KKIAPAY_WEBHOOK_SECRET: z.string().optional(),
  /** Alias global pour HMAC webhook (utilisé par `webhookSignature.ts`). */
  WEBHOOK_SECRET: z.string().optional(),
  /** Clé HMAC-SHA256 pour les watermarks et signatures (utilisé par `crypto.ts`). */
  HMAC_SECRET: z.string().min(32).optional(),
  KKIAPAY_SANDBOX: z.coerce.boolean().default(true),
  CINETPAY_API_KEY: z.string().optional(),
  CINETPAY_SITE_ID: z.string().optional(),
  STRIPE_SECRET: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().default("no-reply@okkaz.bj"),
  SMTP_FROM_NAME: z.string().default("OKKAZ"),

  // Business
  WCC_PHONE_NUMBER: z.string().min(5, "WCC_PHONE_NUMBER is required"),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),

  // Logs
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("✗ Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
