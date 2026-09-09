/*
 * A ESCUTA contra o simulador: o agente reconhece quem respondeu?
 *
 * Cada cenário monta uma lista de conversas do WhatsApp Web e uma conversa
 * aberta, e confere o que lerRespostas() devolve. É o que faltava: o envio
 * tinha teste, a escuta não — e foi nela que o bug morava.
 */
import http from "node:http";
import { chromium } from "playwright";
import { lerRespostas } from "../whatsapp.ts";

type Cenario = {
  nome: string;
  /* Cada conversa da lista: título, se tem selo de não lida, e se a prévia
     tem o nosso tique (última mensagem nossa). */
  lista: { titulo: string; naoLida?: boolean; tique?: boolean }[];
  /* O que a conversa aberta mostra: bolhas in/out. */
  conversa: { de: "in" | "out"; texto: string }[];
  /* Quanto a conversa demora para montar (o vilão do bug: 30s não bastava). */
  demoraMs?: number;
  esperados: string[];
  querido: { telefone: string; contem: string }[];
};

const NUM = "5511971094891";

const cenarios: Cenario[] = [
  {
    nome: "número na lista, humano respondeu",
    lista: [{ titulo: "+55 11 97109-4891" }],
    conversa: [
      { de: "out", texto: "Oi, tudo bem? Falo com alguém da ZL Brasil?" },
      { de: "in", texto: "Bom dia , com quem eu converso ?" },
    ],
    esperados: [NUM],
    querido: [{ telefone: NUM, contem: "com quem eu converso" }],
  },
  {
    nome: "conversa demora 45s a montar (o bug dos 30s)",
    lista: [{ titulo: "+55 11 97109-4891" }],
    conversa: [
      { de: "out", texto: "Oi, tudo bem?" },
      { de: "in", texto: "Quem fala?" },
    ],
    demoraMs: 45_000,
    esperados: [NUM],
    querido: [{ telefone: NUM, contem: "Quem fala" }],
  },
  {
    nome: "conta comercial: nome na frente, número em outro título",
    lista: [{ titulo: "ZL Brasil Corretora de Seguros" }],
    conversa: [
      { de: "out", texto: "Oi, tudo bem?" },
      { de: "in", texto: "Bom dia, pode falar" },
    ],
    esperados: [NUM],
    querido: [{ telefone: NUM, contem: "pode falar" }],
  },
  {
    nome: "última bolha é nossa: não conta como resposta",
    lista: [{ titulo: "+55 11 97109-4891" }],
    conversa: [
      { de: "in", texto: "Oi" },
      { de: "out", texto: "Apresentação já enviada" },
    ],
    esperados: [NUM],
    querido: [],
  },
  {
    nome: "com o nosso tique e sem selo: nem abre",
    lista: [{ titulo: "+55 11 97109-4891", tique: true }],
    conversa: [{ de: "out", texto: "Oi, tudo bem?" }],
    esperados: [NUM],
    querido: [],
  },
  {
    nome: "resposta em áudio (sem texto)",
    lista: [{ titulo: "+55 11 97109-4891" }],
    conversa: [
      { de: "out", texto: "Oi, tudo bem?" },
      { de: "in", texto: "" },
    ],
    esperados: [NUM],
    querido: [{ telefone: NUM, contem: "áudio ou imagem" }],
  },
];

let atual: Cenario = cenarios[0];

const html = () => `<!doctype html><html><head><meta charset="utf-8"><title>WhatsApp</title></head><body>
<div id="app">
  <div id="side">
    <div id="pane-side" aria-label="Lista de conversas">
      ${atual.lista
        .map(
          (c) => `<div role="listitem">
            <span title="${c.titulo}">${c.titulo}</span>
            <span title="prévia da conversa">prévia</span>
            ${c.naoLida ? '<span aria-label="1 mensagem não lida"></span>' : ""}
            ${c.tique ? '<span data-icon="msg-dblcheck"></span>' : ""}
          </div>`,
        )
        .join("")}
    </div>
  </div>
  <div id="main"></div>
</div>
<script>
const conversa = ${JSON.stringify(atual.conversa)};
const demora = ${atual.demoraMs ?? 300};
setTimeout(() => {
  document.getElementById("main").innerHTML =
    '<header>+55 11 97109-4891</header><div id="msgs">' +
    conversa.map((m) => '<div class="message-' + m.de + '">' + (m.texto ? '<span class="selectable-text">' + m.texto + '</span>' : '<span class="audio"></span>') + '</div>').join("") +
    '</div><footer><div contenteditable="true" role="textbox" data-tab="10"></div></footer>';
}, demora);
</script>
</body></html>`;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html());
});

async function main() {
  await new Promise<void>((r) => server.listen(4601, () => r()));
  const base = "http://127.0.0.1:4601";
  const browser = await chromium
    .launch({ headless: true, args: ["--no-sandbox"] })
    .catch(() => chromium.launch({ headless: true, executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }));
  const page = await (await browser.newContext()).newPage();

  let falhas = 0;
  for (const c of cenarios) {
    atual = c;
    await page.goto(`${base}/`);
    const t0 = Date.now();
    // Só a origem é de teste: os tempos são os de produção, porque é
    // justamente o teto de espera que o bug deixava curto demais.
    const r = await lerRespostas(page, c.esperados, () => {}, { base });
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    const ok =
      r.length === c.querido.length &&
      c.querido.every((q, i) => r[i]?.telefone === q.telefone && r[i]?.texto.includes(q.contem));
    if (!ok) falhas++;
    console.log(
      `${ok ? "✅" : "❌"} ${c.nome} (${dur}s) → ${r.length === 0 ? "nada" : r.map((x) => `${x.telefone}: "${x.texto.slice(0, 40)}"`).join(" | ")}`,
    );
  }

  await browser.close();
  server.close();
  console.log(falhas === 0 ? "\nESCUTA: TODOS OS CENÁRIOS PASSARAM" : `\nESCUTA: ${falhas} FALHARAM`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
