/**
 * @module server
 * @description Point d'entrée de l'application.
 *   Démarre le serveur HTTP et connecte Prisma.
 *
 * @dependencies app, prisma, env, logger
 * @author Spynel KOUTON
 */

import app from './app';
import { env, prisma } from './config';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    // Vérification connexion base de données
    await prisma.$connect();
    logger.info('Connexion à la base de données établie (Supabase PostgreSQL).');

    app.listen(env.PORT, () => {
      logger.info(`Serveur OKKAZ démarré sur le port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('Échec du démarrage du serveur.', error);
    process.exit(1);
  }
}

// Arrêt propre
process.on('SIGTERM', async () => {
  logger.info('Signal SIGTERM reçu — arrêt en cours...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Signal SIGINT reçu — arrêt en cours...');
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();
