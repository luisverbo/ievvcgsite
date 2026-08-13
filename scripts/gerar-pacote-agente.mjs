/*
 * Gera lib/agente/pacote.ts com o conteúdo dos arquivos do agente.
 *
 * Por que não ler do disco na hora do download: a leitura em tempo de execução
 * faz o empacotador da Vercel rastrear o projeto inteiro para dentro daquela
 * função ("the whole project was traced unintentionally"), o que incha o
 * pacote e pode estourar o limite. Um módulo importado normalmente resolve
 * isso e ainda garante que o arquivo existe — se faltar, a build quebra aqui,
 * e não na mão do cliente.
 *
 * Roda sozinho antes do build (veja "prebuild" no package.json).
 */

import fs from "node:fs/promises";
import path from "node:path";

const RAIZ = process.cwd();

// Escrita à mão, e não varredura de pasta: um `**/*` acabaria empacotando
// node_modules, o .env do servidor ou o perfil do navegador.
const ARQUIVOS = [
  "agente/api.ts",
  "agente/abordagem.ts",
  "agente/capturaIg.ts",
  "agente/coletor.ts",
  "agente/instagram.ts",
  "agente/prospectar.ts",
  "agente/servico.ts",
  "agente/whatsapp.ts",
  "agente/package.json",
  "agente/tsconfig.json",
  "agente/README.md",
  "lib/prospeccao/tipos.ts",
  "lib/prospeccao/nichos.ts",
  "lib/prospeccao/instagram.ts",
];

const partes = [];
for (const relativo of ARQUIVOS) {
  const conteudo = await fs.readFile(path.join(RAIZ, relativo), "utf8");
  partes.push(`  ${JSON.stringify(relativo)}: ${JSON.stringify(conteudo)},`);
}

const saida = `// GERADO AUTOMATICAMENTE — não edite.
// Fonte: scripts/gerar-pacote-agente.mjs (roda no prebuild).

export const ARQUIVOS_DO_AGENTE: Record<string, string> = {
${partes.join("\n")}
};
`;

await fs.mkdir(path.join(RAIZ, "lib/agente"), { recursive: true });
await fs.writeFile(path.join(RAIZ, "lib/agente/pacote.ts"), saida);
console.log(`✓ pacote do agente gerado (${ARQUIVOS.length} arquivos)`);
