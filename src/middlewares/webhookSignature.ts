/**
 * @module middlewares/webhookSignature
 * @description Vérifie la signature HMAC-SHA256 du webhook KKiapay (§5.1, §4.6).
 *   Le header attendu est `x-kkiapay-signature`. Le body brut (rawBody) est
 *   conservé par express.json({ verify }) côté app.ts pour pouvoir recalculer
 *   la signature exacte.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import { createHmac } from "crypto";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { constantTimeEqual } from "../utils/crypto";

export function webhookSignature(headerName = "x-kkiapay-signature") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const signature = req.header(headerName);
    const secret = env.KKIAPAY_WEBHOOK_SECRET;

    if (!secret) {
      return next(
        AppError.internal(
          "WEBHOOK_SECRET_UNCONFIGURED",
          "Secret webhook non configuré côté serveur.",
        ),
      );
    }
    if (!signature) {
      return next(
        AppError.unauthorized(
          "WEBHOOK_SIGNATURE_MISSING",
          "Signature webhook manquante.",
        ),
      );
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      return next(
        AppError.internal(
          "WEBHOOK_RAW_BODY_MISSING",
          "Raw body indisponible pour vérification.",
        ),
      );
    }

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!constantTimeEqual(signature, expected)) {
      return next(
        AppError.unauthorized(
          "WEBHOOK_SIGNATURE_INVALID",
          "Signature webhook invalide.",
        ),
      );
    }

    next();
  };
}
