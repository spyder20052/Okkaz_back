import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "http", hostname: "localhost", port: "3000", pathname: "/uploads/**" },
  // Fichiers stockés en base (driver `db` — Neon) servis par l'API.
  { protocol: "http", hostname: "localhost", port: "3000", pathname: "/files/**" },
  { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
];

try {
  const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1");
  if (apiUrl.hostname !== "localhost") {
    remotePatterns.push(
      {
        protocol: apiUrl.protocol === "https:" ? "https" : "http",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: "/uploads/**",
      },
      {
        protocol: apiUrl.protocol === "https:" ? "https" : "http",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: "/files/**",
      },
    );
  }
} catch {
  // La validation explicite de NEXT_PUBLIC_API_URL est effectuée dans src/lib/api.ts.
}

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns,
  },
};

export default nextConfig;
