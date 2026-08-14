/*
 * A página que aparece no domínio do cliente quando a hospedagem está suspensa.
 *
 * Três decisões que parecem detalhe e não são:
 *
 * 1. Não diz "falta de pagamento". Quem lê é o cliente DO seu cliente — um
 *    paciente procurando a clínica, alguém pedindo orçamento. Expor a
 *    inadimplência dele na frente do público dele é constrangimento gratuito,
 *    e volta contra você.
 *
 * 2. Responde 503, não 404. 503 é "volta depois"; 404 é "não existe". Com 404
 *    o Google tira o site do índice em poucos dias, e aí o cliente volta a
 *    pagar e descobre que perdeu o ranqueamento que levou meses para
 *    construir. O `Retry-After` diz ao robô para tentar de novo em um dia.
 *
 * 3. Nada é apagado. O HTML continua no banco; volta no ar sozinho no minuto
 *    seguinte ao pagamento.
 */

const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Site temporariamente indisponível</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
       font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
       background:#0f1115;color:#e8eaed}
  main{max-width:420px;text-align:center}
  .p{width:52px;height:52px;margin:0 auto 22px;border-radius:50%;
     background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:24px}
  h1{font-size:21px;line-height:1.35;font-weight:700;letter-spacing:-.01em}
  p{margin-top:12px;font-size:15px;line-height:1.6;color:#9aa0a6}
  small{display:block;margin-top:28px;font-size:12px;color:#5f6368}
  @media (prefers-color-scheme: light){
    body{background:#fff;color:#1f1f1f}
    .p{background:#f1f3f4}
    p{color:#5f6368}
    small{color:#9aa0a6}
  }
</style>
</head>
<body>
<main>
  <div class="p">⏳</div>
  <h1>Este site está temporariamente indisponível</h1>
  <p>Estamos com uma pendência técnica no endereço. Tente novamente em algumas horas.</p>
  <small>Se este site é seu, acesse seu painel para reativá-lo.</small>
</main>
</body>
</html>`;

export function paginaForaDoAr(): Response {
  return new Response(HTML, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Sem cache: no minuto em que ele pagar, o site tem que voltar. Um
      // cache de borda aqui deixaria o cliente vendo a página de suspensão
      // depois de já ter pago — e é aí que ele liga irritado.
      "Cache-Control": "no-store",
      "Retry-After": "86400",
    },
  });
}
