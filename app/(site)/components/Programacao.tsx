import Reveal from "./Reveal";
import type { ProgramacaoItem } from "@/lib/types";
import { groupProgramacaoByDia } from "@/lib/format";

export default function Programacao({ itens }: { itens: ProgramacaoItem[] }) {
  const dias = groupProgramacaoByDia(itens);

  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Programação</div>
          <h2>Dois dias de festa</h2>
        </div>
        <div className="days">
          {dias.map((grupo, i) => (
            <div className="day" key={grupo.dia}>
              <div className="dnum">DIA {String(i + 1).padStart(2, "0")}</div>
              <h3>{grupo.dia}</h3>
              <ul>
                {grupo.itens.map((item) => (
                  <li key={item.id}>
                    <b>{item.horario}</b> {item.descricao}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
