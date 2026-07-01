import Reveal from "./Reveal";

const COMIDAS = [
  { emoji: "🥨", pais: "Alemanha", prato: "Pernil" },
  { emoji: "🥩", pais: "Argentina", prato: "Churrasco" },
  { emoji: "🍔", pais: "EUA", prato: "Burger" },
  { emoji: "🍝", pais: "Itália", prato: "Massas" },
  { emoji: "🍖", pais: "Austrália", prato: "BBQ" },
  { emoji: "🌎", pais: "+11 países", prato: "e mais" },
];

export default function Comidas() {
  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Comidas típicas</div>
          <h2>
            Uma volta ao mundo
            <br />
            em cada mordida
          </h2>
          <p>
            Sanduíche de pernil da Alemanha ou costelinha barbecue da Austrália —
            impossível provar e não se apaixonar.
          </p>
        </div>
        <div className="flag-grid">
          {COMIDAS.map((item) => (
            <div className="flag-card" key={item.pais}>
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
