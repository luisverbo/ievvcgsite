import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { ehAdmin } from "../../actions";
import Painel from "./Painel";
import type { ConfigAbordagem, MensagemRow } from "./actions";
import { telefoneWhatsapp } from "@/lib/prospeccao/mensagem";
import type { ProspectoRow } from "@/lib/prospeccao/tipos";

export default async function AbordagemPage() {
  if (!(await ehAdmin())) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();

  const supabase = await createClient();
  const [{ data: cfgRaw }, { data: msgsRaw }, { data: prospRaw }] = await Promise.all([
    supabase.from("prospeccao_config").select("*").eq("org_id", org.id).maybeSingle(),
    supabase
      .from("prospeccao_mensagens")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("prospeccao")
      .select("*")
      .eq("org_id", org.id)
      .eq("status", "novo")
      .order("pontuacao", { ascending: false })
      .limit(200),
  ]);

  const config: ConfigAbordagem = (cfgRaw as ConfigAbordagem | null) ?? {
    org_id: org.id,
    remetente_nome: null,
    modelo_mensagem: null,
    limite_diario: 20,
    intervalo_min_s: 45,
    intervalo_max_s: 150,
    whatsapp_status: "desconectado",
    whatsapp_qr: null,
    whatsapp_mensagem: null,
    whatsapp_em: null,
  };

  const mensagens = (msgsRaw as MensagemRow[] | null) ?? [];
  const jaNaFila = new Set(mensagens.map((m) => m.prospecto_id));
  const prospectos = (prospRaw as ProspectoRow[] | null) ?? [];

  // Só vale abordar quem tem celular (WhatsApp em fixo é raro) e ainda não
  // entrou na fila.
  const candidatos = prospectos.filter(
    (p) => telefoneWhatsapp(p.telefone) && !jaNaFila.has(p.id),
  );

  const nomePorProspecto: Record<string, string> = {};
  for (const p of prospectos) nomePorProspecto[p.id] = p.nome;

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href="/app/admin/prospeccao" className="text-sm text-paper-dim hover:text-paper">
          ← Prospecção
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Abordagem 💬</h1>
        <p className="mt-1 max-w-3xl text-sm text-paper-dim">
          A primeira mensagem <b className="text-paper">não leva o link do site</b> — ela pergunta
          se pode mandar. Só quem responder vira site gerado, então você não gasta com quem nem
          respondeu.
        </p>
      </div>

      <div className="rounded-xl border border-brand-2/30 bg-brand/10 px-4 py-3 text-xs text-paper-dim">
        ⚠️ Disparo automático fere os termos do WhatsApp e{" "}
        <b className="text-paper">pode custar o número</b>. Use sempre um chip separado, comece
        devagar (15 a 20 por dia) e aumente só se não houver bloqueio. O modo manual não tem esse
        risco.
      </div>

      <Painel
        config={config}
        candidatos={candidatos}
        mensagens={mensagens}
        nomePorProspecto={nomePorProspecto}
      />
    </div>
  );
}
