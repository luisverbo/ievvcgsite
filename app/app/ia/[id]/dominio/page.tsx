import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { podeUsar, PLANOS } from "@/lib/painel/permissoes";
import { getMinhaOrg } from "@/lib/painel/queries";
import { ehAdmin } from "@/lib/painel/admin";
import { cotaDeHospedagem, precoExtraEmReais } from "@/lib/dominios/cota";
import { instrucaoDns, vercelConfigurada } from "@/lib/dominios/vercel";
import { verificarDominio, apagarDominio } from "./actions";
import FormDominio from "./FormDominio";
import { cardClass } from "@/components/painel/ui";
import { IconTrash } from "@/components/painel/icons";

export const dynamic = "force-dynamic";

type DominioRow = {
  id: string;
  dominio: string;
  status: "aguardando_dns" | "ativo" | "erro";
  detalhe: string | null;
  verificado_em: string | null;
};

export default async function DominioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: siteRow } = await supabase
    .from("sites_ia")
    .select("id, titulo, slug, publicado")
    .eq("id", id)
    .maybeSingle();
  const site = siteRow as { id: string; titulo: string; slug: string; publicado: boolean } | null;
  if (!site) notFound();

  const { data: domRaw } = await supabase
    .from("dominios")
    .select("id, dominio, status, detalhe, verificado_em")
    .eq("site_ia_id", id)
    .order("created_at", { ascending: true });
  const dominios = (domRaw as DominioRow[] | null) ?? [];

  /*
   * Perdeu a hospedagem (assinatura suspensa) MAS tem domínio conectado.
   *
   * Antes esta tela dava 404 nesse caso, e o cliente ficava com o site fora do
   * ar e sem nenhuma pista do motivo — a tela onde a explicação deveria estar
   * era justamente a que sumia. Agora ela abre e diz o que houve.
   */
  const liberado = await podeUsar("hospedagem");
  if (!liberado) {
    if (dominios.length === 0) notFound();
    return (
      <div className="painel-wrap flex max-w-3xl flex-col gap-6">
        <div>
          <Link href={`/app/ia/${id}`} className="text-sm text-paper-dim hover:text-paper">
            ← {site.titulo}
          </Link>
          <h1 className="mt-2 font-display text-3xl font-extrabold">Hospedagem pausada</h1>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-paper">
            {dominios.length === 1 ? "Este domínio está" : "Estes domínios estão"} fora do ar porque
            sua assinatura não está ativa:
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {dominios.map((d) => (
              <li key={d.id} className="font-mono text-sm font-bold text-paper-dim">
                {d.dominio}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-paper-dim">
            Nada foi apagado — a página, o conteúdo e o domínio continuam aqui. Assim que o
            pagamento entrar, {dominios.length === 1 ? "ele volta" : "eles voltam"} ao ar sozinho, em
            cerca de um minuto.
          </p>
          <Link
            href="/app/assinatura"
            className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
          >
            Regularizar assinatura
          </Link>
        </div>
      </div>
    );
  }

  // A cota é da ORGANIZAÇÃO, não desta página: ela conta os sites hospedados
  // em todas as páginas juntas. É por isso que a busca é por org e não por id.
  const org = await getMinhaOrg();
  const cota = org ? await cotaDeHospedagem(org.id) : null;
  const semLimite = await ehAdmin();

  return (
    <div className="painel-wrap flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={`/app/ia/${id}`} className="text-sm text-paper-dim hover:text-paper">
          ← {site.titulo}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Domínio próprio 🌐</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Esta página no endereço do seu cliente — com certificado de segurança automático. É o que
          transforma a página num site &quot;de verdade&quot; aos olhos dele.
        </p>
      </div>

      {!vercelConfigurada() && (
        <p className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          A hospedagem ainda não está configurada no servidor (TOKEN_VERCEL e PROJETO_VERCEL).
          Veja o diagnóstico no Admin.
        </p>
      )}

      {!site.publicado && (
        <p className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          Esta página ainda não está publicada. Publique primeiro — o domínio só funciona em página
          no ar.
        </p>
      )}

      {cota && !semLimite && (
        <div className={cardClass}>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-bold text-paper">
              {cota.usados} de {cota.limite} {cota.limite === 1 ? "site hospedado" : "sites hospedados"}
            </span>
            <span className="text-xs text-paper-dim">
              plano {PLANOS[cota.plano]?.rotulo ?? cota.plano} inclui {cota.incluidos}
              {cota.pagos > 0 && ` · ${cota.pagos} extra${cota.pagos > 1 ? "s" : ""} contratado${cota.pagos > 1 ? "s" : ""}`}
              {cota.cortesia > 0 && ` · ${cota.cortesia} de cortesia`}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
            role="presentation"
          >
            <div
              className={`h-full rounded-full ${cota.livre === 0 ? "bg-warn" : "bg-brand-2"}`}
              style={{
                width: `${cota.limite > 0 ? Math.min(100, (cota.usados / cota.limite) * 100) : 100}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-paper-dim">
            {cota.livre > 0
              ? `Você ainda pode conectar ${cota.livre} ${cota.livre === 1 ? "site" : "sites"} sem custo. Acima disso, cada site custa R$ ${precoExtraEmReais()} por mês.`
              : `Você usou tudo do plano. Cada site a mais custa R$ ${precoExtraEmReais()} por mês, cobrado na sua assinatura.`}{" "}
            O <b className="text-paper">www</b> de um domínio já conectado não conta como outro site.
          </p>
        </div>
      )}

      <FormDominio
        siteIaId={id}
        livre={semLimite ? null : (cota?.livre ?? 0)}
        precoExtra={precoExtraEmReais()}
      />

      {dominios.map((d) => {
        const dns = instrucaoDns(d.dominio);
        return (
          <div key={d.id} className={cardClass}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-bold text-paper">{d.dominio}</span>
              {d.status === "ativo" ? (
                <span className="rounded-full bg-ok/15 px-2.5 py-0.5 text-[11px] font-bold text-ok">
                  ✓ no ar
                </span>
              ) : (
                <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-[11px] font-bold text-warn">
                  aguardando DNS
                </span>
              )}
              <form action={apagarDominio.bind(null, id, d.id)} className="ml-auto">
                <button
                  type="submit"
                  title="Desconectar este domínio"
                  className="text-paper-dim transition hover:text-danger"
                >
                  <IconTrash />
                </button>
              </form>
            </div>

            {d.status === "ativo" ? (
              <p className="mt-2 text-sm text-paper-dim">
                Funcionando. Abra{" "}
                <a
                  href={`https://${d.dominio}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-2 underline underline-offset-4"
                >
                  https://{d.dominio}
                </a>{" "}
                para conferir.
              </p>
            ) : (
              <>
                <p className="mt-3 text-sm text-paper">
                  Falta um passo, no site onde o domínio foi comprado (Registro.br, GoDaddy,
                  Hostinger…). Crie este registro de DNS:
                </p>
                <div className="mt-2 overflow-x-auto rounded-lg bg-ink p-3">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="text-paper-dim">
                        <th className="pr-6 font-normal">Tipo</th>
                        <th className="pr-6 font-normal">Nome</th>
                        <th className="font-normal">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-paper">
                        <td className="pr-6 pt-1 font-bold">{dns.tipo}</td>
                        <td className="pr-6 pt-1 font-bold">
                          {dns.raiz ? (
                            <span className="font-sans font-normal text-paper-dim">
                              deixe em branco
                            </span>
                          ) : (
                            dns.nome
                          )}
                        </td>
                        <td className="pt-1 font-bold">{dns.valor}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {dns.raiz && (
                  <p className="mt-2 text-xs text-paper-dim">
                    O campo <b className="text-paper">Nome</b> fica <b className="text-paper">vazio</b>{" "}
                    mesmo — é assim que se diz &quot;o próprio domínio&quot;. No Registro.br, digitar{" "}
                    <code className="text-paper">@</code> dá o erro &quot;Nome do record inválido&quot;.
                    Só use <code className="text-paper">@</code> se o painel do seu registrador
                    exigir alguma coisa no campo (GoDaddy e Hostinger pedem).
                  </p>
                )}
                <p className="mt-2 text-xs text-paper-dim">
                  Depois de salvar lá, a propagação leva de minutos a algumas horas. O certificado
                  (https) é emitido sozinho quando o DNS chegar.
                </p>
                {dns.raiz && (
                  <p className="mt-2 text-xs text-paper-dim">
                    Dica: conecte também <b className="text-paper">www.{d.dominio}</b> aqui em cima —
                    muita gente digita o endereço com &quot;www&quot; na frente.
                  </p>
                )}
                {d.detalhe && <p className="mt-2 text-xs text-warn">{d.detalhe}</p>}
                <form action={verificarDominio.bind(null, id, d.id)} className="mt-3">
                  <button
                    type="submit"
                    className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper transition hover:border-brand-2"
                  >
                    Já configurei — verificar agora
                  </button>
                </form>
              </>
            )}
          </div>
        );
      })}

      {dominios.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-paper-dim">
          Nenhum domínio conectado a esta página ainda. Enquanto isso, ela responde no endereço
          interno /ia/{site.slug}.
        </p>
      )}
    </div>
  );
}
