import Reveal from "./Reveal";
import Faq from "./Faq";

const PERGUNTAS = [
  {
    pergunta: "Quando e onde será?",
    resposta:
      "17 e 18 de julho, das 18h à 00h, no Espaço de Eventos Verbo Campo Grande — Rua Alfredo de Morais, 589, Campo Grande, RJ.",
  },
  {
    pergunta: "Como funciona o ingresso?",
    resposta:
      "É seu passe livre para os shows e stands. Válido para 1 dia de festa. Crianças até 3 anos não pagam. Não é necessário para o bazar.",
  },
  {
    pergunta: "Como é o pagamento na festa?",
    resposta:
      'Na Casa de Câmbio você compra tickets de consumação — é o "dinheiro" da festa para comida, bebida e brinquedos. Sobrou? Troque de volta até 00h.',
  },
  {
    pergunta: "O que é o passaporte?",
    resposta:
      "Sua porta de entrada para os sorteios. Prove as comidas, colecione 8 selos diferentes, preencha com nome + telefone e devolva na Casa de Câmbio.",
  },
  {
    pergunta: "Posso ser patrocinador?",
    resposta:
      "Sim! Escreva para contato.festadasnacoes@gmail.com e solicite nosso Mídia Kit.",
  },
];

export default function FaqSection() {
  return (
    <Reveal id="duvidas">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Dúvidas frequentes</div>
          <h2>Antes de embarcar</h2>
        </div>
        <Faq items={PERGUNTAS} />
      </div>
    </Reveal>
  );
}
