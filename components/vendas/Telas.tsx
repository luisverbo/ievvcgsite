/*
 * As telas do produto, desenhadas em CSS.
 *
 * Por que desenhadas e não capturadas: print de tela vira imagem pesada, fica
 * ilegível no celular (onde metade das visitas acontece) e envelhece a cada
 * ajuste de layout do painel. Estas reproduzem as telas reais com os mesmos
 * tokens de cor do sistema, pesam alguns KB e continuam nítidas em qualquer
 * tamanho.
 *
 * Regra ao mexer aqui: só mostrar o que o produto REALMENTE faz. Uma tela
 * inventada é a promessa que o cliente vai cobrar na primeira hora de uso.
 */

/* Moldura de navegador — dá o contexto de "isto é um sistema, não um slide". */
function Moldura({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-2 shadow-[0_30px_80px_-40px_rgba(108,92,231,0.7)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-danger/60" />
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-warn/60" />
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-ok/60" />
        <span className="ml-2 truncate text-[11px] text-paper-dim">{titulo}</span>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

/* 1 — O construtor: a conversa de um lado, a página nascendo do outro. */
export function TelaCriador() {
  return (
    <Moldura titulo="paginapro.com.br/app/ia — construtor">
      <div className="grid gap-3 sm:grid-cols-[1.05fr_1fr]">
        {/* chat */}
        <div className="flex flex-col gap-2">
          <div className="ml-4 rounded-xl bg-brand/25 px-3 py-2 text-[11px] leading-relaxed text-paper">
            Quero uma página para uma clínica de estética na Tijuca, com agendamento pelo WhatsApp
          </div>
          <div className="mr-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-paper-dim">
            Pronto! Fiz a página com seção de tratamentos, antes e depois, depoimentos e botão de
            WhatsApp fixo. ✨
          </div>
          <div className="ml-4 rounded-xl bg-brand/25 px-3 py-2 text-[11px] leading-relaxed text-paper">
            Deixa o botão maior e troca a foto do topo
          </div>
          <div className="mr-4 flex items-center gap-2 rounded-xl border border-brand-2/40 bg-brand/10 px-3 py-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-2" />
            <span className="text-[11px] font-semibold text-brand-2">escrevendo a página…</span>
          </div>
        </div>

        {/* prévia */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-ink">
          <div className="h-16 bg-gradient-to-br from-brand to-pink p-2.5">
            <div className="h-1.5 w-16 rounded-full bg-white/70" />
            <div className="mt-1.5 h-1 w-24 rounded-full bg-white/40" />
            <div className="mt-2 h-3 w-14 rounded-full bg-white/90" />
          </div>
          <div className="space-y-1.5 p-2.5">
            <div className="h-1 w-3/4 rounded-full bg-white/20" />
            <div className="h-1 w-full rounded-full bg-white/10" />
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {["bg-brand/30", "bg-ok/25", "bg-warn/25"].map((c, i) => (
                <div key={i} className={`h-7 rounded ${c}`} />
              ))}
            </div>
            <div className="h-1 w-2/3 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-paper-dim">
        Você fala em português. A IA devolve a página inteira — e cada pedido vira uma nova versão.
      </p>
    </Moldura>
  );
}

/* 2 — O buscador: a lista de empresas com nota, e o clique que vira site. */
export function TelaBuscador() {
  const empresas = [
    { nome: "Odonto Sorriso", local: "Barra da Tijuca", nota: 94, sit: "só Instagram", cor: "text-ok" },
    { nome: "Adv. Menezes", local: "Recreio", nota: 81, sit: "sem site", cor: "text-ok" },
    { nome: "Pizzaria Bella", local: "Jacarepaguá", nota: 67, sit: "site antigo", cor: "text-warn" },
  ];
  return (
    <Moldura titulo="paginapro.com.br/app/prospeccao — clientes">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-white/15 bg-ink px-2.5 py-1.5 text-[11px] text-paper">
          dentista
        </span>
        <span className="rounded-lg border border-white/15 bg-ink px-2.5 py-1.5 text-[11px] text-paper">
          Barra da Tijuca, RJ
        </span>
        <span className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white">
          Buscar
        </span>
        <span className="ml-auto rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-bold text-ok">
          ● agente ligado
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {empresas.map((e) => (
          <div
            key={e.nome}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-ink px-3 py-2.5"
          >
            <span className={`font-display text-lg font-extrabold tabular-nums ${e.cor}`}>
              {e.nota}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-bold text-paper">{e.nome}</span>
              <span className="block truncate text-[10px] text-paper-dim">
                {e.local} · {e.sit}
              </span>
            </span>
            <span className="flex-none rounded-md bg-brand/20 px-2 py-1 text-[10px] font-bold text-brand-2">
              Gerar site
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-paper-dim">
        Nota alta = quem ainda não tem site. O botão <b className="text-paper">Gerar site</b> cria a
        página daquela empresa em um clique.
      </p>
    </Moldura>
  );
}

/* 3 — O agente: a fila de WhatsApp andando sozinha. */
export function TelaWhatsapp() {
  return (
    <Moldura titulo="paginapro.com.br/app/prospeccao/abordagem — WhatsApp">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-ok/30 bg-ok/5 px-3 py-2">
        <span className="text-[11px] font-bold text-ok">● WhatsApp conectado</span>
        <span className="text-[10px] text-paper-dim">agente rodando no seu computador</span>
        <span className="ml-auto text-[10px] text-paper-dim">18 / 30 enviadas hoje</span>
      </div>

      <div className="rounded-lg border border-white/10 bg-ink p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-paper-dim">
          Próxima da fila
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-paper">
          Olá, <b className="text-brand-2">Odonto Sorriso</b>! Tudo bem? Vi que vocês atendem na{" "}
          <b className="text-brand-2">Barra da Tijuca</b> e ainda não têm site. Montei uma página
          pra vocês, posso te mandar o link?
        </p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-md bg-ok px-3 py-1.5 text-[10px] font-bold text-white">
            Aprovar e enviar
          </span>
          <span className="rounded-md border border-white/15 px-3 py-1.5 text-[10px] font-bold text-paper-dim">
            Pular
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {[
          { n: "Adv. Menezes", s: "respondeu 🎉", c: "bg-ok/15 text-ok" },
          { n: "Pizzaria Bella", s: "enviada", c: "bg-white/10 text-paper-dim" },
          { n: "Studio Lima", s: "na fila", c: "bg-white/10 text-paper-dim" },
        ].map((m) => (
          <div
            key={m.n}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5"
          >
            <span className="min-w-0 flex-1 truncate text-[11px] text-paper">{m.n}</span>
            <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${m.c}`}>
              {m.s}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-paper-dim">
        Intervalo aleatório entre envios e limite diário — para parecer o que é: uma pessoa
        oferecendo serviço.
      </p>
    </Moldura>
  );
}

/* 4 — A recorrência: o domínio do cliente no ar, com métricas. */
export function TelaDominio() {
  return (
    <Moldura titulo="paginapro.com.br/app/ia/…/dominio — hospedagem">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] font-bold text-paper">clinicasorriso.com.br</span>
        <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-bold text-ok">
          ✓ no ar
        </span>
        <span className="ml-auto text-[10px] text-paper-dim">https automático</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg bg-ink">
        <table className="w-full text-left font-mono text-[10px]">
          <thead>
            <tr className="text-paper-dim">
              <th className="px-3 pt-2 font-normal">Tipo</th>
              <th className="px-3 pt-2 font-normal">Nome</th>
              <th className="px-3 pt-2 font-normal">Valor</th>
            </tr>
          </thead>
          <tbody className="text-paper">
            <tr>
              <td className="px-3 pb-2 pt-1 font-bold">A</td>
              <td className="px-3 pb-2 pt-1 text-paper-dim">(em branco)</td>
              <td className="px-3 pb-2 pt-1 font-bold">76.76.21.21</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { v: "1.284", r: "visitas", c: "text-paper" },
          { v: "213", r: "cliques", c: "text-brand-2" },
          { v: "16%", r: "conversão", c: "text-ok" },
        ].map((m) => (
          <div key={m.r} className="rounded-lg border border-white/10 bg-ink p-2.5 text-center">
            <div className={`font-display text-lg font-extrabold tabular-nums ${m.c}`}>{m.v}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-paper-dim">
              {m.r}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-paper-dim">
        O relatório que justifica a sua mensalidade — e segura o cliente todo mês.
      </p>
    </Moldura>
  );
}

export const TELAS: Record<string, () => React.ReactElement> = {
  criador: TelaCriador,
  buscador: TelaBuscador,
  whatsapp: TelaWhatsapp,
  dominio: TelaDominio,
};
