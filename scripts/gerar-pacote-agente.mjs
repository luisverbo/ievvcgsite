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
import { createHash } from "node:crypto";

const RAIZ = process.cwd();

// A lista mora em agente/arquivos.json, e não aqui, porque o AGENTE também
// precisa dela: é sobre esses mesmos arquivos que ele calcula a própria
// versão, e os dois lados só batem se lerem a mesma lista.
//
// Escrita à mão, e não varredura de pasta: um `**/*` acabaria empacotando
// node_modules, o .env do servidor ou o perfil do navegador.
//
// ⚠️ Arquivo novo no agente ENTRA NA LISTA. Esquecer disto gera um zip que só
// quebra na máquina do cliente ("Cannot find module ... espelho.ts") — foi
// exatamente o que aconteceu com espelho.ts e estudio.ts. A conferência de
// imports no fim deste script existe para isso não se repetir.
const ARQUIVOS = JSON.parse(await fs.readFile(path.join(RAIZ, "agente/arquivos.json"), "utf8"));

const partes = [];
const conteudos = new Map();
const hash = createHash("sha256");
for (const relativo of ARQUIVOS) {
  const conteudo = await fs.readFile(path.join(RAIZ, relativo), "utf8");
  conteudos.set(relativo, conteudo);
  partes.push(`  ${JSON.stringify(relativo)}: ${JSON.stringify(conteudo)},`);
  // A versão é o conteúdo, normalizado: um checkout com CRLF no Windows tem
  // que dar o mesmo número que o zip. agente/versao.ts faz a mesma conta.
  hash.update(relativo + "\n" + conteudo.replace(/\r\n/g, "\n") + "\n");
}
/*
 * A versão do agente é o hash do que vai dentro dele — muda só quando um
 * arquivo do agente muda, não a cada deploy do painel. É o que o painel
 * compara com a versão que cada agente reporta para dizer "desatualizado".
 */
const VERSAO = hash.digest("hex").slice(0, 12);

/*
 * A trava: todo import relativo dos arquivos empacotados TEM que estar na
 * lista acima.
 *
 * Sem isto, esquecer um arquivo novo gera um zip que instala normalmente e
 * só quebra quando o cliente aperta LIGAR — com um erro de Node que não diz
 * nada a ele. Melhor quebrar aqui, no build, onde quem lê sou eu.
 */
const faltando = [];
for (const [relativo, conteudo] of conteudos) {
  if (!relativo.endsWith(".ts")) continue;
  const pasta = path.dirname(relativo);
  for (const m of conteudo.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const alvo = path.posix.normalize(path.posix.join(pasta, m[1]));
    if (!conteudos.has(alvo)) faltando.push(`${relativo} importa ${alvo}`);
  }
}
if (faltando.length > 0) {
  console.error("\n✗ O pacote do agente ficaria quebrado — arquivos que faltam na lista ARQUIVOS:");
  for (const f of new Set(faltando)) console.error(`   ${f}`);
  console.error("");
  process.exit(1);
}

const saida = `// GERADO AUTOMATICAMENTE — não edite.
// Fonte: scripts/gerar-pacote-agente.mjs (roda no prebuild).

export const ARQUIVOS_DO_AGENTE: Record<string, string> = {
${partes.join("\n")}
};

// Hash do conteúdo acima. O agente calcula o mesmo (agente/versao.ts).
export const VERSAO_AGENTE = ${JSON.stringify(VERSAO)};
`;

await fs.mkdir(path.join(RAIZ, "lib/agente"), { recursive: true });
await fs.writeFile(path.join(RAIZ, "lib/agente/pacote.ts"), saida);
console.log(`✓ pacote do agente gerado (${ARQUIVOS.length} arquivos, versão ${VERSAO})`);
