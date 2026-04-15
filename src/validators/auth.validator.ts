/**
 * @module authValidator
 * @description Schémas de validation Zod pour l'authentification.
 *
 * @dependencies zod
 * @author Spynel KOUTON
 */

import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Adresse email invalide.'),
  phone: z.string().min(8, 'Numéro de téléphone requis (min 8 caractères).'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
  firstName: z.string().min(1, 'Le prénom est requis.'),
  lastName: z.string().min(1, 'Le nom est requis.'),
});

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(1, 'Le mot de passe est requis.'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Le refresh token est requis.'),
});
