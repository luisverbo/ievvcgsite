import { randomBytes } from "node:crypto";

/*
 * Código aleatório para LINK PÚBLICO (/p, /espelho, /relatorio).
 *
 * Math.random() não serve para isso: o estado do gerador é observável e a
 * sequência é prevísivel — alguém com alguns códigos em mãos consegue
 * estimar os próximos e enumerar links de leads que não são dele. Aqui é
 * randomBytes: imprevisível por construção.
 *
 * Sai em hexadecimal minúsculo, que passa nos validadores /^[a-z0-9]+$/ das
 * rotas. 8 bytes = 16 caracteres = 64 bits: fora de alcance de enumeração.
 */
export function codigoSeguro(bytes = 8): string {
  return randomBytes(bytes).toString("hex");
}
