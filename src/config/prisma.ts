/**
 * @module config/prisma
 * @description Instance Prisma unique partagée par tous les modules.
 *   Évite la multiplication des connexions en développement (hot-reload).
 *
 * @author KOUTON Spynel
 */

import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["error", "warn"],
  });

if (!isProduction) {
  global.__prisma = prisma;
}
