// Barras horizontais simples (server component). Cor única por gráfico para
// leitura limpa; largura proporcional ao maior valor.
export default function Bars({
  dados,
  cor = "var(--color-gold)",
}: {
  dados: { label: string; valor: number }[];
  cor?: string;
}) {
  const max = Math.max(1, ...dados.map((d) => d.valor));

  return (
    <div className="flex flex-col gap-1.5">
      {dados.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-16 flex-shrink-0 text-right text-xs text-cream-dim">{d.label}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-white/5">
            <div
              className="h-full rounded"
              style={{
                width: `${(d.valor / max) * 100}%`,
                backgroundColor: cor,
                minWidth: d.valor > 0 ? 2 : 0,
              }}
            />
          </div>
          <span className="w-10 flex-shrink-0 text-sm font-semibold tabular-nums">{d.valor}</span>
        </div>
      ))}
    </div>
  );
}
