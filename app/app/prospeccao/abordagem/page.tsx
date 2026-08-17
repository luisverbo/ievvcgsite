import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import { funcaoLigada } from "@/lib/painel/flags";
import Painel from "./Painel";
import type { ConfigAbordagem, MensagemRow } from "./actions";
import { telefoneWhatsapp } from "@/lib/prospeccao/mensagem";
import type { ProspectoRow } from "@/lib/prospeccao/tipos";

export default async function AbordagemPage() {
  if (!(await podeUsar("prospeccao"))) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();

  const supabase = await createClient();
  const [{ data: cfgRaw }, { data: msgsRaw }, { data: prospRaw }] = await Promise.all([
    supabase.from("prospeccao_config").select("*").eq("org_id", org.id).maybeSingle(),
    supabase
      .from("prospeccao_mensagens")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("prospeccao")
      .select("*")
      .eq("org_id", org.id)
      .eq("status", "novo")
      .order("pontuacao", { ascending: false })
      .limit(200),
  ]);

  const bruto = cfgRaw as (Partial<ConfigAbordagem> & { org_id: string }) | null;
  const config: ConfigAbordagem = {
    org_id: org.id,
    remetente_nome: null,
    modelo_mensagem: null,
    limite_diario: 20,
    intervalo_min_s: 45,
    intervalo_max_s: 150,
    whatsapp_status: "desconectado",
    whatsapp_qr: null,
    whatsapp_mensagem: null,
    whatsapp_em: null,
    // Padrões do Fechador valem também para quem ainda não rodou a migração —
    // a tela abre normal e só o salvar exige as colunas novas.
    fechador_nivel: "desligado",
    fechador_teto_micro: 5_000_000,
    fechador_gasto_micro: 0,
    fechador_msg_modelo: null,
    fechador_autorizado_em: null,
    resumo_zap: null,
    resumo_hora: 18,
    briefing_msg: null,
    ...(bruto ?? {}),
  };

  /*
   * O placar das mensagens: conversão (respostas / enviadas) por origem —
   * o modelo do cliente contra as escritas pela IA. Coluna `origem` é de
   * migração nova; erro aqui só significa SQL pendente, e o placar some.
   */
  let placar: { origem: string; enviadas: number; respostas: number }[] = [];
  const { data: placarRaw, error: placarErr } = await supabase
    .from("prospeccao_mensagens")
    .select("origem, resposta_em")
    .eq("org_id", org.id)
    .eq("status", "enviada")
    .eq("tipo", "abordagem");
  if (!placarErr && placarRaw) {
    const mapa = new Map<string, { enviadas: number; respostas: number }>();
    for (const m of placarRaw as { origem: string | null; resposta_em: string | null }[]) {
      const chave = m.origem === "ia" ? "ia" : "modelo";
      const atual = mapa.get(chave) ?? { enviadas: 0, respostas: 0 };
      atual.enviadas++;
      if (m.resposta_em) atual.respostas++;
      mapa.set(chave, atual);
    }
    placar = [...mapa.entries()].map(([origem, v]) => ({ origem, ...v }));
  }

  const mensagens = (msgsRaw as MensagemRow[] | null) ?? [];
  const jaNaFila = new Set(mensagens.map((m) => m.prospecto_id));
  const prospectos = (prospRaw as ProspectoRow[] | null) ?? [];

  // Só vale abordar quem tem celular (WhatsApp em fixo é raro) e ainda não
  // entrou na fila.
  const candidatos = prospectos.filter(
    (p) => telefoneWhatsapp(p.telefone) && !jaNaFila.has(p.id),
  );

  const nomePorProspecto: Record<string, string> = {};
  for (const p of prospectos) nomePorProspecto[p.id] = p.nome;

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div className="anim-entrada">
        <Link href="/app/prospeccao" className="text-sm text-paper-dim hover:text-paper">
          ← Prospecção
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Abordagem 💬</h1>
        <p className="mt-1 max-w-3xl text-sm text-paper-dim">
          A primeira mensagem <b className="text-paper">não leva o link do site</b> — ela pergunta
          se pode mandar. Só quem responder vira site gerado, então você não gasta com quem nem
          respondeu.
        </p>
      </div>

      <div className="rounded-xl border border-brand-2/30 bg-brand/10 px-4 py-3 text-xs text-paper-dim">
        ⚠️ Disparo automático fere os termos do WhatsApp e{" "}
        <b className="text-paper">pode custar o número</b>. Use sempre um chip separado, comece
        devagar (15 a 20 por dia) e aumente só se não houver bloqueio. O modo manual não tem esse
        risco.
      </div>

      <Painel
        config={config}
        candidatos={candidatos}
        mensagens={mensagens}
        nomePorProspecto={nomePorProspecto}
        fechadorLigado={await funcaoLigada("fechador")}
        resumoLigado={await funcaoLigada("resumo_diario")}
        cerebroLigado={await funcaoLigada("mensagens_ia")}
        placar={placar}
      />
    </div>
  );
}
