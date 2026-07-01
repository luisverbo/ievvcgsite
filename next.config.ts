import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Padrão é 1MB, que rejeitava uploads de fotos e vídeos do painel.
      // Para vídeos grandes, prefira link do YouTube (mais leve pra quem acessa).
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
