"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type RecuperarState = { ok?: string; error?: string } | undefined;

/*
 * O e-mail de "esqueci minha senha".
 *
 * Duas decisões que parecem detalhe e não são:
 *
 * 1. A RESPOSTA É SEMPRE A MESMA, exista ou não a conta. Se dissermos "esse
 *    e-mail não está cadastrado", qualquer um descobre quem é cliente nosso
 *    testando endereços — e isso é justamente o que um ataque faz antes de
 *    tentar senha.
 *
 * 2. O link volta para o MESMO domínio de onde a pessoa pediu. Quem entrou
 *    por prospector.luismarketing.com.br tem que voltar para lá; mandar para
 *    outro endereço, no meio de uma recuperação de senha, é exatamente o que
 *    um golpe pareceria.
 */
export async function pedirRecuperacao(
  _prev: RecuperarState,
  formData: FormData,
): Promise<RecuperarState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) return { error: "Informe um e-mail válido." };

  const resposta = {
    ok: `Se existir uma conta com ${email}, o link de recuperação está a caminho. Pode levar alguns minutos — e confira a caixa de spam.`,
  };

  /*
   * Caminho preferido: NÓS mandamos o e-mail, pelo Resend.
   *
   * O texto é código, em português, com a cor do produto que a pessoa
   * comprou — igual ao de boas-vindas. Antes quem mandava era o Supabase,
   * com o modelo que mora no painel dele: saía em inglês por padrão e vivia
   * fora do projeto, onde ninguém revisa.
   *
   * O resultado é ignorado de propósito. Conta inexistente, cooldown e
   * envio recusado devolvem a MESMA resposta — a diferença entre elas é
   * exatamente o que alguém usaria para descobrir quem é cliente nosso.
   */
  const { mandarRecuperacaoDeSenha } = await import("@/lib/email/recuperar-senha");
  const r = await mandarRecuperacaoDeSenha(email);
  if (r.enviado || r.motivo !== "resend-nao-configurado") return resposta;

  /*
   * Sem Resend configurado, cai no caminho do Supabase: um e-mail em inglês
   * é ruim, nenhum e-mail é pior.
   */
  const cab = await headers();
  const host = cab.get("host") ?? "";
  // x-forwarded-proto na Vercel; local cai em http.
  const protocolo = cab.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const destino = host
    ? `${protocolo}://${host}/auth/confirmar?proximo=nova-senha`
    : `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/auth/confirmar?proximo=nova-senha`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: destino });
  // Excesso de pedidos é o único erro que a pessoa PRECISA entender, para não
  // ficar clicando à toa. Qualquer outro vira a mesma mensagem neutra.
  if (error && /rate|too many|limit/i.test(error.message)) {
    return { error: "Muitos pedidos seguidos. Espere alguns minutos e tente de novo." };
  }

  return resposta;
}
