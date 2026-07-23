import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Recebe o beacon de saída das páginas publicadas (sendBeacon não permite
// headers, então o insert anônimo é feito aqui no servidor — a RLS permite
// insert público em analytics_eventos).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const orgId = String(body.org_id ?? "");
  const siteId = String(body.site_id ?? "");
  if (!UUID.test(orgId) || !UUID.test(siteId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const maxScroll = Math.min(100, Math.max(0, Number(body.max_scroll) || 0));
  const tempoS = Math.min(7200, Math.max(0, Number(body.tempo_s) || 0));

  // Sanitiza o tempo por zona: só chaves 10..100 (dezenas), valores em segundos.
  const zonasEntrada = (body.zonas ?? {}) as Record<string, unknown>;
  const zonas: Record<string, number> = {};
  for (let z = 10; z <= 100; z += 10) {
    const v = Number(zonasEntrada[String(z)]);
    if (Number.isFinite(v) && v > 0) zonas[String(z)] = Math.min(7200, Math.round(v));
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  await supabase.from("analytics_eventos").insert({
    org_id: orgId,
    site_id: siteId,
    pagina_id: UUID.test(String(body.pagina_id ?? "")) ? body.pagina_id : null,
    tipo: "saida",
    rotulo: String(maxScroll),
    path: typeof body.path === "string" ? body.path.slice(0, 300) : null,
    dados: { max_scroll: maxScroll, tempo_s: tempoS, zonas },
  });

  return NextResponse.json({ ok: true });
}
