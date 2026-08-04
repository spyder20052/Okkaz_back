/**
 * @module config
 * @description Point d'entrée unique pour la configuration applicative.
 */

export { env, isProduction, isDevelopment, isTest } from './env';
export { prisma } from './prisma';
export { logger } from './logger';
