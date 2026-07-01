import Reveal from "./Reveal";
import Faq from "./Faq";
import type { FaqItemRow } from "@/lib/types";
import { txt } from "@/lib/textos";

export default function FaqSection({
  items,
  textos,
}: {
  items: FaqItemRow[];
  textos: Record<string, string>;
}) {
  return (
    <Reveal id="duvidas">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">{txt(textos, "faq_eyebrow")}</div>
          <h2>{txt(textos, "faq_titulo")}</h2>
        </div>
        <Faq items={items} />
      </div>
    </Reveal>
  );
}
