/**
 * @module modules/users/users.validator
 * @description Schémas Zod pour le module Utilisateurs (§4.2).
 */

import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  profilePhotoUrl: z.string().url().max(500).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/\d/),
});

export const userIdParamSchema = z.object({ id: z.string().uuid() });
