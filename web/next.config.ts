import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

// Chemins servis par le backend : `/uploads/**` (driver `local`, disque du
// backend) et `/files/**` (driver `db`, fichiers stockés dans Neon). Les URLs
// Cloudinary sont déjà absolues.
const API_IMAGE_PATHS = ["/uploads/**", "/files/**"] as const;

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
];

// L'origine de l'API est déduite de NEXT_PUBLIC_API_URL, port compris — y
// compris sur localhost : coder « 3000 » en dur casse les images dès que le
// backend tourne sur un autre port.
try {
  const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1");
  for (const pathname of API_IMAGE_PATHS) {
    remotePatterns.push({
      protocol: apiUrl.protocol === "https:" ? "https" : "http",
      hostname: apiUrl.hostname,
      port: apiUrl.port,
      pathname,
    });
  }
} catch {
  // La validation explicite de NEXT_PUBLIC_API_URL est effectuée dans src/lib/api.ts.
}

// Next 16 refuse par défaut d'optimiser une image hébergée sur une IP locale
// (protection SSRF). En développement, l'API tourne sur localhost : sans ce
// drapeau, toutes les photos d'annonces passant par `next/image` répondent
// « url parameter is not allowed » (400) et la page n'affiche que des
// placeholders. On ne l'active donc que si l'API est effectivement locale —
// en production (api.okkaz.bj, Cloudinary) la restriction reste en place.
const isLocalApi = (() => {
  try {
    const { hostname } = new URL(
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1",
    );
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
})();

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns,
    ...(isLocalApi ? { dangerouslyAllowLocalIP: true } : {}),
  },
};

export default nextConfig;
