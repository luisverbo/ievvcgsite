/*
 * Busca avulsa pelo terminal, sem passar pela fila.
 *
 *   npm run prospectar -- --nicho=dentista --local="Barra da Tijuca, RJ" --limite=20
 *
 * Útil para testar seletores e para uma busca rápida. O uso do dia a dia é
 * pelo painel, com o serviço (npm run servico) atendendo a fila.
 */

import { createClient } from "@supabase/supabase-js";

import { coletarDoGoogle } from "./coletor.ts";
import { pontuarEGravar } from "./gravar.ts";
import { acharNicho, NICHOS } from "../lib/prospeccao/nichos.ts";

function arg(nome: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);
}
const temFlag = (nome: string) => process.argv.includes(`--${nome}`);

const NICHO = arg("nicho") ?? "";
const LOCAL = arg("local") ?? "";
const LIMITE = Math.min(120, Math.max(1, Number(arg("limite")) || 20));

async function main() {
  if (!acharNicho(NICHO) || LOCAL.length < 3) {
    console.log("\nUso:");
    console.log('  npm run prospectar -- --nicho=dentista --local="Barra da Tijuca, RJ" --limite=20\n');
    console.log("Opções: --headless (sem janela)  --debug (salva print ao falhar)  --pausa=2500");
    console.log(`\nNichos: ${NICHOS.map((n) => n.chave).join(", ")}\n`);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    console.log("\n❌ Faltam as variáveis. Crie agente/.env a partir do .env.example.\n");
    process.exit(1);
  }
  const supabase = createClient(url, chave, { auth: { persistSession: false } });

  const orgId =
    arg("org") ??
    (await supabase.from("organizacoes").select("id").order("created_at").limit(1).maybeSingle())
      .data?.id;
  if (!orgId) {
    console.log("\n❌ Não achei sua organização no Supabase. Passe --org=<uuid>.\n");
    process.exit(1);
  }

  console.log(`\n🔎 ${NICHO} em "${LOCAL}" — até ${LIMITE} empresas\n`);

  const r = await coletarDoGoogle(NICHO, LOCAL, LIMITE, {
    headless: temFlag("headless"),
    debug: temFlag("debug"),
    pausaMs: Number(arg("pausa")) || undefined,
    log: (m) => console.log(`   ${m}`),
  });

  if (r.bloqueio && r.empresas.length === 0) {
    console.log(`\n⛔ O Google mostrou ${r.bloqueio}. Parando — não vou tentar burlar.`);
    console.log("   Espere alguns minutos e tente com um limite menor.\n");
    return;
  }
  if (r.empresas.length === 0) {
    console.log("\n❌ Nenhuma empresa lida. Os seletores do Google podem ter mudado.");
    console.log("   Rode com --debug e me mande os arquivos de agente/diagnostico/.\n");
    return;
  }

  const resumo = await pontuarEGravar(
    supabase,
    orgId,
    NICHO,
    LOCAL,
    r.empresas,
    (m) => console.log(`   ${m}`),
  );

  console.log("\n────────────────────────────────────────");
  console.log(`✅ ${resumo.gravadas} empresas gravadas no painel`);
  console.log(
    `   ${resumo.oportunidades} com oportunidade real · ${resumo.quentes} de prioridade alta`,
  );
  if (r.falhas) console.log(`   ${r.falhas} não puderam ser lidas`);
  if (r.bloqueio) console.log(`   ⚠️  parou no meio: ${r.bloqueio}`);
  console.log("\n   Veja em: /app/admin/prospeccao\n");
}

main();
