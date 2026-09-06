/*
 * O começo do dia, no fuso de Brasília.
 *
 * Todo limite "por dia" do sistema (mensagens por linha, capturas de
 * Instagram, empresas do teste grátis) conta a partir daqui. Parece
 * detalhe, mas não é: o servidor roda em UTC, e `new Date().setHours(0,0,0,0)`
 * lá dá meia-noite de LONDRES — 21h de Brasília do dia anterior. Na prática o
 * cliente configurava 50 por dia, o agente mandava as 50, e às 21h o contador
 * zerava e ele mandava mais 50 no mesmo dia.
 *
 * Puro e sem fuso do sistema: o Brasil está em UTC-3 o ano inteiro desde
 * 2019 (o horário de verão acabou), então a conta é subtrair 3 horas para
 * achar a data de Brasília e montar a meia-noite dela em UTC.
 */

const TRES_HORAS = 3 * 3_600_000;

/** A data de hoje em Brasília, como "AAAA-MM-DD". */
export function hojeBr(agora: number = Date.now()): string {
  return new Date(agora - TRES_HORAS).toISOString().slice(0, 10);
}

/** 00:00 de hoje em Brasília, em ISO (para comparar com colunas timestamptz). */
export function inicioDoDiaBr(agora: number = Date.now()): string {
  return `${hojeBr(agora)}T03:00:00.000Z`;
}
