/**
 * @module app
 * @description Factory de l'application Express. Sépare la création de l'app
 *   de son démarrage (server.ts) pour faciliter les tests.
 *
 *   Ordre des middlewares (§5.1) :
 *     1. Sécurité (helmet, cors)
 *     2. Body parsing (json + rawBody pour la vérification HMAC webhook)
 *     3. Logging HTTP (morgan)
 *     4. Rate limiting global
 *     5. Routes
 *     6. 404 handler
 *     7. Error handler (dernier)
 *
 * @author KOUTON Spynel
 */

import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import path from "path";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { globalRateLimiter } from "./middlewares/rateLimit";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler";

// Routers
import authRouter from "./modules/auth/auth.routes";
import usersRouter from "./modules/users/users.routes";
import kycRouter from "./modules/kyc/kyc.routes";
import categoriesRouter from "./modules/categories/categories.routes";
import listingsRouter from "./modules/listings/listings.routes";
import paymentsRouter from "./modules/payments/payments.routes";
import subscriptionsRouter from "./modules/subscriptions/subscriptions.routes";
import reportsRouter from "./modules/reports/reports.routes";
import reviewsRouter from "./modules/reviews/reviews.routes";
import demandsRouter from "./modules/demands/demands.routes";
import adminRouter from "./modules/admin/admin.routes";

export function createApp(): Application {
  const app = express();

  // ── Sécurité ─────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // ── Body parsing ─────────────────────────────────────────────────────────
  // Le rawBody est conservé pour la vérification HMAC du webhook KKiapay (§5.1).
  app.use(
    express.json({
      verify: (
        req: Request & { rawBody?: Buffer },
        _res: Response,
        buf: Buffer,
      ) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  // ── Logging HTTP ─────────────────────────────────────────────────────────
  app.use(
    morgan("combined", {
      stream: { write: (msg: string) => logger.info(msg.trim()) },
      skip: (_req, res) =>
        res.statusCode < 400 && env.NODE_ENV === "production",
    }),
  );

  // ── Rate limiting global ─────────────────────────────────────────────────
  app.use(globalRateLimiter);

  // ── Uploads locaux (dev) ─────────────────────────────────────────────────
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  // ── Health check ─────────────────────────────────────────────────────────
  app.get(`${env.API_PREFIX}/health`, (_req, res) =>
    res
      .status(200)
      .json({
        success: true,
        data: { status: "ok", env: env.NODE_ENV, ts: new Date().toISOString() },
      }),
  );

  // ── Routes API ───────────────────────────────────────────────────────────
  const prefix = env.API_PREFIX;
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/users`, usersRouter);
  app.use(`${prefix}/kyc`, kycRouter);
  app.use(`${prefix}/categories`, categoriesRouter);
  app.use(`${prefix}/listings`, listingsRouter);
  app.use(`${prefix}/payments`, paymentsRouter);
  app.use(`${prefix}/subscriptions`, subscriptionsRouter);
  app.use(`${prefix}/reports`, reportsRouter);
  app.use(`${prefix}/reviews`, reviewsRouter);
  app.use(`${prefix}/demands`, demandsRouter);
  app.use(`${prefix}/admin`, adminRouter);

  // ── Handlers finaux ───────────────────────────────────────────────────────
  app.use(notFoundHandler);
  // NOTE: L'errorHandler DOIT être déclaré en dernier et accepter 4 paramètres.
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) =>
    errorHandler(err, req, res, next),
  );

  return app;
}
