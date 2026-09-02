"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { semearBlocosComConfig } from "@/lib/painel/seed";
import { LANDING_PAGINAS, LANDING_TEMA } from "@/lib/templates/paginapro-landing";
import { salvarAnthropicKey } from "@/lib/ia/anthropic";
import { ehAdmin as checarAdmin } from "@/lib/painel/admin";
import { cotaDoPlano, PLANOS } from "@/lib/painel/permissoes";

// Reexportado para as telas de admin que já importam daqui. A definição vive
// em lib/painel/admin.ts — veja lá o porquê.
export async function ehAdmin(): Promise<boolean> {
  return checarAdmin();
}

export async function alterarPlano(orgId: string, novoPlano: "free" | "pro" | "agencia" | "prospector") {
  if (!(await ehAdmin())) return;
  const admin = createAdminClient();

  const { data: antes } = await admin
    .from("organizacoes")
    .select("plano")
    .eq("id", orgId)
    .maybeSingle();
  const planoAntigo = (antes as { plano: string } | null)?.plano ?? "free";

  // A cota de IA acompanha o plano: trocar um sem o outro deixaria o cliente
  // pagando o plano cheio e recebendo o crédito do plano velho.
  const { error } = await admin
    .from("organizacoes")
    .update({ plano: novoPlano, cota_mensal: cotaDoPlano(novoPlano) })
    .eq("id", orgId);
  /*
   * Erro engolido aqui já custou uma tarde: o CHECK antigo da coluna não
   * conhecia 'prospector', o banco recusava e o botão parecia simplesmente
   * não funcionar. Falhou, PARA — seguir adiante creditaria a diferença de
   * cota de um plano que não foi aplicado.
   */
  if (error) {
    throw new Error(
      error.message.includes("plano_check")
        ? "O banco ainda não aceita este plano — rode a migração 2026-08-22_prospector_plano.sql no Supabase."
        : `Não deu para trocar o plano: ${error.message}`,
    );
  }

  /*
   * Subiu de plano no meio do mês: entrega a diferença de crédito agora.
   *
   * `cota_mensal` sozinho não muda saldo nenhum — renovar_cota credita uma vez
   * a cada 30 dias, e a cota deste mês já foi entregue pelo plano anterior.
   * Sem isto, promover alguém aqui não dá crédito nenhum até o mês virar.
   */
  const diferenca = cotaDoPlano(novoPlano) - cotaDoPlano(planoAntigo);
  if (diferenca > 0) {
    await admin.rpc("creditar", {
      p_org: orgId,
      p_valor: diferenca,
      p_tipo: "cota",
      p_descricao: `Crédito adicional pela mudança para o plano ${PLANOS[novoPlano]?.rotulo ?? novoPlano}`,
    });
  }

  revalidatePath("/app/admin");
  revalidatePath("/app");
}

/* --------------------------- ajuste de crédito ----------------------------- */

export type AjusteState = { ok?: string; error?: string } | undefined;

/*
 * Crédito na mão, para os casos que nenhuma regra cobre: cortesia, um erro
 * nosso, uma compensação, um teste. Aceita valor negativo para estornar.
 *
 * Passa pelo mesmo `creditar` das demais entradas, então o lançamento aparece
 * no extrato do cliente — ajuste invisível é o tipo de coisa que ninguém
 * consegue explicar três meses depois.
 */
export async function ajustarCredito(
  orgId: string,
  _prev: AjusteState,
  formData: FormData,
): Promise<AjusteState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };

  const dolares = Number(String(formData.get("dolares") ?? "").replace(",", "."));
  if (!Number.isFinite(dolares) || dolares === 0) {
    return { error: "Informe um valor em dólares (ex.: 10 ou -5)." };
  }
  if (Math.abs(dolares) > 500) return { error: "Valor alto demais para um ajuste manual." };

  const micro = Math.round(dolares * 1_000_000);
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 120);

  const admin = createAdminClient();
  const { error } = await admin.rpc("creditar", {
    p_org: orgId,
    p_valor: micro,
    p_tipo: "ajuste",
    p_descricao: motivo || "Ajuste manual do suporte",
  });
  if (error) return { error: error.message };

  revalidatePath("/app/admin");
  return { ok: `${dolares > 0 ? "Creditado" : "Debitado"} US$ ${Math.abs(dolares)}.` };
}

