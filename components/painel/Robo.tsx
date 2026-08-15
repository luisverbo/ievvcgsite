/*
 * O robô do agente — a cara da IA que trabalha pelo cliente.
 *
 * Desenhado em SVG, não em imagem: pesa ~1KB, fica nítido em qualquer
 * tamanho, herda as cores do tema e — o principal — ANIMA por estado. É o
 * que transforma "processo node rodando no seu computador" em "seu agente
 * está dormindo, clique para acordar".
 *
 * Estados:
 *   trabalhando  antena pulsando, olhos acesos, feixe de busca varrendo
 *   dormindo     olhos fechados, Zzz subindo — instalado, só não está aberto
 *   novo         apagado e translúcido, olhos vazios — nunca foi instalado
 *
 * Componente de servidor: toda a vida vem de CSS (keyframes em globals.css),
 * zero JavaScript no navegador.
 */

export type EstadoRobo = "trabalhando" | "dormindo" | "novo";

export default function Robo({
  estado,
  tamanho = 72,
}: {
  estado: EstadoRobo;
  tamanho?: number;
}) {
  const acordado = estado === "trabalhando";
  const corCorpo = estado === "novo" ? "#3a4152" : "#6c5ce7";
  const corPainel = estado === "novo" ? "#2a303e" : "#8e7bff";

  return (
    <span
      className="relative inline-block select-none"
      style={{ width: tamanho, height: tamanho }}
      aria-hidden
    >
      <svg
        viewBox="0 0 96 96"
        width={tamanho}
        height={tamanho}
        style={{
          animation: acordado ? "pp-flutuar 2.6s ease-in-out infinite" : undefined,
          opacity: estado === "novo" ? 0.55 : 1,
        }}
      >
        {/* feixe de busca — só quando trabalha */}
        {acordado && (
          <g style={{ transformOrigin: "48px 34px", animation: "pp-varrer 2.4s ease-in-out infinite" }}>
            <path d="M48 34 L30 8 L66 8 Z" fill="url(#feixe)" opacity="0.5" />
          </g>
        )}

        <defs>
          <linearGradient id="feixe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8e7bff" stopOpacity="0" />
            <stop offset="100%" stopColor="#8e7bff" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="corpo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={corPainel} />
            <stop offset="100%" stopColor={corCorpo} />
          </linearGradient>
        </defs>

        {/* antena */}
        <line x1="48" y1="22" x2="48" y2="30" stroke={corCorpo} strokeWidth="3" strokeLinecap="round" />
        <circle
          cx="48"
          cy="19"
          r="4.5"
          fill={acordado ? "#2fbf8f" : estado === "dormindo" ? "#f4a62a" : "#3a4152"}
          style={acordado ? { animation: "pp-piscar 1.6s infinite" } : undefined}
        />

        {/* cabeça */}
        <rect x="22" y="30" width="52" height="38" rx="14" fill="url(#corpo)" />
        <rect x="28" y="36" width="40" height="26" rx="9" fill="#0e1016" />

        {/* olhos */}
        {acordado ? (
          <g style={{ animation: "pp-piscar 3.4s infinite" }}>
            <circle cx="40" cy="49" r="4.5" fill="#8e7bff" />
            <circle cx="56" cy="49" r="4.5" fill="#8e7bff" />
            <circle cx="41.5" cy="47.5" r="1.6" fill="#f4f6fb" />
            <circle cx="57.5" cy="47.5" r="1.6" fill="#f4f6fb" />
          </g>
        ) : estado === "dormindo" ? (
          <g stroke="#8e7bff" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M36 50 q4 3.5 8 0" />
            <path d="M52 50 q4 3.5 8 0" />
          </g>
        ) : (
          <g stroke="#3a4152" strokeWidth="2.6" strokeLinecap="round">
            <line x1="37" y1="49" x2="44" y2="49" />
            <line x1="53" y1="49" x2="60" y2="49" />
          </g>
        )}

        {/* orelhas */}
        <rect x="15" y="42" width="7" height="14" rx="3.5" fill={corCorpo} />
        <rect x="74" y="42" width="7" height="14" rx="3.5" fill={corCorpo} />

        {/* corpo */}
        <rect x="32" y="72" width="32" height="14" rx="7" fill="url(#corpo)" opacity="0.9" />
        <circle cx="48" cy="79" r="3" fill={acordado ? "#2fbf8f" : "#0e1016"}>
          {acordado && (
            <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
          )}
        </circle>
      </svg>

      {/* Zzz de quem dorme — fora do SVG para tipografia limpa */}
      {estado === "dormindo" && (
        <span className="pointer-events-none absolute -right-1 top-0 font-display text-xs font-extrabold text-brand-2">
          <span style={{ display: "inline-block", animation: "pp-zzz 2.4s infinite" }}>z</span>
          <span style={{ display: "inline-block", animation: "pp-zzz 2.4s 0.5s infinite" }}>z</span>
          <span style={{ display: "inline-block", animation: "pp-zzz 2.4s 1s infinite" }}>Z</span>
        </span>
      )}
    </span>
  );
}
