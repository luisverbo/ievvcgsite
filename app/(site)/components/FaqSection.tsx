import Reveal from "./Reveal";
import Faq from "./Faq";
import type { FaqItemRow } from "@/lib/types";

export default function FaqSection({ items }: { items: FaqItemRow[] }) {
  return (
    <Reveal id="duvidas">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Dúvidas frequentes</div>
          <h2>Antes de embarcar</h2>
        </div>
        <Faq items={items} />
      </div>
    </Reveal>
  );
}
