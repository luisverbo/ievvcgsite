"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
import type { ProspectoRow } from "@/lib/prospeccao/tipos";

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
};

export type MensagemRow = {
  id: string;
  prospecto_id: string;
  telefone: string;
  texto: string;
  tipo?: "abordagem" | "fechamento" | "followup" | "gancho" | "apresentacao";
  modo: "semi" | "auto";
  status: "pendente" | "enviada" | "erro" | "cancelada" | "sem_whatsapp";
  erro: string | null;
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

  const limite = Math.min(200, Math.max(1, Number(formData.get("limite_diario")) || 20));
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
    ok: modoGancho
      ? "Salvo! As próximas abordagens saem em dois passos: gancho e, para quem responder, a apresentação."
      : "Configuração salva.",
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
  if (ids.length > 50) return { error: "Máximo de 50 empresas por vez." };

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
  const modoGancho = cfg?.abordagem_modo === "gancho";
  const modelo = modoGancho
    ? cfg?.gancho_msg_modelo?.trim() || MODELO_GANCHO
    : cfg?.modelo_mensagem || (oferta.tipo === "propria" ? MODELO_PADRAO_PROPRIA : MODELO_PADRAO);
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
  // Abordado é abordado, foi direto ou por gancho: ninguém recebe as duas.
  const { data: jaExistem } = await supabase
    .from("prospeccao_mensagens")
    .select("prospecto_id")
    .eq("org_id", org.id)
    .in("tipo", ["abordagem", "gancho"])
    .in("prospecto_id", linhas.map((l) => l.prospecto_id as string));
  const abordados = new Set(
    ((jaExistem as { prospecto_id: string }[] | null) ?? []).map((l) => l.prospecto_id),
  );
  const novas = linhas.filter((l) => !abordados.has(l.prospecto_id as string));
  if (novas.length === 0) {
    return { error: "Todas as escolhidas já estão na fila ou já foram abordadas." };
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
  const oQue = modoGancho ? "ganchos" : "mensagens";
  const complemento = modoGancho
    ? " Quem responder recebe a apresentação sozinho, minutos depois."
    : "";
  // Prometer "começa a enviar em instantes" com o envio pausado seria mentira
  // — e o cliente ficaria esperando um agente que está de freio puxado.
  const comeco = cfg?.envio_pausado
    ? " ⏸️ O envio está PAUSADO: elas ficam guardadas até você clicar em Retomar."
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

export async function limparEnviadas() {
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  await supabase
    .from("prospeccao_mensagens")
    .delete()
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

/*
 * Pede ao agente que abra o WhatsApp e mostre o QR.
 *
 * O status 'aguardando_qr' é o próprio recado: o agente vê isso na fila e
 * abre a sessão mesmo sem ter mensagem para enviar. Antes este botão só
 * limpava o estado e não acontecia nada — o agente nunca era acionado.
 */
export async function conectarWhatsapp() {
  if (!(await podeUsar("prospeccao"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const supabase = await createClient();
  await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      whatsapp_status: "aguardando_qr",
      whatsapp_qr: null,
      whatsapp_mensagem: "Pedido enviado ao agente. O QR aparece aqui em alguns segundos…",
      whatsapp_em: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  revalidatePath("/app/prospeccao/abordagem");
}

/*
 * Desconecta o WhatsApp para você entrar com outro número.
 *
 * Não basta mudar o status: o agente guarda a sessão num perfil de navegador,
 * e sem apagá-lo o WhatsApp entraria de novo com o mesmo número. Por isso a
 * bandeira — quem apaga o perfil é o agente.
 */
export async function desconectarWhatsapp() {
  if (!(await podeUsar("prospeccao"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const supabase = await createClient();
  await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      desconectar_pedido: true,
      whatsapp_status: "desconectado",
      whatsapp_qr: null,
      whatsapp_mensagem: "Desconectando… aguarde alguns segundos.",
      whatsapp_em: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  revalidatePath("/app/prospeccao/abordagem");
}
