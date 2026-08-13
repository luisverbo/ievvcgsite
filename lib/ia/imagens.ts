import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ImagemMarcada } from "./html-imagens";

// Geração das imagens das páginas de IA — mesma OpenAI (gpt-image-1 com
// fallback para dall-e-3) e mesmo bucket dos ebooks.

function tamanho(orientacao: ImagemMarcada["orientacao"], modelo: "gpt-image-1" | "dall-e-3") {
  if (orientacao === "quadrado") return "1024x1024";
  if (orientacao === "retrato") return modelo === "gpt-image-1" ? "1024x1536" : "1024x1792";
  return modelo === "gpt-image-1" ? "1536x1024" : "1792x1024";
}

export async function gerarImagemLanding(
  key: string,
  promptImagem: string,
  orientacao: ImagemMarcada["orientacao"],
  qualidade: "media" | "alta" = "media",
): Promise<Buffer> {
  const prompt = `${promptImagem}. Fotografia/arte de altíssima qualidade para uma landing page premium. Sem texto, sem letras, sem palavras, sem marca d'água na imagem.`;

  async function chamar(modelo: "gpt-image-1" | "dall-e-3") {
    const body: Record<string, unknown> = {
      model: modelo,
      prompt,
      n: 1,
      size: tamanho(orientacao, modelo),
    };
    if (modelo === "gpt-image-1") body.quality = qualidade === "alta" ? "high" : "medium";
    else {
      body.response_format = "b64_json";
      if (qualidade === "alta") body.quality = "hd";
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(150_000),
    });
    if (!res.ok) {
      const erro = await res.text();
      throw new Error(`OpenAI (${modelo}) respondeu ${res.status}: ${erro.slice(0, 300)}`);
    }
    const json = await res.json();
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("A OpenAI não devolveu a imagem.");
    return Buffer.from(b64, "base64");
  }

  try {
    return await chamar("gpt-image-1");
  } catch {
    return await chamar("dall-e-3");
  }
}

export async function subirImagemIA(
  orgId: string,
  siteIaId: string,
  nomeArquivo: string,
  buf: Buffer,
  tipo = "image/png",
): Promise<string> {
  const admin = createAdminClient();
  const caminho = `${orgId}/ia/${siteIaId}/${nomeArquivo}`;
  const { error } = await admin.storage
    .from("midias")
    .upload(caminho, buf, { contentType: tipo, upsert: true });
  if (error) throw new Error(`Falha ao salvar a imagem: ${error.message}`);
  const { data } = admin.storage.from("midias").getPublicUrl(caminho);
  return data.publicUrl;
}