/* ------------------------------ plano grátis ------------------------------- */

/*
 * Liga/desliga o plano grátis (a degustação de 1 página).
 *
 * Vive em config_sistema para valer na hora, sem redeploy. Desligado, quem
 * está no free não usa o construtor — o painel abre e o caminho vira assinar.
 */
export async function alternarPlanoFree(ativo: boolean) {
  if (!(await ehAdmin())) return;
  const admin = createAdminClient();
  await admin.from("config_sistema").upsert({
    chave: "plano_free_ativo",
    valor: ativo ? "1" : "0",
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/app/admin");
  revalidatePath("/app");
}

/* --------------------------- funções novas --------------------------------- */

/*
 * Liga/desliga uma função nova para TODOS os clientes, na hora.
 * O freio de mão do dono — ver lib/painel/flags.ts.
 */
export async function alternarFuncao(nome: string, ligada: boolean) {
  if (!(await ehAdmin())) return;
  const admin = createAdminClient();
  await admin.from("config_sistema").upsert({
    chave: `funcao_${nome}`,
    valor: ligada ? "1" : "0",
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/app/admin");
}

/* --------------------------- vídeo da landing ------------------------------ */

export type VideoLandingState = { ok?: string; error?: string } | undefined;

/*
 * Cola o link do YouTube e o vídeo aparece no topo da página de vendas.
 * Campo vazio remove. A revalidação derruba o cache da landing na hora —
 * sem ela, a mudança só apareceria na próxima reconstrução da página.
 */
export async function salvarVideoLanding(
  _prev: VideoLandingState,
  formData: FormData,
): Promise<VideoLandingState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const { idDoYoutube, CHAVES_VIDEO } = await import("@/lib/landing");

  /*
   * Qual vídeo. O campo escondido do formulário diz — e a chave sai deste
   * catálogo, nunca do que veio do navegador, senão daria para escrever em
   * qualquer linha de config_sistema por aqui.
   */
  const CATALOGO = {
    principal: { chave: CHAVES_VIDEO.principal, caminho: "/", onde: "de vendas" },
    prospector: { chave: CHAVES_VIDEO.prospector, caminho: "/prospector", onde: "do Prospector" },
    tutorial: { chave: CHAVES_VIDEO.tutorial, caminho: "/app/comecar", onde: "do tutorial" },
  } as const;
  const pedido = String(formData.get("qual") ?? "principal");
  const alvo = CATALOGO[pedido as keyof typeof CATALOGO] ?? CATALOGO.principal;
  const { chave, caminho, onde } = alvo;

  const bruto = String(formData.get("video_url") ?? "").trim();
  const admin = createAdminClient();

  if (!bruto) {
    await admin.from("config_sistema").upsert({
      chave,
      valor: "",
      updated_at: new Date().toISOString(),
    });
    revalidatePath(caminho);
    revalidatePath("/app/admin");
    return { ok: `Vídeo removido. A página ${onde} volta a aparecer sem vídeo.` };
  }

  const id = idDoYoutube(bruto);
  if (!id) {
    return {
      error:
        "Não reconheci este link. Cole o endereço do vídeo no YouTube (youtube.com/watch?v=... ou youtu.be/...).",
    };
  }

  await admin.from("config_sistema").upsert({
    chave,
    valor: bruto,
    updated_at: new Date().toISOString(),
  });
  revalidatePath(caminho);
  revalidatePath("/app/admin");
  return { ok: `Vídeo no ar! Abra a página ${onde} para conferir.` };
}

/* ---------------------------- chave da Anthropic --------------------------- */
export type ChaveIAState = { ok?: boolean; error?: string } | undefined;

export async function salvarChaveAnthropic(
  _prev: ChaveIAState,
  formData: FormData,
): Promise<ChaveIAState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const valor = String(formData.get("anthropic_key") ?? "").trim();
  if (!valor.startsWith("sk-ant-")) return { error: "A chave da Anthropic começa com sk-ant-." };
  await salvarAnthropicKey(valor);
  revalidatePath("/app/admin");
  return { ok: true };
}

export type LandingState = { error?: string } | undefined;

// Cria o site de marketing do próprio PáginaPro na conta do dono, com as 3
// páginas prontas (principal, teste grátis e oferta do Básico) — tudo
// editável depois no editor visual, como qualquer site.
export async function criarLandingPaginaPro(): Promise<LandingState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const supabase = await createClient();
  const { data: novoSite, error } = await supabase
    .from("sites")
    .insert({
      org_id: org.id,
      nome: "PáginaPro",
      slug: "paginapro",
      tema: LANDING_TEMA,
      publicado: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um site com o endereço 'paginapro'. Exclua-o antes de recriar." };
    }
    return { error: error.message };
  }
  const siteId = (novoSite as { id: string }).id;

  for (const [i, pagina] of LANDING_PAGINAS.entries()) {
    const { data: nova } = await supabase
      .from("paginas")
      .insert({
        org_id: org.id,
        site_id: siteId,
        slug: pagina.slug,
        titulo: pagina.titulo,
        ordem: i + 1,
        publicado: true,
      })
      .select("id")
      .single();
    if (nova) {
      await semearBlocosComConfig((nova as { id: string }).id, org.id, pagina.blocos);
    }
  }

  revalidatePath("/app");
  redirect(`/app/sites/${siteId}`);
}

/* ------------------- pixel das páginas de venda ---------------------------- */

export type PixelVendasState = { ok?: string; error?: string } | undefined;

/*
 * Os pixels das SUAS landings (/ e /prospector) — não confundir com o pixel
 * que o cliente põe na página dele. Guardado em config_sistema para trocar
 * sem redeploy: campanha se ajusta no meio da tarde.
 */
export async function salvarPixelVendas(
  _prev: PixelVendasState,
  formData: FormData,
): Promise<PixelVendasState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const { CHAVES_PIXEL, metaValido, googleValido } = await import("@/lib/vendas-pixel");

  const meta = String(formData.get("pixel_meta") ?? "").trim();
  const google = String(formData.get("pixel_google") ?? "").trim();
  const extra = String(formData.get("pixel_extra") ?? "").trim().slice(0, 4000);

  if (meta && !metaValido(meta)) {
    return { error: "O ID do Meta é só números (ex.: 1234567890123). Cole apenas o ID, sem o código todo." };
  }
  if (google && !googleValido(google)) {
    return { error: "A tag do Google começa com G-, AW- ou GT- (ex.: G-ABC1234567)." };
  }

  const admin = createAdminClient();
  const agora = new Date().toISOString();
  const { error } = await admin.from("config_sistema").upsert(
    [
      { chave: CHAVES_PIXEL.meta, valor: meta, updated_at: agora },
      { chave: CHAVES_PIXEL.google, valor: google.toUpperCase(), updated_at: agora },
      { chave: CHAVES_PIXEL.extra, valor: extra, updated_at: agora },
    ],
    { onConflict: "chave" },
  );
  if (error) return { error: error.message };

  // As landings são pré-renderizadas: sem revalidar, o pixel novo só entraria
  // na próxima reconstrução — e a campanha começa hoje.
  revalidatePath("/");
  revalidatePath("/prospector");
  revalidatePath("/app/admin");
  return {
    ok:
      meta || google || extra
        ? "Pixel no ar nas duas páginas de venda. Confira no Gerenciador de Eventos (pode levar alguns minutos)."
        : "Pixels removidos das páginas de venda.",
  };
}

