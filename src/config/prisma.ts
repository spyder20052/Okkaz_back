/**
 * @module prisma
 * @description Instance singleton du client Prisma.
 *   Réutilisée dans tous les services/repositories.
 *
 * @dependencies @prisma/client
 * @author Spynel KOUTON
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});
