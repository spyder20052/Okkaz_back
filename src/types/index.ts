/**
 * @module types
 * @description Types partagés à travers l'application.
 *
 * @author Spynel KOUTON
 */

import { Request } from 'express';

/** Rôles utilisateur de la plateforme OKKAZ */
export enum UserRole {
  USER = 'USER',
  OWNER = 'OWNER',
  OWNER_PREMIUM = 'OWNER_PREMIUM',
  ADMIN = 'ADMIN',
}

/** Statut d'une annonce */
export enum ListingStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  RENTED = 'RENTED',
}

/** Statut d'un paiement */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/** Payload JWT décodé */
export interface JwtPayload {
  userId: string;
  role: UserRole;
}

/** Request Express enrichie avec l'utilisateur authentifié */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/** Réponse API standardisée — succès */
export interface ApiSuccessResponse<T = unknown> {
  status: 'success';
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/** Réponse API standardisée — erreur */
export interface ApiErrorResponse {
  status: 'error';
  code: string;
  message: string;
  details?: unknown;
}
