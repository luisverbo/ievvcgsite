/*
 * Versão e atualização do agente.
 *
 * O painel precisa saber se o programa que roda na máquina do cliente é o
 * mesmo que ele acabou de publicar — senão toda melhoria vira "baixe o
 * agente de novo" dito no escuro. E a atualização tem que ser um botão, não
 * um SSH: quem roda na VPS clica em Atualizar e o agente se vira.
 *
 * A VERSÃO é o hash do conteúdo dos arquivos listados em arquivos.json — a
 * mesma conta que scripts/gerar-pacote-agente.mjs faz no servidor. Muda só
 * quando um arquivo do agente muda, e bate nos dois lados sem precisar de
 * número de versão mantido à mão.
 *
 * A ATUALIZAÇÃO tem dois caminhos, escolhidos sozinhos:
 *   - instalação por git (a VPS): `git pull` e reinício — o systemd religa;
 *   - instalação por zip (Windows/Mac): baixa os arquivos novos do painel,
 *     escreve por cima e reinicia — o LIGAR-AGENTE religa.
 *
 * O que ela NUNCA toca: o .env e a pasta .perfil-whatsapp. Atualizar não
 * custa a sessão do WhatsApp nem o código de acesso.
 */

import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A raiz do pacote: a pasta acima de agente/ (onde também mora lib/).
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/*
 * Código de saída que significa "me religue": os lançadores (LIGAR-AGENTE e
 * o systemd) reiniciam o agente ao vê-lo. Qualquer outro código é parada.
 */
export const CODIGO_REINICIAR = 75;

function listaDeArquivos(): string[] {
  const bruto = fs.readFileSync(path.join(RAIZ, "agente/arquivos.json"), "utf8");
  const lista = JSON.parse(bruto);
  if (!Array.isArray(lista)) throw new Error("arquivos.json inválido");
  return lista.map(String);
}

/*
 * A versão local. "desconhecida" quando não dá para calcular (arquivo
 * faltando, lista corrompida): o painel mostra isso em vez de mentir.
 */
export function versaoLocal(): string {
  try {
    const hash = createHash("sha256");
    for (const relativo of listaDeArquivos()) {
      const conteudo = fs.readFileSync(path.join(RAIZ, relativo), "utf8");
      hash.update(relativo + "\n" + conteudo.replace(/\r\n/g, "\n") + "\n");
    }
    return hash.digest("hex").slice(0, 12);
  } catch {
    return "desconhecida";
  }
}

export function instaladoPorGit(): boolean {
  return fs.existsSync(path.join(RAIZ, ".git"));
}

// Um caminho vindo do painel só entra se ficar DENTRO da raiz do pacote.
function caminhoSeguro(relativo: string): string | null {
  if (path.isAbsolute(relativo) || relativo.includes("..") || relativo.includes("\0")) return null;
  const destino = path.resolve(RAIZ, relativo);
  if (!destino.startsWith(RAIZ + path.sep)) return null;
  return destino;
}

function rodar(comando: string, cwd: string, log: (m: string) => void) {
  const saida = execSync(comando, { cwd, stdio: ["ignore", "pipe", "pipe"], timeout: 180_000 })
    .toString()
    .trim();
  if (saida) log(saida.split("\n").slice(-3).join(" · "));
}

/*
 * Aplica a atualização. Devolve true quando há o que reiniciar.
 *
 * `baixarPacote` é a chamada ao painel que traz os arquivos novos — fica de
 * fora daqui para este módulo não depender do api.ts (que ele mesmo pode
 * estar prestes a substituir).
 */
export async function aplicarAtualizacao(
  baixarPacote: () => Promise<Record<string, string>>,
  log: (m: string) => void,
): Promise<boolean> {
  const antes = versaoLocal();

  if (instaladoPorGit()) {
    log("atualizando pelo git…");
    // --ff-only: se alguém editou na mão na VPS, não tentamos fundir nada —
    // paramos e avisamos, em vez de deixar o código num estado do meio.
    rodar("git pull --ff-only", RAIZ, log);
  } else {
    log("baixando os arquivos novos do painel…");
    const arquivos = await baixarPacote();
    let escritos = 0;
    for (const [relativo, conteudo] of Object.entries(arquivos)) {
      const destino = caminhoSeguro(relativo);
      if (!destino) continue;
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, conteudo, "utf8");
      escritos++;
    }
    log(`${escritos} arquivos escritos`);
  }

  const depois = versaoLocal();
  if (depois === antes) {
    log("nada mudou — já estava na versão mais nova");
    return false;
  }

  // Dependência nova no package.json? O install é rápido quando não há nada.
  try {
    rodar("npm install --no-audit --no-fund", path.join(RAIZ, "agente"), log);
  } catch (e) {
    log(`npm install falhou (sigo assim mesmo): ${(e as Error).message.slice(0, 120)}`);
  }

  log(`atualizado: ${antes} → ${depois}`);
  return true;
}
