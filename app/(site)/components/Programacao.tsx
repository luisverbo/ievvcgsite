import Reveal from "./Reveal";

const PROGRAMACAO = [
  {
    dnum: "DIA 01",
    dia: "Sexta · 17 jul",
    itens: [
      { horario: "18h", descricao: "Abertura dos portões e stands" },
      { horario: "19h", descricao: "Atração musical" },
      { horario: "21h", descricao: "Sorteios do passaporte" },
      { horario: "22h", descricao: "Show principal" },
      { horario: "00h", descricao: "Encerramento" },
    ],
  },
  {
    dnum: "DIA 02",
    dia: "Sábado · 18 jul",
    itens: [
      { horario: "18h", descricao: "Abertura dos portões e stands" },
      { horario: "19h", descricao: "Atração musical" },
      { horario: "21h", descricao: "Sorteios do passaporte" },
      { horario: "22h", descricao: "Show de encerramento" },
      { horario: "00h", descricao: "Encerramento" },
    ],
  },
];

export default function Programacao() {
  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Programação</div>
          <h2>Dois dias de festa</h2>
        </div>
        <div className="days">
          {PROGRAMACAO.map((dia) => (
            <div className="day" key={dia.dnum}>
              <div className="dnum">{dia.dnum}</div>
              <h3>{dia.dia}</h3>
              <ul>
                {dia.itens.map((item) => (
                  <li key={item.horario + item.descricao}>
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
