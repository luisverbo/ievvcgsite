import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

/*
 * Cifra as chaves de API dos clientes antes de gravar no banco.
 *
 * Guardar chave de API de terceiro é guardar um cartão de crédito indireto: se
 * o banco vazar, os clientes recebem fatura. Por isso o segredo que decifra
 * (APP_CRYPTO_KEY) fica na env, fora do banco — um dump sozinho não abre nada.
 *
 * AES-256-GCM: além de cifrar, autentica. Se alguém alterar o texto cifrado no
 * banco, a decifragem falha em vez de devolver lixo.
 */

const ALGORITMO = "aes-256-gcm";

function segredo(): Buffer {
  const bruto = process.env.APP_CRYPTO_KEY;
  if (!bruto || bruto.length < 32) {
    throw new Error(
      "APP_CRYPTO_KEY não configurada (mínimo 32 caracteres). Sem ela não dá para guardar chaves de cliente.",
    );
  }
  // sha256 normaliza qualquer texto para os 32 bytes que o AES-256 exige.
  return createHash("sha256").update(bruto).digest();
}

export function temSegredo(): boolean {
  return !!process.env.APP_CRYPTO_KEY && process.env.APP_CRYPTO_KEY.length >= 32;
}

// Formato guardado: v1.<iv>.<tag>.<texto cifrado>, tudo em base64url.
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITMO, segredo(), iv);
  const dados = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), dados.toString("base64url")].join(
    ".",
  );
}

export function decifrar(guardado: string | null | undefined): string | null {
  if (!guardado) return null;
  const [versao, iv, tag, dados] = guardado.split(".");
  if (versao !== "v1" || !iv || !tag || !dados) return null;
  try {
    const decipher = createDecipheriv(ALGORITMO, segredo(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dados, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Chave trocada ou registro corrompido: melhor tratar como "sem chave" do
    // que derrubar a página inteira.
    return null;
  }
}

// Últimos 4 caracteres, para a tela mostrar qual chave está salva sem decifrar.
export function final4(chave: string): string {
  return chave.trim().slice(-4);
}
