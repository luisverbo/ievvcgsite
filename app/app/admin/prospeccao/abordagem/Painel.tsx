"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelarMensagem,
  limparEnviadas,
  marcarEnviada,
  prepararAbordagem,
  conectarWhatsapp,
  desconectarWhatsapp,
  salvarConfig,
  type ConfigAbordagem,
  type EstadoAbordagem,
  type MensagemRow,
} from "./actions";
import { MODELO_PADRAO } from "@/lib/prospeccao/mensagem";
import { faixa, type ProspectoRow } from "@/lib/prospeccao/tipos";
import { inputClass, labelClass, cardClass } from "@/components/painel/ui";

const ROTULO_MSG: Record<string, string> = {
  pendente: "Aguardando",
  enviada: "Enviada ✓",
  erro: "Falhou",
  cancelada: "Cancelada",
  sem_whatsapp: "Sem WhatsApp",
};

export default function Painel({
  config,
  candidatos,
  mensagens,
  nomePorProspecto,
}: {
  config: ConfigAbordagem;
  candidatos: ProspectoRow[];
  mensagens: MensagemRow[];
  nomePorProspecto: Record<string, string>;
}) {
  const router = useRouter();
  const [cfgEstado, salvarCfg, salvandoCfg] = useActionState<EstadoAbordagem, FormData>(
    salvarConfig,
    undefined,
  );
  const [filaEstado, prepararFila, preparando] = useActionState<EstadoAbordagem, FormData>(
    prepararAbordagem,
    undefined,
  );
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  // Controlados para a tela mostrar, ao vivo, quanto tempo o envio vai levar —
  // é o que traduz "45 a 150 segundos" em algo que dá para decidir.
  const [limite, setLimite] = useState(config.limite_diario);
  const [minS, setMinS] = useState(config.intervalo_min_s);
  const [maxS, setMaxS] = useState(config.intervalo_max_s);
  const duracaoTotal = duracao(limite * ((minS + maxS) / 2));

  const pendentes = mensagens.filter((m) => m.status === "pendente");
  const semi = pendentes.filter((m) => m.modo === "semi");
  const enviadasHoje = mensagens.filter(
    (m) => m.status === "enviada" && m.enviada_em && m.enviada_em > hojeInicio(),
  ).length;

  // Enquanto houver fila automática, acompanha o envio sem precisar recarregar.
  const temFilaAuto = pendentes.some((m) => m.modo === "auto");
  // Também durante a conexão: o QR chega do agente e só aparece se a página
  // recarregar sozinha (e ele muda a cada ~20s).
  const conectando = config.whatsapp_status === "aguardando_qr";
  useEffect(() => {
    if (!temFilaAuto && !conectando) return;
    const id = window.setInterval(() => router.refresh(), conectando ? 4000 : 10_000);
    return () => window.clearInterval(id);
  }, [temFilaAuto, conectando, router]);

  function alternar(id: string) {
    setMarcados((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const corStatus =
    config.whatsapp_status === "conectado"
      ? "text-ok"
      : config.whatsapp_status === "erro"
        ? "text-danger"
        : "text-paper-dim";

  return (
    <div className="flex flex-col gap-6">
      {/* --------------------------- WhatsApp --------------------------- */}
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              WhatsApp do agente ·{" "}
              <span className={corStatus}>
                {config.whatsapp_status === "conectado"
                  ? "conectado"
                  : config.whatsapp_status === "aguardando_qr"
                    ? "aguardando leitura do QR"
                    : config.whatsapp_status === "erro"
                      ? "com problema"
                      : "desconectado"}
              </span>
            </h2>
            {config.whatsapp_mensagem && (
              <p className="mt-0.5 text-sm text-paper-dim">{config.whatsapp_mensagem}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={conectarWhatsapp}>
              <button
                type="submit"
                className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                  config.whatsapp_status === "conectado"
                    ? "border border-white/15 text-paper-dim hover:border-white/40 hover:text-paper"
                    : "bg-brand text-white hover:bg-brand-2"
                }`}
              >
                {config.whatsapp_status === "conectado" ? "Reconectar" : "Conectar WhatsApp"}
              </button>
            </form>
            <form action={desconectarWhatsapp}>
              <button
                type="submit"
                title="Apaga a sessão para você entrar com outro número"
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-bold text-paper-dim transition hover:border-danger hover:text-danger"
              >
                Desconectar
              </button>
            </form>
          </div>
        </div>

        {conectando && !config.whatsapp_qr && (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-2">
            Aguardando o agente abrir o WhatsApp… o QR aparece aqui em alguns segundos. Se não
            aparecer em 1 minuto, confira se o serviço está no ar na VPS.
          </p>
        )}

        {config.whatsapp_qr && config.whatsapp_status !== "conectado" && (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.whatsapp_qr}
              alt="QR do WhatsApp"
              className="max-h-[420px] w-auto max-w-full rounded"
            />
            <p className="text-center text-xs text-black">
              WhatsApp no celular → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b>
            </p>
          </div>
        )}

        <p className="mt-3 text-xs text-paper-dim">
          Use um <b className="text-paper">chip separado</b>, nunca o número que seus clientes já
          têm. Enviadas hoje: <b className="text-paper">{enviadasHoje}</b> de {config.limite_diario}.
        </p>
      </div>

      {/* ------------------------- a mensagem --------------------------- */}
      <form action={salvarCfg} className={cardClass}>
        <h2 className="mb-1 text-lg font-bold">A mensagem</h2>
        <p className="mb-3 text-sm text-paper-dim">
          Use <code className="text-paper">{"{empresa}"}</code>,{" "}
          <code className="text-paper">{"{ramo}"}</code>,{" "}
          <code className="text-paper">{"{bairro}"}</code>,{" "}
          <code className="text-paper">{"{prova}"}</code> (frase de avaliações, some sozinha se a
          empresa tiver poucas), <code className="text-paper">{"{regiao}"}</code>,{" "}
          <code className="text-paper">{"{meunome}"}</code> e{" "}
          <code className="text-paper">{"{contato}"}</code> (vira “, Dra. Juliana” quando o nome da
          pessoa está na placa; fica vazio quando não dá para saber, em vez de inventar). Para
          variar o texto,{" "}
          <code className="text-paper">[Oi|Olá|Opa]</code> sorteia uma opção a cada envio — é o que
          evita a mensagem parecer disparo.
        </p>
        <div className="mb-3">
          <label className={labelClass} htmlFor="remetente_nome">
            Seu nome (assina a mensagem)
          </label>
          <input
            id="remetente_nome"
            name="remetente_nome"
            defaultValue={config.remetente_nome ?? ""}
            placeholder="Luis"
            className={`${inputClass} w-full sm:w-64`}
          />
        </div>

        <textarea
          name="modelo_mensagem"
          defaultValue={config.modelo_mensagem || MODELO_PADRAO}
          rows={10}
          className={`${inputClass} w-full resize-y font-mono text-xs`}
        />

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="font-bold">Ritmo do envio automático</h3>
          <p className="mt-1 text-xs text-paper-dim">
            Estes números só valem no modo automático. São eles que fazem o agente parecer uma
            pessoa mandando mensagem, e não um robô disparando.
          </p>

          <div className="mt-4">
            <label className={labelClass} htmlFor="limite_diario">
              Quantas mensagens por dia, no máximo
            </label>
            <input
              id="limite_diario"
              name="limite_diario"
              type="number"
              min={1}
              max={200}
              value={limite}
              onChange={(e) => setLimite(Number(e.target.value))}
              className={`${inputClass} mt-1 w-28`}
            />
            <p className="mt-1 text-xs text-paper-dim">
              Ao chegar nesse número o agente para sozinho e só volta no dia seguinte. Comece
              baixo: 15 a 20 nos primeiros dias.
            </p>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Espera entre uma mensagem e a próxima</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-paper-dim">de</span>
              <input
                name="intervalo_min_s"
                type="number"
                min={20}
                value={minS}
                onChange={(e) => setMinS(Number(e.target.value))}
                className={`${inputClass} w-24`}
              />
              <span className="text-sm text-paper-dim">até</span>
              <input
                name="intervalo_max_s"
                type="number"
                min={30}
                value={maxS}
                onChange={(e) => setMaxS(Number(e.target.value))}
                className={`${inputClass} w-24`}
              />
              <span className="text-sm text-paper-dim">
                <b className="text-paper">segundos</b> ({emMinutos(minS)} a {emMinutos(maxS)})
              </span>
            </div>
            <p className="mt-1 text-xs text-paper-dim">
              A cada envio o agente sorteia um tempo diferente entre esses dois. Intervalo fixo
              (sempre 60s, por exemplo) é assinatura de robô — ninguém manda mensagem em tempo
              cravado.
            </p>
          </div>

          <p className="mt-4 rounded-lg border border-brand-2/30 bg-brand/10 px-3 py-2.5 text-sm">
            📊 Do jeito que está: <b className="text-paper">{limite} mensagens</b> por dia, uma a
            cada <b className="text-paper">{emMinutos(Math.round((minS + maxS) / 2))}</b> em média.
            Vão levar cerca de <b className="text-paper">{duracaoTotal}</b> para todas saírem.
            {minS < 30 && (
              <span className="mt-1 block text-danger">
                ⚠️ Menos de 30 segundos é arriscado — é aí que o WhatsApp costuma bloquear.
              </span>
            )}
          </p>
        </div>

        <button
          type="submit"
          disabled={salvandoCfg}
          className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {salvandoCfg ? "Salvando…" : "Salvar mensagem e limites"}
        </button>
        {cfgEstado?.error && <p className="mt-2 text-sm text-danger">{cfgEstado.error}</p>}
        {cfgEstado?.ok && <p className="mt-2 text-sm text-ok">{cfgEstado.ok}</p>}
      </form>

      {/* ------------------------- escolher ----------------------------- */}
      <form action={prepararFila} className={cardClass}>
        <h2 className="mb-1 text-lg font-bold">Quem abordar ({candidatos.length} disponíveis)</h2>
        <p className="mb-3 text-sm text-paper-dim">
          Só aparecem empresas com celular e que ainda não foram abordadas, da maior nota para a
          menor.
        </p>

        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {candidatos.length === 0 && (
            <p className="text-sm text-paper-dim">
              Nenhuma empresa disponível. Faça uma busca na aba Prospecção primeiro.
            </p>
          )}
          {candidatos.map((p) => {
            const fx = faixa(p.pontuacao);
            return (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-3 py-2 transition hover:border-white/25"
              >
                <input
                  type="checkbox"
                  name="prospecto"
                  value={p.id}
                  checked={marcados.has(p.id)}
                  onChange={() => alternar(p.id)}
                  className="h-4 w-4 flex-none accent-[var(--color-brand)]"
                />
                <span className={`w-8 flex-none text-sm font-extrabold text-${fx.cor}`}>
                  {p.pontuacao}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{p.nome}</span>
                <span className="flex-none text-xs text-paper-dim">{p.telefone}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-paper-dim">{marcados.size} selecionadas</span>
          <button
            type="submit"
            name="modo"
            value="semi"
            disabled={preparando || marcados.size === 0}
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-bold text-paper transition hover:border-white/40 disabled:opacity-50"
          >
            Preparar para eu enviar
          </button>
          <button
            type="submit"
            name="modo"
            value="auto"
            disabled={preparando || marcados.size === 0}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-50"
          >
            {preparando ? "Enfileirando…" : "Enviar automático"}
          </button>
        </div>
        {filaEstado?.error && <p className="mt-2 text-sm text-danger">{filaEstado.error}</p>}
        {filaEstado?.ok && <p className="mt-2 text-sm text-ok">✅ {filaEstado.ok}</p>}
      </form>

      {/* ------------------------- semi: enviar ------------------------- */}
      {semi.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-3 text-lg font-bold">Prontas para você enviar ({semi.length})</h2>
          <div className="flex flex-col gap-2">
            {semi.map((m) => (
              <div key={m.id} className="rounded-lg border border-white/10 p-3">
                <p className="mb-1 text-sm font-bold">
                  {nomePorProspecto[m.prospecto_id] ?? "Empresa"}{" "}
                  <span className="font-normal text-paper-dim">· {m.telefone}</span>
                </p>
                <p className="whitespace-pre-line rounded-md bg-black/30 p-2.5 text-xs text-paper-dim">
                  {m.texto}
                </p>
                <div className="mt-2 flex gap-2">
                  <a
                    href={`https://wa.me/${m.telefone}?text=${encodeURIComponent(m.texto)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-ok/20 px-4 py-2 text-xs font-bold text-ok transition hover:bg-ok/30"
                  >
                    Abrir no WhatsApp →
                  </a>
                  <form action={marcarEnviada.bind(null, m.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-paper-dim transition hover:border-white/40 hover:text-paper"
                    >
                      Já enviei
                    </button>
                  </form>
                  <form action={cancelarMensagem.bind(null, m.id)}>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-2 text-xs text-paper-dim transition hover:text-danger"
                    >
                      descartar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------- histórico -------------------------- */}
      {mensagens.length > 0 && (
        <div className={cardClass}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Histórico</h2>
            <form action={limparEnviadas}>
              <button
                type="submit"
                className="text-xs text-paper-dim underline transition hover:text-paper"
              >
                limpar finalizadas
              </button>
            </form>
          </div>
          <div className="flex flex-col gap-1.5">
            {mensagens.slice(0, 40).map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 px-3 py-2 text-xs"
              >
                <span className="font-bold text-paper">
                  {nomePorProspecto[m.prospecto_id] ?? m.telefone}
                </span>
                <span
                  className={
                    m.status === "enviada"
                      ? "text-ok"
                      : m.status === "erro" || m.status === "sem_whatsapp"
                        ? "text-danger"
                        : "text-paper-dim"
                  }
                >
                  {ROTULO_MSG[m.status]}
                </span>
                <span className="text-paper-dim">{m.modo === "auto" ? "automático" : "manual"}</span>
                {m.erro && <span className="text-danger">{m.erro}</span>}
                <span className="ml-auto text-paper-dim">
                  {new Date(m.enviada_em ?? m.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function hojeInicio() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// "45" -> "45 segundos"; "150" -> "2min30"
function emMinutos(segundos: number) {
  if (!Number.isFinite(segundos) || segundos <= 0) return "—";
  if (segundos < 60) return `${segundos} segundos`;
  const min = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return resto === 0 ? `${min}min` : `${min}min${String(resto).padStart(2, "0")}`;
}

// Tempo total do lote, em linguagem de gente.
function duracao(segundos: number) {
  if (!Number.isFinite(segundos) || segundos <= 0) return "—";
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} minutos`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hora${h > 1 ? "s" : ""}` : `${h}h${String(m).padStart(2, "0")}`;
}
