import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/*
 * O link que coloca o cliente dentro do painel.
 *
 * Serve a dois donos: o botão do Admin ("dar acesso a um cliente") e o e-mail
 * de boas-vindas que sai sozinho quando o pagamento entra. Mora aqui para os
 * dois gerarem o MESMO link — se um dia o formato mudar, muda nos dois.
 *
 * O link cai em /nova-senha, e não numa entrada direta: entrar direto
 * resolveria hoje e devolveria o problema na semana seguinte, quando a
 * pessoa fosse entrar de novo e continuasse sem senha.
 */

export type Acesso = {
  link: string;
  /* Cliente do Prospector recebe link no domínio do Prospector. */
  ehProspector: boolean;
  base: string;
};

function hostProspector(): string {
  return (process.env.NEXT_PUBLIC_HOST_PROSPECTOR ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0];
}

export async function linkDeAcesso(
  email: string,
): Promise<{ acesso: Acesso } | { erro: string }> {
  const alvo = email.trim().toLowerCase();
  if (!alvo || !alvo.includes("@")) return { erro: "E-mail inválido." };

  const admin = createAdminClient();

  /*
   * "recovery" para quem já tem conta; "invite" cria a conta na hora para
   * quem pagou sem nunca ter se cadastrado. A mensagem do Supabase para
   * usuário inexistente mudou de texto entre versões, então o segundo caminho
   * é tentado sempre que o primeiro falha — e é ele que dá o erro final.
   */
  let props: { hashed_token?: string; verification_type?: string } | null = null;
  let usuarioId: string | null = null;

  const tentativa = await admin.auth.admin.generateLink({ type: "recovery", email: alvo });
  if (!tentativa.error && tentativa.data?.properties) {
    props = tentativa.data.properties;
    usuarioId = tentativa.data.user?.id ?? null;
  } else {
    const convite = await admin.auth.admin.generateLink({ type: "invite", email: alvo });
    if (convite.error || !convite.data?.properties) {
      return { erro: convite.error?.message ?? "Não consegui gerar o link para esse e-mail." };
    }
    props = convite.data.properties;
    usuarioId = convite.data.user?.id ?? null;
  }

  const token = props?.hashed_token;
  if (!token) return { erro: "O Supabase não devolveu o token do link." };
  const tipo = props?.verification_type === "invite" ? "invite" : "recovery";

  /*
   * Em qual endereço mandar a pessoa. Quem comprou o Prospector tem que cair
   * no domínio do Prospector: ver outra marca na tela de senha é exatamente o
   * momento em que se desconfia de golpe.
   */
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

  const host = hostProspector();
  const base =
    ehProspector && host
      ? `https://${host}`
      : (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!base) return { erro: "Falta NEXT_PUBLIC_APP_URL — sem ela não sei montar o link." };

  return {
    acesso: {
      link: `${base}/auth/confirmar?token_hash=${encodeURIComponent(token)}&type=${tipo}&proximo=nova-senha`,
      ehProspector,
      base,
    },
  };
}

/*
 * O e-mail de quem manda na organização.
 *
 * O webhook da Stripe conhece a ORG, não a pessoa — e é para a pessoa que o
 * e-mail de boas-vindas vai. Primeiro membro = quem criou a conta.
 */
export async function emailDoDono(orgId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("membros")
    .select("user_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const userId = (data as { user_id: string } | null)?.user_id;
  if (!userId) return null;
  const { data: u } = await admin.auth.admin.getUserById(userId);
  return u.user?.email ?? null;
}
