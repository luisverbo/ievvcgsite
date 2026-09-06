import { notFound } from "next/navigation";
import Abas from "../Abas";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar, exigirProspeccao } from "@/lib/painel/permissoes";
import { funcaoLigada } from "@/lib/painel/flags";
import Painel from "./Painel";
import type { LinhaTela } from "./Linhas";
import type { JaAbordado } from "./JaAbordei";
import type { ResultadoTeste } from "./TesteEnvio";

// Agente vivo = deu sinal nos últimos 15 min (o mesmo critério da tela do agente).
function agenteVivo(ultimo: string | null | undefined): boolean {
  return !!ultimo && Date.now() - new Date(ultimo).getTime() < 15 * 60_000;
}

type JaAbordadoRow = {
  id: string;
  nome: string;
  telefone: string | null;
  status: JaAbordado["status"];
  nicho_busca: string | null;
  local_busca: string | null;
  nao_perturbar: boolean | null;
};
import { linhasDaOrg, MAX_LINHAS } from "@/lib/prospeccao/linhas";
import { inicioDoDiaBr } from "@/lib/prospeccao/dia";
import type { ConfigAbordagem, MensagemRow } from "./actions";
import { telefoneWhatsapp } from "@/lib/prospeccao/mensagem";
import type { ProspectoRow } from "@/lib/prospeccao/tipos";

