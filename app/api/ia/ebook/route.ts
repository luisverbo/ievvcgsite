import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ehAdmin } from "@/app/app/admin/actions";
import { conversarComIA, getAnthropicKey, modeloValido } from "@/lib/ia/anthropic";
import { SYSTEM_EBOOK, promptEbookInicial } from "@/lib/ebooks/prompt-claude";
import { contarPaginas } from "@/lib/ebooks/parse";

// Escreve (ou reescreve) o ebook com a Claude, em streaming NDJSON — mesmo
// mecanismo do construtor de páginas, porque diagramar 15 páginas leva
// minutos e ninguém encara tela parada.

export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type EbookGeracao = {
  id: string;
  org_id: string;
  tema: string;
  formato: string;
  html: string | null;
  modelo_ia: string | null;
  paginas_alvo: number;
};

export async function POST(req: Request) {
  if (!(await ehAdmin())) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const ebookId = String(body.ebookId ?? "");
  if (!UUID.test(ebookId)) return NextResponse.json({ error: "Ebook inválido." }, { status: 400 });
  const ajuste = String(body.mensagem ?? "").trim();

  const key = await getAnthropicKey();
  if (!key) {
    return NextResponse.json(
      { error: "Configure a chave da Anthropic no painel admin." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("ebooks")
    .select("id, org_id, tema, formato, html, modelo_ia, paginas_alvo")
    .eq("id", ebookId)
    .maybeSingle();
  const ebook = data as EbookGeracao | null;
  if (!ebook) return NextResponse.json({ error: "Ebook não encontrado." }, { status: 404 });

  const primeiraVez = !ebook.html;
  if (!primeiraVez && ajuste.length < 3) {
    return NextResponse.json({ error: "Escreva o que você quer mudar." }, { status: 400 });
  }

  const pedido = primeiraVez
    ? promptEbookInicial(ebook.tema, ebook.paginas_alvo || 12, ebook.formato, ajuste || undefined)
    : ajuste;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const linha = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
        } catch {
          // navegador fechou a conexão — a geração segue e o salvamento também
        }
      };

      try {
        const resposta = await conversarComIA({
          key,
          modelo: modeloValido(ebook.modelo_ia),
          system: SYSTEM_EBOOK,
          mensagens: [{ papel: "user", conteudo: pedido }],
          htmlAtual: ebook.html || null,
          onTexto: (pedaco) => linha({ t: "delta", v: pedaco }),
        });

        if (!resposta.html) {
          linha({ t: "erro", v: "A IA não devolveu o ebook. Tente pedir de novo." });
          controller.close();
          return;
        }

        const total = contarPaginas(resposta.html);
        if (total === 0) {
          linha({
            t: "erro",
            v: "A IA não usou o formato de páginas esperado. Peça para gerar de novo.",
          });
          controller.close();
          return;
        }

        await supabase
          .from("ebooks")
          .update({ html: resposta.html, status: "pronto", motor: "claude" })
          .eq("id", ebookId);

        linha({ t: "fim", html: resposta.html, resumo: resposta.resumo, paginas: total });
      } catch (e) {
        await supabase.from("ebooks").update({ status: "erro" }).eq("id", ebookId);
        linha({ t: "erro", v: e instanceof Error ? e.message : "Falha ao falar com a IA." });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
