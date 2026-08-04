/**
 * @module server
 * @description Point d'entrée du serveur. Lance l'application Express et
 *   gère l'arrêt propre (SIGTERM/SIGINT) avec fermeture de la connexion
 *   Prisma (§5.1 — observabilité).
 *
 * @author KOUTON Spynel
 */

import { createApp } from "./app";
import { env, isTest } from "./config/env";
import { prisma } from "./config/prisma";
import { logger } from "./config/logger";
import { startReviewReminderJob } from "./jobs/reviewReminder.job";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, prefix: env.API_PREFIX },
    `🚀 OKKAZ API running on http://localhost:${env.PORT}`,
  );
  // Jobs périodiques (désactivés en environnement de test).
  if (!isTest) startReviewReminderJob();
});

// ── Arrêt propre ─────────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down gracefully…");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("✓ Database disconnected. Bye.");
    process.exit(0);
  });
  // Force exit après 10s si des connexions restent ouvertes.
  setTimeout(() => {
    logger.error("Forced shutdown after 10s timeout.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason: unknown) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err: Error) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  void shutdown("uncaughtException");
});
