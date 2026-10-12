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
 * O que o cliente precisa configurar no registrador dele — a RESERVA.
 *
 * Vale só quando a hospedagem não responde. O endereço de verdade vem dela
 * (veja `dnsRecomendado`): hoje cada projeto tem o seu, do tipo
 * "f34c59bcf32150f5.vercel-dns-017.com", e o valor genérico aqui embaixo
 * leva a um domínio que nunca sobe. Foi assim que um domínio com DNS
 * aparentemente certo passou dias fechando a ligação no navegador — o
 * painel ditava o valor errado com toda a confiança do mundo.
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

/*
 * O primeiro endereço aproveitável de uma resposta que pode vir de várias
 * formas: "valor", ["valor"], [{ value: "valor" }], [{ value: ["valor"] }].
 *
 * A tolerância é de propósito. Esta parte da API da hospedagem já mudou de
 * formato antes, e o preço de errar aqui é alto: o cliente copia um endereço
 * que não existe e fica dias achando que é propagação de DNS. Formato que eu
 * não reconheço vira "não achei", e aí entra a reserva — nunca um palpite.
 */
function primeiroValor(bruto: unknown): string | null {
  if (typeof bruto === "string") {
    const limpo = bruto.trim().replace(/\.$/, ""); // a Vercel mostra com ponto no fim
    return limpo || null;
  }
  if (Array.isArray(bruto)) {
    for (const item of bruto) {
      const dentro =
        item && typeof item === "object" && "value" in (item as object)
          ? (item as { value: unknown }).value
          : item;
      const achado = primeiroValor(dentro);
      if (achado) return achado;
    }
  }
  return null;
}

/*
 * O endereço que a PRÓPRIA hospedagem manda usar para este domínio.
 *
 * É o mesmo que aparece no painel dela em "Vercel recommends updating your
 * DNS records". Cada projeto tem o seu, então ditar um valor fixo daqui é
 * mandar o cliente apontar para o lugar errado.
 */
function dnsRecomendado(dominio: string, cfg: Record<string, unknown>): InstrucaoDns {
  const reserva = instrucaoDns(dominio);
  const sugerido = reserva.raiz
    ? primeiroValor(cfg.recommendedIPv4)
    : primeiroValor(cfg.recommendedCNAME);
  return sugerido ? { ...reserva, valor: sugerido } : reserva;
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
export type EstadoDominio = {
  /** O registro de DNS a criar, como a hospedagem manda — não como a gente acha. */
  dns: InstrucaoDns;
} & (
  | { situacao: "pronto" }
  | { situacao: "fora_do_projeto" }
  | { situacao: "falta_verificar"; registros: RegistroExtra[] }
  | { situacao: "dns_errado" }
  | { situacao: "indisponivel"; motivo: string }
);

export async function estadoDoDominio(dominio: string): Promise<EstadoDominio> {
  if (!vercelConfigurada()) {
    return {
      situacao: "indisponivel",
      motivo: "A hospedagem não está configurada no servidor (TOKEN_VERCEL e PROJETO_VERCEL).",
      dns: instrucaoDns(dominio),
    };
  }
  const projeto = process.env.PROJETO_VERCEL!.trim();

  /*
   * As duas perguntas saem juntas: "está no projeto?" e "qual endereço eu
   * mando o cliente apontar?". A segunda vale até quando a primeira dá não —
   * é justamente aí que ele precisa da instrução para sair do lugar.
   */
  const [noProjeto, cfg] = await Promise.all([
    chamar("GET", `/v9/projects/${projeto}/domains/${encodeURIComponent(dominio)}`),
    chamar("GET", `/v6/domains/${encodeURIComponent(dominio)}/config?projectIdOrName=${projeto}`),
  ]);
  const dns = cfg.ok ? dnsRecomendado(dominio, cfg.json) : instrucaoDns(dominio);

  if (noProjeto.status === 404) return { situacao: "fora_do_projeto", dns };
  if (!noProjeto.ok) {
    return {
      situacao: "indisponivel",
      motivo: noProjeto.json.error?.message ?? `A Vercel respondeu ${noProjeto.status}.`,
      dns,
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
      dns,
    };
  }

  if (!cfg.ok) {
    return {
      situacao: "indisponivel",
      motivo: cfg.json.error?.message ?? `A Vercel respondeu ${cfg.status}.`,
      dns,
    };
  }
  return cfg.json.misconfigured === false
    ? { situacao: "pronto", dns }
    : { situacao: "dns_errado", dns };
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
      /*
       * Sem acusar nada. A hospedagem pede esta prova de posse em mais de uma
       * situação (o endereço já estar em outra conta é só a mais comum), e
       * afirmar a causa errada manda o cliente caçar uma conta que não existe.
       */
      return "Falta provar que o domínio é seu: crie também o registro TXT abaixo, no mesmo lugar onde você cria o outro. Costuma acontecer quando o endereço já esteve ligado a outra hospedagem.";
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
