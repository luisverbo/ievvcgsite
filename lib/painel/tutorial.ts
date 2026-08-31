/*
 * O passo a passo da instalação, escrito uma vez só.
 *
 * Mora aqui, e não dentro de uma tela, porque aparece em três lugares — a
 * página "Comece aqui", a tela do agente e o convite na home — e três cópias
 * do mesmo texto viram três versões diferentes na primeira correção.
 *
 * Tom: quem lê isto vende seguro, não mexe com computador. Nada de "execute",
 * "diretório" ou "terminal"; e cada passo diz o que a pessoa VÊ acontecer,
 * para ela saber que deu certo sem precisar perguntar.
 */

export type PassoTutorial = {
  titulo: string;
  texto: string;
  /* O aviso de rodapé — o "e se…" que evita o chamado no suporte. */
  detalhe?: string;
  /* Passo que tem o botão de baixar embutido na tela. */
  download?: boolean;
  /* Passo que a maioria pula. Aparece destacado. */
  destaque?: boolean;
};

export const PASSOS_TUTORIAL: PassoTutorial[] = [
  {
    titulo: "Baixe o agente",
    texto:
      "Um arquivo só, no botão abaixo. Ele já vem com o seu código dentro — você não digita nada, não cria senha nenhuma e não configura nada.",
    detalhe:
      "Não repasse esse arquivo para ninguém: dentro dele vai o código que dá acesso à sua conta.",
    download: true,
  },
  {
    titulo: "Descompacte e clique duas vezes em INSTALAR-AGENTE",
    texto:
      "Clique com o botão direito no arquivo baixado e escolha “Extrair tudo” (no Mac, dois cliques já extraem). Abra a pasta e clique duas vezes em INSTALAR-AGENTE. Uma janela preta abre e faz o resto sozinha.",
    detalhe:
      "Extraia na Área de Trabalho, fora do Google Drive, OneDrive ou Dropbox. A primeira instalação leva alguns minutos — pode deixar rodando e ir tomar um café. Se o Windows mostrar o aviso azul “O Windows protegeu o computador”, clique em “Mais informações” → “Executar assim mesmo”: é o aviso padrão para programa novo, de qualquer empresa.",
  },
  {
    titulo: "Reinicie o computador",
    texto:
      "É o passo que quase todo mundo pula — e é justamente o que faz o agente ligar sozinho. Depois de reiniciar uma vez, toda vez que você ligar o computador ele acorda junto, minimizado, sem você clicar em nada.",
    detalhe:
      "Com pressa? Clique em LIGAR-AGENTE dentro da pasta e ele começa a trabalhar agora mesmo. Mas reinicie assim que der: é o que deixa tudo automático daí em diante.",
    destaque: true,
  },
  {
    titulo: "Conecte o seu WhatsApp — uma vez só",
    texto:
      "Volte para Prospecção › Abordagem aqui no painel. Vai aparecer um QR code na tela. No celular, abra o WhatsApp → Aparelhos conectados → Conectar aparelho e aponte para o QR.",
    detalhe:
      "É o mesmo QR do WhatsApp Web, e o seu número continua funcionando normalmente no celular. A conexão fica gravada só no seu computador — nós nunca vemos a sua senha.",
  },
];

/*
 * O que a pessoa NÃO precisa fazer.
 *
 * Vale tanto quanto os passos: o medo de quem compra não é o que ele vai ter
 * que fazer, é o que ele vai ter que aprender a fazer toda semana.
 */
export const NAO_PRECISA: string[] = [
  "Deixar o computador ligado a noite inteira — o agente trabalha quando você estiver usando o computador normalmente",
  "Abrir o programa toda vez: depois do reinício ele liga junto com o computador",
  "Instalar nada além disso, nem pagar por ferramenta de fora",
  "Repetir esta instalação — é uma vez só, nesta máquina",
];

/* O que acontece depois — para a instalação não parecer o produto. */
export const DEPOIS_DISSO: string[] = [
  "Você diz o ramo e a cidade (“clínica de estética em Campinas”)",
  "O agente varre o Google Maps e monta a lista com telefone e avaliações",
  "Você revisa, marca as melhores e manda abordar",
  "Ele conversa no seu WhatsApp, no seu ritmo, e avisa quem respondeu",
];
