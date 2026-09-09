"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import {
  MODELO_PADRAO,
  MODELO_PADRAO_PROPRIA,
  MODELO_GANCHO,
  MODELO_APRESENTACAO,
  MODELO_APRESENTACAO_PROPRIA,
  montarMensagem,
  telefoneWhatsapp,
  type DadosEmpresa,
} from "@/lib/prospeccao/mensagem";
import { escreverMensagens } from "@/lib/prospeccao/escrever";
import { ofertaDaOrg } from "@/lib/prospeccao/oferta";
import { funcaoLigada } from "@/lib/painel/flags";
import { enfileirarApresentacao } from "@/lib/prospeccao/gancho";
import type { ProspectoRow } from "@/lib/prospeccao/tipos";
import { janelaDeConfig, janelaAberta, descreverJanela, quandoAbre } from "@/lib/prospeccao/janela";

export type ConfigAbordagem = {
  org_id: string;
  remetente_nome: string | null;
  modelo_mensagem: string | null;
  limite_diario: number;
  intervalo_min_s: number;
  intervalo_max_s: number;
  whatsapp_status: "desconectado" | "aguardando_qr" | "conectado" | "erro";
  whatsapp_qr: string | null;
  whatsapp_mensagem: string | null;
  whatsapp_em: string | null;
  fechador_nivel: "desligado" | "avisar" | "preparar" | "fechar";
  fechador_teto_micro: number;
  fechador_gasto_micro: number;
  fechador_msg_modelo: string | null;
  fechador_autorizado_em: string | null;
  resumo_zap: string | null;
  resumo_hora: number;
  briefing_msg: string | null;
  followup_ligado: boolean;
  followup_dias: number;
  followup_dias_2?: number | null;
  followup_dias_3?: number | null;
  followup_msg_modelo: string | null;
  // O que as mensagens vendem: 'site' (demonstração criada pela IA — o
  // padrão de sempre) ou 'propria' (modo Prospector: seguro, consórcio…).
  oferta_tipo?: "site" | "propria" | null;
  oferta_resumo?: string | null;
  // Textos prontos para colar quando o lead responde ({t: título, x: texto}).
  respostas_rapidas?: { t: string; x: string }[] | null;
  /*
   * Como a primeira mensagem sai: 'direta' (uma mensagem só, a de sempre) ou
   * 'gancho' (uma linha curta primeiro; a apresentação só para quem responde).
   */
  abordagem_modo?: "direta" | "gancho" | null;
  gancho_msg_modelo?: string | null;
  apresentacao_msg_modelo?: string | null;
  // O freio de mão: com isto ligado, nenhuma mensagem sai — a fila espera.
  envio_pausado?: boolean | null;
  envio_pausado_em?: string | null;
  // Quantas linhas de WhatsApp enviam ao mesmo tempo (1 = uma por vez, com
  // as outras de reserva; 2+ = revezando).
  linhas_simultaneas?: number | null;
  // A última resposta que o servidor deu ao agente sobre o envio — é o que a
  // tela mostra quando "está conectado e não sai nada".
  ultimo_motivo?: string | null;
  ultimo_motivo_em?: string | null;
  // Aquecimento: as linhas da conta conversam entre si até esta data,
  // N vezes por hora, e num grupo (pelo nome) se o dono criou um.
  aquecimento_ate?: string | null;
  aquecimento_por_hora?: number | null;
  aquecimento_grupo?: string | null;
  aquecimento_ultimo_em?: string | null;
  // Horário de envio (Brasília): hora de início, de fim e dias da semana
  // ("1,2,3,4,5" = seg a sex). Migração 2026-09-16.
  envio_hora_inicio?: number | null;
  envio_hora_fim?: number | null;
  envio_dias?: string | null;
};

export type MensagemRow = {
  id: string;
  prospecto_id: string;
  telefone: string;
  texto: string;
  tipo?: "abordagem" | "fechamento" | "followup" | "gancho" | "apresentacao" | "reenvio" | "teste" | "aquecimento";
  grupo?: string | null;
  linha_id?: string | null;
  modo: "semi" | "auto";
  status: "pendente" | "enviada" | "erro" | "cancelada" | "sem_whatsapp";
  erro: string | null;
  resposta_classe?: string | null;
  enviada_em: string | null;
  created_at: string;
};

export type EstadoAbordagem = { ok?: string; error?: string } | undefined;

export async function salvarConfig(
  _prev: EstadoAbordagem,
  formData: FormData,
): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const remetente = String(formData.get("remetente_nome") ?? "").trim().slice(0, 60);
  if (remetente.length < 2) return { error: "Escreva seu nome — é ele que assina a mensagem." };

  /*
   * Dois modos, e cada um valida o SEU texto. A tela só manda as caixas do
   * modo escolhido — o texto do outro modo fica guardado como estava, para
   * a pessoa poder ir e voltar sem perder o que escreveu.
   */
  const modoGancho = String(formData.get("abordagem_modo") ?? "direta") === "gancho";

  const modelo = String(formData.get("modelo_mensagem") ?? "").trim();
  if (!modoGancho) {
    if (modelo.length < 30) return { error: "A mensagem está curta demais." };
    if (!modelo.includes("{empresa}")) {
      return { error: "Use {empresa} na mensagem — sem o nome ela vira spam genérico." };
    }
  }

  const gancho = String(formData.get("gancho_msg_modelo") ?? "").trim().slice(0, 300);
  const apresentacao = String(formData.get("apresentacao_msg_modelo") ?? "").trim().slice(0, 1500);
  if (modoGancho) {
    if (gancho.length < 8) return { error: "O gancho está curto demais — uma linha com uma pergunta." };
    if (gancho.length > 160) {
      return { error: "O gancho passou de 160 caracteres. A graça dele é caber inteiro no preview da notificação." };
    }
    if (apresentacao.length < 30) return { error: "A apresentação está curta demais." };
    if (!apresentacao.includes("{empresa}")) {
      return { error: "Use {empresa} na apresentação — sem o nome ela vira spam genérico." };
    }
  }

  let limite = Math.min(200, Math.max(1, Number(formData.get("limite_diario")) || 20));
  // Teste grátis: o teto de envios por dia é do plano, não do cliente. O
  // servidor do agente também aplica — aqui é só para a tela não prometer.
  const { tetoEnviosDaOrg } = await import("@/lib/painel/teste");
  const tetoTeste = await tetoEnviosDaOrg(org.id);
  let avisoTeto = "";
  if (tetoTeste !== null && limite > tetoTeste) {
    limite = tetoTeste;
    avisoTeto = ` No teste grátis o máximo é ${tetoTeste} por dia — salvei ${tetoTeste}. Assinando, você escolhe até 200.`;
  }
  const min = Math.max(20, Number(formData.get("intervalo_min_s")) || 45);
  const max = Math.max(min + 5, Number(formData.get("intervalo_max_s")) || 150);

  const base = {
    org_id: org.id,
    remetente_nome: remetente,
    ...(modelo ? { modelo_mensagem: modelo } : {}),
    limite_diario: limite,
    intervalo_min_s: min,
    intervalo_max_s: max,
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  let { error } = await supabase.from("prospeccao_config").upsert(
    {
      ...base,
      abordagem_modo: modoGancho ? "gancho" : "direta",
      ...(gancho ? { gancho_msg_modelo: gancho } : {}),
      ...(apresentacao ? { apresentacao_msg_modelo: apresentacao } : {}),
    },
    { onConflict: "org_id" },
  );
  // Migração do gancho pendente: o modo direto salva como sempre; o gancho avisa.
  if (error && /abordagem_modo|gancho_msg_modelo|apresentacao_msg_modelo/.test(error.message)) {
    if (modoGancho) {
      return { error: "Rode a migração do gancho no Supabase (2026-09-04_gancho.sql) para ligar este modo." };
    }
    ({ error } = await supabase.from("prospeccao_config").upsert(base, { onConflict: "org_id" }));
  }
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao/abordagem");
  return {
    ok:
      (modoGancho
        ? "Salvo! As próximas abordagens saem em dois passos: gancho e, para quem responder, a apresentação."
        : "Configuração salva.") + avisoTeto,
  };
}

