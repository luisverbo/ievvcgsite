import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import { telefoneWhatsapp } from "@/lib/prospeccao/mensagem";
import type { ProspectoRow } from "@/lib/prospeccao/tipos";

/*
 * Exportar a lista em CSV — a planilha é onde vendedor vive.
 *
 * O arquivo abre direto no Excel e no Google Sheets: separador ponto e
 * vírgula (o Excel brasileiro ignora vírgula como separador, porque vírgula
 * aqui é decimal) e BOM na frente (sem ele o Excel lê UTF-8 como bagunça e
 * "São Paulo" vira "SÃ£o Paulo").
 *
 * A lista é do dono — os dados saem completos, sem recorte por plano.
 */

function celula(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function GET() {
  if (!(await podeUsar("prospeccao"))) return new Response("Não encontrado", { status: 404 });
  const org = await getMinhaOrg();
  if (!org) return new Response("Não encontrado", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("prospeccao")
    .select("*")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(5000);
  const lista = (data as ProspectoRow[] | null) ?? [];

  const cabecalho = [
    "empresa",
    "categoria",
    "telefone",
    "whatsapp",
    "endereco",
    "nota_google",
    "avaliacoes",
    "etiqueta",
    "status",
    "nicho_pesquisado",
    "regiao_pesquisada",
    "site",
    "instagram",
    "link_google_maps",
  ];

  const linhas = lista.map((p) => {
    const zap = telefoneWhatsapp(p.telefone);
    return [
      p.nome,
      p.categoria,
      p.telefone,
      zap ? `https://wa.me/${zap}` : "",
      p.endereco,
      p.nota_media,
      p.avaliacoes,
      p.etiqueta ?? "",
      p.status,
      p.nicho_busca,
      p.local_busca,
      p.website,
      p.instagram,
      p.fonte_url,
    ]
      .map(celula)
      .join(";");
  });

  const csv = "\uFEFF" + `${cabecalho.join(";")}\n${linhas.join("\n")}`;
  const hoje = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prospeccao-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
