"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import {
  MODELO_PADRAO,
  montarMensagem,
  telefoneWhatsapp,
  type DadosEmpresa,
} from "@/lib/prospeccao/mensagem";
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
};

export type MensagemRow = {
  id: string;
  prospecto_id: string;
  telefone: string;
  texto: string;
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

  const modelo = String(formData.get("modelo_mensagem") ?? "").trim();
  if (modelo.length < 30) return { error: "A mensagem está curta demais." };
  if (!modelo.includes("{empresa}")) {
    return { error: "Use {empresa} na mensagem — sem o nome ela vira spam genérico." };
  }

  const limite = Math.min(200, Math.max(1, Number(formData.get("limite_diario")) || 20));
  const min = Math.max(20, Number(formData.get("intervalo_min_s")) || 45);
  const max = Math.max(min + 5, Number(formData.get("intervalo_max_s")) || 150);

  const supabase = await createClient();
  const { error } = await supabase.from("prospeccao_config").upsert(
    {
      org_id: org.id,
      remetente_nome: remetente,
      modelo_mensagem: modelo,
      limite_diario: limite,
      intervalo_min_s: min,
      intervalo_max_s: max,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao/abordagem");
  return { ok: "Configuração salva." };
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
 * Monta a mensagem de cada empresa escolhida e coloca na fila.
 *
 * modo 'auto' -> o agente envia sozinho, respeitando limite e intervalo
 * modo 'semi' -> fica esperando você abrir o WhatsApp e enviar na mão
 */
export async function prepararAbordagem(
  _prev: EstadoAbordagem,
  formData: FormData,
): Promise<EstadoAbordagem> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const modo = String(formData.get("modo")) === "semi" ? "semi" : "auto";
  const ids = formData.getAll("prospecto").map(String).filter(Boolean);
  if (ids.length === 0) return { error: "Selecione pelo menos uma empresa." };
  if (ids.length > 50) return { error: "Máximo de 50 empresas por vez." };

  const supabase = await createClient();
  const [{ data: cfgRaw }, { data: prospRaw }] = await Promise.all([
    supabase
      .from("prospeccao_config")
      .select("modelo_mensagem, remetente_nome")
      .eq("org_id", org.id)
      .maybeSingle(),
    supabase.from("prospeccao").select("*").eq("org_id", org.id).in("id", ids),
  ]);

  const cfg = cfgRaw as { modelo_mensagem: string | null; remetente_nome: string | null } | null;
  const modelo = cfg?.modelo_mensagem || MODELO_PADRAO;
  const remetente = (cfg?.remetente_nome ?? "").trim();

  // Sem o nome, a mensagem sairia com "Meu nome é." — melhor barrar aqui do
  // que mandar texto quebrado para o cliente.
  if (modelo.includes("{meunome}") && remetente.length < 2) {
    return {
      error: 'Preencha "Seu nome" aí em cima e salve — sem ele a mensagem sai com "Meu nome é." e nada mais.',
    };
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
      texto: montarMensagem(modelo, p as DadosEmpresa, p.id, remetente),
      modo,
      status: "pendente",
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
  const { data: jaExistem } = await supabase
    .from("prospeccao_mensagens")
    .select("prospecto_id")
    .eq("org_id", org.id)
    .eq("tipo", "abordagem")
    .in("prospecto_id", linhas.map((l) => l.prospecto_id as string));
  const abordados = new Set(
    ((jaExistem as { prospecto_id: string }[] | null) ?? []).map((l) => l.prospecto_id),
  );
  const novas = linhas.filter((l) => !abordados.has(l.prospecto_id as string));
  if (novas.length === 0) {
    return { error: "Todas as escolhidas já estão na fila ou já foram abordadas." };
  }

  const { error } = await supabase.from("prospeccao_mensagens").insert(novas);
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath("/app/prospeccao/abordagem");
  const pulos = [
    semZap > 0 ? `${semZap} sem celular` : "",
    optOut > 0 ? `${optOut} que pediram para não receber` : "",
  ].filter(Boolean);
  const aviso = pulos.length > 0 ? ` (puladas: ${pulos.join(" e ")})` : "";
  return {
    ok:
      modo === "auto"
        ? `${novas.length} mensagens na fila${aviso}. O agente começa a enviar em instantes.`
        : `${novas.length} mensagens prontas${aviso}. Abra uma a uma aqui embaixo.`,
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
