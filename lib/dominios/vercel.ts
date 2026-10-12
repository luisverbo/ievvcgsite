import "server-only";

/*
 * Fala com a API da Vercel para pendurar o domínio do cliente neste projeto.
 *
 * O fluxo real de um domínio próprio:
 *   1. registramos o domínio no projeto (API da Vercel);
 *   2. o cliente aponta o DNS no registrador dele (nós só mostramos o quê);
 *   3. quando o DNS propaga, a Vercel emite o certificado sozinha e o site
 *      passa a responder — o nosso proxy faz o resto.
 *
 * O token fica em TOKEN_VERCEL e nunca sai do servidor: com ele dá para
 * mexer no projeto inteiro.
 */

const API = "https://api.vercel.com";

export function vercelConfigurada(): boolean {
  return !!process.env.TOKEN_VERCEL?.trim() && !!process.env.PROJETO_VERCEL?.trim();
}

function comTeam(caminho: string): string {
  const team = process.env.TIME_VERCEL?.trim();
  return team ? `${caminho}${caminho.includes("?") ? "&" : "?"}teamId=${team}` : caminho;
}

async function chamar(metodo: string, caminho: string, corpo?: unknown) {
  const res = await fetch(`${API}${comTeam(caminho)}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${process.env.TOKEN_VERCEL!.trim()}`,
      "Content-Type": "application/json",
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
    [k: string]: unknown;
  };
  return { ok: res.ok, status: res.status, json };
}

export type InstrucaoDns = {
  tipo: "A" | "CNAME";
  /** O que digitar no campo "Nome"/"Host". Vazio quando é o domínio raiz. */
  nome: string;
  valor: string;
  raiz: boolean;
};

/*
 * O que o cliente precisa configurar no registrador dele.
 *
 * Domínio raiz não aceita CNAME (regra do DNS, não nossa), então lá vai um
 * registro A. Subdomínio (www, site, etc.) vai de CNAME, que sobrevive a
 * mudanças de IP da Vercel.
 *
 * O nome do registro raiz vai VAZIO, não "@".
 *
 * "@" é uma abreviação que alguns painéis (GoDaddy, Cloudflare, Hostinger)
 * aceitam como "o próprio domínio" — mas é convenção de painel, não parte do
 * DNS. O Registro.br não aceita: ele já mostra o domínio ao lado do campo e
 * responde "Nome do record inválido - @". Campo em branco funciona nos dois
 * mundos, então é o que mandamos; o "@" fica só como observação na tela.
 */
export function instrucaoDns(dominio: string): InstrucaoDns {
  const partes = dominio.split(".");
  // "clinica.com.br" tem 3 partes mas é raiz (o .br registra em dois níveis);
  // "www.clinica.com.br" tem 4 e é subdomínio. "www" na frente decide sozinho.
  const ehRaiz =
    partes[0] !== "www" &&
    (partes.length === 2 || (partes.length === 3 && partes[partes.length - 1] === "br"));
  if (ehRaiz) {
    return { tipo: "A", nome: "", valor: "76.76.21.21", raiz: true };
  }
  return { tipo: "CNAME", nome: partes[0], valor: "cname.vercel-dns.com", raiz: false };
}

export type ResultadoDominio =
  | { ok: true }
  | { ok: false; motivo: string };

export async function registrarDominio(dominio: string): Promise<ResultadoDominio> {
  const projeto = process.env.PROJETO_VERCEL!.trim();
  const r = await chamar("POST", `/v10/projects/${projeto}/domains`, { name: dominio });

  if (r.ok) return { ok: true };

  const codigo = r.json.error?.code ?? "";
  // Já estava neste projeto: para nós é sucesso, não erro.
  if (codigo === "domain_already_in_use" && /this project/i.test(r.json.error?.message ?? "")) {
    return { ok: true };
  }
  if (codigo === "domain_already_in_use") {
    return {
      ok: false,
      motivo:
        "Este domínio já está em uso em outro projeto da Vercel. Se ele é seu, remova-o de lá primeiro.",
    };
  }
  if (codigo === "invalid_domain" || codigo === "invalid_request") {
    return { ok: false, motivo: "Endereço inválido. Confira se digitou só o domínio, sem https:// e sem barras." };
  }
  if (r.status === 403) {
    return {
      ok: false,
      motivo:
        "A Vercel recusou o token (TOKEN_VERCEL). Confira o token e se o PROJETO_VERCEL é o deste projeto.",
    };
  }
  return { ok: false, motivo: r.json.error?.message ?? `A Vercel respondeu ${r.status}.` };
}

export async function removerDominio(dominio: string): Promise<void> {
  const projeto = process.env.PROJETO_VERCEL!.trim();
  // Falha aqui não pode impedir a remoção no banco: na pior das hipóteses
  // sobra um domínio órfão na Vercel, que não serve nada (o proxy não o acha).
  await chamar("DELETE", `/v9/projects/${projeto}/domains/${encodeURIComponent(dominio)}`).catch(
    () => {},
  );
}

export type RegistroExtra = { tipo: string; nome: string; valor: string };

