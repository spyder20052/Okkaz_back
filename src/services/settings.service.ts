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

async function loadAll(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < TTL_MS) return cache.values;
  const rows = await prisma.systemSetting.findMany();
  cache = { loadedAt: now, values: new Map(rows.map((r) => [r.key, r.value])) };
  return cache.values;
}

export function invalidateSettingsCache(): void {
  cache = null;
}

export async function getSetting(key: string): Promise<string | undefined> {
  const all = await loadAll();
  return all.get(key);
}

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

export async function getAllSettings(): Promise<Record<string, string>> {
  const all = await loadAll();
  return Object.fromEntries(all.entries());
}
