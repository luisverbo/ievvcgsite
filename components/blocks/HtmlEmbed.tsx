"use client";

import { useEffect, useRef } from "react";

// Injeta HTML arbitrário do usuário E executa os <script> (inline e externos).
// innerHTML não roda scripts por segurança do navegador, então recriamos cada
// tag <script> — é o que faz o botão de 1 clique da Kiwify/Hotmart funcionar.
export default function HtmlEmbed({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = html;

    const scripts = Array.from(el.querySelectorAll("script"));
    for (const antigo of scripts) {
      const novo = document.createElement("script");
      for (const attr of Array.from(antigo.attributes)) {
        novo.setAttribute(attr.name, attr.value);
      }
      novo.textContent = antigo.textContent;
      antigo.replaceWith(novo); // recriar dispara o carregamento/execução
    }
  }, [html]);

  return <div ref={ref} className="pp-html" />;
}
