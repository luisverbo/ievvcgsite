import "server-only";

/*
 * Envio de e-mail pelo Resend.
 *
 * Chamado direto por HTTP, sem SDK: é UM endpoint, e uma dependência a menos
 * é uma coisa a menos para quebrar num deploy.
 *
 * Não confundir com o SMTP do Resend configurado no Supabase: aquele manda os
 * e-mails de AUTENTICAÇÃO (recuperar senha, confirmar cadastro), com textos
 * que moram no painel do Supabase. Este aqui é para os NOSSOS e-mails — o de
 * boas-vindas depois da compra —, que o Supabase não tem como mandar porque
 * não sabe que eles existem.
 *
 * REGRA: nunca lança. Quem chama isto é o webhook da Stripe, e um e-mail que
 * não saiu não pode fazer o pagamento voltar como falha para a Stripe — ela
 * reenviaria o evento, e o cliente acabaria com o dobro de tudo.
 */

const API = "https://api.resend.com/emails";

export type Enviado = { ok: true; id?: string } | { ok: false; erro: string };

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_REMETENTE?.trim());
}

export async function enviarEmail(opcoes: {
  para: string;
  assunto: string;
  html: string;
  /* Versão em texto puro. Sem ela, filtro de spam desconfia mais. */
  texto: string;
  responderPara?: string;
}): Promise<Enviado> {
  const chave = process.env.RESEND_API_KEY?.trim();
  const de = process.env.EMAIL_REMETENTE?.trim();
  if (!chave || !de) {
    return { ok: false, erro: "Falta RESEND_API_KEY ou EMAIL_REMETENTE." };
  }

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: de,
        to: [opcoes.para],
        subject: opcoes.assunto,
        html: opcoes.html,
        text: opcoes.texto,
        ...(opcoes.responderPara ? { reply_to: opcoes.responderPara } : {}),
      }),
      // O webhook da Stripe tem tempo curto; e-mail travado não pode segurá-lo.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      return { ok: false, erro: `Resend respondeu ${res.status}: ${corpo.slice(0, 200)}` };
    }
    const dados = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: dados.id };
  } catch (e) {
    return { ok: false, erro: (e as Error).message.slice(0, 200) };
  }
}
