/**
 * @module services/settings.service
 * @description Lecture mise en cache des `system_settings` (§3.12, §6).
 *   Les paramètres sont relus à la volée ; un petit cache TTL de 60s évite
 *   d'interroger la DB à chaque requête.
 *
 * @author KOUTON Spynel
 */

import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

const TTL_MS = 60_000;
let cache: { loadedAt: number; values: Map<string, string> } | null = null;

/**
 * Charge (ou relit depuis le cache TTL 60s) tous les paramètres système.
 * @returns Map clé → valeur.
 * @private
 */
async function loadAll(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < TTL_MS) return cache.values;
  const rows = await prisma.systemSetting.findMany();
  cache = { loadedAt: now, values: new Map(rows.map((r) => [r.key, r.value])) };
  return cache.values;
}

/**
 * Invalide le cache des paramètres (appelé après `updateSetting`).
 */
export function invalidateSettingsCache(): void {
  cache = null;
}

/**
 * Récupère un paramètre système par clé.
 *
 * @param key - Clé du paramètre.
 * @returns La valeur ou `undefined`.
 */
export async function getSetting(key: string): Promise<string | undefined> {
  const all = await loadAll();
  return all.get(key);
}

/**
 * Récupère un paramètre système numérique avec fallback optionnel.
 *
 * @param key      - Clé du paramètre.
 * @param fallback - Valeur par défaut si le paramètre n'existe pas.
 * @returns La valeur numérique.
 * @throws {AppError} Si le paramètre est manquant (sans fallback) ou non-numérique.
 */
export async function getSettingNumber(
  key: string,
  fallback?: number,
): Promise<number> {
  const v = await getSetting(key);
  if (v === undefined) {
    if (fallback === undefined)
      throw AppError.internal(
        "SETTING_MISSING",
        `Paramètre système manquant : ${key}`,
      );
    return fallback;
  }
  const n = Number(v);
  if (!Number.isFinite(n))
    throw AppError.internal(
      "SETTING_INVALID",
      `Paramètre système non numérique : ${key}`,
    );
  return n;
}

/**
 * Récupère tous les paramètres système sous forme d'objet clé-valeur.
 *
 * @returns Record `{ clé: valeur }`.
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const all = await loadAll();
  return Object.fromEntries(all.entries());
}
