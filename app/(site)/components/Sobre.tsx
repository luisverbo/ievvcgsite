import Reveal from "./Reveal";

export default function Sobre({ texto }: { texto: string }) {
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
          <p className="sobre-body">{texto}</p>
        </div>
      </div>
    </Reveal>
  );
}