/*
 * Configuração do Fechador — o site automático na resposta.
 *
 * O nível 'fechar' (o agente envia sozinho) só liga com o "de acordo"
 * explícito, e a data desse sim fica guardada: mandar mensagem sozinho no
 * WhatsApp de alguém é decisão do dono do número, documentada.
 */
export async function salvarFechador(
  _prev: EstadoAbordagem,
  formData: FormData,
): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const nivel = String(formData.get("fechador_nivel") ?? "desligado");
  if (!["desligado", "avisar", "preparar", "fechar"].includes(nivel)) {
    return { error: "Nível inválido." };
  }

  // Teto em dólares na tela, microdólares no banco.
  const tetoDolar = Number(String(formData.get("fechador_teto") ?? "").replace(",", "."));
  if (!Number.isFinite(tetoDolar) || tetoDolar < 1 || tetoDolar > 200) {
    return { error: "O teto mensal precisa estar entre US$1 e US$200." };
  }

  const modelo = String(formData.get("fechador_msg") ?? "").trim().slice(0, 600);
  if (modelo && !modelo.includes("{link}")) {
    return { error: "A mensagem do site precisa conter {link} — sem ele o lead não recebe o endereço." };
  }

  const supabase = await createClient();
  const { data: atualRaw } = await supabase
    .from("prospeccao_config")
    .select("fechador_autorizado_em")
    .eq("org_id", org.id)
    .maybeSingle();
  const jaAutorizado = (atualRaw as { fechador_autorizado_em: string | null } | null)
    ?.fechador_autorizado_em;

  const autorizouAgora = String(formData.get("autorizo") ?? "") === "1";
  if (nivel === "fechar" && !jaAutorizado && !autorizouAgora) {
    return {
      error:
        "Para o agente enviar sozinho, marque o de acordo — é o seu número de WhatsApp em jogo.",
    };
  }

  const { error } = await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      fechador_nivel: nivel,
      fechador_teto_micro: Math.round(tetoDolar * 1_000_000),
      fechador_msg_modelo: modelo || null,
      ...(autorizouAgora && !jaAutorizado
        ? { fechador_autorizado_em: new Date().toISOString() }
        : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao/abordagem");
  return { ok: "Fechador configurado." };
}

/*
 * Resumo diário: para qual WhatsApp e a partir de que hora. Número vazio
 * desliga — sem destino não há resumo.
 */
export async function salvarResumo(
  _prev: EstadoAbordagem,
  formData: FormData,
): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const bruto = String(formData.get("resumo_zap") ?? "").trim();
  const telefone = bruto ? telefoneWhatsapp(bruto) : null;
  if (bruto && !telefone) {
    return { error: "Número inválido — use celular com DDD, ex.: (21) 99999-8888." };
  }

  const hora = Math.min(22, Math.max(6, Number(formData.get("resumo_hora")) || 18));

  const supabase = await createClient();
  const { error } = await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      resumo_zap: telefone,
      resumo_hora: hora,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao/abordagem");
  return {
    ok: telefone
      ? `Resumo diário ligado — chega a partir das ${hora}h no ${bruto}.`
      : "Resumo diário desligado.",
  };
}

/*
 * Follow-up automático: se liga, depois de quantos dias e com que texto.
 * A trava de "uma vez só" e o respeito ao opt-out moram no servidor
 * (lib/prospeccao/followup.ts) — aqui é só a preferência do cliente.
 */
