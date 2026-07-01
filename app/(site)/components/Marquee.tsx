const PAISES_PADRAO = [
  "ALEMANHA 🇩🇪",
  "ARGENTINA 🇦🇷",
  "EUA 🇺🇸",
  "ITÁLIA 🇮🇹",
  "AUSTRÁLIA 🇦🇺",
  "JAPÃO 🇯🇵",
  "MÉXICO 🇲🇽",
];

export default function Marquee({ paises }: { paises?: string[] }) {
  // Usa os países cadastrados em Comidas; entradas tipo "+11 países" ficam de fora
  const lista = (paises ?? []).filter((p) => !p.startsWith("+"));
  const nomes = lista.length >= 3 ? lista : PAISES_PADRAO;
  const items = [...nomes, ...nomes];

  return (
    <div className="marquee">
      <div className="track">
        {items.map((pais, i) => (
          <span key={i}>
            {pais} <b>·</b>
          </span>
        ))}
      </div>
    </div>
  );
}
