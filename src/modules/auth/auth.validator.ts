/**
 * @module modules/auth/auth.validator
 * @description Schémas Zod pour les routes d'authentification (§4.1).
 */

import { z } from 'zod';

/** Regex pour numéros de téléphone : 8 à 15 chiffres, préfixe + optionnel. */
const phoneRegex = /^\+?\d{8,15}$/;
/** Politique de mot de passe : 8-128 caractères, au moins 1 majuscule, 1 minuscule, 1 chiffre. */
const passwordSchema = z
  .string()
  .min(8, 'Mot de passe trop court (8 caractères minimum).')
  .max(128, 'Mot de passe trop long.')
  .regex(/[A-Z]/, 'Doit contenir une majuscule.')
  .regex(/[a-z]/, 'Doit contenir une minuscule.')
  .regex(/\d/, 'Doit contenir un chiffre.');

/**
 * Schéma d'inscription. Body de `POST /auth/register`.
 *
 * @property firstName - Prénom (2-100 caractères).
 * @property lastName  - Nom (2-100 caractères).
 * @property email     - Adresse email (normalisée en lowercase).
 * @property phone     - Numéro de téléphone.
 * @property password  - Mot de passe (min 8, politique stricte).
 * @property role      - Rôle : `BUYER` (défaut) ou `SELLER`.
 */
export const registerSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email().max(255).toLowerCase(),
  phone: z.string().regex(phoneRegex, 'Numéro de téléphone invalide.'),
  password: passwordSchema,
  role: z.enum(['BUYER', 'SELLER']).default('BUYER'),
});

/**
 * Schéma de connexion. Body de `POST /auth/login`.
 * Au moins `email` ou `phone` est requis (`.refine()`).
 */
export const loginSchema = z
  .object({
    email: z.string().email().toLowerCase().optional(),
    phone: z.string().regex(phoneRegex).optional(),
    password: z.string().min(1, 'Mot de passe requis.'),
  })
  .refine((v) => Boolean(v.email || v.phone), {
    message: 'email ou phone requis.',
    path: ['email'],
  });

/** Schéma du body pour `POST /auth/refresh`. */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

/** Schéma du body pour `POST /auth/forgot-password`. */
export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

/** Schéma du body pour `POST /auth/reset-password/:token`. */
export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

/** Param de route `:token` pour `GET /auth/verify-email/:token`. */
export const verifyEmailParamsSchema = z.object({
  token: z.string().min(16),
});

/** Param de route `:token` pour `POST /auth/reset-password/:token`. */
export const resetPasswordParamsSchema = z.object({
  token: z.string().min(16),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