/*
 * Em que pé está o domínio, do ponto de vista de quem serve a página.
 *
 * Antes aqui só se perguntava "o DNS aponta para cá?". Faltava a pergunta
 * anterior, que é a que mais dói: o domínio está PENDURADO no projeto? Um
 * endereço que a Vercel não conhece não dá 404 — ela derruba a ligação no
 * aperto de mão do https, e o navegador mostra ERR_CONNECTION_CLOSED. Para
 * quem olha, isso é idêntico a "o DNS não propagou", e a pessoa fica
 * esperando por uma propagação que já aconteceu.
 *
 * Então são três perguntas, nesta ordem — e a tela responde a que falhou:
 *   1. está no projeto?            (senão: reconectar, que é automático)
 *   2. está verificado?            (senão: falta um TXT, caso raro)
 *   3. o DNS aponta para cá?       (senão: o CNAME/A do registrador)
 */
export type EstadoDominio =
  | { situacao: "pronto" }
  | { situacao: "fora_do_projeto" }
  | { situacao: "falta_verificar"; registros: RegistroExtra[] }
  | { situacao: "dns_errado" }
  | { situacao: "indisponivel"; motivo: string };

export async function estadoDoDominio(dominio: string): Promise<EstadoDominio> {
  if (!vercelConfigurada()) {
    return {
      situacao: "indisponivel",
      motivo: "A hospedagem não está configurada no servidor (TOKEN_VERCEL e PROJETO_VERCEL).",
    };
  }
  const projeto = process.env.PROJETO_VERCEL!.trim();

  const noProjeto = await chamar(
    "GET",
    `/v9/projects/${projeto}/domains/${encodeURIComponent(dominio)}`,
  );
  if (noProjeto.status === 404) return { situacao: "fora_do_projeto" };
  if (!noProjeto.ok) {
    return {
      situacao: "indisponivel",
      motivo: noProjeto.json.error?.message ?? `A Vercel respondeu ${noProjeto.status}.`,
    };
  }

  // Verificação por TXT: só aparece quando o domínio já está em outra conta da
  // Vercel. É raro, mas sem mostrar o registro a pessoa não tem como sair do
  // lugar — e não existe nada no DNS do registrador que denuncie isso.
  if (noProjeto.json.verified === false) {
    const bruto = (noProjeto.json.verification ?? []) as {
      type?: string;
      domain?: string;
      value?: string;
    }[];
    return {
      situacao: "falta_verificar",
      registros: bruto.map((v) => ({
        tipo: (v.type ?? "TXT").toUpperCase(),
        nome: v.domain ?? "",
        valor: v.value ?? "",
      })),
    };
  }

  const cfg = await chamar(
    "GET",
    `/v6/domains/${encodeURIComponent(dominio)}/config?projectIdOrName=${projeto}`,
  );
  if (!cfg.ok) {
    return {
      situacao: "indisponivel",
      motivo: cfg.json.error?.message ?? `A Vercel respondeu ${cfg.status}.`,
    };
  }
  return cfg.json.misconfigured === false ? { situacao: "pronto" } : { situacao: "dns_errado" };
}

/*
 * A mesma situação dita em português, para a tela e para o campo `detalhe`.
 */
export function explicarEstado(estado: EstadoDominio, dominio: string): string {
  switch (estado.situacao) {
    case "pronto":
      return "Funcionando.";
    case "fora_do_projeto":
      return `O endereço ${dominio} ainda não está pendurado na hospedagem — por isso o navegador fecha a ligação em vez de mostrar a página. Clique em "Conferir agora" que eu reconecto sozinho.`;
    case "falta_verificar":
      return "Este domínio já está em uso em outra conta de hospedagem. Para provar que ele é seu, crie também o registro TXT abaixo.";
    case "dns_errado":
      return "O DNS ainda não aponta para cá. Confira o registro no site onde o domínio foi comprado — a propagação pode levar de minutos a algumas horas.";
    case "indisponivel":
      return estado.motivo;
  }
}

/*
 * Conta da hospedagem respondendo? (para o diagnóstico do Admin)
 */
export async function conferirConta(): Promise<{ ok: boolean; detalhe: string }> {
  if (!vercelConfigurada()) {
    return { ok: false, detalhe: "TOKEN_VERCEL e/ou PROJETO_VERCEL não chegaram ao servidor." };
  }
  const projeto = process.env.PROJETO_VERCEL!.trim();
  const r = await chamar("GET", `/v9/projects/${projeto}`).catch(() => null);
  if (!r) return { ok: false, detalhe: "Não consegui falar com a hospedagem." };
  if (r.ok) return { ok: true, detalhe: `Projeto "${projeto}" respondendo.` };
  if (r.status === 403) {
    return { ok: false, detalhe: "O token foi recusado (403). Gere outro e atualize TOKEN_VERCEL." };
  }
  if (r.status === 404) {
    return {
      ok: false,
      detalhe: `Projeto "${projeto}" não encontrado. Se ele está num time, falta a variável TIME_VERCEL.`,
    };
  }
  return { ok: false, detalhe: r.json.error?.message ?? `A hospedagem respondeu ${r.status}.` };
}
