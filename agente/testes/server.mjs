/*
 * Simulador do WhatsApp Web para testar enviarMensagem() sem sessão real.
 * Cada cenário é escolhido pelo último dígito do telefone:
 *   1 conversa abre em 1s, Enter esvazia a caixa
 *   2 "Iniciando conversa" 1s, depois aviso de número inválido
 *   3 "Iniciando conversa" para sempre
 *   4 lista visível e nada acontece (silêncio)
 *   5 outro diálogo; Esc fecha e a conversa abre
 *   6 tela de QR (sessão caiu)
 *   7 1ª carga: silêncio; 2ª carga: conversa abre (testa a nova tentativa)
 *   8 faixa "Computador não conectado" 2s, depois conversa abre
 *   9 conversa abre, Enter NÃO esvazia; o botão de enviar esvazia
 *   0 "Iniciando conversa" 1s na 1ª carga e some sem abrir; 2ª carga abre
 */
import http from "node:http";

const hits = new Map();

const html = (cenario, vez, texto, variante) => `<!doctype html><html><head><meta charset="utf-8"><title>WhatsApp</title></head>
<body>
<div id="app">
  <div id="side">
    <div id="banner"></div>
    ${cenario === 6 ? "" : '<div id="pane-side" aria-label="Lista de conversas"><div role="listitem"><span title="Fulano">Fulano</span></div><div role="listitem"><span title="Equipe" id="grupo">Equipe</span></div></div>'}
  </div>
  <div id="main"></div>
  <div id="dialogos"></div>
  ${cenario === 6 ? '<canvas aria-label="Scan this QR code" width="10" height="10"></canvas>' : ""}
</div>
<script>
const cenario = ${cenario};
const vez = ${vez};
const variante = ${variante};
const texto = ${JSON.stringify(texto)};
const dialogos = document.getElementById("dialogos");
const main = document.getElementById("main");
const banner = document.getElementById("banner");
function dialogo(t, comCancelar) {
  dialogos.innerHTML = '<div role="dialog"><p>' + t + '</p>' + (comCancelar ? '<button>Cancelar</button>' : '<button>OK</button>') + '</div>';
}
function fecharDialogo() { dialogos.innerHTML = ""; }
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharDialogo(); });
function abrirConversa(enterEsvazia, semMarcacao) {
  fecharDialogo();
  main.innerHTML = '<header>+55 21 9999</header><div id="msgs"></div>' +
    (semMarcacao
      ? '<div class="rodape-novo"><div contenteditable="true" id="caixa">' + texto + '</div><button aria-label="Enviar" id="btn"></button></div>'
      : '<footer><div contenteditable="true" role="textbox" data-tab="10" id="caixa">' + texto + '</div>' +
        '<button aria-label="Enviar" id="btn"></button></footer>');
  const caixa = document.getElementById("caixa");
  const esvaziar = () => { caixa.textContent = ""; };
  caixa.addEventListener("keydown", (e) => { if (e.key === "Enter" && enterEsvazia) { e.preventDefault(); esvaziar(); } });
  document.getElementById("btn").addEventListener("click", esvaziar);
}
document.getElementById("grupo")?.addEventListener("click", () => {
  main.innerHTML = '<header>Equipe</header><div id="msgs"></div>' +
    '<footer><div contenteditable="true" role="textbox" data-tab="10" id="caixa"></div><button aria-label="Enviar" id="btn"></button></footer>';
  const caixa = document.getElementById("caixa");
  caixa.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); caixa.textContent = ""; } });
});
switch (cenario) {
  case 1:
    if (variante === 1) { setTimeout(() => abrirConversa(true, true), 500); break; }            // caixa sem footer/role/tab
    if (variante === 2) { main.innerHTML = '<header>+55 21 9999</header><p>As mensagens são protegidas.</p>'; setTimeout(() => abrirConversa(true), 3500); break; } // cabeçalho antes, caixa depois do "silêncio"
    if (variante === 3) { main.innerHTML = '<header>+55 21 9999</header><button id="cont">Continuar</button>'; document.getElementById("cont").addEventListener("click", () => abrirConversa(true)); break; } // botão libera a caixa
    if (variante === 4) { main.innerHTML = '<header>+55 21 9999</header><p>Sem caixa nunca.</p>'; break; } // conversa aberta sem caixa
    if (variante === 5) { main.innerHTML = '<header>+55 21 9999</header><p>As mensagens e ligações são protegidas com a criptografia de ponta a ponta.</p><div>Sua conta está restringida dos dispositivos conectados. Não é possível iniciar novas conversas no momento. <a>Saiba mais</a></div>'; break; } // restrição do WhatsApp
    setTimeout(() => abrirConversa(true), 1000); break;
  case 2: dialogo("Iniciando conversa", true); setTimeout(() => dialogo("O número de telefone compartilhado por url é inválido.", false), 1000); break;
  case 3: dialogo("Iniciando conversa", true); break;
  case 4: break;
  case 5: dialogo("Você está usando o WhatsApp em outro computador.", false);
          document.addEventListener("keydown", (e) => { if (e.key === "Escape") setTimeout(() => abrirConversa(true), 300); }); break;
  case 6: break;
  case 7: if (vez >= 2) setTimeout(() => abrirConversa(true), 500); break;
  case 8: banner.textContent = "Computador não conectado"; setTimeout(() => { banner.textContent = ""; abrirConversa(true); }, 2000); break;
  case 9: setTimeout(() => abrirConversa(false), 500); break;
  case 0: dialogo("Iniciando conversa", true); setTimeout(() => { fecharDialogo(); if (vez >= 2) abrirConversa(true); }, 1000); break;
}
</script>
</body></html>`;

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const phone = u.searchParams.get("phone") ?? "0";
  const texto = u.searchParams.get("text") ?? "";
  const vez = (hits.get(phone) ?? 0) + 1;
  hits.set(phone, vez);
  const cenario = Number(phone.slice(-1));
  const variante = Number(phone.slice(-2, -1));
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html(cenario, vez, texto, variante));
});

server.listen(Number(process.env.PORT ?? 4599), () => console.log("simulador em", server.address().port));
