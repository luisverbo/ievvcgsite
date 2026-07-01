import Reveal from "./Reveal";
import { txt } from "@/lib/textos";

export default function Testemunho({ textos }: { textos: Record<string, string> }) {
  return (
    <Reveal>
      <div className="wrap">
        <div className="testemunho">
          <q>{txt(textos, "testemunho_texto")}</q>
          <span>{txt(textos, "testemunho_autor")}</span>
        </div>
      </div>
    </Reveal>
  );
}
