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

export type EstadoDns =
  | { pronto: true }
  | { pronto: false; motivo: string };

/*
 * O DNS do cliente já aponta para cá?
 *
 * A resposta vem da própria Vercel — é ela quem serve o domínio, então é a
 * única opinião que importa. "misconfigured" é o campo que diz.
 */
export async function conferirDns(dominio: string): Promise<EstadoDns> {
  const projeto = process.env.PROJETO_VERCEL!.trim();
  const cfg = await chamar(
    "GET",
    `/v6/domains/${encodeURIComponent(dominio)}/config?projectIdOrName=${projeto}`,
  );
  if (!cfg.ok) {
    return { pronto: false, motivo: cfg.json.error?.message ?? `A Vercel respondeu ${cfg.status}.` };
  }
  if (cfg.json.misconfigured === false) return { pronto: true };
  return {
    pronto: false,
    motivo:
      "O DNS ainda não aponta para cá. Confira o registro no site onde o domínio foi comprado — a propagação pode levar de minutos a algumas horas.",
  };
}
