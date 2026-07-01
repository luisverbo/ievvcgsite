import Reveal from "./Reveal";
import type { Patrocinador } from "@/lib/types";

export default function Patrocinadores({ patrocinadores }: { patrocinadores: Patrocinador[] }) {
  return (
    <Reveal>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Patrocinadores</div>
          <h2>Quem faz a festa acontecer</h2>
        </div>
        <div className="sponsors">
          {patrocinadores.map((sponsor) =>
            sponsor.logo_url ? (
              <a
                className="sponsor"
                key={sponsor.id}
                href={sponsor.link_url ?? "#"}
                style={{ padding: 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.nome}
                  style={{ objectFit: "contain", width: "100%", height: "100%" }}
                />
              </a>
            ) : (
              <div className="sponsor" key={sponsor.id}>
                {sponsor.nome}
              </div>
            ),
          )}
        </div>
      </div>
    </Reveal>
  );
}
