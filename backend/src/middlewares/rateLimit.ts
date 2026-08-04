/**
 * @module middlewares/rateLimit
 * @description Middleware de rate limiting basé sur `express-rate-limit`.
 *
 *   Deux configurations pré-construites, pilotées par l'environnement
 *   (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`) :
 *   - `globalLimiter` : limiteur global de l'API.
 *   - `authLimiter`   : limiteur strict des routes d'authentification
 *     (prévention du brute-force).
 *
 *   Les limiteurs sont inactifs en `development` et `test` : en local, tout
 *   le trafic (pages, images, outils) provient de la même IP et épuiserait
 *   le quota en quelques minutes.
 *
 * @author KOUTON Spynel
 */

import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/** Les limiteurs ne s'appliquent qu'en staging/production. @private */
const isLimiterActive =
  env.NODE_ENV === "production" || env.NODE_ENV === "staging";

/**
 * Rate limiter global appliqué aux routes de l'API (préfixe `/api/v1`),
 * hors fichiers statiques `/uploads`.
 *
 * Configuration (via `.env`) :
 * - **Fenêtre** : `RATE_LIMIT_WINDOW_MS` (défaut 15 minutes).
 * - **Maximum** : `RATE_LIMIT_MAX` requêtes par IP par fenêtre (défaut 100).
 * - **standardHeaders** : envoie les headers `RateLimit-*` (RFC 6585).
 * - **legacyHeaders** : désactive les headers `X-RateLimit-*` (obsolètes).
 *
 * @example
 * ```ts
 * app.use(env.API_PREFIX, globalLimiter);
 * ```
 */
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isLimiterActive,
  message: {
    success: false,
    error: { code: "RATE_LIMIT", message: "Trop de requêtes." },
  },
});

/**
 * Rate limiter strict dédié aux routes sensibles d'authentification
 * (`/login`, `/register`, `/forgot-password`, `/reset-password`).
 *
 * Configuration (via `.env`) :
 * - **Fenêtre** : `RATE_LIMIT_WINDOW_MS` (défaut 15 minutes).
 * - **Maximum** : `AUTH_RATE_LIMIT_MAX` requêtes par IP par fenêtre (défaut 5).
 *
 * Protection contre le brute-force de mots de passe et le credential stuffing.
 *
 * @example
 * ```ts
 * router.post('/login', authLimiter, asyncHandler(controller.login));
 * ```
 */
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isLimiterActive,
  message: {
    success: false,
    error: {
      code: "AUTH_RATE_LIMIT",
      message: "Trop de tentatives, réessayez plus tard.",
    },
  },
});
