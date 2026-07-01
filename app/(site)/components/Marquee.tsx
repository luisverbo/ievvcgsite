const PAISES = [
  "ALEMANHA 🇩🇪",
  "ARGENTINA 🇦🇷",
  "EUA 🇺🇸",
  "ITÁLIA 🇮🇹",
  "AUSTRÁLIA 🇦🇺",
  "JAPÃO 🇯🇵",
  "MÉXICO 🇲🇽",
];

export default function Marquee() {
  const items = [...PAISES, ...PAISES];
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
