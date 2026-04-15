/**
 * @module app
 * @description Configuration de l'application Express.
 *   Monte les middlewares globaux, les routes et le gestionnaire d'erreurs.
 *
 * @dependencies express, cors, helmet, morgan, cookie-parser
 * @author Spynel KOUTON
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { sendError } from './utils/apiResponse';
import v1Routes from './routes/v1';

const app = express();

// --- Middlewares de sécurité et parsing ---
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Logging HTTP ---
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// --- Health check ---
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Routes API ---
app.use('/api/v1', v1Routes);

// --- 404 ---
app.use((_req, res) => {
  sendError(res, 'NOT_FOUND', 'Route introuvable.', 404);
});

// --- Gestionnaire d'erreurs global ---
app.use(errorHandler);

export default app;
