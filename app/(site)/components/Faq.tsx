"use client";

import { useState } from "react";

export type FaqItem = {
  pergunta: string;
  resposta: string;
};

export default function Faq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="faq-list">
      {items.map((item, i) => (
        <div key={item.pergunta} className={`faq-item${openIndex === i ? " open" : ""}`}>
          <button
            className="faq-q"
            aria-expanded={openIndex === i}
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <span>{item.pergunta}</span>
            <span className="plus" aria-hidden="true">
              +
            </span>
          </button>
          <div className="faq-a">
            <p>{item.resposta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
