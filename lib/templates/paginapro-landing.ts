// Landing page do PRÓPRIO PáginaPro (dogfooding): 3 páginas prontas que são
// criadas como um site normal na conta do dono via botão no /app/admin.
// Fica fora da galeria pública de templates — é material do produto.

import type { Tema } from "@/lib/types";
import type { TemplateBloco } from "./catalog";

export const LANDING_TEMA: Tema = {
  fonte_titulo: "Montserrat",
  cores: {
    night: "#0d0f17",
    night2: "#141826",
    night3: "#1c2236",
    cream: "#f4f6fb",
    creamDim: "#a9b2c7",
    gold: "#8e7bff",
    coral: "#6c5ce7",
    green: "#2fbf8f",
    pink: "#e878a6",
    violet: "#8e7bff",
  },
};

const CADASTRO = "/cadastro";

/* ------------------------------------------------------------------ */
/* PÁGINA PRINCIPAL — vende os 3 planos                                */
/* ------------------------------------------------------------------ */
const PRINCIPAL: TemplateBloco[] = [
  {
    tipo: "aviso",
    config: {
      texto: "🎁 7 dias grátis em qualquer plano — sem cartão de crédito",
      link_texto: "Começar agora",
      href: CADASTRO,
      cor: "violet",
    },
  },
  {
    tipo: "cabecalho",
    config: {
      nome: "PáginaPro",
      botao: { texto: "Começar grátis", href: CADASTRO, estilo: "primario", rastreio: "Cabecalho" },
    },
  },
  {
    tipo: "hero",
    config: {
      selo: "Feito no Brasil 🇧🇷 • Preço em real • Sem programador",
      titulo: "Sua Landing Page Profissional no Ar em Minutos",
      subtitulo:
        "Escolha um template pronto, troque os textos e publique. Páginas bonitas, rápidas e com métricas de venda — sem pagar mensalidade em dólar nem depender de ninguém.",
      alinhamento: "centro",
      botoes: [
        { texto: "Criar minha página grátis", href: CADASTRO, estilo: "primario", rastreio: "HeroPrincipal" },
        { texto: "Ver planos e preços", href: "#planos", estilo: "secundario", rastreio: "HeroVerPlanos" },
      ],
    },
  },
  {
    tipo: "estatisticas",
    config: {
      itens: [
        { numero: "15", rotulo: "templates prontos por nicho" },
        { numero: "21", rotulo: "blocos de conversão" },
        { numero: "5 min", rotulo: "do template ao site no ar" },
      ],
    },
  },
  {
    tipo: "midiatexto",
    config: {
      eyebrow: "Você conhece essa história",
      titulo: "Ferramenta gringa em dólar, página amadora ou orçamento caro de programador?",
      corpo:
        "Quem vende online hoje fica preso entre três opções ruins: pagar US$97/mês numa ferramenta em inglês, improvisar uma página feia que espanta cliente, ou esperar (e pagar caro) um desenvolvedor. Enquanto isso, cada dia sem página é venda que não acontece.",
      posicao: "direita",
      itens: [
        "Mensalidade em real, sem surpresa no câmbio",
        "Tudo em português, feito para o mercado brasileiro",
        "Você mesmo edita — sem código, sem esperar ninguém",
      ],
      botao: { texto: "Quero resolver isso", href: CADASTRO, estilo: "secundario", rastreio: "Problema" },
    },
  },
  {
    tipo: "passos",
    config: {
      eyebrow: "Como funciona",
      titulo: "Do zero ao site no ar em 3 passos",
      itens: [
        { titulo: "Escolha um template", texto: "15 modelos prontos por nicho: infoproduto, serviço local, evento, imobiliária, delivery e mais." },
        { titulo: "Troque textos e cores", texto: "Editor visual com prévia ao vivo. Clicou, editou, viu na hora — no computador e no celular." },
        { titulo: "Publique e divulgue", texto: "Seu link fica no ar na hora, pronto para colocar na bio e nos anúncios." },
      ],
    },
  },
  {
    tipo: "cards",
    config: {
      eyebrow: "O que vem dentro",
      titulo: "Tudo que uma página que vende precisa",
      colunas: 3,
      itens: [
        { emoji: "🎨", titulo: "Editor visual", texto: "Monte a página empilhando blocos prontos. Impossível ficar feio ou quebrar no celular." },
        { emoji: "📊", titulo: "Métricas de verdade", texto: "Visitas, cliques por botão, origem (Instagram, Google…) e mapa de calor — sem configurar nada." },
        { emoji: "✉️", titulo: "Captura de leads", texto: "Formulários que guardam nome, email e WhatsApp dos interessados direto no seu painel." },
        { emoji: "💬", titulo: "WhatsApp integrado", texto: "Botão flutuante de WhatsApp em todas as páginas, direto para o seu número." },
        { emoji: "📈", titulo: "Pixel do Facebook", texto: "Cole seu Pixel e rode anúncios com rastreamento desde o primeiro dia." },
        { emoji: "⚡", titulo: "Velocidade absurda", texto: "Páginas leves que carregam em menos de 1 segundo — Google e clientes agradecem." },
      ],
    },
  },
  {
    tipo: "midiatexto",
    config: {
      eyebrow: "O diferencial",
      titulo: "Você vai saber de onde vem cada clique",
      corpo:
        "A maioria das ferramentas te deixa no escuro. No PáginaPro, cada página mostra quem visitou, de onde veio (Instagram, Facebook, Google, direto), em qual botão clicou e até em que parte da página as pessoas desistem — com mapa de calor de rolagem.",
      posicao: "esquerda",
      itens: [
        "Origem das visitas por canal",
        "Cliques por botão cruzados com a origem",
        "Mapa de calor: onde leem e onde abandonam",
      ],
    },
  },
  {
    tipo: "depoimentos",
    config: {
      eyebrow: "Quem já usa",
      titulo: "Resultados de quem publicou",
      itens: [
        { texto: "Publiquei minha página de agendamento em uma tarde. No primeiro fim de semana já chegaram 12 pedidos pelo formulário.", autor: "Ana P. • estúdio de beleza" },
        { texto: "Eu pagava em dólar numa ferramenta que nem usava direito. Aqui é em real, em português e com as métricas que eu precisava pros meus anúncios.", autor: "Diego M. • infoprodutor" },
        { texto: "Fiz a página do meu cardápio em minutos usando o template de restaurante. Ficou melhor que a de agência que me cobraram R$1.500.", autor: "Rosana T. • delivery" },
      ],
    },
  },
  {
    tipo: "planos",
    config: {
      eyebrow: "Planos",
      titulo: "Escolha o seu — todos com 7 dias grátis",
      subtitulo: "Sem fidelidade. Cancele quando quiser.",
      itens: [
        {
          nome: "Básico",
          preco: 29,
          preco_sufixo: "/mês",
          descricao: "Para colocar sua primeira página no ar",
          itens: [
            "1 site com até 3 páginas",
            "Todos os templates e blocos",
            "Captura de leads",
            "Botão de WhatsApp",
            "Suporte por email",
          ],
          botao: { texto: "Começar no Básico", href: CADASTRO, estilo: "secundario", rastreio: "PlanoBasico" },
        },
        {
          nome: "Pro",
          preco: 59,
          preco_sufixo: "/mês",
          descricao: "Para quem anuncia e precisa medir",
          destaque: true,
          selo: "Mais popular",
          itens: [
            "3 sites com até 10 páginas cada",
            "Tudo do Básico",
            "Métricas completas + mapa de calor",
            "Origem das visitas e cliques por canal",
            "Domínio próprio (em breve)",
          ],
          botao: { texto: "Quero o Pro", href: CADASTRO, estilo: "primario", rastreio: "PlanoPro" },
        },
        {
          nome: "Premium",
          preco: 97,
          preco_sufixo: "/mês",
          descricao: "Para agências e múltiplos projetos",
          itens: [
            "7 sites com páginas ilimitadas",
            "Tudo do Pro",
            "5 domínios próprios (em breve)",
            "Suporte prioritário no WhatsApp",
          ],
          botao: { texto: "Quero o Premium", href: CADASTRO, estilo: "secundario", rastreio: "PlanoPremium" },
        },
      ],
    },
  },
  {
    tipo: "garantia",
    config: {
      emoji: "🛡️",
      selo: "7 dias grátis + sem fidelidade",
      titulo: "Teste sem risco nenhum",
      texto:
        "Crie sua conta, monte sua página e publique. Se em 7 dias você não quiser continuar, não paga nada — e pode cancelar a assinatura a qualquer momento, sem multa e sem burocracia.",
    },
  },
  {
    tipo: "faq",
    config: {
      eyebrow: "Dúvidas",
      titulo: "Perguntas frequentes",
      itens: [
        { pergunta: "Preciso saber programar?", resposta: "Não. Você escolhe um template, troca os textos e as fotos no editor visual e publica. Se sabe usar WhatsApp, sabe usar o PáginaPro." },
        { pergunta: "Em quanto tempo minha página fica no ar?", resposta: "Minutos. Os templates já vêm com estrutura e textos de venda prontos — você só personaliza e clica em Publicar." },
        { pergunta: "Funciona para o meu tipo de negócio?", resposta: "Temos templates para infoprodutos, serviços locais, delivery, imobiliária, eventos, portfólio, link de bio e mais — e você pode montar do zero com os blocos." },
        { pergunta: "Posso usar meu próprio domínio?", resposta: "O domínio próprio está chegando nos planos Pro e Premium. Por enquanto sua página fica num link exclusivo do PáginaPro, pronto para divulgar." },
        { pergunta: "Como funciona o cancelamento?", resposta: "Sem fidelidade: você cancela quando quiser e não é cobrado no mês seguinte. Simples assim." },
      ],
    },
  },
  {
    tipo: "cta",
    config: {
      titulo: "Sua página podia estar no ar ainda hoje",
      subtitulo: "Comece grátis agora — em 5 minutos você vê sua primeira página pronta.",
      botao: { texto: "Criar minha página grátis", href: CADASTRO, estilo: "primario", rastreio: "CTAFinal" },
    },
  },
  {
    tipo: "rodape",
    config: {
      texto: "PáginaPro",
      contato: "contato@paginapro.com.br",
      instagram_url: "https://instagram.com",
    },
  },
];

