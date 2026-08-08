import "server-only";

import { acharNicho } from "./nichos";
import type { EmpresaEncontrada } from "./tipos";

// Busca empresas no OpenStreetMap: Nominatim resolve a localização e o
// Overpass devolve os estabelecimentos. Tudo gratuito e sem chave — por isso
// roda direto na Vercel, sem navegador e sem risco de bloqueio.

const UA = "PaginaPro/1.0 (prospeccao de clientes)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";

export type Caixa = { sul: number; oeste: number; norte: number; leste: number; rotulo: string };

export async function localizar(local: string): Promise<Caixa | null> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(local)}&format=json&limit=1&countrycodes=br`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Não consegui localizar "${local}" (${res.status}).`);

  const json = (await res.json()) as {
    boundingbox: [string, string, string, string];
    display_name: string;
  }[];
  const achado = json[0];
  if (!achado) return null;

  const [sul, norte, oeste, leste] = achado.boundingbox.map(Number);
  return { sul, oeste, norte, leste, rotulo: achado.display_name };
}

function texto(tags: Record<string, string>, ...chaves: string[]): string | undefined {
  for (const c of chaves) {
    const v = tags[c]?.trim();
    if (v) return v;
  }
  return undefined;
}

function montarEndereco(tags: Record<string, string>): string | undefined {
  const rua = tags["addr:street"];
  const numero = tags["addr:housenumber"];
  const bairro = tags["addr:suburb"] || tags["addr:neighbourhood"];
  const cidade = tags["addr:city"];
  const partes = [
    rua ? (numero ? `${rua}, ${numero}` : rua) : undefined,
    bairro,
    cidade,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : undefined;
}

// Normaliza o endereço de rede social: no OSM às vezes vem só o @usuário.
function urlSocial(valor: string | undefined, base: string): string | undefined {
  if (!valor) return undefined;
  if (/^https?:\/\//i.test(valor)) return valor;
  return `${base}${valor.replace(/^@/, "")}`;
}

type ElementoOsm = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function buscarEmpresas(
  nichoChave: string,
  caixa: Caixa,
  limite: number,
): Promise<EmpresaEncontrada[]> {
  const nicho = acharNicho(nichoChave);
  if (!nicho) throw new Error("Nicho desconhecido.");

  const bbox = `${caixa.sul},${caixa.oeste},${caixa.norte},${caixa.leste}`;
  // Busca com folga: parte dos resultados cai fora por não ter nome.
  const teto = Math.min(400, Math.max(limite * 4, 60));
  const clausulas = nicho.filtros.map((f) => `nwr${f}(${bbox});`).join("\n  ");
  const query = `[out:json][timeout:40];\n(\n  ${clausulas}\n);\nout center tags ${teto};`;

  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 429
        ? "O OpenStreetMap está limitando as buscas agora. Espere um minuto e tente de novo."
        : `A busca falhou (${res.status}).`,
    );
  }

  const json = (await res.json()) as { elements?: ElementoOsm[] };
  const vistos = new Set<string>();
  const saida: EmpresaEncontrada[] = [];

  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    const nome = tags.name?.trim();
    if (!nome) continue; // sem nome não serve para prospectar

    // Deduplica pelo nome: a mesma empresa às vezes aparece como ponto e como
    // área (o prédio), com ids diferentes.
    const chave = nome.toLowerCase().replace(/\s+/g, " ");
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    saida.push({
      fonte_id: `${el.type}/${el.id}`,
      nome,
      categoria: texto(tags, "amenity", "shop", "office", "healthcare", "leisure", "tourism"),
      endereco: montarEndereco(tags),
      telefone: texto(tags, "phone", "contact:phone", "contact:mobile"),
      website: texto(tags, "website", "contact:website", "url"),
      instagram: urlSocial(
        texto(tags, "contact:instagram", "instagram"),
        "https://instagram.com/",
      ),
      facebook: urlSocial(texto(tags, "contact:facebook", "facebook"), "https://facebook.com/"),
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
      temHorario: Boolean(tags.opening_hours),
      temEmail: Boolean(texto(tags, "email", "contact:email")),
    });
  }

  return saida.slice(0, limite);
}
