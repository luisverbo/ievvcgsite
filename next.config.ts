import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Navegador não pode "adivinhar" tipo de arquivo — mata truques de
          // servir upload como script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sites de cliente e páginas internas só podem ser embutidos por
          // nós mesmos (o Espelho e as prévias usam iframe do próprio site).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Endereços internos (com códigos de link único) não vazam inteiros
          // no Referer quando o visitante clica para fora.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nenhuma página nossa precisa de câmera, microfone ou GPS.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
