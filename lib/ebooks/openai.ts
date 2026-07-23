import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Integração com a OpenAI para o módulo de Ebooks IA.
// A chave fica em config_sistema (colada pelo dono no painel Admin) com
// fallback para a env OPENAI_API_KEY. NUNCA vai para o navegador.

export type FormatoEbook = "a4" | "mobile" | "quadrado";

export type PaginaEbook = {
  tipo: "capa" | "conteudo";
  titulo: string;
  texto?: string;
  prompt_imagem: string;
  imagem_url?: string | null;
};

export type ConteudoEbook = {
  titulo: string;
  subtitulo: string;
  paginas: PaginaEbook[];
};

export async function getOpenAIKey(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("config_sistema")
    .select("valor")
    .eq("chave", "openai_api_key")
    .maybeSingle();
  const valor = (data as { valor: string } | null)?.valor?.trim();
  return valor || process.env.OPENAI_API_KEY || null;
}

export async function salvarOpenAIKey(valor: string) {
  const admin = createAdminClient();
  await admin
    .from("config_sistema")
    .upsert({ chave: "openai_api_key", valor: valor.trim(), updated_at: new Date().toISOString() });
}

const ESTILOS_IMAGEM: Record<string, string> = {
  fotografico: "fotografia profissional realista, iluminação natural cinematográfica",
  ilustracao: "ilustração digital moderna estilo flat design, cores vibrantes",
  aquarela: "pintura em aquarela artística, traços suaves e orgânicos",
  minimalista: "arte minimalista elegante, poucos elementos, muito espaço negativo",
  "3d": "render 3D moderno estilo Pixar, cores ricas, luz suave",
};

export function descricaoEstilo(estilo: string) {
  return ESTILOS_IMAGEM[estilo] ?? ESTILOS_IMAGEM.fotografico;
}

// ---------------------------------------------------------------- texto ----
export async function gerarConteudoEbook(
  key: string,
  tema: string,
  numPaginas: number,
  formato: FormatoEbook,
  estilo: string,
): Promise<ConteudoEbook> {
  const porPagina = formato === "mobile" ? "60 a 90" : "120 a 180";
  const prompt = `Você é um redator profissional de ebooks em português do Brasil.
Crie um ebook completo, no formato de revista digital, sobre o tema abaixo.

TEMA: ${tema}

REGRAS:
- Exatamente ${numPaginas} páginas de conteúdo, além da capa.
- Cada página de conteúdo tem: um título curto e forte, um texto de ${porPagina} palavras (parágrafos separados por \\n\\n), e um "prompt_imagem".
- O "prompt_imagem" descreve EM PORTUGUÊS uma imagem SEM NENHUM TEXTO/LETRAS, no estilo: ${descricaoEstilo(estilo)}. Seja específico sobre cena, objetos, cores e clima.
- A capa tem título do ebook (máx. 6 palavras), subtítulo (1 frase) e prompt_imagem impactante.
- Conteúdo prático, direto e valioso — nada de encher linguiça.

Responda SOMENTE com JSON válido neste formato:
{"titulo":"...","subtitulo":"...","paginas":[{"tipo":"capa","titulo":"...","texto":"subtítulo da capa","prompt_imagem":"..."},{"tipo":"conteudo","titulo":"...","texto":"...","prompt_imagem":"..."}]}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const erro = await res.text();
    throw new Error(`OpenAI (texto) respondeu ${res.status}: ${erro.slice(0, 300)}`);
  }
  const json = await res.json();
  const conteudo = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as ConteudoEbook;
  if (!conteudo.paginas?.length) throw new Error("A IA não devolveu páginas. Tente novamente.");

  // Garante capa na posição 0.
  if (conteudo.paginas[0]?.tipo !== "capa") {
    conteudo.paginas.unshift({
      tipo: "capa",
      titulo: conteudo.titulo ?? tema,
      texto: conteudo.subtitulo ?? "",
      prompt_imagem: `${tema}, ${descricaoEstilo(estilo)}`,
    });
  }
  return conteudo;
}

// --------------------------------------------------------------- imagem ----
function tamanhoImagem(formato: FormatoEbook, modelo: "gpt-image-1" | "dall-e-3") {
  if (formato === "quadrado") return "1024x1024";
  return modelo === "gpt-image-1" ? "1024x1536" : "1024x1792"; // retrato
}

export async function gerarImagemEbook(
  key: string,
  promptImagem: string,
  formato: FormatoEbook,
  estilo: string,
): Promise<Buffer> {
  const prompt = `${promptImagem}. Estilo: ${descricaoEstilo(estilo)}. Sem texto, sem letras, sem palavras na imagem.`;

  async function chamar(modelo: "gpt-image-1" | "dall-e-3") {
    const body: Record<string, unknown> = {
      model: modelo,
      prompt,
      n: 1,
      size: tamanhoImagem(formato, modelo),
    };
    if (modelo === "gpt-image-1") body.quality = "medium";
    else body.response_format = "b64_json";

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
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

  // gpt-image-1 exige organização verificada em algumas contas; se falhar,
  // cai para o dall-e-3 automaticamente.
  try {
    return await chamar("gpt-image-1");
  } catch {
    return await chamar("dall-e-3");
  }
}

// --------------------------------------------------------------- upload ----
export async function subirImagemEbook(
  orgId: string,
  ebookId: string,
  nomeArquivo: string,
  buf: Buffer,
): Promise<string> {
  const admin = createAdminClient();
  const caminho = `${orgId}/ebooks/${ebookId}/${nomeArquivo}`;
  const { error } = await admin.storage
    .from("midias")
    .upload(caminho, buf, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Falha ao salvar a imagem: ${error.message}`);
  const { data } = admin.storage.from("midias").getPublicUrl(caminho);
  return data.publicUrl;
}
