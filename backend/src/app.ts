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
import { globalLimiter } from './middlewares/rateLimit';
import { errorHandler } from './middlewares/errorHandler';
import { AppError } from './utils/AppError';

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

  // Derrière un reverse proxy (nginx/Caddy/PaaS), fait confiance au premier
  // saut pour X-Forwarded-For : indispensable pour que le rate limiting
  // s'applique à l'IP réelle du client et non à celle du proxy.
  if (env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') {
    app.set('trust proxy', 1);
  }

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
      origin: env.FRONTEND_URL, // une ou plusieurs origines (liste séparée par virgules dans .env)
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
  // Limité au préfixe API : les fichiers statiques /uploads (photos
  // d'annonces) ne doivent pas consommer le quota — une page de résultats
  // charge des dizaines d'images.
  app.use(env.API_PREFIX, globalLimiter);

  // ── Uploads locaux (dev) ─────────────────────────────────────────────────
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // ── Fichiers stockés en base (driver `db` — Neon en production) ──────────
  // Photos d'annonces : publiques, cache long. Pièces KYC : privées —
  // token ADMIN ou celui du propriétaire du document requis.
  app.get('/files/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Fichier introuvable.' },
        });
      }
      const { prisma } = await import('./config/prisma');
      const file = await prisma.storedFile.findUnique({ where: { id } });
      if (!file) {
        return res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Fichier introuvable.' },
        });
      }
      if (file.isPrivate) {
        const header = req.headers.authorization ?? '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) {
          return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentification requise.' },
          });
        }
        let payload: { userId: string; role: string };
        try {
          const { verifyAccessToken } = await import('./utils/jwt');
          payload = verifyAccessToken(token);
        } catch {
          return res.status(401).json({
            success: false,
            error: { code: 'TOKEN_INVALID', message: 'Token invalide ou expiré.' },
          });
        }
        if (payload.role !== 'ADMIN' && payload.userId !== file.ownerId) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Accès refusé à ce document.' },
          });
        }
        res.setHeader('Cache-Control', 'private, no-store');
      } else {
        // Contenu immuable : l'id est unique par upload.
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      res.setHeader('Content-Type', file.mime);
      return res.send(Buffer.from(file.data));
    } catch (err) {
      return next(err);
    }
  });

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

  // ── Cron Vercel : rappels d'avis ─────────────────────────────────────────
  // En serverless il n'y a pas de processus long-lived pour setInterval :
  // Vercel Cron appelle cet endpoint (header Authorization: Bearer CRON_SECRET,
  // injecté automatiquement par Vercel quand la variable est définie).
  app.get(`${env.API_PREFIX}/jobs/review-reminders`, async (req, res, next) => {
    try {
      if (!env.CRON_SECRET || req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Secret cron invalide.' },
        });
      }
      const { runReviewReminders } = await import('./jobs/reviewReminder.job');
      const sent = await runReviewReminders();
      return res.status(200).json({ success: true, message: 'Rappels envoyés.', data: { sent } });
    } catch (err) {
      return next(err);
    }
  });

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
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(AppError.notFound('ROUTE_NOT_FOUND', 'Route introuvable.'));
  });
  // L'errorHandler DOIT être déclaré en dernier (4 paramètres obligatoires).
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) =>
    errorHandler(err, req, res, next),
  );

  return app;
}