export default async function AbordagemPage() {
  await exigirProspeccao();
  const org = await getMinhaOrg();
  if (!org) notFound();
  // Modo Prospector: os textos falam do produto DELE, nunca de site.
  const podeSites = await podeUsar("construtor");

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
    followup_ligado: false,
    followup_dias: 4,
    followup_msg_modelo: null,
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

  /*
   * As linhas de WhatsApp, com QR e o total enviado hoje por cada uma.
   * null = migração pendente: o Painel desenha a linha das colunas antigas.
   */
  const linhasRaw = await linhasDaOrg(org.id, true);
  const principalId = linhasRaw?.find((l) => l.principal)?.id ?? null;
  const enviadasPorLinha = new Map<string, number>();
  for (const m of mensagens) {
    if (m.status !== "enviada" || !m.enviada_em || m.enviada_em < inicioDoDiaBr()) continue;
    const chave = (m as { linha_id?: string | null }).linha_id ?? principalId;
    if (chave) enviadasPorLinha.set(chave, (enviadasPorLinha.get(chave) ?? 0) + 1);
  }
  /*
   * O último teste de envio e se existe agente vivo — o card de diagnóstico
   * precisa dos dois: um teste na fila sem agente no ar fica esperando para
   * sempre, e é melhor a tela dizer isso antes de a pessoa esperar.
   */
  const { data: testeRaw } = await supabase
    .from("prospeccao_mensagens")
    .select("telefone, status, erro, created_at, enviada_em")
    .eq("org_id", org.id)
    .eq("tipo", "teste")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const linhaTeste = testeRaw as {
    telefone: string;
    status: NonNullable<ResultadoTeste>["status"];
    erro: string | null;
    created_at: string;
    enviada_em: string | null;
  } | null;
  const ultimoTeste: ResultadoTeste = linhaTeste
    ? {
        telefone: linhaTeste.telefone,
        status: linhaTeste.status,
        erro: linhaTeste.erro,
        criadoEm: linhaTeste.created_at,
        enviadaEm: linhaTeste.enviada_em,
      }
    : null;

  const { data: agentesRaw } = await supabase
    .from("agentes")
    .select("ultimo_contato")
    .eq("org_id", org.id)
    .order("ultimo_contato", { ascending: false })
    .limit(1)
    .maybeSingle();
  const agenteOnline = agenteVivo((agentesRaw as { ultimo_contato: string | null } | null)?.ultimo_contato);

  const linhasTela: LinhaTela[] = (linhasRaw ?? []).map((l) => ({
    id: l.id,
    nome: l.nome,
    principal: l.principal,
    status: l.status,
    qr: l.qr,
    mensagem: l.mensagem,
    ativa: l.ativa,
    desconectar_pedido: l.desconectar_pedido,
    enviadasHoje: enviadasPorLinha.get(l.id) ?? 0,
  }));
  const prospectos = (prospRaw as ProspectoRow[] | null) ?? [];

  // Só vale abordar quem tem celular (WhatsApp em fixo é raro) e ainda não
  // entrou na fila.
  const candidatos = prospectos.filter(
    (p) => telefoneWhatsapp(p.telefone) && !jaNaFila.has(p.id),
  );

  /*
   * JÁ ABORDEI: quem recebeu mensagem, com a data do último envio.
   *
   * Antes esta gente simplesmente sumia da tela — abordado era abordado, e
   * não havia como falar de novo fora da cadência automática. Agora eles
   * ficam aqui, e daqui sai o reenvio (outro texto, outro número).
   *
   * A consulta é própria e não reaproveita `mensagens` (que traz só as 200
   * últimas de todos os tipos): quem abordou 500 empresas precisa ver as 500.
   */
  const { data: enviadasRaw } = await supabase
    .from("prospeccao_mensagens")
    .select("prospecto_id, enviada_em, tipo")
    .eq("org_id", org.id)
    .eq("status", "enviada")
    .in("tipo", ["abordagem", "gancho", "reenvio"])
    .order("enviada_em", { ascending: false })
    .limit(1000);
  const ultimoEnvio = new Map<string, { em: string | null; total: number }>();
  for (const m of (enviadasRaw as { prospecto_id: string; enviada_em: string | null }[] | null) ?? []) {
    const atual = ultimoEnvio.get(m.prospecto_id);
    if (atual) atual.total++;
    else ultimoEnvio.set(m.prospecto_id, { em: m.enviada_em, total: 1 });
  }

  let jaAbordados: JaAbordado[] = [];
  if (ultimoEnvio.size > 0) {
    const { data: abordadosRaw } = await supabase
      .from("prospeccao")
      .select("id, nome, telefone, status, nicho_busca, local_busca, nao_perturbar")
      .eq("org_id", org.id)
      .in("id", [...ultimoEnvio.keys()]);
    jaAbordados = ((abordadosRaw as JaAbordadoRow[] | null) ?? [])
      // Opt-out não entra nem na lista: quem pediu para parar, parou.
      .filter((p) => !p.nao_perturbar && telefoneWhatsapp(p.telefone))
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        telefone: p.telefone,
        status: p.status,
        nicho: p.nicho_busca,
        local: p.local_busca,
        enviadaEm: ultimoEnvio.get(p.id)?.em ?? null,
        toques: ultimoEnvio.get(p.id)?.total ?? 1,
        naFila: jaNaFila.has(p.id) && mensagens.some((m) => m.prospecto_id === p.id && m.status === "pendente"),
      }))
      .sort((a, b) => (b.enviadaEm ?? "").localeCompare(a.enviadaEm ?? ""));
  }

  /*
   * Nome de TODO mundo que aparece na tela — não só dos "novos".
   *
   * A lista de prospectos acima filtra status "novo" (é a de quem ainda dá
   * para abordar), mas o Histórico e as "Prontas para enviar" mostram gente
   * que já saiu desse status — e sem esta segunda busca eles apareciam como
   * número cru de telefone, que não diz nada a ninguém.
   */
  const nomePorProspecto: Record<string, string> = {};
  for (const p of prospectos) nomePorProspecto[p.id] = p.nome;
  const idsSemNome = [...new Set(mensagens.map((m) => m.prospecto_id))].filter(
    (id) => id && !nomePorProspecto[id],
  );
  if (idsSemNome.length > 0) {
    const { data: extras } = await supabase
      .from("prospeccao")
      .select("id, nome")
      .eq("org_id", org.id)
      .in("id", idsSemNome);
    for (const e of (extras as { id: string; nome: string }[] | null) ?? []) {
      nomePorProspecto[e.id] = e.nome;
    }
  }

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div className="anim-entrada flex flex-col gap-4">
        <div>
        <h1 className="font-display text-3xl font-extrabold">Abordagem 💬</h1>
        {podeSites ? (
          <p className="mt-1 max-w-3xl text-sm text-paper-dim">
            A primeira mensagem <b className="text-paper">não leva o link do site</b> — ela
            pergunta se pode mandar. Só quem responder vira site gerado, então você não gasta com
            quem nem respondeu.
          </p>
        ) : (
          <p className="mt-1 max-w-3xl text-sm text-paper-dim">
            A primeira mensagem <b className="text-paper">não leva link nem preço</b> — ela se
            apresenta, fala do que você vende e pede permissão. Quem responde aparece aqui e a
            conversa passa a ser sua.
          </p>
        )}
        </div>
        <Abas />
      </div>

      <div className="rounded-xl border border-brand-2/30 bg-brand/10 px-4 py-3 text-xs text-paper-dim">
        ⚠️ Disparo automático fere os termos do WhatsApp e{" "}
        <b className="text-paper">pode custar o número</b>. Use sempre um chip separado, comece
        devagar (15 a 20 por dia) e aumente só se não houver bloqueio. O modo manual não tem esse
        risco.
      </div>

      {/*
        O Fechador cria site: no plano só de prospecção o card nem aparece,
        senão o cliente configuraria algo que nunca vai disparar.
      */}
      <Painel
        config={config}
        candidatos={candidatos}
        mensagens={mensagens}
        nomePorProspecto={nomePorProspecto}
        linhas={linhasTela}
        maxLinhas={MAX_LINHAS}
        jaAbordados={jaAbordados}
        ultimoTeste={ultimoTeste}
        agenteOnline={agenteOnline}
        fechadorLigado={(await funcaoLigada("fechador")) && podeSites}
        resumoLigado={(await funcaoLigada("resumo_diario")) && (await podeUsar("prospeccao_resumo"))}
        cerebroLigado={(await funcaoLigada("mensagens_ia")) && (await podeUsar("prospeccao_ia"))}
        followupLigado={await funcaoLigada("followup")}
        placar={placar}
        somenteOfertaPropria={!podeSites}
      />
    </div>
  );
}
