/**
 * @module types/express
 * @description Étend l'objet `Request` d'Express avec les données injectées
 *   par les middlewares `authenticate()` et `isOwner()`.
 */

import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

export {};
