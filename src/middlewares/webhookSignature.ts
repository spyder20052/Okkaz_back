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
 * Factory de middleware qui vérifie la signature HMAC-SHA256 d'un webhook.
 *
 * Flux :
 * 1. Récupère le raw body depuis `req.rawBody` (capturé par le middleware
 *    bodyParser avec l'option `verify`).
 * 2. Récupère la signature du header `x-webhook-signature`.
 * 3. Calcule le HMAC attendu avec `WEBHOOK_SECRET`.
 * 4. Compare les deux signatures avec `crypto.timingSafeEqual()`.
 * 5. Si mismatch → 401 Unauthorized (log warning).
 *
 * @param headerName - Nom du header HTTP contenant la signature (défaut : `'x-webhook-signature'`).
 * @returns Middleware Express vérifiant la signature.
 *
 * @example
 * ```ts
 * router.post('/payments/webhook', webhookSignature(), asyncHandler(controller.webhook));
 * ```
 *
 * @throws {AppError} 401 si la signature est absente ou ne correspond pas.
 */
export function webhookSignature(headerName = "x-webhook-signature") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const signature = req.headers[headerName] as string | undefined;
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

    if (!signature || !rawBody) {
      throw AppError.unauthorized(
        "WEBHOOK_SIGNATURE_MISSING",
        "Signature webhook manquante.",
      );
    }

    const expected = crypto
      .createHmac("sha256", env.WEBHOOK_SECRET ?? env.KKIAPAY_WEBHOOK_SECRET ?? "")
      .update(rawBody)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw AppError.unauthorized(
        "WEBHOOK_SIGNATURE_INVALID",
        "Signature webhook invalide.",
      );
    }

    next();
  };
}
