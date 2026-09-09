import { analisarResposta, parteNova } from "../../lib/prospeccao/automatica.ts";

let falhas = 0;
const eh = (nome: string, texto: string, esperado: boolean) => {
  const r = analisarResposta(texto);
  const ok = r.automatica === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? "✅" : "❌"} ${nome} → ${r.automatica ? `automática (${r.motivo})` : "gente"}`);
};

// ---- robôs de verdade ----
eh("o caso do print (ZL Brasil)", "Bom dia, seja bem-vindo(a)!\n\nVocê está conversando com o atendimento ao cliente da ZL Brasil Seguros.\n\nEstamos aqui para garantir sua segurança e tranquilidade. 🛡️", true);
eh("mensagem automática explícita", "Esta é uma mensagem automática. Recebemos o seu contato e responderemos em breve, obrigado!", true);
eh("fora do horário", "Olá! No momento estamos fora do horário de atendimento. Nosso horário de funcionamento é de segunda a sexta, das 9h às 18h.", true);
eh("menu de opções", "Olá! Para continuarmos, escolha uma opção:\n1 - Cotação\n2 - Sinistro\n3 - Falar com atendente", true);
eh("recebemos sua mensagem", "Obrigado por entrar em contato com a nossa empresa! Recebemos sua mensagem e em breve um de nossos atendentes irá responder.", true);
eh("duas pistas fracas", "Olá! Aqui é a central de atendimento. Nosso horário comercial é das 8h às 18h, fique à vontade para deixar sua mensagem.", true);

// ---- gente de verdade (o que NÃO pode virar robô) ----
eh("resposta curta", "Sim, sou eu", false);
eh("pergunta de gente", "Tudo bem sim, quem fala?", false);
eh("recusa", "Não tenho interesse, obrigado", false);
eh("interesse com texto longo", "Oi! Sim, é da ZL Brasil sim. Estamos precisando sim de um site novo, o nosso está bem antigo e não aparece no Google. Pode me mandar mais informações de valores?", false);
eh("dono simpático e prolixo", "Bom dia! Tudo ótimo por aqui, obrigado por perguntar. Sim, falo com você, sou o Marcelo, sócio da corretora. Do que se trata?", false);
eh("uma pista fraca só", "Bom dia! Como podemos te ajudar hoje? Aqui é o Marcelo falando, pode mandar.", false);

// ---- parte nova ----
const auto = "Bom dia, seja bem-vindo!";
const check = (nome: string, ok: boolean, extra = "") => { if (!ok) falhas++; console.log(`${ok ? "✅" : "❌"} ${nome} ${extra}`); };
check("texto igual → nada novo", parteNova(auto, auto) === "");
check("humano depois do robô", parteNova(auto + "\nOi, sou o Marcelo", auto) === "Oi, sou o Marcelo", JSON.stringify(parteNova(auto + "\nOi, sou o Marcelo", auto)));
check("sem nada visto antes", parteNova("Oi", null) === "Oi");
check("velho saiu da janela", parteNova(auto.slice(0, 10), auto) === "");
check("texto totalmente diferente", parteNova("Quanto custa?", auto) === "Quanto custa?");

console.log(falhas === 0 ? "\nTODOS OS CASOS PASSARAM" : `\n${falhas} CASO(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);
