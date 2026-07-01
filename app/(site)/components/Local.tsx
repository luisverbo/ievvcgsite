import Reveal from "./Reveal";
import { txt } from "@/lib/textos";
import { multiline } from "@/lib/multiline";

export default function Local({
  endereco,
  textos,
}: {
  endereco: string;
  textos: Record<string, string>;
}) {
  const itens = txt(textos, "local_itens")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const nome = txt(textos, "local_nome");

  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">{txt(textos, "local_eyebrow")}</div>
          <h2>{multiline(txt(textos, "local_titulo"))}</h2>
        </div>
        <div className="local">
          <div className="addr">
            📍 {nome ? `${nome} — ` : ""}
            {endereco}
          </div>
          <ul>
            {itens.map((item) => (
              <li key={item}>
                <b aria-hidden="true">✓</b> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}