export async function salvarFollowup(
  _prev: EstadoAbordagem,
  formData: FormData,
): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const ligado = String(formData.get("followup_ligado") ?? "") === "1";
  const dias = Math.min(30, Math.max(1, Number(formData.get("followup_dias")) || 4));
  // Etapas 2 e 3 da cadência: 0 = desligada. Contam a partir do toque anterior.
  const dias2 = Math.min(30, Math.max(0, Number(formData.get("followup_dias_2")) || 0));
  const dias3 = Math.min(30, Math.max(0, Number(formData.get("followup_dias_3")) || 0));
  const modelo = String(formData.get("followup_msg") ?? "").trim().slice(0, 900);

  if (ligado && modelo && !modelo.includes("{empresa}")) {
    return { error: "Use {empresa} no texto — sem o nome a segunda mensagem vira spam genérico." };
  }
  if (ligado && dias < 2) {
    return { error: "Espere pelo menos 2 dias — insistir no dia seguinte irrita e derruba número." };
  }
  if (ligado && ((dias2 > 0 && dias2 < 3) || (dias3 > 0 && dias3 < 3))) {
    return { error: "As insistências seguintes pedem pelo menos 3 dias de espaço entre uma e outra." };
  }
  if (ligado && dias3 > 0 && dias2 === 0) {
    return { error: "Ligue a 2ª mensagem antes da 3ª — não existe pular direto para a terceira insistência." };
  }

  const supabase = await createClient();
  let { error } = await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      followup_ligado: ligado,
      followup_dias: dias,
      followup_dias_2: dias2,
      followup_dias_3: dias3,
      followup_msg_modelo: modelo || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  // Migração da cadência pendente: salva o que já existia e avisa.
  if (error && /followup_dias_2|followup_dias_3/.test(error.message)) {
    if (dias2 > 0 || dias3 > 0) {
      return { error: "Rode a migração do CRM no Supabase (2026-08-23_crm.sql) para ligar a 2ª e a 3ª mensagens." };
    }
    ({ error } = await supabase.from("prospeccao_config").upsert(
      {
        org_id: org.id,
        followup_ligado: ligado,
        followup_dias: dias,
        followup_msg_modelo: modelo || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    ));
  }
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao/abordagem");
  return {
    ok: ligado
      ? `Follow-up ligado — quem não responder em ${dias} dias recebe uma segunda mensagem (uma só).`
      : "Follow-up desligado.",
  };
}

/*
 * O briefing das mensagens com cérebro: quem é o cliente, o que oferece, o
 * tom. É a matéria-prima da IA na hora de escrever uma mensagem por lead.
 */
