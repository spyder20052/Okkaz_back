/**
 * @module jobs/reviewReminder.job
 * @description Rappel par email aux locataires n'ayant pas encore laissé d'avis
 *   après consultation d'un contact (§4.9).
 *
 *   Un délai configurable (`review_reminder_delay_hours`) sépare la consultation
 *   du rappel. Chaque consultation n'est relancée qu'une seule fois
 *   (`contact_reveals.review_reminder_sent_at`).
 *
 * @author KOUTON Spynel
 */

import { UserStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { getSettingNumber } from "../services/settings.service";
import { sendMail, buildReviewReminderHtml } from "../services/email.service";

/** Intervalle de scan du job (1h). */
const SCAN_INTERVAL_MS = 60 * 60 * 1000;
/** Nombre max de consultations traitées par passage (anti-surcharge). */
const BATCH_SIZE = 100;

/**
 * Exécute une passe de rappels : sélectionne les consultations éligibles
 * (délai écoulé, jamais relancées, annonce non supprimée), envoie un email
 * aux utilisateurs n'ayant pas encore laissé d'avis, et marque la consultation
 * comme traitée.
 *
 * @returns Nombre d'emails de rappel envoyés.
 */
export async function runReviewReminders(): Promise<number> {
  const delayHours = await getSettingNumber("review_reminder_delay_hours", 48);
  const threshold = new Date(Date.now() - delayHours * 3600 * 1000);

  const candidates = await prisma.contactReveal.findMany({
    where: {
      reviewReminderSentAt: null,
      createdAt: { lte: threshold },
      listing: { deletedAt: null },
    },
    take: BATCH_SIZE,
    include: {
      user: { select: { email: true, firstName: true, status: true } },
      listing: { select: { title: true, slug: true } },
    },
  });

  if (candidates.length === 0) return 0;

  let sent = 0;
  for (const c of candidates) {
    // L'utilisateur a-t-il déjà laissé un avis sur cette annonce ?
    const alreadyReviewed = await prisma.review.findUnique({
      where: { reviewerId_listingId: { reviewerId: c.userId, listingId: c.listingId } },
    });

    // On marque toujours la consultation comme traitée pour ne pas la re-scanner.
    const shouldSkip =
      Boolean(alreadyReviewed) ||
      c.user.status === UserStatus.BLOCKED ||
      !c.user.email;

    if (!shouldSkip) {
      const mail = buildReviewReminderHtml(
        c.user.firstName,
        c.listing.title,
        c.listing.slug,
      );
      await sendMail({ to: c.user.email, ...mail });
      sent++;
    }

    await prisma.contactReveal.update({
      where: { id: c.id },
      data: { reviewReminderSentAt: new Date() },
    });
  }

  if (sent > 0) logger.info({ sent }, "📧 Review reminders sent");
  return sent;
}

let timer: NodeJS.Timeout | null = null;

/**
 * Démarre le job périodique (idempotent). À appeler au démarrage du serveur.
 * Le timer est `unref()` pour ne pas empêcher l'arrêt du process.
 */
export function startReviewReminderJob(): void {
  if (timer) return;
  timer = setInterval(() => {
    runReviewReminders().catch((err) =>
      logger.error({ err }, "✗ Review reminder job failed"),
    );
  }, SCAN_INTERVAL_MS);
  if (timer.unref) timer.unref();
  logger.info("⏰ Review reminder job scheduled (hourly)");
}

/**
 * Arrête le job périodique (utile pour les tests / arrêt propre).
 */
export function stopReviewReminderJob(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
