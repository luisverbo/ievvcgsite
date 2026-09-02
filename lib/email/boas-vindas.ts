import "server-only";

import { enviarEmail, emailConfigurado } from "./enviar";
import { linkDeAcesso, emailDoDono } from "@/lib/painel/acesso";

/*
 * O e-mail que sai quando o pagamento entra.
 *
 * Ele existe para resolver dois problemas de uma vez:
 *
 *   1. o cliente que fecha a aba depois de pagar não tem como voltar — o
 *      link de acesso vai dentro do e-mail, então a porta fica na mão dele;
 *   2. o Prospector só serve depois que o agente está instalado, e quem
 *      abandona a instalação some sem pedir reembolso e sem renovar. Este
 *      e-mail é o único lugar que traz essa pessoa de volta.
 *
 * Por isso o texto é curto e tem UM botão. Um e-mail de boas-vindas com seis
 * links é um e-mail que ninguém clica.
 */

/* Escapa o que vai para dentro do HTML — nome de plano hoje, o que vier amanhã. */
function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function corpoHtml(op: {
  produto: string;
  link: string;
  prospector: boolean;
  cor: string;
}): string {
  const passos = op.prospector
    ? `<ol style="margin:0 0 24px;padding-left:20px;color:#3c4149;font-size:15px;line-height:1.7">
         <li>Crie sua senha no botão acima</li>
         <li>Abra a aba <b>Tutorial</b> e baixe o agente</li>
         <li>Instale e <b>reinicie o computador</b> — é o passo que faz ele ligar sozinho</li>
         <li>Conecte seu WhatsApp lendo o QR, uma vez só</li>
       </ol>
       <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">
         São uns 10 minutos, uma vez só. Depois é ligar o computador e trabalhar.
       </p>`
    : `<p style="margin:0 0 24px;color:#3c4149;font-size:15px;line-height:1.7">
         Crie sua senha no botão acima e seu painel está liberado — é só começar
         a criar as páginas.
       </p>`;

  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px 12px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e6ea">
    <tr><td style="padding:32px 28px">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${op.cor}">
        ${esc(op.produto)}
      </p>
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#14161a">
        Sua assinatura está ativa 🎉
      </h1>
      <p style="margin:0 0 24px;color:#3c4149;font-size:15px;line-height:1.7">
        Obrigado por assinar! Falta só criar a sua senha de acesso — clique no botão
        abaixo e você já entra no painel.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
        <tr><td style="border-radius:999px;background:${op.cor}">
          <a href="${esc(op.link)}" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">
            Criar minha senha e entrar
          </a>
        </td></tr>
      </table>

      ${passos}

      <p style="margin:0 0 6px;color:#6b7280;font-size:13px;line-height:1.6">
        O botão não funcionou? Copie e cole este endereço no navegador:
      </p>
      <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#8a919c">
        ${esc(op.link)}
      </p>

      <p style="margin:0;padding-top:20px;border-top:1px solid #e9ebef;color:#8a919c;font-size:12px;line-height:1.6">
        Este link é só seu e vale por 1 hora. Se expirar, é só usar
        “Esqueci minha senha” na tela de login — ou responder este e-mail que a
        gente resolve.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function corpoTexto(op: { produto: string; link: string; prospector: boolean }): string {
  const passos = op.prospector
    ? `\nDepois de entrar:\n` +
      `1. Abra a aba Tutorial e baixe o agente\n` +
      `2. Instale e REINICIE o computador (é o que faz ele ligar sozinho)\n` +
      `3. Conecte seu WhatsApp lendo o QR, uma vez só\n\n` +
      `São uns 10 minutos, uma vez só.\n`
    : `\nCriada a senha, seu painel está liberado.\n`;

  return (
    `${op.produto} — sua assinatura está ativa!\n\n` +
    `Obrigado por assinar. Falta só criar a sua senha de acesso:\n\n` +
    `${op.link}\n` +
    passos +
    `\nO link é só seu e vale por 1 hora. Se expirar, use "Esqueci minha senha" ` +
    `na tela de login, ou responda este e-mail.\n`
  );
}

/*
 * Manda o e-mail de boas-vindas do pagamento que acabou de entrar.
 *
 * Devolve o motivo em vez de lançar: quem chama é o webhook da Stripe, e um
 * e-mail que não saiu não pode fazer o pagamento voltar como falha — a Stripe
 * reenviaria o evento e o cliente acabaria com tudo em dobro.
 */
export async function mandarBoasVindas(
  orgId: string,
  plano: string,
): Promise<{ ok: boolean; motivo?: string }> {
  if (!emailConfigurado()) return { ok: false, motivo: "sem RESEND_API_KEY/EMAIL_REMETENTE" };

  const email = await emailDoDono(orgId);
  if (!email) return { ok: false, motivo: "org sem dono com e-mail" };

  const r = await linkDeAcesso(email);
  if ("erro" in r) return { ok: false, motivo: r.erro };

  const prospector = plano === "prospector";
  const produto = prospector ? "Prospector" : "PáginaPro";
  // Azul do Google no Prospector; roxo da marca no resto — a mesma cor que a
  // pessoa acabou de ver na página onde pagou.
  const cor = prospector ? "#4285F4" : "#6c5ce7";

  const enviado = await enviarEmail({
    para: email,
    assunto: prospector
      ? "Seu Prospector está ativo — crie sua senha e comece"
      : "Sua assinatura do PáginaPro está ativa",
    html: corpoHtml({ produto, link: r.acesso.link, prospector, cor }),
    texto: corpoTexto({ produto, link: r.acesso.link, prospector }),
  });

  return enviado.ok ? { ok: true } : { ok: false, motivo: enviado.erro };
}