export async function salvarBriefing(
  _prev: EstadoAbordagem,
  formData: FormData,
): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const briefing = String(formData.get("briefing_msg") ?? "").trim().slice(0, 1200);
  if (briefing && briefing.length < 40) {
    return {
      error:
        "Briefing curto demais — conte quem você é, o que oferece e o tom que quer (umas 3 linhas já bastam).",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("prospeccao_config").upsert(
    { org_id: org.id, briefing_msg: briefing || null, updated_at: new Date().toISOString() },
    { onConflict: "org_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao/abordagem");
  return { ok: briefing ? "Briefing salvo — a IA já pode escrever por você." : "Briefing removido." };
}

/*
 * O que você vende quando aborda: site (o padrão de sempre) ou o próprio
 * produto — o modo Prospector. Muda o modelo padrão, o prompt da IA, o
 * classificador de respostas e desliga o Fechador (que só sabe criar site).
 */
export async function salvarOferta(
  _prev: EstadoAbordagem,
  formData: FormData,
): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const tipo = String(formData.get("oferta_tipo")) === "propria" ? "propria" : "site";
  const resumo = String(formData.get("oferta_resumo") ?? "").trim().slice(0, 160);
  if (tipo === "propria" && resumo.length < 5) {
    return {
      error:
        'Diga em poucas palavras o que você vende — ex.: "consórcio de imóveis", "plano de saúde empresarial".',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      oferta_tipo: tipo,
      oferta_resumo: tipo === "propria" ? resumo : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) {
    return error.message.includes("oferta_tipo")
      ? { error: "Rode a migração do Prospector no Supabase primeiro (2026-08-22_prospector.sql)." }
      : { error: error.message };
  }

  revalidatePath("/app/prospeccao/abordagem");
  return {
    ok:
      tipo === "propria"
        ? `Salvo! As mensagens agora oferecem: ${resumo}.`
        : "Salvo! As mensagens voltam a oferecer o site de demonstração.",
  };
}

/*
 * Respostas rápidas: os textos que o vendedor cola quando o lead responde.
 *
 * "Quanto custa?" chega dez vezes por dia — a resposta boa já existe na
 * cabeça do vendedor; aqui ela vira botão de copiar do lado do lead. Até 4
 * pares título+texto, guardados na config da conta.
 */
export async function salvarRespostasRapidas(
  _prev: EstadoAbordagem,
  formData: FormData,
): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const respostas: { t: string; x: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const t = String(formData.get(`rr_titulo_${i}`) ?? "").trim().slice(0, 30);
    const x = String(formData.get(`rr_texto_${i}`) ?? "").trim().slice(0, 600);
    if (t && x) respostas.push({ t, x });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      respostas_rapidas: respostas.length > 0 ? respostas : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) {
    return /respostas_rapidas/.test(error.message)
      ? { error: "Rode a migração do CRM no Supabase (2026-08-23_crm.sql) primeiro." }
      : { error: error.message };
  }

  revalidatePath("/app/prospeccao/abordagem");
  revalidatePath("/app/prospeccao", "layout");
  return { ok: respostas.length > 0 ? "Respostas salvas — aparecem ao lado de quem respondeu." : "Respostas removidas." };
}

/*
 * Monta a mensagem de cada empresa escolhida e coloca na fila.
 *
 * modo 'auto' -> o agente envia sozinho, respeitando limite e intervalo
 * modo 'semi' -> fica esperando você abrir o WhatsApp e enviar na mão
 *
 * estrategia 'modelo' -> seu texto com variações [a|b]
 * estrategia 'ia'     -> a IA escreve uma mensagem diferente por lead, a
 *                        partir do briefing (Mensagens com cérebro 🧠)
 */
export async function prepararAbordagem(
  _prev: EstadoAbordagem,
  formData: FormData,
): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const modo = String(formData.get("modo")) === "semi" ? "semi" : "auto";
  /*
   * REENVIO: falar de novo com quem já foi abordado. O texto vem da tela
   * (o dono ajusta para este lote), e ele pode escolher por qual número sai.
   */
  const reenvio = String(formData.get("reenvio")) === "1";
  const textoReenvio = String(formData.get("texto_reenvio") ?? "").trim().slice(0, 1500);
  const linhaEscolhida = String(formData.get("linha") ?? "").trim();
  /*
   * A IA só entra se o interruptor do Admin permitir E o plano vender essa
   * camada. No Prospector ela não existe: a opção nem aparece na tela, e um
   * formulário reenviado com estrategia=ia cai no modelo em vez de gastar.
   */
  const estrategia =
    String(formData.get("estrategia")) === "ia" &&
    (await funcaoLigada("mensagens_ia")) &&
    (await podeUsar("prospeccao_ia"))
      ? "ia"
      : "modelo";
  const ids = formData.getAll("prospecto").map(String).filter(Boolean);
  if (ids.length === 0) return { error: "Selecione pelo menos uma empresa." };
  /*
   * Quantas cabem num lote.
   *
   * O teto era 50 para os dois caminhos, e ficou apertado depois que a busca
   * passou a trazer até 120: o dono marcava a lista inteira e levava um "não".
   * Preparar não é enviar — a fila espera o limite do dia e o intervalo — então
   * pelo modelo não há razão para segurar: 200 de uma vez.
   *
   * Com a IA continua 50: ali cada mensagem é uma chamada paga e demorada, e
   * um lote grande estouraria o tempo da ação antes de gravar qualquer coisa.
   */
  const teto = estrategia === "ia" ? 50 : 200;
  if (ids.length > teto) {
    return {
      error:
        estrategia === "ia"
          ? "Com a IA escrevendo, o máximo é 50 por vez (cada mensagem é uma chamada paga). Para lotes maiores, use o seu modelo de texto."
          : `Máximo de ${teto} empresas por vez. Prepare em lotes — a fila não some, e vai saindo no seu limite diário.`,
    };
  }

  const supabase = await createClient();
  // select * de propósito: as colunas do gancho são de migração nova, e
  // pedi-las pelo nome derrubaria a abordagem direta de quem não rodou o SQL.
  const [{ data: cfgRaw }, { data: prospRaw }] = await Promise.all([
    supabase.from("prospeccao_config").select("*").eq("org_id", org.id).maybeSingle(),
    supabase.from("prospeccao").select("*").eq("org_id", org.id).in("id", ids),
  ]);

  const cfg = cfgRaw as {
    modelo_mensagem: string | null;
    remetente_nome: string | null;
    abordagem_modo?: string | null;
    gancho_msg_modelo?: string | null;
    apresentacao_msg_modelo?: string | null;
    envio_pausado?: boolean | null;
  } | null;
  /*
   * Modo Prospector: o modelo padrão fala da oferta própria — o de site
   * ofereceria uma demonstração que não existe. Modelo escrito pelo dono
   * continua valendo nos dois modos.
   */
  const oferta = await ofertaDaOrg(org.id);
  /*
   * Modo GANCHO: o que entra na fila é a linha curta; a apresentação só
   * nasce quando o lead responde (lib/prospeccao/gancho.ts). A IA não entra
   * aqui — gancho é uma linha, não tem o que escrever.
   */
  const modoGancho = !reenvio && cfg?.abordagem_modo === "gancho";
  const modelo = reenvio
    ? textoReenvio
    : modoGancho
      ? cfg?.gancho_msg_modelo?.trim() || MODELO_GANCHO
      : cfg?.modelo_mensagem || (oferta.tipo === "propria" ? MODELO_PADRAO_PROPRIA : MODELO_PADRAO);
  if (reenvio && modelo.length < 20) {
    return { error: "Escreva a mensagem do reenvio — pelo menos umas duas linhas." };
  }
  const remetente = (cfg?.remetente_nome ?? "").trim();
  const extras = { oferta: oferta.resumo || "o meu trabalho" };
  const apresentacaoUsaOferta =
    modoGancho &&
    (cfg?.apresentacao_msg_modelo?.trim() || MODELO_APRESENTACAO_PROPRIA).includes("{oferta}");
  if (oferta.tipo === "propria" && !oferta.resumo && (modelo.includes("{oferta}") || apresentacaoUsaOferta)) {
    return {
      error:
        'Preencha "O que você vende" no card 🎯 O que você oferece — é isso que entra na mensagem.',
    };
  }

  // Sem o nome, a mensagem sairia com "Meu nome é." — melhor barrar aqui do
  // que mandar texto quebrado para o cliente. Na IA ele também é obrigatório:
  // é quem assina.
  const apresentacaoUsaNome =
    modoGancho && (cfg?.apresentacao_msg_modelo?.trim() || MODELO_APRESENTACAO).includes("{meunome}");
  if ((estrategia === "ia" || modelo.includes("{meunome}") || apresentacaoUsaNome) && remetente.length < 2) {
    return {
      error: 'Preencha "Seu nome" aí em cima e salve — sem ele a mensagem sai com "Meu nome é." e nada mais.',
    };
  }

  // O briefing mora em coluna própria (migração nova); buscar separado para
  // não derrubar o caminho tradicional em quem ainda não rodou o SQL.
  let briefing = "";
  if (estrategia === "ia") {
    const { data: bRaw, error: bErr } = await supabase
      .from("prospeccao_config")
      .select("briefing_msg")
      .eq("org_id", org.id)
      .maybeSingle();
    if (bErr) return { error: "Rode a migração das Mensagens com cérebro no Supabase primeiro." };
    briefing = ((bRaw as { briefing_msg: string | null } | null)?.briefing_msg ?? "").trim();
    if (briefing.length < 40) {
      return { error: "Preencha o briefing no card Mensagens com cérebro 🧠 antes de usar a IA." };
    }
  }
  const prospectos = (prospRaw as ProspectoRow[] | null) ?? [];

  const linhas: Record<string, unknown>[] = [];
  let semZap = 0;
  let optOut = 0;

  for (const p of prospectos) {
    /*
     * Opt-out é sagrado: quem pediu para não receber não entra em fila
     * NENHUMA, nem se for selecionado na tela. A trava mora aqui, no
     * servidor — a interface pode errar; esta linha não.
     */
    if (p.nao_perturbar) {
      optOut++;
      continue;
    }
    const telefone = telefoneWhatsapp(p.telefone);
    if (!telefone) {
      semZap++;
      continue;
    }
    linhas.push({
      org_id: org.id,
      prospecto_id: p.id,
      telefone,
      // A chave do sorteio é o id da empresa: a prévia do painel mostra
      // exatamente o texto que vai ser enviado.
      texto: montarMensagem(modelo, p as DadosEmpresa, p.id, remetente, extras),
      modo,
      status: "pendente",
      ...(modoGancho ? { tipo: "gancho" } : {}),
      ...(reenvio ? { tipo: "reenvio" } : {}),
      /*
       * Número escolhido para este lote: a mensagem fica reservada para
       * aquela linha, e o escalonador não deixa outra pegá-la. Sem escolha,
       * vale o revezamento normal.
       */
      ...(linhaEscolhida ? { linha_id: linhaEscolhida } : {}),
    });
  }

  if (linhas.length === 0) {
    return {
      error:
        optOut > 0
          ? "Todas as escolhidas ou não têm celular ou pediram para não receber mensagens."
          : "Nenhuma das empresas escolhidas tem celular com WhatsApp.",
    };
  }

  /*
   * Quem já tem abordagem não entra de novo. Antes isto era um upsert com
   * onConflict — mas a trava virou índice parcial (só tipo='abordagem', para
   * o fechamento poder ser a segunda mensagem), e ON CONFLICT não enxerga
   * índice parcial sem o predicado. Filtrar antes resolve, e o índice
   * continua lá como rede de segurança contra corrida.
   */
  /*
   * Quem não entra:
   *   abordagem  — quem JÁ foi abordado (direto ou por gancho): ninguém
   *                recebe as duas, e o índice único no banco é a rede;
   *   reenvio    — quem já tem mensagem ESPERANDO na fila. Já ter sido
   *                abordado é o pré-requisito aqui, não o impedimento; o que
   *                não pode é a mesma empresa entrar duas vezes no mesmo lote.
   */
  const consulta = supabase
    .from("prospeccao_mensagens")
    .select("prospecto_id")
    .eq("org_id", org.id)
    .in("prospecto_id", linhas.map((l) => l.prospecto_id as string));
  const { data: jaExistem } = await (reenvio
    ? consulta.eq("status", "pendente")
    : consulta.in("tipo", ["abordagem", "gancho"]));
  const bloqueados = new Set(
    ((jaExistem as { prospecto_id: string }[] | null) ?? []).map((l) => l.prospecto_id),
  );
  const novas = linhas.filter((l) => !bloqueados.has(l.prospecto_id as string));
  if (novas.length === 0) {
    return {
      error: reenvio
        ? "As escolhidas já têm mensagem esperando na fila."
        : "Todas as escolhidas já estão na fila ou já foram abordadas.",
    };
  }

  /*
   * Mensagens com cérebro: a IA escreve só para quem VAI receber (depois do
   * filtro), para não pagar por mensagem descartada. Lead que a IA não
   * conseguiu (lote falhou, resposta capenga) mantém o texto do modelo — a
   * mensagem sai do mesmo jeito, e a coluna `origem` registra qual foi qual
   * para o placar comparar com honestidade.
   */
  let escritas = 0;
  if (estrategia === "ia") {
    const porId = new Map(prospectos.map((p) => [p.id, p]));
    const alvo = novas
      .map((l) => porId.get(l.prospecto_id as string))
      .filter((p): p is ProspectoRow => !!p);
    let textos: Map<string, string>;
    try {
      textos = await escreverMensagens(org.id, briefing, remetente, alvo);
    } catch (e) {
      return { error: (e as Error).message };
    }
    for (const l of novas) {
      const texto = textos.get(l.prospecto_id as string);
      if (texto) {
        l.texto = texto;
        l.origem = "ia";
        escritas++;
      } else {
        l.origem = "modelo";
      }
    }
    if (escritas === 0) {
      return { error: "A IA não conseguiu escrever nenhuma mensagem agora — tente de novo em instantes ou use seu modelo." };
    }
  }

  const { error } = await supabase.from("prospeccao_mensagens").insert(novas);
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath("/app/prospeccao/abordagem");
  const pulos = [
    semZap > 0 ? `${semZap} sem celular` : "",
    optOut > 0 ? `${optOut} que pediram para não receber` : "",
  ].filter(Boolean);
  const aviso = pulos.length > 0 ? ` (puladas: ${pulos.join(" e ")})` : "";
  const assinatura =
    estrategia === "ia"
      ? escritas === novas.length
        ? " 🧠 Todas escritas pela IA, uma diferente para cada."
        : ` 🧠 ${escritas} escritas pela IA; ${novas.length - escritas} saíram do seu modelo.`
      : "";
  const oQue = modoGancho ? "ganchos" : reenvio ? "reenvios" : "mensagens";
  const complemento = modoGancho
    ? " Quem responder recebe a apresentação sozinho, minutos depois."
    : "";
  // Prometer "começa a enviar em instantes" com o envio pausado — ou fora do
  // horário — seria mentira, e o cliente ficaria esperando à toa.
  const janelaCfg = janelaDeConfig(cfg as Parameters<typeof janelaDeConfig>[0]);
  const comeco = cfg?.envio_pausado
    ? " ⏸️ O envio está PAUSADO: elas ficam guardadas até você clicar em Retomar."
    : janelaCfg && !janelaAberta(janelaCfg)
      ? ` 🕒 Fora do horário de envio (${descreverJanela(janelaCfg)}): o agente começa ${quandoAbre(janelaCfg)}.`
      : " O agente começa a enviar em instantes.";
  return {
    ok:
      modo === "auto"
        ? `${novas.length} ${oQue} na fila${aviso}.${assinatura}${comeco}${complemento}`
        : `${novas.length} ${oQue} prontos${aviso}.${assinatura} Abra um a um aqui embaixo.${complemento}`,
  };
}

