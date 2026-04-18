/**
 * @module services/email.service
 * @description Envoi d'emails transactionnels via Nodemailer (SMTP).
 *   Les templates sont minimaux (texte + HTML rudimentaire) ; en production,
 *   remplacer par un service transactionnel dédié (SES, Mailgun, etc.).
 *
 *   Utilisé pour :
 *     - Vérification d'email (§4.1)
 *     - Réinitialisation de mot de passe (§4.1)
 *     - Notifications admin (validation KYC/annonce)
 *
 * @author KOUTON Spynel
 */

import nodemailer, { type Transporter } from "nodemailer";
import { env, isProduction } from "../config/env";
import { logger } from "../config/logger";

let transporter: Transporter | null = null;

/**
 * Initialise et retourne le transporter Nodemailer (singleton lazy).
 * En dev/test sans SMTP configuré, utilise un `jsonTransport` (log only).
 * @returns Instance Nodemailer Transporter.
 * @private
 */
function getTransporter(): Transporter {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    // Fallback : transporter JSON (n'envoie rien, logge). Utile en dev/tests.
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Envoie un email transactionnel.
 *
 * En cas d'erreur, l'échec est logué mais ne fait **pas** échouer la requête HTTP.
 *
 * @param params - `{ to, subject, text, html? }`.
 */
export async function sendMail({
  to,
  subject,
  text,
  html,
}: MailInput): Promise<void> {
  const from = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`;
  try {
    const info = await getTransporter().sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    if (!isProduction) {
      logger.info({ to, subject, messageId: info.messageId }, "📧 Email sent");
    }
  } catch (err) {
    logger.error({ err, to, subject }, "✗ Email send failed");
    // Ne pas throw : l'envoi d'email ne doit pas faire échouer la requête HTTP.
  }
}

/**
 * Construit le contenu email de vérification d'adresse (§4.1).
 *
 * @param token     - Token de vérification.
 * @param firstName - Prénom de l'utilisateur.
 * @returns `{ subject, text, html }`.
 */
export function buildVerifyEmailHtml(
  token: string,
  firstName: string,
): { subject: string; text: string; html: string } {
  const link = `${env.FRONTEND_URL}/verify-email/${token}`;
  return {
    subject: "OKKAZ — Vérifiez votre adresse email",
    text: `Bonjour ${firstName},\n\nConfirmez votre email : ${link}\n\nÀ bientôt sur OKKAZ.`,
    html: `<p>Bonjour ${firstName},</p><p>Confirmez votre email : <a href="${link}">${link}</a></p>`,
  };
}

/**
 * Construit le contenu email de réinitialisation de mot de passe (§4.1).
 *
 * @param token     - Token de reset.
 * @param firstName - Prénom de l'utilisateur.
 * @returns `{ subject, text, html }`.
 */
export function buildResetPasswordHtml(
  token: string,
  firstName: string,
): { subject: string; text: string; html: string } {
  const link = `${env.FRONTEND_URL}/reset-password/${token}`;
  return {
    subject: "OKKAZ — Réinitialisation du mot de passe",
    text: `Bonjour ${firstName},\n\nRéinitialisez votre mot de passe : ${link}\nCe lien expire dans 1 heure.\n`,
    html: `<p>Bonjour ${firstName},</p><p>Réinitialisez votre mot de passe : <a href="${link}">${link}</a></p><p>Ce lien expire dans 1 heure.</p>`,
  };
}
