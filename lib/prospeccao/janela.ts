/*
 * A janela de envio: em que horas e em que dias da semana o agente manda
 * mensagem de prospecção. Tudo em Brasília (UTC-3 o ano inteiro).
 *
 * Puro de propósito — sem banco, sem "server-only" — para o painel usar as
 * mesmas contas ao vivo enquanto a pessoa mexe nos horários, e o servidor
 * usar as mesmas ao decidir se entrega. Uma conta só, dos dois lados.
 */

export type Janela = {
  /* Hora de início (0–23) e de fim (1–24), Brasília. Envia em [inicio, fim). */
  inicio: number;
  fim: number;
  /* Dias permitidos: 0 = domingo … 6 = sábado. */
  dias: number[];
};

export const JANELA_PADRAO: Janela = { inicio: 8, fim: 20, dias: [1, 2, 3, 4, 5] };

const TRES_HORAS = 3 * 3_600_000;
const NOMES_DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/* As colunas da config viram uma Janela. null quando a migração não rodou. */
export function janelaDeConfig(cfg: {
  envio_hora_inicio?: number | null;
  envio_hora_fim?: number | null;
  envio_dias?: string | null;
} | null): Janela | null {
  if (!cfg || typeof cfg.envio_hora_inicio !== "number" || typeof cfg.envio_hora_fim !== "number") return null;
  const dias = String(cfg.envio_dias ?? "")
    .split(",")
    .map((d) => Number(d.trim()))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return {
    inicio: Math.min(23, Math.max(0, cfg.envio_hora_inicio)),
    fim: Math.min(24, Math.max(1, cfg.envio_hora_fim)),
    dias: dias.length > 0 ? [...new Set(dias)].sort() : JANELA_PADRAO.dias,
  };
}

/* Hora e dia da semana AGORA, em Brasília. */
export function agoraBrasilia(agora = Date.now()): { hora: number; minuto: number; dia: number } {
  const d = new Date(agora - TRES_HORAS);
  return { hora: d.getUTCHours(), minuto: d.getUTCMinutes(), dia: d.getUTCDay() };
}

export function janelaAberta(j: Janela, agora = Date.now()): boolean {
  const { hora, dia } = agoraBrasilia(agora);
  return j.dias.includes(dia) && hora >= j.inicio && hora < j.fim;
}

/*
 * O próximo instante em que a janela abre (só faz sentido quando fechada).
 * Anda dia a dia, até uma semana, procurando o primeiro dia permitido cuja
 * hora de início ainda está no futuro.
 */
export function proximaAbertura(j: Janela, agora = Date.now()): Date | null {
  const base = new Date(agora - TRES_HORAS);
  for (let d = 0; d <= 7; d++) {
    const local = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + d, j.inicio, 0, 0);
    if (!j.dias.includes(new Date(local).getUTCDay())) continue;
    const real = local + TRES_HORAS;
    if (real > agora) return new Date(real);
  }
  return null;
}

/* "seg a sex, 8h–20h" / "seg, qua e sex, 6h–22h" / "todos os dias, 8h–20h" */
export function descreverJanela(j: Janela): string {
  const dias = [...j.dias].sort();
  let quando: string;
  if (dias.length === 7) quando = "todos os dias";
  else if (dias.length >= 3 && dias.every((d, i) => i === 0 || d === dias[i - 1] + 1)) {
    quando = `${NOMES_DIA[dias[0]]} a ${NOMES_DIA[dias[dias.length - 1]]}`;
  } else if (dias.length === 0) quando = "nenhum dia";
  else {
    const nomes = dias.map((d) => NOMES_DIA[d]);
    quando = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
  }
  return `${quando}, ${j.inicio}h–${j.fim === 24 ? "24" : j.fim}h`;
}

/* "seg 08:00" / "hoje 08:00" / "amanhã 06:00" — para dizer quando retoma. */
export function quandoAbre(j: Janela, agora = Date.now()): string {
  const prox = proximaAbertura(j, agora);
  if (!prox) return "quando você liberar um dia da semana";
  const hoje = new Date(agora - TRES_HORAS).getUTCDate();
  const alvo = new Date(prox.getTime() - TRES_HORAS);
  const hora = `${String(alvo.getUTCHours()).padStart(2, "0")}:00`;
  const diff = alvo.getUTCDate() - hoje;
  if (diff === 0) return `hoje às ${hora}`;
  if (diff === 1) return `amanhã às ${hora}`;
  return `${NOMES_DIA[alvo.getUTCDay()]} às ${hora}`;
}

/*
 * Em quantos dias de envio a fila termina, e quando é o último deles.
 * `porDia` = limite diário × linhas ativas. Conta só dias permitidos, a
 * partir de hoje (se a janela ainda vai abrir ou está aberta) ou de amanhã.
 */
export function previsaoDeTermino(
  j: Janela,
  naFila: number,
  porDia: number,
  agora = Date.now(),
): { dias: number; termina: Date | null } {
  if (naFila <= 0 || porDia <= 0) return { dias: 0, termina: null };
  const dias = Math.ceil(naFila / porDia);
  if (j.dias.length === 0) return { dias, termina: null };
  const base = new Date(agora - TRES_HORAS);
  const { hora } = agoraBrasilia(agora);
  let contados = 0;
  for (let d = 0; d <= 60; d++) {
    const local = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + d));
    if (!j.dias.includes(local.getUTCDay())) continue;
    if (d === 0 && hora >= j.fim) continue; // hoje já fechou
    contados++;
    if (contados === dias) return { dias, termina: new Date(local.getTime() + TRES_HORAS) };
  }
  return { dias, termina: null };
}
