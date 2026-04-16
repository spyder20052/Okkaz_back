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
 *     5. Swagger UI  ← /api/v1/docs  (dev / staging uniquement)
 *     6. Routes
 *     7. 404 handler
 *     8. Error handler (dernier)
 *
 * @author KOUTON Spynel
 */

import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { logger } from './config/logger';
import { globalRateLimiter } from './middlewares/rateLimit';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';

// Routers
import authRouter from './modules/auth/auth.routes';
import usersRouter from './modules/users/users.routes';
import kycRouter from './modules/kyc/kyc.routes';
import categoriesRouter from './modules/categories/categories.routes';
import listingsRouter from './modules/listings/listings.routes';
import paymentsRouter from './modules/payments/payments.routes';
import subscriptionsRouter from './modules/subscriptions/subscriptions.routes';
import reportsRouter from './modules/reports/reports.routes';
import reviewsRouter from './modules/reviews/reviews.routes';
import demandsRouter from './modules/demands/demands.routes';
import adminRouter from './modules/admin/admin.routes';

// ── Chargement de la spec OpenAPI ─────────────────────────────────────────
const SPEC_PATH = path.resolve(process.cwd(), 'docs/api/openapi.yaml');

function loadSwaggerSpec(): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(SPEC_PATH, 'utf-8');
    return yaml.load(raw) as Record<string, unknown>;
  } catch (err) {
    logger.warn({ err }, '⚠️  Impossible de charger docs/api/openapi.yaml');
    return {};
  }
}

export function createApp(): Application {
  const app = express();

  const docsPath = `${env.API_PREFIX}/docs`;

  // ── Sécurité ─────────────────────────────────────────────────────────────
  // La CSP par défaut de helmet bloque les assets inline de Swagger UI.
  // On la relâche uniquement sur la route /docs ; partout ailleurs elle
  // reste stricte.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith(docsPath)) {
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc:    ["'self'"],
            scriptSrc:     ["'self'", "'unsafe-inline'"],
            styleSrc:      ["'self'", "'unsafe-inline'"],
            imgSrc:        ["'self'", 'data:', 'https:'],
            connectSrc:    ["'self'"],
          },
        },
      })(req, res, next);
    } else {
      helmet()(req, res, next);
    }
  });

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Body parsing ─────────────────────────────────────────────────────────
  // rawBody conservé pour la vérification HMAC du webhook KKiapay (§5.1).
  app.use(
    express.json({
      verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  // ── Logging HTTP ─────────────────────────────────────────────────────────
  app.use(
    morgan('combined', {
      stream: { write: (msg: string) => logger.info(msg.trim()) },
      skip: (_req, res) => res.statusCode < 400 && env.NODE_ENV === 'production',
    }),
  );

  // ── Rate limiting global ─────────────────────────────────────────────────
  app.use(globalRateLimiter);

  // ── Uploads locaux (dev) ─────────────────────────────────────────────────
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // ── Swagger UI ───────────────────────────────────────────────────────────
  // Monté sur /api/v1/docs en dev et staging.
  // Désactiver en production via NODE_ENV=production.
  if (env.NODE_ENV !== 'production') {
    const baseSpec = loadSwaggerSpec();

    // Injecte les URLs de serveur dynamiquement
    const swaggerSpec = {
      ...baseSpec,
      servers: [
        {
          url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
          description: '🖥 Local',
        },
        {
          url: `https://api.okkaz.bj${env.API_PREFIX}`,
          description: '🌍 Production',
        },
      ],
    };

    // — Interface Swagger UI complète
    app.use(
      docsPath,
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'OKKAZ API — Documentation',
        customfavIcon: '',
        customCss: `
          body { background: #0f0f1a; }
          .swagger-ui { font-family: 'Inter', sans-serif; }
          .swagger-ui .topbar {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            padding: 8px 24px;
            border-bottom: 2px solid #e94560;
          }
          .swagger-ui .topbar .download-url-wrapper { display: none; }
          .swagger-ui .topbar-wrapper::before {
            content: 'OKKAZ';
            color: #e94560;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 2px;
          }
          .swagger-ui .info .title { color: #e94560; font-size: 2rem; }
          .swagger-ui .info .description p { color: #ccc; }
          .swagger-ui .opblock-tag { color: #e94560; border-bottom-color: #e94560; }
          .swagger-ui .btn.authorize { background: #e94560; border-color: #e94560; color: #fff; }
          .swagger-ui .btn.authorize svg { fill: #fff; }
        `,
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          tryItOutEnabled: false,
          deepLinking: true,
          docExpansion: 'list',
          syntaxHighlight: { activate: true, theme: 'monokai' },
        },
      }),
    );

    // — Spec brute JSON  (Postman / Insomnia)
    app.get(`${docsPath}/spec.json`, (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(swaggerSpec);
    });

    // — Spec brute YAML
    app.get(`${docsPath}/spec.yaml`, (_req, res) => {
      res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
      res.send(fs.readFileSync(SPEC_PATH, 'utf-8'));
    });

    logger.info(`📚 Swagger UI  → http://localhost:${env.PORT}${docsPath}`);
    logger.info(`📄 Spec JSON   → http://localhost:${env.PORT}${docsPath}/spec.json`);
  }

  // ── Health check ─────────────────────────────────────────────────────────
  app.get(`${env.API_PREFIX}/health`, (_req, res) =>
    res.status(200).json({
      success: true,
      data: { status: 'ok', env: env.NODE_ENV, ts: new Date().toISOString() },
    }),
  );

  // ── Routes API ───────────────────────────────────────────────────────────
  const prefix = env.API_PREFIX;
  app.use(`${prefix}/auth`,          authRouter);
  app.use(`${prefix}/users`,         usersRouter);
  app.use(`${prefix}/kyc`,           kycRouter);
  app.use(`${prefix}/categories`,    categoriesRouter);
  app.use(`${prefix}/listings`,      listingsRouter);
  app.use(`${prefix}/payments`,      paymentsRouter);
  app.use(`${prefix}/subscriptions`, subscriptionsRouter);
  app.use(`${prefix}/reports`,       reportsRouter);
  app.use(`${prefix}/reviews`,       reviewsRouter);
  app.use(`${prefix}/demands`,       demandsRouter);
  app.use(`${prefix}/admin`,         adminRouter);

  // ── Handlers finaux ───────────────────────────────────────────────────────
  app.use(notFoundHandler);
  // L'errorHandler DOIT être déclaré en dernier (4 paramètres obligatoires).
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) =>
    errorHandler(err, req, res, next),
  );

  return app;
}
