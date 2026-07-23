import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Integração com a OpenAI para o módulo de Ebooks IA.
// A chave fica em config_sistema (colada pelo dono no painel Admin) com
// fallback para a env OPENAI_API_KEY. NUNCA vai para o navegador.

export type FormatoEbook = "a4" | "mobile" | "quadrado";
export type QualidadeImagem = "media" | "alta";

// Layouts editoriais que a IA distribui entre as páginas (estilo revista).
export type LayoutPagina = "capa" | "classico" | "lateral" | "full" | "citacao";

export type PaginaEbook = {
  tipo: "capa" | "conteudo";
  layout?: LayoutPagina;
  kicker?: string; // chapéu curto acima do título (ex: "CAPÍTULO 01 · ESTRATÉGIA")
  titulo: string;
  texto?: string;
  destaque?: string; // frase de efeito para pull-quote
  prompt_imagem: string;
  imagem_url?: string | null;
};

export type ConteudoEbook = {
  titulo: string;
  subtitulo: string;
  paginas: PaginaEbook[];
};

export const MODELOS_TEXTO: Record<string, { rotulo: string; custo: string }> = {
  "gpt-4o-mini": { rotulo: "GPT-4o mini", custo: "rápido e barato (~US$0,01)" },
  "gpt-4o": { rotulo: "GPT-4o", custo: "equilíbrio ideal (~US$0,05)" },
  "gpt-4.1": { rotulo: "GPT-4.1", custo: "máxima qualidade (~US$0,10)" },
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
  fotografico:
    "fotografia editorial real de revista premium, câmera full-frame 50mm f/1.8, luz natural suave, texturas ricas e realistas, profundidade de campo, cores levemente dessaturadas e elegantes — deve parecer uma foto de verdade, jamais arte digital",
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
  modelo: string,
): Promise<ConteudoEbook> {
  const porPagina = formato === "mobile" ? "50 a 80" : "110 a 160";
  const prompt = `Você é o diretor editorial de uma revista premium (padrão de revista de gastronomia/lifestyle de banca, papel couché). Crie um ebook em português do Brasil no formato de revista digital de altíssimo nível sobre o tema abaixo.

TEMA: ${tema}

ESTRUTURA (JSON):
- 1 página "capa" + exatamente ${numPaginas} páginas "conteudo".
- Cada página de conteúdo tem:
  - "layout": escolha entre "classico" (imagem no topo), "lateral" (imagem ocupa metade da página), "full" (imagem de página inteira com painel de texto sobreposto — use texto de 40 a 60 palavras nesta) e "citacao" (página de frase de impacto). VARIE os layouts como uma revista de verdade: alterne, nunca repita o mesmo layout 3x seguidas, use "citacao" 1 ou 2 vezes no meio, e "full" nas páginas mais visuais.
  - "kicker": chapéu editorial curto em CAIXA ALTA (ex: "CAPÍTULO 02 · ESTRATÉGIA").
  - "titulo": título curto e magnético.
  - "texto": ${porPagina} palavras (menos no layout "full"), parágrafos separados por \\n\\n, tom de editor experiente — prático, elegante, zero enrolação.
  - "destaque": UMA frase de efeito curta tirada da essência da página (para pull-quote).
  - "prompt_imagem": descrição EM PORTUGUÊS de uma imagem SEM NENHUM TEXTO/LETRAS, cena específica (objetos, ângulo, luz, atmosfera), no estilo: ${descricaoEstilo(estilo)}.
- A capa: "titulo" (máx 5 palavras, impactante), "texto" = subtítulo de 1 linha, "kicker" = nome de seção (ex: "EDIÇÃO ESPECIAL"), "prompt_imagem" digno de capa de revista premiada.

Responda SOMENTE com JSON válido:
{"titulo":"...","subtitulo":"...","paginas":[{"tipo":"capa","layout":"capa","kicker":"...","titulo":"...","texto":"...","prompt_imagem":"..."},{"tipo":"conteudo","layout":"classico","kicker":"...","titulo":"...","texto":"...","destaque":"...","prompt_imagem":"..."}]}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODELOS_TEXTO[modelo] ? modelo : "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
    }),
    // Sem timeout a requisição pode pendurar para sempre e travar o fluxo.
    signal: AbortSignal.timeout(150_000),
  });

  if (!res.ok) {
    const erro = await res.text();
    throw new Error(`OpenAI (texto) respondeu ${res.status}: ${erro.slice(0, 300)}`);
  }
  const json = await res.json();
  const conteudo = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as ConteudoEbook;
  if (!conteudo.paginas?.length) throw new Error("A IA não devolveu páginas. Tente novamente.");

  if (conteudo.paginas[0]?.tipo !== "capa") {
    conteudo.paginas.unshift({
      tipo: "capa",
      layout: "capa",
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
  qualidade: QualidadeImagem = "media",
): Promise<Buffer> {
  const prompt = `${promptImagem}. Estilo: ${descricaoEstilo(estilo)}. Sem texto, sem letras, sem palavras, sem marca d'água na imagem.`;

  async function chamar(modelo: "gpt-image-1" | "dall-e-3") {
    const body: Record<string, unknown> = {
      model: modelo,
      prompt,
      n: 1,
      size: tamanhoImagem(formato, modelo),
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
      // gpt-image-1 em qualidade alta pode passar de 1 minuto; aborta em 2min30
      // para o fallback/erro acontecer antes do limite da função (300s).
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
