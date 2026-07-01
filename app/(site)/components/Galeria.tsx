import Reveal from "./Reveal";
import type { GaleriaItem } from "@/lib/types";
import { FALLBACK_GALERIA } from "@/lib/fallback-data";

export default function Galeria({ itens }: { itens: GaleriaItem[] }) {
  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Edições anteriores</div>
          <h2>Quem vem, se apaixona</h2>
        </div>
        <div className="gallery">
          {itens.length > 0
            ? itens.map((item) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="g"
                  key={item.id}
                  src={item.imagem_url}
                  alt=""
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
              ))
            : FALLBACK_GALERIA.map((gradient, i) => (
                <div className="g" key={i} style={{ background: gradient }} />
              ))}
        </div>
      </div>
    </Reveal>
  );
}