// No modo semi você envia na mão; o painel só registra que foi enviada.
export async function marcarEnviada(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospeccao_mensagens")
    .update({ status: "enviada", enviada_em: new Date().toISOString(), agente: "manual" })
    .eq("id", id)
    .select("prospecto_id")
    .maybeSingle();

  const prospectoId = (data as { prospecto_id: string } | null)?.prospecto_id;
  if (prospectoId) {
    await supabase
      .from("prospeccao")
      .update({ status: "contactado", contactado_em: new Date().toISOString() })
      .eq("id", prospectoId);
  }
  revalidatePath("/app/prospeccao/abordagem");
}

export async function cancelarMensagem(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  await supabase
    .from("prospeccao_mensagens")
    .update({ status: "cancelada" })
    .eq("id", id)
    .eq("status", "pendente");
  revalidatePath("/app/prospeccao/abordagem");
}

/*
 * Teste de envio: um número, um texto, e o resultado de verdade.
 *
 * "O WhatsApp está conectado mas não manda" é a dúvida mais difícil de
 * responder olhando a tela — conectado é um status guardado no banco, não uma
 * prova. A mensagem de teste percorre o MESMO caminho de uma abordagem (fila
 * → agente → WhatsApp Web) e volta com o veredito da ponta: enviada, ou o
 * motivo exato da falha.
 *
 * Ela fura a fila e não conta no limite do dia — é diagnóstico, não venda.
 */
