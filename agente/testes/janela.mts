import { janelaAberta, proximaAbertura, quandoAbre, descreverJanela, previsaoDeTermino, janelaDeConfig } from "../../lib/prospeccao/janela.ts";
const j = { inicio: 6, fim: 22, dias: [1,2,3,4,5] };
// domingo 06/09/2026 23:30 Brasília = 07/09 02:30Z
const dom2330 = Date.parse("2026-09-07T02:30:00Z");
// segunda 07/09 10:00 Brasília = 13:00Z
const seg10 = Date.parse("2026-09-07T13:00:00Z");
// sexta 11/09 22:30 Brasília = 12/09 01:30Z
const sex2230 = Date.parse("2026-09-12T01:30:00Z");
// segunda 00:10 Brasília = 03:10Z
const seg0010 = Date.parse("2026-09-07T03:10:00Z");
const check = (nome: string, ok: boolean, extra = "") => console.log(`${ok ? "✅" : "❌"} ${nome} ${extra}`);
check("dom 23:30 fechada", !janelaAberta(j, dom2330));
check("seg 10:00 aberta", janelaAberta(j, seg10));
check("sex 22:30 fechada", !janelaAberta(j, sex2230));
check("seg 00:10 fechada (antes das 6h)", !janelaAberta(j, seg0010));
check("dom 23:30 → abre seg 06:00", proximaAbertura(j, dom2330)!.toISOString() === "2026-09-07T09:00:00.000Z", proximaAbertura(j, dom2330)!.toISOString());
check("seg 00:10 → 'hoje às 06:00'", quandoAbre(j, seg0010) === "hoje às 06:00", quandoAbre(j, seg0010));
check("dom 23:30 → 'amanhã às 06:00'", quandoAbre(j, dom2330) === "amanhã às 06:00", quandoAbre(j, dom2330));
check("sex 22:30 → 'seg às 06:00'", quandoAbre(j, sex2230) === "seg às 06:00", quandoAbre(j, sex2230));
check("descrever seg a sex", descreverJanela(j) === "seg a sex, 6h–22h", descreverJanela(j));
check("descrever todos", descreverJanela({ ...j, dias: [0,1,2,3,4,5,6] }) === "todos os dias, 6h–22h");
check("descrever seg, qua e sex", descreverJanela({ ...j, dias: [1,3,5] }) === "seg, qua e sex, 6h–22h", descreverJanela({ ...j, dias: [1,3,5] }));
const p = previsaoDeTermino(j, 150, 80, seg10); // 2 dias: seg e ter
check("previsão 150/80 na seg → 2 dias, termina ter 08/09", p.dias === 2 && p.termina!.toISOString().startsWith("2026-09-08"), JSON.stringify(p));
const p2 = previsaoDeTermino(j, 150, 80, sex2230); // sex já fechou → seg e ter (14 e 15)
check("previsão na sex 22:30 → termina ter 15/09", p2.termina!.toISOString().startsWith("2026-09-15"), JSON.stringify(p2));
check("config sem colunas → null", janelaDeConfig({}) === null);
check("config com colunas", JSON.stringify(janelaDeConfig({ envio_hora_inicio: 6, envio_hora_fim: 22, envio_dias: "1,2,3,4,5,6" })) === JSON.stringify({ inicio: 6, fim: 22, dias: [1,2,3,4,5,6] }));
