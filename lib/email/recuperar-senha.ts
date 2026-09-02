import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail, emailConfigurado } from "./enviar";
import { linkDeAcesso } from "@/lib/painel/acesso";

/*
 * O "esqueci minha senha", mandado por NÓS.
 *
 * Antes quem mandava era o Supabase, com o modelo de e-mail que mora no
 * painel dele. Funciona, mas o texto vive fora do projeto: sai em inglês por
 * padrão, muda por um formulário que ninguém revisa, e não acompanha o
 * produto quando a marca muda. Aqui o e-mail é código — em português, com a
 * cor do produto que a pessoa comprou, igual ao de boas-vindas.
 *
 * Sem Resend configurado, quem chama cai de volta no caminho do Supabase:
 * um e-mail em inglês é ruim, nenhum e-mail é pior.
 */

const COOLDOWN_S = 60;

/*
 * Trava de repetição, por e-mail.
 *
 * O caminho do Supabase tinha limite próprio; este não teria, e sem ele
 * qualquer um poderia encher a caixa de entrada de um cliente clicando no
 * botão. O e-mail é guardado como HASH: um cooldown não é motivo para deixar
 * uma lista de endereços de clientes em texto puro numa tabela de config.
 */
function chaveDoCooldown(email: string): string {
  return `rec_${createHash("sha256").update(email).digest("hex").slice(0, 40)}`;
}

async function esperandoCooldown(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const chave = chaveDoCooldown(email);
  const { data } = await admin
    .from("config_sistema")
    .select("valor")
    .eq("chave", chave)
    .maybeSingle();
  const antes = (data as { valor: string } | null)?.valor;
  if (antes) {
    const quando = Date.parse(antes);
    if (Number.isFinite(quando) && Date.now() - quando < COOLDOWN_S * 1000) return true;
  }
  await admin
    .from("config_sistema")
    .upsert({ chave, valor: new Date().toISOString(), updated_at: new Date().toISOString() });
  return false;
}

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function html(link: string, produto: string, cor: string): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px 12px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e6ea">
    <tr><td style="padding:32px 28px">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${cor}">
        ${esc(produto)}
      </p>
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#14161a">Redefinir sua senha</h1>
      <p style="margin:0 0 24px;color:#3c4149;font-size:15px;line-height:1.7">
        Recebemos um pedido para trocar a senha da sua conta. Clique no botão abaixo
        para criar uma nova — leva dez segundos.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
        <tr><td style="border-radius:999px;background:${cor}">
          <a href="${esc(link)}" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">
            Criar nova senha
          </a>
        </td></tr>
      </table>

      <p style="margin:0 0 6px;color:#6b7280;font-size:13px;line-height:1.6">
        O botão não funcionou? Copie e cole este endereço no navegador:
      </p>
      <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#8a919c">${esc(link)}</p>

      <p style="margin:0;padding-top:20px;border-top:1px solid #e9ebef;color:#8a919c;font-size:12px;line-height:1.6">
        O link vale por 1 hora e serve uma vez só.<br>
        Se não foi você quem pediu, pode ignorar este e-mail — sua senha continua a mesma.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

export type ResultadoRecuperacao = { enviado: boolean; motivo?: string };

/*
 * Devolve `enviado: false` também quando a conta não existe ou o cooldown
 * está valendo. Quem chama NÃO pode contar essa diferença ao visitante:
 * a tela responde a mesma coisa sempre, senão vira um jeito de descobrir
 * quem é cliente nosso testando endereços.
 */
export async function mandarRecuperacaoDeSenha(email: string): Promise<ResultadoRecuperacao> {
  if (!emailConfigurado()) return { enviado: false, motivo: "resend-nao-configurado" };

  if (await esperandoCooldown(email)) return { enviado: false, motivo: "cooldown" };

  const r = await linkDeAcesso(email);
  if ("erro" in r) return { enviado: false, motivo: r.erro };

  const produto = r.acesso.ehProspector ? "Prospector" : "PáginaPro";
  const cor = r.acesso.ehProspector ? "#4285F4" : "#6c5ce7";

  const env = await enviarEmail({
    para: email,
    assunto: "Redefinir sua senha",
    html: html(r.acesso.link, produto, cor),
    texto:
      `${produto} — redefinir sua senha\n\n` +
      `Recebemos um pedido para trocar a senha da sua conta. Use o link abaixo ` +
      `para criar uma nova:\n\n${r.acesso.link}\n\n` +
      `O link vale por 1 hora e serve uma vez só.\n` +
      `Se não foi você quem pediu, pode ignorar este e-mail.\n`,
  });

  return env.ok ? { enviado: true } : { enviado: false, motivo: env.erro };
}
