/**
 * @module utils/slug
 * @description Génération de slugs uniques URL-friendly pour les ressources
 *   (annonces, catégories…).
 *
 *   Le slug est composé du titre normalisé + un suffixe UUID court pour
 *   garantir l'unicité même si deux annonces ont le même titre.
 *
 * @author KOUTON Spynel
 */

import { randomUUID } from "crypto";

/**
 * Génère un slug URL-friendly unique à partir d'un titre.
 *
 * Processus de normalisation :
 * 1. Conversion en minuscules.
 * 2. Suppression des accents (décomposition Unicode NFC → NFD + strip des diacritiques).
 * 3. Remplacement de tout caractère non alphanumérique par un tiret.
 * 4. Suppression des tirets consécutifs et en bordure.
 * 5. Ajout d'un suffixe UUID tronqué (8 caractères) pour l'unicité.
 *
 * @param title - Le titre de la ressource (annonce, catégorie…).
 * @returns Un slug unique au format `mon-titre-abcd1234`.
 *
 * @example
 * ```ts
 * generateSlug('Terrain à vendre à Cotonou');
 * // → "terrain-a-vendre-a-cotonou-a1b2c3d4"
 * ```
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${randomUUID().split("-")[0]}`;
}

/**
 * Alias de `generateSlug` — utilisé par `listings.service`.
 *
 * @param title - Titre de la ressource.
 * @returns Slug unique URL-friendly.
 */
export const uniqueSlug = generateSlug;
