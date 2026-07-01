import Reveal from "./Reveal";

export default function Sobre() {
  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Sobre a festa</div>
          <h2>
            Toda a igreja,
            <br />
            um só propósito
          </h2>
        </div>
        <div className="sobre">
          <p className="sobre-lead">
            Em 2 dias, os <b>6 continentes</b> ganham vida em mais de <b>16 stands</b> —
            com comidas típicas, sorteios, atrações musicais e um grande bazar.
          </p>
          <p className="sobre-body">
            A tradicional Festa das Nações já faz parte do calendário de muitas famílias
            da Zona Oeste. Mais do que uma festa, é um evento que une a igreja em um só
            propósito: arrecadar fundos para a expansão da obra e a propagação do
            evangelho.
          </p>
        </div>
      </div>
    </Reveal>
  );
}
