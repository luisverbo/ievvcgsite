/*
 * A tabela de preços, conferida sem rede e sem banco.
 *
 * Existe porque errar aqui não dá erro em lugar nenhum: a conta simplesmente
 * sai errada, e o cliente paga a mais (ou nós pagamos). O caso que motivou
 * foi a taxa de LEITURA DE CACHE, que não é 10% em todo modelo — e o prompt
 * do construtor vai com cache, então é a parte que mais se repete.
 *
 *     node --experimental-strip-types lib/creditos/__testes__/precos.mts
 */
import { custoEmMicro, emDolar, paginasRestantes } from "../precos.ts";

let falhas = 0;
const ok = (nome: string, cond: boolean, extra = "") => {
  if (!cond) falhas++;
  console.log(`${cond ? "✅" : "❌"} ${nome}${extra ? ` → ${extra}` : ""}`);
};

const M = 1_000_000;

ok("Opus 5.5: 1M entrada + 1M saída = US$24", custoEmMicro("claude-opus-5-5", { entrada: M, saida: M }) === 24 * M);
ok("Fable 5.1: 1M + 1M = US$60", custoEmMicro("claude-fable-5-1", { entrada: M, saida: M }) === 60 * M);
ok("Opus 5 (anterior): 1M + 1M = US$30", custoEmMicro("claude-opus-5", { entrada: M, saida: M }) === 30 * M);

ok(
  "cache lido no Opus 5.5 custa 5% da entrada",
  custoEmMicro("claude-opus-5-5", { entrada: 0, saida: 0, cacheLido: M }) === 200_000,
  emDolar(custoEmMicro("claude-opus-5-5", { entrada: 0, saida: 0, cacheLido: M })),
);
ok(
  "cache lido no Fable 5.1 custa 2,5% da entrada",
  custoEmMicro("claude-fable-5-1", { entrada: 0, saida: 0, cacheLido: M }) === 250_000,
);
ok(
  "modelo sem taxa própria segue nos 10% de sempre",
  custoEmMicro("claude-opus-5", { entrada: 0, saida: 0, cacheLido: M }) === 500_000,
);

ok("gravar cache custa 1,25× a entrada", custoEmMicro("claude-opus-5-5", { entrada: 0, saida: 0, cacheGravado: M }) === 5 * M);
ok("modelo desconhecido cobra pelo mais caro", custoEmMicro("inventado", { entrada: M, saida: 0 }) === 10 * M);
ok("nunca arredonda para zero", custoEmMicro("claude-opus-5-5", { entrada: 1, saida: 0 }) >= 1);

ok("a cota de US$15 promete ao menos 30 páginas", paginasRestantes(15 * M) >= 30, String(paginasRestantes(15 * M)));

console.log(falhas === 0 ? "\nTUDO PASSOU" : `\n${falhas} FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);
