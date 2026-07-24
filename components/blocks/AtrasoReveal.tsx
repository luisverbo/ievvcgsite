"use client";

import { useEffect, useState } from "react";

// Mostra o bloco só depois de N segundos na página (surgindo com animação).
// Usado para revelar ofertas/CTAs quando o visitante já está engajado.
export default function AtrasoReveal({
  segundos,
  children,
}: {
  segundos: number;
  children: React.ReactNode;
}) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisivel(true), Math.max(0, segundos) * 1000);
    return () => clearTimeout(t);
  }, [segundos]);

  return (
    <div className={`pp-atraso${visivel ? " pp-atraso-visivel" : ""}`} aria-hidden={!visivel}>
      {children}
    </div>
  );
}
