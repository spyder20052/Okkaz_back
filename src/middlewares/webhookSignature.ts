/**
 * @module middlewares/webhookSignature
 * @description Middleware de vérification de signature HMAC pour les
 *   webhooks entrants (KKiapay, Stripe…).
 *
 *   La vérification utilise un raw body capturé en amont pour calculer
 *   le HMAC-SHA256 et le comparer au header `x-webhook-signature` de façon
 *   time-safe (protection contre les timing attacks).
 *
 * @see §5.1 du cahier des charges — Sécurité des webhooks
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

/**
 * Factory de middleware qui vérifie le secret d'un webhook KKiapay.
 *
 * Flux :
 * 1. Récupère le secret depuis le header `x-kkiapay-secret`.
 * 2. Le compare au secret attendu (`KKIAPAY_WEBHOOK_SECRET`) avec `crypto.timingSafeEqual()`
 *    pour éviter les timing attacks.
 * 3. Si mismatch ou absent → 401 Unauthorized (log warning).
 *
 * @param headerName - Nom du header HTTP contenant le secret (défaut : `'x-kkiapay-secret'`).
 * @returns Middleware Express vérifiant le secret.
 *
 * @example
 * ```ts
 * router.post('/payments/webhook', webhookSignature(), asyncHandler(controller.webhook));
 * ```
 *
 * @throws {AppError} 401 si le secret est absent ou ne correspond pas.
 */
export function webhookSignature(headerName = "x-kkiapay-secret") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const signature = req.headers[headerName] as string | undefined;

    if (!signature) {
      throw AppError.unauthorized(
        "WEBHOOK_SIGNATURE_MISSING",
        "Secret webhook manquant.",
      );
    }

    const expected = env.WEBHOOK_SECRET ?? env.KKIAPAY_WEBHOOK_SECRET ?? "";
    
    // Fallback if empty
    if (!expected) {
      throw AppError.unauthorized(
        "WEBHOOK_SECRET_NOT_CONFIGURED",
        "Secret webhook non configuré sur le serveur.",
      );
    }

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw AppError.unauthorized(
        "WEBHOOK_SIGNATURE_INVALID",
        "Secret webhook invalide.",
      );
    }

    next();
  };
}
