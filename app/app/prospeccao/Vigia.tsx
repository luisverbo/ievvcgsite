"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/*
 * O vigia do estado do agente.
 *
 * O momento "cliquei no LIGAR-AGENTE e o painel PERCEBEU sozinho" é o que
 * transforma um processo rodando em "meu agente acordou". Sem isto, o cliente
 * liga o agente, volta ao navegador e vê a tela dizendo dormindo até dar F5 —
 * e conclui que não funcionou.
 *
 * Dois ritmos, de propósito:
 *   esperando  o agente está desligado e o cliente provavelmente ACABOU de ir
 *              ligá-lo — checa rápido (8s) para a tela virar na hora.
 *   vigiando   está tudo ligado; checa devagar (45s) só para o banner não
 *              mentir quando o agente for fechado.
 *
 * router.refresh() repete a renderização no servidor sem perder scroll nem
 * estado dos formulários — não é um F5.
 */
export default function Vigia({ modo }: { modo: "esperando" | "vigiando" }) {
  const router = useRouter();

  useEffect(() => {
    const intervalo = modo === "esperando" ? 8_000 : 45_000;
    const id = window.setInterval(() => {
      // Aba em segundo plano não precisa vigiar nada.
      if (!document.hidden) router.refresh();
    }, intervalo);
    return () => window.clearInterval(id);
  }, [modo, router]);

  return null;
}
