/**
 * @module utils/slug
 * @description Génération de slugs URL-friendly garantis uniques.
 *
 * @author KOUTON Spynel
 */

import slugify from "slugify";
import { randomBytes } from "crypto";

export function toSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true });
}

export function uniqueSlug(input: string): string {
  const suffix = randomBytes(3).toString("hex");
  return `${toSlug(input)}-${suffix}`;
}
