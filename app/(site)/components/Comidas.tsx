import Reveal from "./Reveal";
import type { Comida } from "@/lib/types";

export default function Comidas({ comidas }: { comidas: Comida[] }) {
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
