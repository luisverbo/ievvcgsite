/*
 * Todos os testes do agente, num comando:
 *
 *     cd agente && npm test
 *
 * São três frentes, e cada uma nasceu de um bug que custou horas:
 *
 *   envio     — abrir a conversa e mandar (o "Iniciando conversa" eterno, a
 *               caixa que muda de marcação, a conta restringida);
 *   escuta    — reconhecer quem respondeu (o teto de 30s que fazia a escuta
 *               desistir calada, e a conta comercial que esconde o número);
 *   automática/janela — as regras puras (robô da empresa, horário de envio).
 *
 * O simulador sobe um WhatsApp Web de mentira em http://127.0.0.1 e roda o
 * código de verdade do agente contra ele. Não substitui o WhatsApp real —
 * substitui o "acho que agora vai".
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SUITES = ["automatica.mts", "janela.mts", "envio.mts", "escuta.mts"];

let falhou = false;
for (const suite of SUITES) {
  console.log(`\n──────── ${suite} ────────`);
  const codigo = await new Promise<number>((resolve) => {
    const p = spawn(process.execPath, ["--import", "tsx", path.join(AQUI, suite)], {
      stdio: "inherit",
      cwd: path.join(AQUI, ".."),
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers" },
    });
    p.on("exit", (c) => resolve(c ?? 1));
  });
  if (codigo !== 0) falhou = true;
}

console.log(falhou ? "\n❌ alguma suíte falhou" : "\n✅ tudo passou");
process.exit(falhou ? 1 : 0);