export async function enviarTesteZap(
  _prev: EstadoAbordagem,
  formData: FormData,
): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const bruto = String(formData.get("telefone") ?? "").trim();
  const telefone = telefoneWhatsapp(bruto);
  if (!telefone) {
    return { error: "Número inválido — use celular com DDD, ex.: (21) 99999-8888." };
  }
  const texto = String(formData.get("texto") ?? "").trim().slice(0, 600);
  if (texto.length < 2) return { error: "Escreva a mensagem do teste." };
  const linha = String(formData.get("linha") ?? "").trim();

  const supabase = await createClient();
  // Um teste por vez: o anterior que não saiu vira lixo na fila.
  await createAdminClient()
    .from("prospeccao_mensagens")
    .delete()
    .eq("org_id", org.id)
    .eq("tipo", "teste")
    .eq("status", "pendente");

  const { error } = await supabase.from("prospeccao_mensagens").insert({
    org_id: org.id,
    prospecto_id: null,
    telefone,
    texto,
    tipo: "teste",
    modo: "auto",
    status: "pendente",
    ...(linha ? { linha_id: linha } : {}),
  });
  if (error) {
    return /tipo|prospecto_id/.test(error.message)
      ? { error: "Rode a migração do teste de envio no Supabase (2026-09-11_teste_envio.sql) primeiro." }
      : { error: error.message };
  }

  revalidatePath("/app/prospeccao/abordagem");
  return {
    ok: `Teste na fila para ${bruto}. O agente manda em até 20 segundos — o resultado aparece aqui embaixo.`,
  };
}

/*
 * Cancela a fila inteira — as mensagens que ainda não saíram.
 *
 * APAGA em vez de marcar como cancelada, e é de propósito: a trava "nunca
 * abordar duas vezes" é um índice único por prospecto, e uma linha cancelada
 * continuaria ocupando o lugar. Apagando, as empresas voltam para "Quem
 * abordar" e o dono pode montar a lista de novo — que é o que ele quer
 * quando cancela.
 *
 * Só mexe no que está PENDENTE: o que já foi enviado é história e fica.
 */
export async function cancelarFila(): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  /*
   * Cliente de servidor (service_role) com o filtro de organização escrito à
   * mão. É o mesmo padrão de apagarAgente: apagar em lote pela sessão do
   * usuário depende de a política de RLS cobrir DELETE, e quando não cobre o
   * banco não apaga nada E NÃO RECLAMA — o botão parecia não funcionar. Aqui
   * o escopo é explícito e o resultado é o número de linhas que saíram.
   */
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("prospeccao_mensagens")
    .delete()
    .eq("org_id", org.id)
    .eq("status", "pendente")
    .neq("tipo", "teste")
    .select("id");
  if (error) return { error: error.message };

  const total = data?.length ?? 0;
  revalidatePath("/app/prospeccao/abordagem");
  revalidatePath("/app/prospeccao", "layout");
  return {
    ok:
      total === 0
        ? "A fila já estava vazia."
        : `${total} ${total === 1 ? "mensagem cancelada" : "mensagens canceladas"}. As empresas voltaram para “Quem abordar”.`,
  };
}