/* --------------------- link de acesso para o cliente ----------------------- */

export type LinkAcessoState =
  | { ok?: string; error?: string; link?: string; recado?: string; email?: string }
  | undefined;

/*
 * Gerar na mão o link de acesso de um cliente.
 *
 * Existe porque o caso real acontece: o cliente assina, fecha a aba e não
 * consegue mais entrar — esqueceu a senha, digitou o e-mail com um ponto a
 * mais, ou nem chegou a criar a conta porque pagou por outro caminho. Ele
 * está pagando; o acesso não pode depender de um e-mail que talvez tenha ido
 * para o spam.
 *
 * O ponto todo desta função é NÃO depender de e-mail: o Supabase gera o
 * token e nos devolve; nós montamos o endereço e você manda pelo WhatsApp,
 * que é onde o cliente responde. Funciona hoje, sem SMTP configurado.
 *
 * O link cai em /nova-senha: o cliente escolhe a senha dele e já entra. Um
 * link de "entrar direto" resolveria hoje e deixaria o problema para a
 * semana que vem, quando ele fosse entrar de novo e continuasse sem senha.
 */
export async function gerarLinkAcesso(
  _prev: LinkAcessoState,
  formData: FormData,
): Promise<LinkAcessoState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) return { error: "Informe o e-mail do cliente." };

  const admin = createAdminClient();

  /*
   * "recovery" para quem já tem conta; "invite" cria a conta na hora para
   * quem pagou sem nunca ter se cadastrado. A mensagem do Supabase para
   * usuário inexistente mudou de texto entre versões, então o segundo
   * caminho é tentado sempre que o primeiro falha — e é ele que dá a
   * mensagem final de erro, se também falhar.
   */
  let props: { hashed_token?: string; verification_type?: string } | null = null;
  let usuarioId: string | null = null;

  const tentativa = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (!tentativa.error && tentativa.data?.properties) {
    props = tentativa.data.properties;
    usuarioId = tentativa.data.user?.id ?? null;
  } else {
    const convite = await admin.auth.admin.generateLink({ type: "invite", email });
    if (convite.error || !convite.data?.properties) {
      return { error: convite.error?.message ?? "Não consegui gerar o link para esse e-mail." };
    }
    props = convite.data.properties;
    usuarioId = convite.data.user?.id ?? null;
  }

  const token = props?.hashed_token;
  if (!token) return { error: "O Supabase não devolveu o token do link." };
  const tipo = props?.verification_type === "invite" ? "invite" : "recovery";

  /*
   * Em qual endereço mandar o cliente.
   *
   * Cliente do Prospector tem que cair no domínio do Prospector: ele comprou
   * aquilo, e ver outra marca na tela de senha é exatamente o momento em que
   * a pessoa desconfia de golpe.
   */
  let base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  let ehProspector = false;
  if (usuarioId) {
    const { data: vinculo } = await admin
      .from("membros")
      .select("org_id")
      .eq("user_id", usuarioId)
      .limit(1)
      .maybeSingle();
    const orgId = (vinculo as { org_id: string } | null)?.org_id;
    if (orgId) {
      const { data: orgRow } = await admin
        .from("organizacoes")
        .select("plano")
        .eq("id", orgId)
        .maybeSingle();
      ehProspector = (orgRow as { plano: string } | null)?.plano === "prospector";
    }
  }
  const hostProspector = (process.env.NEXT_PUBLIC_HOST_PROSPECTOR ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0];
  if (ehProspector && hostProspector) base = `https://${hostProspector}`;
  if (!base) return { error: "Falta NEXT_PUBLIC_APP_URL na Vercel — sem ela não sei montar o link." };

  const link = `${base}/auth/confirmar?token_hash=${encodeURIComponent(
    token,
  )}&type=${tipo}&proximo=nova-senha`;

  const produto = ehProspector ? "Prospector" : "PáginaPro";
  const recado =
    `Oi! Aqui é do ${produto}. Sua assinatura já está ativa. ` +
    `Use este link para criar sua senha e entrar:\n\n${link}\n\n` +
    `O link é só seu e vale por 1 hora — se expirar, me chama que eu gero outro.`;

  return {
    ok: `Link pronto para ${email}. Ele cria a senha e já entra no painel.`,
    link,
    recado,
    email,
  };
}
