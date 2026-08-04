/**
 * Point d'entrée Vercel (serverless).
 *
 * Vercel enveloppe l'app Express exportée en handler de fonction ; toutes les
 * requêtes y sont réécrites via `vercel.json`. En local et sur un serveur
 * classique, c'est `src/server.ts` qui reste le point d'entrée (avec le job
 * de rappel d'avis en setInterval — remplacé ici par Vercel Cron).
 */
import { createApp } from "../src/app";

const app = createApp();

export default app;