/* ------------------------------------------------------------------ */
/* /teste-gratis — foco total no trial de 7 dias                       */
/* ------------------------------------------------------------------ */
const TESTE_GRATIS: TemplateBloco[] = [
  {
    tipo: "aviso",
    config: {
      texto: "⏰ Oferta de lançamento: 7 dias grátis, sem cartão de crédito",
      cor: "green",
    },
  },
  {
    tipo: "cabecalho",
    config: {
      nome: "PáginaPro",
      botao: { texto: "Testar grátis", href: CADASTRO, estilo: "primario", rastreio: "Cabecalho" },
    },
  },
  {
    tipo: "hero",
    config: {
      selo: "Sem cartão • Sem compromisso • Cancela quando quiser",
      titulo: "Teste o PáginaPro Grátis por 7 Dias",
      subtitulo:
        "Crie sua conta em 1 minuto, monte sua landing page com um template pronto e publique hoje. Se não amar, é só não continuar — você não paga nada.",
      alinhamento: "centro",
      botoes: [
        { texto: "Começar meu teste grátis", href: CADASTRO, estilo: "primario", rastreio: "HeroTrial" },
      ],
    },
  },
  {
    tipo: "lista",
    config: {
      eyebrow: "No seu teste você já tem",
      titulo: "Acesso completo desde o primeiro minuto",
      itens: [
        "Todos os 15 templates prontos por nicho",
        "Editor visual com 21 blocos de conversão",
        "Sua página publicada num link pronto para divulgar",
        "Captura de leads com nome, email e WhatsApp",
        "Métricas de visitas e cliques para testar seus anúncios",
      ],
    },
  },
  {
    tipo: "passos",
    config: {
      eyebrow: "É rápido assim",
      titulo: "Do cadastro à página no ar",
      itens: [
        { titulo: "Crie sua conta", texto: "Só email e senha. Nada de cartão de crédito." },
        { titulo: "Escolha um template", texto: "Diga seu nicho e receba uma página pronta com textos de venda." },
        { titulo: "Publique", texto: "Personalize e clique em Publicar. Pronto: link no ar." },
      ],
    },
  },
  {
    tipo: "depoimentos",
    config: {
      eyebrow: "Quem testou, ficou",
      titulo: "O teste grátis que vira hábito",
      itens: [
        { texto: "Entrei só pra ver e no mesmo dia publiquei a página do meu lançamento. Nem senti os 7 dias passarem — assinei antes.", autor: "Diego M. • infoprodutor" },
        { texto: "Testei umas 4 ferramentas antes. Essa foi a única em que consegui deixar a página bonita sozinha.", autor: "Ana P. • estúdio de beleza" },
      ],
    },
  },
  {
    tipo: "planos",
    config: {
      eyebrow: "Depois do teste",
      titulo: "Planos a partir de R$29/mês",
      subtitulo: "Você escolhe o plano só se quiser continuar. Todos começam com os mesmos 7 dias grátis.",
      itens: [
        {
          nome: "Básico",
          preco: 29,
          preco_sufixo: "/mês",
          descricao: "1 site · 3 páginas",
          itens: ["Templates e blocos completos", "Leads + WhatsApp"],
          botao: { texto: "Testar grátis", href: CADASTRO, estilo: "secundario", rastreio: "TrialBasico" },
        },
        {
          nome: "Pro",
          preco: 59,
          preco_sufixo: "/mês",
          descricao: "3 sites · métricas completas",
          destaque: true,
          selo: "Mais popular",
          itens: ["Tudo do Básico", "Métricas + mapa de calor", "Domínio próprio (em breve)"],
          botao: { texto: "Testar grátis", href: CADASTRO, estilo: "primario", rastreio: "TrialPro" },
        },
        {
          nome: "Premium",
          preco: 97,
          preco_sufixo: "/mês",
          descricao: "7 sites · para agências",
          itens: ["Tudo do Pro", "Suporte no WhatsApp", "5 domínios (em breve)"],
          botao: { texto: "Testar grátis", href: CADASTRO, estilo: "secundario", rastreio: "TrialPremium" },
        },
      ],
    },
  },
  {
    tipo: "garantia",
    config: {
      emoji: "🔓",
      selo: "Risco zero de verdade",
      titulo: "Sem cartão, sem pegadinha",
      texto:
        "Não pedimos cartão no teste. Se os 7 dias acabarem e você não quiser assinar, sua conta simplesmente pausa — sem cobrança surpresa, sem email de cobrança chato.",
    },
  },
  {
    tipo: "faq",
    config: {
      eyebrow: "Dúvidas",
      titulo: "Antes de testar",
      itens: [
        { pergunta: "Precisa de cartão de crédito?", resposta: "Não. O teste é 100% gratuito e não pedimos cartão em nenhum momento." },
        { pergunta: "O que acontece quando os 7 dias acabam?", resposta: "Você escolhe um plano para continuar ou sua conta pausa. Nada é cobrado automaticamente." },
        { pergunta: "Minha página some se eu não assinar?", resposta: "Ela fica guardada. Assinou depois, está tudo lá do jeito que você deixou." },
      ],
    },
  },
  {
    tipo: "cta",
    config: {
      titulo: "7 dias grátis. 5 minutos para começar.",
      subtitulo: "O que você tem a perder — além da página que ainda não existe?",
      botao: { texto: "Começar meu teste grátis agora", href: CADASTRO, estilo: "primario", rastreio: "CTAFinalTrial" },
    },
  },
  {
    tipo: "rodape",
    config: { texto: "PáginaPro", contato: "contato@paginapro.com.br" },
  },
];

