import "server-only";

import fs from "node:fs";
import path from "node:path";

/*
 * Os prints reais do painel que a landing mostra como prova.
 *
 * Moram em public/prospector/, gerados por scripts/embacar-prints.py a
 * partir dos originais (que ficam fora do git, em prints/). A landing só
 * mostra o bloco de prova quando os arquivos existem — sem eles, o bloco
 * inteiro não aparece. Nada de moldura vazia dizendo "em breve".
 *
 * As dimensões são lidas do cabeçalho do PNG (bytes 16–24) para o
 * next/image reservar o espaço certo e a página não pular ao carregar.
 */

export type Print = { src: string; largura: number; altura: number };

const PASTA = path.join(process.cwd(), "public", "prospector");

function dimensoesPng(arquivo: string): { largura: number; altura: number } | null {
  try {
    const fd = fs.openSync(arquivo, "r");
    const cab = Buffer.alloc(24);
    fs.readSync(fd, cab, 0, 24, 0);
    fs.closeSync(fd);
    // Assinatura PNG + chunk IHDR: largura e altura são big-endian em 16 e 20.
    if (cab.toString("hex", 0, 8) !== "89504e470d0a1a0a") return null;
    return { largura: cab.readUInt32BE(16), altura: cab.readUInt32BE(20) };
  } catch {
    return null;
  }
}

export function printDaLanding(nome: "funil" | "quem-abordar" | "leads"): Print | null {
  const arquivo = path.join(PASTA, `${nome}.png`);
  const dim = dimensoesPng(arquivo);
  if (!dim) return null;
  return { src: `/prospector/${nome}.png`, ...dim };
}
