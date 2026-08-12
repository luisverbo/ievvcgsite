import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { podeUsar } from "@/lib/painel/permissoes";
import {
  leiaMe,
  listarUrlsRemotas,
  nomearArquivos,
  reescreverCaminhos,
} from "@/lib/ia/exportar";

// Baixa a página como um site solto: index.html + pasta de imagens, pronto
// para subir em qualquer hospedagem. É o que permite vender o site e entregar
// o arquivo para o cliente hospedar onde quiser.

export const maxDuration = 300;

const MAX_IMAGEM_BYTES = 15 * 1024 * 1024;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await podeUsar("construtor"))) return new Response("Não encontrado", { status: 404 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Endereço inválido", { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("sites_ia")
    .select("titulo, slug, html")
    .eq("id", id)
    .maybeSingle();
  const site = data as { titulo: string; slug: string; html: string } | null;
  if (!site?.html) {
    return new Response("Esta página ainda não tem conteúdo.", { status: 404 });
  }

  // Baixa as imagens. Se alguma falhar, ela continua apontando para o
  // endereço original — melhor um site com uma foto remota do que um site
  // com foto quebrada.
  const urls = listarUrlsRemotas(site.html);
  const todos = nomearArquivos(urls);
  const zip = new JSZip();
  const baixadas = new Map<string, string>();

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) return;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGEM_BYTES) return;
        const caminho = todos.get(url)!;
        zip.file(caminho, buf);
        baixadas.set(url, caminho);
      } catch {
        // sem rede ou imagem sumida: mantém a URL original
      }
    }),
  );

  const html = reescreverCaminhos(site.html, baixadas);
  zip.file("index.html", html);
  zip.file("LEIA-ME.txt", leiaMe(site.titulo, new Date().toLocaleString("pt-BR")));

  const conteudo = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const nome = `${site.slug || "site"}.zip`;
  return new Response(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Content-Length": String(conteudo.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
