import Reveal from "./Reveal";

const GRADIENTES = [
  "linear-gradient(150deg,#EF5B43,#7a2418)",
  "linear-gradient(150deg,#37B08A,#123f30)",
  "linear-gradient(150deg,#F4A62A,#7a5310)",
  "linear-gradient(150deg,#EA5C93,#6e2144)",
  "linear-gradient(150deg,#9D6BE0,#3d2569)",
  "linear-gradient(150deg,#37B08A,#123f30)",
  "linear-gradient(150deg,#EF5B43,#7a2418)",
  "linear-gradient(150deg,#F4A62A,#7a5310)",
];

export default function Galeria() {
  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Edições anteriores</div>
          <h2>Quem vem, se apaixona</h2>
        </div>
        <div className="gallery">
          {GRADIENTES.map((gradient, i) => (
            <div className="g" key={i} style={{ background: gradient }} />
          ))}
        </div>
      </div>
    </Reveal>
  );
}