/* ------------------------------------------------------------------ */
/* /comecar — oferta única do plano Básico (venda direta)              */
/* ------------------------------------------------------------------ */
const COMECAR: TemplateBloco[] = [
  {
    tipo: "aviso",
    config: {
      texto: "🔥 Oferta de lançamento do plano Básico — vagas da primeira turma",
      link_texto: "Garantir",
      href: "#oferta",
      cor: "gold",
    },
  },
  {
    tipo: "cabecalho",
    config: {
      nome: "PáginaPro",
      botao: { texto: "Quero minha página", href: "#oferta", estilo: "primario", rastreio: "Cabecalho" },
    },
  },
  {
    tipo: "hero",
    config: {
      selo: "Menos de R$1 por dia",
      titulo: "Sua Landing Page Profissional por R$29/mês",
      subtitulo:
        "Pare de perder venda por não ter uma página decente. Template pronto, editor visual, leads no seu painel e link no ar hoje — pelo preço de uma pizza.",
      alinhamento: "centro",
      botoes: [
        { texto: "Quero começar por R$29", href: "#oferta", estilo: "primario", rastreio: "HeroComecar" },
      ],
    },
  },
  {
    tipo: "lista",
    config: {
      eyebrow: "Está incluso no Básico",
      titulo: "Tudo que você precisa para vender",
      itens: [
        "1 site com até 3 páginas publicadas",
        "15 templates prontos por nicho (infoproduto, serviço, delivery…)",
        "Editor visual com 21 blocos — impossível ficar feio",
        "Formulário de captura: leads com nome, email e WhatsApp",
        "Botão flutuante de WhatsApp em todas as páginas",
        "Pixel do Facebook para seus anúncios",
      ],
    },
  },
  {
    tipo: "estatisticas",
    config: {
      itens: [
        { numero: "5 min", rotulo: "do template ao link no ar" },
        { numero: "R$0,96", rotulo: "por dia — menos que um café" },
        { numero: "0", rotulo: "linhas de código necessárias" },
      ],
    },
  },
  {
    tipo: "depoimentos",
    config: {
      eyebrow: "Prova real",
      titulo: "Quem começou pelo Básico",
      itens: [
        { texto: "Achei que R$29 fosse ter pegadinha. Publiquei minha página no mesmo dia e os pedidos começaram a chegar pelo formulário.", autor: "Rosana T. • delivery" },
        { texto: "Eu ia pagar R$1.500 numa agência. Fiz sozinha em uma tarde e ficou do meu jeito.", autor: "Carla S. • consultora" },
      ],
    },
  },
  {
    tipo: "oferta",
    config: {
      eyebrow: "Plano Básico — oferta de lançamento",
      titulo: "Comece hoje por apenas:",
      preco: 29,
      preco_sufixo: "/mês • cancele quando quiser",
      aviso: "🎁 Bônus da primeira turma: eu configuro sua primeira página com você pelo WhatsApp.",
      botao: { texto: "QUERO MINHA PÁGINA AGORA", href: CADASTRO, estilo: "primario", rastreio: "ComprarBasico" },
    },
  },
  {
    tipo: "garantia",
    config: {
      emoji: "🛡️",
      selo: "7 dias de garantia",
      titulo: "Testou, não gostou, devolvo",
      texto:
        "Use por 7 dias. Se sentir que não é para você, devolvo 100% do valor — direto no Pix, sem perguntar o motivo.",
    },
  },
  {
    tipo: "faq",
    config: {
      eyebrow: "Últimas dúvidas",
      titulo: "Perguntas rápidas",
      itens: [
        { pergunta: "Preciso saber programar?", resposta: "Zero. É escolher template, trocar texto e publicar." },
        { pergunta: "Tem fidelidade?", resposta: "Nenhuma. Assinatura mensal, cancela quando quiser." },
        { pergunta: "Posso subir de plano depois?", resposta: "Sim! Quando precisar de mais sites ou das métricas avançadas, é só migrar para o Pro." },
      ],
    },
  },
  {
    tipo: "cta",
    config: {
      titulo: "R$29 e sua página no ar hoje",
      subtitulo: "Cada dia sem página é cliente indo para o concorrente.",
      botao: { texto: "Começar agora por R$29", href: CADASTRO, estilo: "primario", rastreio: "CTAFinalComecar" },
    },
  },
  {
    tipo: "rodape",
    config: { texto: "PáginaPro", contato: "contato@paginapro.com.br" },
  },
];

export const LANDING_PAGINAS: { slug: string; titulo: string; blocos: TemplateBloco[] }[] = [
  { slug: "", titulo: "PáginaPro — Principal", blocos: PRINCIPAL },
  { slug: "teste-gratis", titulo: "Teste grátis 7 dias", blocos: TESTE_GRATIS },
  { slug: "comecar", titulo: "Oferta Básico", blocos: COMECAR },
];
