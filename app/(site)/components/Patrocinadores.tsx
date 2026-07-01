import Reveal from "./Reveal";

export default function Patrocinadores() {
  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Patrocinadores</div>
          <h2>Quem faz a festa acontecer</h2>
        </div>
        <div className="sponsors">
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="sponsor" key={i}>
              Sua marca
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
