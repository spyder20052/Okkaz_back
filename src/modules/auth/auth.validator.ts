/**
 * @module modules/auth/auth.validator
 * @description Schémas Zod pour les routes d'authentification (§4.1).
 */

import { z } from 'zod';

const phoneRegex = /^\+?\d{8,15}$/;
const passwordSchema = z
  .string()
  .min(8, 'Mot de passe trop court (8 caractères minimum).')
  .max(128, 'Mot de passe trop long.')
  .regex(/[A-Z]/, 'Doit contenir une majuscule.')
  .regex(/[a-z]/, 'Doit contenir une minuscule.')
  .regex(/\d/, 'Doit contenir un chiffre.');

export const registerSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email().max(255).toLowerCase(),
  phone: z.string().regex(phoneRegex, 'Numéro de téléphone invalide.'),
  password: passwordSchema,
  role: z.enum(['BUYER', 'SELLER']).default('BUYER'),
});

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

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const verifyEmailParamsSchema = z.object({
  token: z.string().min(16),
});

export const resetPasswordParamsSchema = z.object({
  token: z.string().min(16),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
