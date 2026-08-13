import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * A rota que monta o .zip do agente lê arquivos-fonte em tempo de execução.
   * Sem esta lista, o empacotamento da Vercel não os inclui na função (ela só
   * leva o que é importado por código) e o download sai vazio em produção,
   * funcionando só na máquina de desenvolvimento.
   */
  outputFileTracingIncludes: {
    "/app/prospeccao/agente/baixar": [
      "./agente/*.ts",
      "./agente/package.json",
      "./agente/tsconfig.json",
      "./agente/README.md",
      "./lib/prospeccao/*.ts",
    ],
  },
};

export default nextConfig;
