import Reveal from "./Reveal";
import { txt } from "@/lib/textos";

export default function Destaques({ textos }: { textos: Record<string, string> }) {
  const cards = [
    { cls: "feat-kids", n: 1 },
    { cls: "feat-bazar", n: 2 },
    { cls: "feat-pass", n: 3 },
  ];

  return (
    <Reveal>
      <div className="wrap">
        <div className="feat-grid">
          {cards.map((card) => (
            <div className={`feat ${card.cls}`} key={card.n}>
              <span className="ic">{txt(textos, `destaque${card.n}_emoji`)}</span>
              <h3>{txt(textos, `destaque${card.n}_titulo`)}</h3>
              <p>{txt(textos, `destaque${card.n}_texto`)}</p>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
