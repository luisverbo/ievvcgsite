import { chromium } from "playwright";
import { enviarMensagem, enviarNoGrupo, type OpcoesEnvio } from "../whatsapp.ts";

await import("./server.mjs");
const BASE = `http://127.0.0.1:${process.env.PORT ?? 4599}`;

// Tempos curtos: o que na VPS são 25s/60s/120s aqui são 2s/3s/6s.
const opcoes: OpcoesEnvio = {
  base: BASE,
  esperaAberturaMs: 6000,
  esperaIniciandoMs: 3000,
  esperaSilencioMs: 2000,
  tentativas: 2,
  pausaAntesMs: [50, 100],
  confirmacaoMs: 300,
  log: (m) => console.log("   log:", m),
};

type Esperado = { ok: boolean; semWhatsapp?: boolean; pararTudo?: boolean; tentarDeNovo?: boolean; restringida?: boolean; motivo?: RegExp };
const cenarios: { tel: string; nome: string; esperado: Esperado }[] = [
  { tel: "5521900000001", nome: "conversa abre e Enter envia", esperado: { ok: true } },
  { tel: "5521900000002", nome: "número inválido após Iniciando conversa", esperado: { ok: false, semWhatsapp: true } },
  { tel: "5521900000003", nome: "Iniciando conversa para sempre", esperado: { ok: false, tentarDeNovo: true, motivo: /preso em "Iniciando conversa"/ } },
  { tel: "5521900000004", nome: "lista visível, silêncio", esperado: { ok: false, tentarDeNovo: true, motivo: /nada aconteceu/ } },
  { tel: "5521900000005", nome: "outro diálogo, Esc e abre", esperado: { ok: true } },
  { tel: "5521900000006", nome: "QR (sessão caiu)", esperado: { ok: false, pararTudo: true } },
  { tel: "5521900000007", nome: "silêncio na 1ª carga, abre na 2ª", esperado: { ok: true } },
  { tel: "5521900000008", nome: "faixa sem ligação, depois abre", esperado: { ok: true } },
  { tel: "5521900000009", nome: "Enter não esvazia, botão esvazia", esperado: { ok: true } },
  { tel: "5521900000000", nome: "Iniciando some sem abrir; 2ª carga abre", esperado: { ok: true } },
  { tel: "5521900000011", nome: "caixa sem footer/role/data-tab", esperado: { ok: true } },
  { tel: "5521900000021", nome: "cabeçalho abre, caixa só depois do limite de silêncio", esperado: { ok: true } },
  { tel: "5521900000031", nome: "botão Continuar libera a caixa", esperado: { ok: true } },
  { tel: "5521900000051", nome: "restrição do WhatsApp no lugar da caixa", esperado: { ok: false, pararTudo: true, restringida: true, motivo: /restringiu esta conta/ } },
  { tel: "5521900000041", nome: "conversa aberta sem caixa nunca", esperado: { ok: false, tentarDeNovo: true, motivo: /caixa de texto não apareceu.*editáveis=\[nenhum\]/ } },
];

async function main() {
  const browser = await chromium
    .launch({ headless: true, args: ["--no-sandbox"] })
    .catch(() => chromium.launch({ headless: true, executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }));
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let falhas = 0;
  for (const c of cenarios) {
    const t0 = Date.now();
    const r = await enviarMensagem(page, c.tel, "Olá, tudo bem? Teste do simulador.", opcoes);
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    const e = c.esperado;
    const bate =
      r.ok === e.ok &&
      (r.ok ||
        ((e.semWhatsapp ?? false) === (r.semWhatsapp ?? false) &&
          (e.pararTudo ?? false) === (r.pararTudo ?? false) &&
          (e.tentarDeNovo ?? false) === (r.tentarDeNovo ?? false) &&
          (e.restringida ?? false) === (r.restringida ?? false) &&
          (!e.motivo || e.motivo.test(r.motivo))));
    if (!bate) falhas++;
    const detalhe = r.ok ? "ok" : `${r.motivo}${r.foto ? ` [foto ${Math.round(r.foto.length / 1024)}KB]` : ""}`;
    console.log(`${bate ? "✅" : "❌"} ${c.tel.slice(-1)} ${c.nome} (${dur}s) → ${detalhe}`);
  }
  // Grupo: abre pela lista, digita e manda (a página atual já tem a lista).
  {
    await page.goto(`${BASE}/send/?phone=5521900000004&text=x`);
    const t0 = Date.now();
    const r = await enviarNoGrupo(page, "Equipe", "Bom dia, pessoal!", { pausaAntesMs: [50, 100], confirmacaoMs: 300, esperaAberturaMs: 4000, log: (m) => console.log("   log:", m) });
    const bate = r.ok === true;
    if (!bate) falhas++;
    console.log(`${bate ? "✅" : "❌"} G grupo pela lista de conversas (${((Date.now() - t0) / 1000).toFixed(1)}s) → ${r.ok ? "ok" : r.motivo}`);
    const r2 = await enviarNoGrupo(page, "Inexistente", "Oi", { pausaAntesMs: [50, 100], confirmacaoMs: 300, esperaAberturaMs: 2000 });
    const bate2 = !r2.ok;
    if (!bate2) falhas++;
    console.log(`${bate2 ? "✅" : "❌"} G grupo que não existe → ${r2.ok ? "ok (errado)" : r2.motivo}`);
  }
  await browser.close();
  console.log(falhas === 0 ? "\nTODOS OS CENÁRIOS PASSARAM" : `\n${falhas} CENÁRIO(S) FALHARAM`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("erro no teste:", e);
  process.exit(2);
});
