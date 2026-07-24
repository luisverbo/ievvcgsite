"use client";

import { useEffect } from "react";

// Anima a entrada das seções ao rolar, sem criar wrappers (não interfere no
// position:sticky do cabeçalho). Sem JS, nada é escondido: a classe pp-anim
// só entra aqui, então o fallback é o site 100% visível.
export default function RevealSite() {
  useEffect(() => {
    const root = document.querySelector(".pp-site");
    if (!root) return;
    root.classList.add("pp-anim");

    const alvos = Array.from(root.children).filter(
      (el) =>
        el instanceof HTMLElement &&
        !el.classList.contains("pp-header") &&
        !el.classList.contains("pp-aviso-bar"),
    ) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("pp-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );
    alvos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
