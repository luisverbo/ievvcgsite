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
 * A lista é do dono — os dados saem completos, sem recorte por plano. O que
 * o dono escolhe é o RECORTE, e por um motivo prático: cada destino quer uma
 * planilha diferente. Ferramenta de disparo quer uma coluna de números e
 * mais nada; o vendedor que vai ligar quer telefone e nome; quem vai estudar
 * a região quer tudo. Uma planilha só serve mal aos três.
 */

type Formato = "zap" | "contatos" | "completo";

const FORMATOS: Formato[] = ["zap", "contatos", "completo"];

function celula(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/*
 * O número puro (5511999999999), sem + e sem wa.me — é o formato que as
 * ferramentas de importação esperam.
 *
 * Sai entre aspas para ser um campo de TEXTO no CSV, que é a dica que a
 * maioria dos importadores respeita. O Excel ainda pode EXIBIR 5,51199E+12
 * (ele faz isso com qualquer número longo); o valor continua certo, e basta
 * formatar a coluna como número sem casas para ver os treze dígitos.
 */
function colunaNumero(zap: string): string {
  return `"${zap}"`;
}

export async function GET(request: Request) {
  if (!(await podeUsar("prospeccao"))) return new Response("Não encontrado", { status: 404 });
  const org = await getMinhaOrg();
  if (!org) return new Response("Não encontrado", { status: 404 });

  const url = new URL(request.url);
  const formato: Formato =
    FORMATOS.find((f) => f === url.searchParams.get("formato")) ?? "completo";
  /*
   * No formato "só WhatsApp" o recorte é obrigatório: uma planilha de números
   * com linhas vazias no meio (as empresas de telefone fixo) não serve para
   * importar em lugar nenhum.
   */
  const soZap = url.searchParams.get("so_zap") === "1" || formato === "zap";

  /*
   * Os mesmos filtros da tela, com os mesmos nomes de parâmetro. Quem filtrou
   * "lead quente" e clicou em exportar espera a planilha dos leads quentes —
   * baixar a lista inteira ali seria desfazer o trabalho que ele acabou de
   * fazer na tela.
   */
  const status = url.searchParams.get("f");
  const busca = url.searchParams.get("b");
  const procura = (url.searchParams.get("q") ?? "").trim().slice(0, 80).replace(/[%_]/g, "\\$&");
  const tag = (url.searchParams.get("tag") ?? "").trim().slice(0, 30);

  const supabase = await createClient();
  let q = supabase
    .from("prospeccao")
    .select("*")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (status && status !== "todos") q = q.eq("status", status);
  if (busca && busca !== "todas") {
    const [nicho, local] = busca.split("|");
    q = q.eq("nicho_busca", nicho).eq("local_busca", local);
  }
  if (procura) q = q.ilike("nome", `%${procura}%`);
  if (tag) q = q.eq("etiqueta", tag);

  const { data } = await q;
  let lista = (data as ProspectoRow[] | null) ?? [];

  /*
   * "Só quem tem WhatsApp" é o recorte mais pedido, e não é um capricho: uma
   * lista com fixos no meio faz o vendedor perder a manhã descobrindo, um a
   * um, quais números não abrem conversa. telefoneWhatsapp() só aceita
   * celular brasileiro (DDD + 9 + 8 dígitos), que é o teste certo.
   */
  if (soZap) lista = lista.filter((p) => telefoneWhatsapp(p.telefone));

  const COLUNAS: Record<Formato, { cabecalho: string[]; linha: (p: ProspectoRow) => string[] }> = {
    /* Enxuta, para colar em ferramenta de importação: número na coluna A. */
    zap: {
      cabecalho: ["whatsapp", "empresa"],
      linha: (p) => [colunaNumero(telefoneWhatsapp(p.telefone) ?? ""), celula(p.nome)],
    },
    /* Para quem vai falar com essa gente: quem é, como chamar, onde fica. */
    contatos: {
      cabecalho: ["empresa", "telefone", "whatsapp", "link_whatsapp", "endereco", "etiqueta", "status"],
      linha: (p) => {
        const zap = telefoneWhatsapp(p.telefone);
        return [
          celula(p.nome),
          celula(p.telefone),
          zap ? colunaNumero(zap) : "",
          zap ? `https://wa.me/${zap}` : "",
          celula(p.endereco),
          celula(p.etiqueta ?? ""),
          celula(p.status),
        ];
      },
    },
    /* Tudo o que o agente descobriu — para cruzar, estudar a região, arquivar. */
    completo: {
      cabecalho: [
        "empresa",
        "categoria",
        "telefone",
        "whatsapp",
        "link_whatsapp",
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
      ],
      linha: (p) => {
        const zap = telefoneWhatsapp(p.telefone);
        return [
          celula(p.nome),
          celula(p.categoria),
          celula(p.telefone),
          zap ? colunaNumero(zap) : "",
          zap ? `https://wa.me/${zap}` : "",
          celula(p.endereco),
          celula(p.nota_media),
          celula(p.avaliacoes),
          celula(p.etiqueta ?? ""),
          celula(p.status),
          celula(p.nicho_busca),
          celula(p.local_busca),
          celula(p.website),
          celula(p.instagram),
          celula(p.fonte_url),
        ];
      },
    },
  };

  const { cabecalho, linha } = COLUNAS[formato];
  const linhas = lista.map((p) => linha(p).join(";"));
  const csv = "\uFEFF" + `${cabecalho.join(";")}\n${linhas.join("\n")}`;

  const hoje = new Date().toISOString().slice(0, 10);
  const apelido = formato === "zap" ? "whatsapp" : formato === "contatos" ? "contatos" : "completa";
  const nome = `prospeccao-${apelido}${soZap && formato !== "zap" ? "-com-whatsapp" : ""}-${hoje}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
