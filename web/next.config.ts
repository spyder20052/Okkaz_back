import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      // Images servies par le backend (uploads locaux en dev)
      { protocol: "http", hostname: "localhost", port: "3000", pathname: "/uploads/**" },
    ],
  },
};

export default nextConfig;
