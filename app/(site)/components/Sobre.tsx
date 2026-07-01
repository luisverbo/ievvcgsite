import Reveal from "./Reveal";
import { txt } from "@/lib/textos";
import { multiline } from "@/lib/multiline";

export default function Sobre({
  texto,
  textos,
}: {
  texto: string;
  textos: Record<string, string>;
}) {
  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">{txt(textos, "sobre_eyebrow")}</div>
          <h2>{multiline(txt(textos, "sobre_titulo"))}</h2>
        </div>
        <div className="sobre">
          <p className="sobre-lead">{txt(textos, "sobre_lead")}</p>
          <p className="sobre-body">{texto}</p>
        </div>
      </div>
    </Reveal>
  );
}
