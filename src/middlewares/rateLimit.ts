/**
 * @module middlewares/rateLimit
 * @description Middleware de rate limiting basé sur `express-rate-limit`.
 *
 *   Deux configurations pré-construites :
 *   - `globalLimiter`  : limiteur global (200 req/15 min par IP).
 *   - `authLimiter`    : limiteur strict pour les routes d'authentification
 *     (10 req/15 min par IP) afin de prévenir le brute-force.
 *
 * @author KOUTON Spynel
 */

import rateLimit from "express-rate-limit";

/**
 * Rate limiter global appliqué à toutes les routes de l'API.
 *
 * Configuration :
 * - **Fenêtre** : 15 minutes.
 * - **Maximum** : 200 requêtes par IP par fenêtre.
 * - **standardHeaders** : envoie les headers `RateLimit-*` (RFC 6585).
 * - **legacyHeaders** : désactive les headers `X-RateLimit-*` (obsolètes).
 *
 * @example
 * ```ts
 * app.use('/api', globalLimiter);
 * ```
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMIT", message: "Trop de requêtes." },
  },
});

/**
 * Rate limiter strict dédié aux routes sensibles d'authentification
 * (`/login`, `/register`, `/forgot-password`, `/reset-password`).
 *
 * Configuration :
 * - **Fenêtre** : 15 minutes.
 * - **Maximum** : 10 requêtes par IP par fenêtre.
 *
 * Protection contre le brute-force de mots de passe et le credential stuffing.
 *
 * @example
 * ```ts
 * router.post('/login', authLimiter, asyncHandler(controller.login));
 * ```
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "AUTH_RATE_LIMIT",
      message: "Trop de tentatives, réessayez plus tard.",
    },
  },
});
