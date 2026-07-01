import Reveal from "./Reveal";

const ITENS_SEGURANCA = [
  "Saídas de emergência sinalizadas",
  "Equipe de segurança em todo o evento",
  "Ambulância do Corpo de Bombeiros de plantão",
  "Estrutura para até 5.000 pessoas com conforto",
  "Estacionamentos particulares próximos",
];

export default function Local() {
  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Local amplo e seguro</div>
          <h2>
            Pode ficar tranquilo,
            <br />
            cuidamos de tudo
          </h2>
        </div>
        <div className="local">
          <div className="addr">
            📍 Espaço de Eventos Verbo CG — Rua Alfredo de Morais, 589, Campo Grande, RJ
          </div>
          <ul>
            {ITENS_SEGURANCA.map((item) => (
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
