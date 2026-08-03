/**
 * @module config/logger
 * @description Logger structuré Pino. Codes couleur conformes au standard:
 *     🟡 Auth | 🔵 Lecture | 🟢 Écriture | 🔴 Erreur
 *
 * @author KOUTON Spynel
 */

import pino from "pino";
import { env, isProduction } from "./env";

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      },
  redact: {
    // Ne jamais logger des secrets.
    paths: [
      "password",
      "passwordHash",
      "password_hash",
      "token",
      "authorization",
      "cookie",
      "contactPhone",
      "contact_phone",
    ],
    censor: "[REDACTED]",
  },
});