export async function limparEnviadas() {
  if (!(await podeUsar("prospeccao"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  // O filtro por organização é explícito de propósito: contar com a RLS para
  // limitar um DELETE em lote é apostar que a política cobre DELETE.
  const admin = createAdminClient();
  await admin
    .from("prospeccao_mensagens")
    .delete()
    .eq("org_id", org.id)
    .in("status", ["enviada", "cancelada", "erro", "sem_whatsapp"]);
  revalidatePath("/app/prospeccao/abordagem");
}

/*
 * O freio de mão do envio: para tudo, sem perder a fila.
 *
 * Não é o mesmo que desconectar (que apaga a sessão e obriga a ler o QR de
 * novo) nem que cancelar mensagem por mensagem. Pausado, o servidor
 * simplesmente não entrega mensagem nenhuma ao agente — e por morar aqui, e
 * não no agente, a pausa vale também para quem ainda não atualizou o programa
 * no computador. Retomar é um clique, e a fila continua de onde parou.
 */
export async function alternarPausaEnvio(pausar: boolean): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const supabase = await createClient();
  const { error } = await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      envio_pausado: pausar,
      envio_pausado_em: pausar ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) {
    return /envio_pausado/.test(error.message)
      ? { error: "Rode a migração da pausa no Supabase (2026-09-05_pausar_envio.sql) primeiro." }
      : { error: error.message };
  }

  revalidatePath("/app/prospeccao/abordagem");
  revalidatePath("/app/prospeccao", "layout");
  return {
    ok: pausar
      ? "Envio pausado. Nenhuma mensagem sai até você retomar — a fila fica guardada."
      : "Envio retomado. O agente volta a mandar em instantes, no ritmo de sempre.",
  };
}

/* ------------------------------ as linhas ------------------------------ */
/*
 * Cada número de WhatsApp é uma LINHA (lib/prospeccao/linhas.ts). Os botões
 * abaixo mexem numa linha; quem executa (abrir o navegador, mostrar o QR,
 * apagar o perfil) é o agente, na próxima volta. Sem a migração das linhas,
 * tudo cai na linha principal pelas colunas antigas — nada quebra.
 */

const MSG_PEDIDO = "Pedido enviado ao agente. O QR aparece aqui em alguns segundos…";
const MSG_DESCONECTANDO = "Desconectando… aguarde alguns segundos.";

// A linha que um pedido nomeia — só se for desta organização.
async function linhaDaOrg(orgId: string, linhaId: string) {
  const { linhasDaOrg } = await import("@/lib/prospeccao/linhas");
  return (await linhasDaOrg(orgId))?.find((l) => l.id === linhaId) ?? null;
}

/*
 * Pede ao agente que abra o WhatsApp de uma linha e mostre o QR.
 *
 * O status 'aguardando_qr' é o próprio recado: o agente vê isso na fila e
 * abre a sessão mesmo sem ter mensagem para enviar. Linha sem dono é
 * reivindicada pelo primeiro agente que passar — é assim que um número novo
 * vai parar numa máquina.
 */
export async function conectarLinha(linhaId: string) {
  if (!(await podeUsar("prospeccao"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const { atualizarLinha } = await import("@/lib/prospeccao/linhas");
  const linha = await linhaDaOrg(org.id, linhaId);
  if (!linha) return;
  await atualizarLinha(org.id, linha, { status: "aguardando_qr", qr: null, mensagem: MSG_PEDIDO });
  revalidatePath("/app/prospeccao/abordagem");
}

/*
 * Desconecta uma linha para entrar com outro número.
 *
 * Não basta mudar o status: o agente guarda a sessão num perfil de navegador,
 * e sem apagá-lo o WhatsApp entraria de novo com o mesmo número. Por isso a
 * bandeira — quem apaga o perfil é o agente.
 */
export async function desconectarLinha(linhaId: string) {
  if (!(await podeUsar("prospeccao"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const { atualizarLinha } = await import("@/lib/prospeccao/linhas");
  const linha = await linhaDaOrg(org.id, linhaId);
  if (!linha) return;
  await atualizarLinha(org.id, linha, {
    desconectar_pedido: true,
    status: "desconectado",
    qr: null,
    mensagem: MSG_DESCONECTANDO,
  });
  revalidatePath("/app/prospeccao/abordagem");
}

// Liga/desliga uma linha no envio, sem desconectar (fica de fora do revezamento).
export async function alternarLinha(linhaId: string, ativa: boolean) {
  if (!(await podeUsar("prospeccao"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const supabase = await createClient();
  await supabase.from("whatsapp_linhas").update({ ativa }).eq("id", linhaId).eq("org_id", org.id);
  revalidatePath("/app/prospeccao/abordagem");
}

export async function adicionarLinha(): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };
  const { linhasDaOrg, garantirPrincipal, MAX_LINHAS } = await import("@/lib/prospeccao/linhas");

  // A principal precisa existir antes da segunda: é ela que herda o perfil antigo.
  if (!(await garantirPrincipal(org.id))) {
    return { error: "Rode a migração das linhas no Supabase (2026-09-09_linhas_whatsapp.sql) primeiro." };
  }
  const linhas = (await linhasDaOrg(org.id)) ?? [];
  if (linhas.length >= MAX_LINHAS) {
    return { error: `Máximo de ${MAX_LINHAS} números por conta — cada um é um navegador aberto na sua máquina.` };
  }
  const ordem = Math.max(0, ...linhas.map((l) => l.ordem)) + 1;

  const supabase = await createClient();
  const { error } = await supabase.from("whatsapp_linhas").insert({
    org_id: org.id,
    nome: `Linha ${ordem}`,
    ordem,
    status: "desconectado",
    mensagem: "Clique em Conectar para ler o QR deste número.",
  });
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao/abordagem");
  return { ok: `Linha ${ordem} criada. Clique em Conectar nela e leia o QR com o novo chip.` };
}

/*
 * Remove uma linha. A principal não sai (é o perfil de sempre; para trocar
 * o número dela, Desconectar). O agente percebe a linha sumir e apaga o
 * perfil dela na próxima volta.
 */
export async function removerLinha(linhaId: string) {
  if (!(await podeUsar("prospeccao"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const supabase = await createClient();
  await supabase
    .from("whatsapp_linhas")
    .delete()
    .eq("id", linhaId)
    .eq("org_id", org.id)
    .eq("principal", false);
  revalidatePath("/app/prospeccao/abordagem");
}

/*
 * Quantas linhas enviam ao mesmo tempo. É a única regra do revezamento:
 *   1  = uma linha manda; as outras ficam de reserva e assumem quando ela cai;
 *   2+ = as N primeiras conectadas revezam, mensagem sim mensagem não.
 */
export async function salvarLinhasSimultaneas(n: number): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };
  const { MAX_LINHAS } = await import("@/lib/prospeccao/linhas");
  const valor = Math.max(1, Math.min(MAX_LINHAS, Math.round(Number(n) || 1)));

  const supabase = await createClient();
  const { error } = await supabase
    .from("prospeccao_config")
    .upsert({ org_id: org.id, linhas_simultaneas: valor, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
  if (error) {
    return /linhas_simultaneas/.test(error.message)
      ? { error: "Rode a migração das linhas no Supabase (2026-09-09_linhas_whatsapp.sql) primeiro." }
      : { error: error.message };
  }
  revalidatePath("/app/prospeccao/abordagem");
  return {
    ok:
      valor === 1
        ? "Salvo: uma linha envia por vez; as outras ficam de reserva e assumem se ela cair."
        : `Salvo: ${valor} linhas revezam o envio; caiu uma, a próxima conectada entra no lugar.`,
  };
}

/*
 * Os botões antigos (um WhatsApp só) continuam existindo: viram a linha
 * principal. Sem a migração, escrevem nas colunas velhas como sempre.
 */
export async function conectarWhatsapp() {
  if (!(await podeUsar("prospeccao"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const { garantirPrincipal, atualizarLinha } = await import("@/lib/prospeccao/linhas");
  const principal = await garantirPrincipal(org.id);
  if (principal) {
    await atualizarLinha(org.id, principal, { status: "aguardando_qr", qr: null, mensagem: MSG_PEDIDO });
  } else {
    const supabase = await createClient();
    await supabase.from("prospeccao_config").upsert(
      {
        org_id: org.id,
        whatsapp_status: "aguardando_qr",
        whatsapp_qr: null,
        whatsapp_mensagem: MSG_PEDIDO,
        whatsapp_em: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    );
  }
  revalidatePath("/app/prospeccao/abordagem");
}

export async function desconectarWhatsapp() {
  if (!(await podeUsar("prospeccao"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const { garantirPrincipal, atualizarLinha } = await import("@/lib/prospeccao/linhas");
  const principal = await garantirPrincipal(org.id);
  if (principal) {
    await atualizarLinha(org.id, principal, {
      desconectar_pedido: true,
      status: "desconectado",
      qr: null,
      mensagem: MSG_DESCONECTANDO,
    });
  } else {
    const supabase = await createClient();
    await supabase.from("prospeccao_config").upsert(
      {
        org_id: org.id,
        desconectar_pedido: true,
        whatsapp_status: "desconectado",
        whatsapp_qr: null,
        whatsapp_mensagem: MSG_DESCONECTANDO,
        whatsapp_em: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    );
  }
  revalidatePath("/app/prospeccao/abordagem");
}


/* ------------------------------ aquecimento ------------------------------- */

// O número de uma linha: é para ele que as outras mandam no aquecimento.
export async function salvarTelefoneLinha(linhaId: string, telefone: string): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };
  const digitos = telefone.replace(/\D/g, "");
  if (digitos && (digitos.length < 10 || digitos.length > 15)) {
    return { error: "Número incompleto. Use DDI + DDD + número, ex.: 5521999998888." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_linhas")
    .update({ telefone: digitos || null })
    .eq("id", linhaId)
    .eq("org_id", org.id);
  if (error) {
    return /telefone/.test(error.message)
      ? { error: "Rode a migração do aquecimento no Supabase (2026-09-15_aquecimento.sql) primeiro." }
      : { error: error.message };
  }
  revalidatePath("/app/prospeccao/abordagem");
  return { ok: "Número salvo." };
}

/*
 * Liga o aquecimento por N dias. O servidor cuida do resto: a cada checagem
 * do agente ele decide se é hora de mais uma troca entre as linhas.
 */
export async function configurarAquecimento(_: EstadoAbordagem, formData: FormData): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const dias = Math.min(14, Math.max(1, Number(formData.get("dias")) || 2));
  const porHora = Math.min(12, Math.max(1, Number(formData.get("por_hora")) || 4));
  const grupo = String(formData.get("grupo") ?? "").trim().slice(0, 80) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      aquecimento_ate: new Date(Date.now() + dias * 86_400_000).toISOString(),
      aquecimento_por_hora: porHora,
      aquecimento_grupo: grupo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) {
    return /aquecimento/.test(error.message)
      ? { error: "Rode a migração do aquecimento no Supabase (2026-09-15_aquecimento.sql) primeiro." }
      : { error: error.message };
  }
  revalidatePath("/app/prospeccao/abordagem");
  return { ok: `Aquecimento ligado por ${dias} dia${dias > 1 ? "s" : ""}, ${porHora} troca${porHora > 1 ? "s" : ""} por hora.` };
}

export async function pararAquecimento(): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospeccao_config")
    .update({ aquecimento_ate: null, updated_at: new Date().toISOString() })
    .eq("org_id", org.id);
  if (error) return { error: error.message };
  // O que ainda estava na fila de aquecimento não precisa sair.
  await supabase
    .from("prospeccao_mensagens")
    .update({ status: "cancelada" })
    .eq("org_id", org.id)
    .eq("tipo", "aquecimento")
    .eq("status", "pendente");
  revalidatePath("/app/prospeccao/abordagem");
  return { ok: "Aquecimento desligado." };
}


/* ----------------------------- horário de envio ---------------------------- */

export async function salvarHorarioEnvio(_: EstadoAbordagem, formData: FormData): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const inicio = Math.min(23, Math.max(0, Number(formData.get("inicio"))));
  const fim = Math.min(24, Math.max(1, Number(formData.get("fim"))));
  if (!Number.isInteger(inicio) || !Number.isInteger(fim)) return { error: "Horário inválido." };
  if (fim <= inicio) return { error: "A hora de parar precisa ser depois da de começar." };
  const dias = [...new Set(formData.getAll("dias").map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  if (dias.length === 0) return { error: "Escolha pelo menos um dia da semana." };

  const supabase = await createClient();
  const { error } = await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      envio_hora_inicio: inicio,
      envio_hora_fim: fim,
      envio_dias: dias.join(","),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) {
    return /envio_hora|envio_dias/.test(error.message)
      ? { error: "Rode a migração do horário no Supabase (2026-09-16_horario_envio.sql) primeiro." }
      : { error: error.message };
  }
  revalidatePath("/app/prospeccao/abordagem");
  revalidatePath("/app/prospeccao", "layout");
  return { ok: `Horário salvo: ${descreverJanela({ inicio, fim, dias })}.` };
}


/* --------------------- apresentação na mão (modo gancho) -------------------- */

/*
 * Mandar a apresentação para quem respondeu, sem esperar a escuta.
 *
 * A escuta do agente é ótima quando funciona, e quando não funciona o dono
 * fica olhando a resposta no celular dele sem nada acontecer. Este botão é a
 * saída: ele viu a resposta, ele manda. Enfileira a apresentação do mesmo
 * jeito que a escuta enfileiraria — mesma trava de uma por lead, mesma
 * prioridade, mesmo texto.
 *
 * Também marca o gancho como respondido, senão a escuta continuaria olhando
 * aquele número para sempre e o remarketing acabaria caindo em cima de quem
 * já está conversando.
 */
export async function mandarApresentacao(prospectoId: string): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const supabase = await createClient();
  const { data: gRaw } = await supabase
    .from("prospeccao_mensagens")
    .select("id, telefone, modo, resposta_em")
    .eq("org_id", org.id)
    .eq("prospecto_id", prospectoId)
    .eq("tipo", "gancho")
    .eq("status", "enviada")
    .order("enviada_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const gancho = gRaw as { id: string; telefone: string; modo: string; resposta_em: string | null } | null;
  if (!gancho) return { error: "Este lead não recebeu o gancho — não há apresentação para mandar." };

  const entrou = await enfileirarApresentacao(
    org.id,
    prospectoId,
    gancho.telefone,
    gancho.modo === "semi" ? "semi" : "auto",
  );
  if (!entrou) {
    return { error: "A apresentação já estava na fila (ou o lead pediu para não receber)." };
  }

  // O gancho passa a contar como respondido: encerra a escuta daquele número
  // e tira o lead da fila do remarketing.
  if (!gancho.resposta_em) {
    await supabase
      .from("prospeccao_mensagens")
      .update({
        resposta_em: new Date().toISOString(),
        resposta_classe: "outro",
        resposta_texto: "(respondeu — marcado por você no painel)",
      })
      .eq("id", gancho.id)
      .eq("org_id", org.id);
  }

  revalidatePath("/app/prospeccao/abordagem");
  revalidatePath("/app/prospeccao", "layout");
  return { ok: "Apresentação na fila — o agente manda em instantes (ela fura o limite do dia e o intervalo)." };
}
