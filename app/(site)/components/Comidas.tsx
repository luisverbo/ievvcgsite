import Reveal from "./Reveal";
import type { Comida } from "@/lib/types";
import { txt } from "@/lib/textos";
import { multiline } from "@/lib/multiline";

export default function Comidas({
  comidas,
  textos,
}: {
  comidas: Comida[];
  textos: Record<string, string>;
}) {
  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">{txt(textos, "comidas_eyebrow")}</div>
          <h2>{multiline(txt(textos, "comidas_titulo"))}</h2>
          <p>{txt(textos, "comidas_desc")}</p>
        </div>
        <div className="flag-grid">
          {comidas.map((item) => (
            <div className="flag-card" key={item.id}>
              <span className="emoji">{item.emoji}</span>
              <b>{item.pais}</b>
              <span>{item.prato}</span>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
