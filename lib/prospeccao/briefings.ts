/*
 * Briefing por nicho: o que precisa existir numa landing page daquele ramo.
 *
 * Sem isto a IA gera uma página genérica bonita, mas que não parece de um
 * dentista — e o dono percebe na hora. Cada texto diz as seções obrigatórias,
 * o tom e a direção visual do segmento.
 */

const PADRAO = `SEÇÕES: topo com o que a empresa faz e onde fica + botão de WhatsApp · serviços principais em cartões · por que escolher (diferenciais concretos) · depoimentos de clientes · localização com endereço e horário · chamada final para contato.
TOM: próximo e confiável, de negócio local que atende bem.
VISUAL: moderno e limpo, com foto do espaço e cores que combinem com o ramo.`;

const BRIEFINGS: Record<string, string> = {
  dentista: `SEÇÕES: topo com a promessa do sorriso + botão "Agendar avaliação" no WhatsApp · especialidades (clínico geral, implante, ortodontia, clareamento, prótese) em cartões com ícone · antes e depois (reserve o espaço, mesmo sem foto real) · a equipe/dentista responsável com CRO · convênios e formas de pagamento (parcelamento é decisivo aqui) · "como é a primeira consulta" em 3 passos, para tirar o medo · depoimentos de pacientes · localização com mapa, horário e estacionamento · FAQ (dói? quanto custa? atende convênio? tem horário aos sábados?).
TOM: acolhedor e tranquilizador — o medo de dentista é a maior objeção. Nada agressivo.
VISUAL: limpo e clínico com respiro, azul-petróleo/turquesa ou verde-menta com branco, tipografia arredondada. Passar higiene e tecnologia, nunca hospital frio.`,

  clinica: `SEÇÕES: topo com a especialidade e o botão de agendamento · especialidades atendidas · corpo clínico com CRM · convênios aceitos (lista visível — é o primeiro que o paciente procura) · exames e procedimentos · como agendar em 3 passos · depoimentos · estrutura da clínica em fotos · localização, horário e telefone · FAQ.
TOM: profissional e humano, transmitindo segurança técnica sem jargão médico.
VISUAL: azul e branco com um acento quente, muito espaço em branco, fotos de ambiente claro.`,

  medico: `SEÇÕES: topo com o nome do médico, especialidade e CRM + agendar · sobre o profissional (formação, tempo de experiência, onde se formou) · condições tratadas · como é a consulta · convênios e particular · depoimentos de pacientes · consultório e localização · FAQ.
TOM: autoridade serena. Aqui quem vende é a credibilidade do profissional, não a clínica.
VISUAL: sóbrio e elegante, foto profissional em destaque, paleta contida (azul profundo, grafite, off-white).`,

  veterinario: `SEÇÕES: topo emocional com o pet + "agendar consulta" · serviços (consulta, vacina, cirurgia, banho e tosa, exames) · atendimento de emergência e horário estendido em destaque · a equipe com foto · depoimentos de tutores · estrutura (internação, laboratório) · localização · FAQ.
TOM: carinhoso e empático — tutor trata pet como filho. Falar "seu amigo", não "o animal".
VISUAL: cores quentes e alegres (verde, laranja, azul claro), cantos bem arredondados, fotos de animais.`,

  estetica: `SEÇÕES: topo aspiracional + "agendar horário" · procedimentos em cartões com preço ou "a partir de" · antes e depois (essencial neste ramo) · profissionais e certificações · promoções e pacotes · depoimentos com resultado · o espaço em fotos · localização e horário · FAQ (dói? quantas sessões? quanto dura?).
TOM: aspiracional e confiante, falando de autoestima e resultado.
VISUAL: sofisticado e feminino sem ser clichê — nude, rosé, dourado suave ou preto com dourado; tipografia elegante.`,

  fisioterapia: `SEÇÕES: topo focado em alívio da dor + agendar · áreas (ortopédica, RPG, pilates, pós-cirúrgico, esportiva) · como funciona o tratamento em etapas · o fisioterapeuta com CREFITO · convênios · depoimentos de recuperação · estrutura e aparelhos · localização · FAQ.
TOM: esperançoso e técnico na medida — quem procura está com dor e quer saber quanto tempo leva.
VISUAL: energia e movimento, verde/azul vibrante, fotos de atendimento real.`,

  psicologo: `SEÇÕES: topo empático (falar da dor, não do serviço) + "agendar conversa" · como funciona a terapia · abordagens e temas atendidos (ansiedade, luto, relacionamento, burnout) · sobre o profissional com CRP · online e presencial · valores e frequência · sigilo e ética em destaque · FAQ.
TOM: acolhedor, humano e sem julgamento. Zero linguagem de venda agressiva — aqui pressão afasta.
VISUAL: calmo e suave, tons terrosos ou verde-sálvia, muito respiro, tipografia leve.`,

  advogado: `SEÇÕES: topo com a área de atuação e "fale com um advogado" · áreas do direito atendidas em cartões · como funciona o atendimento (primeira consulta, prazos) · sobre o escritório e o advogado com OAB · casos e resultados (sem violar sigilo) · depoimentos · escritório e localização · FAQ (quanto custa? quanto tempo demora? preciso ir presencialmente?).
TOM: autoridade e discrição. Nada de promessa de ganho de causa — é vedado pela OAB.
VISUAL: sóbrio e imponente, azul-marinho/grafite/bordô com dourado discreto, serifada no título. Aqui o clássico é adequado.`,

  contador: `SEÇÕES: topo com a dor (imposto, burocracia, multa) + "falar com um contador" · serviços (abertura de empresa, MEI, imposto de renda, folha, BPO financeiro) · para quem é (MEI, ME, profissional liberal) · planos com preço mensal — decisivo neste ramo · como funciona a migração de contador · depoimentos · FAQ.
TOM: prático e direto, resolvendo dor de cabeça. Fale em economia e tranquilidade.
VISUAL: confiável e moderno, azul e verde, ícones e números grandes.`,

  imobiliaria: `SEÇÕES: topo com busca de imóveis (campo de bairro/tipo) + WhatsApp · imóveis em destaque em cartões com foto, preço e características · serviços (comprar, vender, alugar, administrar) · por que anunciar com a gente (para o proprietário) · corretores da equipe com CRECI · depoimentos · região de atuação · FAQ.
TOM: confiança e agilidade — trata do maior investimento da vida da pessoa.
VISUAL: fotográfico e amplo, imagens grandes de imóveis, paleta neutra com um acento forte.`,

  arquiteto: `SEÇÕES: topo com uma imagem impactante de projeto + "solicitar orçamento" · portfólio em galeria (o portfólio É a venda) · serviços (projeto, interiores, reforma, acompanhamento) · como funciona o processo em etapas com prazo · sobre o escritório · depoimentos de clientes · FAQ (quanto custa um projeto? quanto tempo leva?).
TOM: autoral e sofisticado. Menos texto, mais imagem.
VISUAL: minimalista e editorial, preto e branco com um acento, tipografia grande, muito espaço negativo. A página tem que parecer o portfólio.`,

  seguros: `SEÇÕES: topo com proteção e "fazer cotação" · tipos de seguro (auto, vida, residencial, empresarial, saúde) · por que usar corretor em vez de contratar direto · como funciona o sinistro (a maior dúvida) · seguradoras parceiras · depoimentos · FAQ.
TOM: segurança e cuidado, sem alarmismo.
VISUAL: sólido e confiável, azul profundo com verde ou laranja, ícones de escudo/proteção.`,

  academia: `SEÇÕES: topo motivacional + "matricule-se" ou "aula experimental grátis" · modalidades (musculação, funcional, aulas coletivas, personal) · planos com preço em destaque e comparativo · estrutura e aparelhos em fotos · professores · horários das aulas · depoimentos com transformação · localização · FAQ (tem fidelidade? posso trancar?).
TOM: energético e motivador, sem intimidar iniciante.
VISUAL: alto contraste e movimento, preto com amarelo/lima/laranja elétrico, tipografia pesada em caixa alta, fotos de treino.`,

  escola: `SEÇÕES: topo com a proposta pedagógica + "agendar visita" · níveis/cursos oferecidos · diferenciais (metodologia, idiomas, período integral, tecnologia) · estrutura em fotos · corpo docente · depoimentos de pais e alunos · processo de matrícula em passos · mensalidade e bolsas · localização · FAQ.
TOM: confiança e acolhimento — quem decide é o pai, mas quem vive é a criança.
VISUAL: alegre e organizado, cores vivas com base clara, fotos de alunos, cantos arredondados.`,

  restaurante: `SEÇÕES: topo com foto do prato principal + "reservar" ou "pedir delivery" · cardápio ou destaques do menu com preço · ambiente em fotos · delivery e apps de entrega · reservas e eventos · avaliações de clientes · localização, horário e estacionamento · FAQ.
TOM: convidativo e sensorial — descreva sabor, não "qualidade".
VISUAL: apetitoso, fotos grandes de comida, fundo escuro valoriza prato; tipografia com personalidade.`,

  cafeteria: `SEÇÕES: topo com a atmosfera do lugar + endereço e horário · cardápio (cafés, doces, salgados, brunch) · o ambiente e o wi-fi para trabalhar · grãos e origem do café (diferencial que vende) · encomendas e eventos · avaliações · localização e horário · Instagram em destaque.
TOM: aconchegante e autoral, de quem ama café.
VISUAL: quente e artesanal — creme, terracota, marrom, verde-oliva; textura de papel, fotos de xícara e balcão.`,

  padaria: `SEÇÕES: topo com foto irresistível do produto + "encomendar pelo WhatsApp" · produtos (bolos, tortas, doces, salgados, pães) com foto e preço · encomendas para festas e eventos — é o maior ticket · sabores disponíveis · como encomendar em passos com prazo · depoimentos · entrega e retirada · localização e horário.
TOM: caloroso e caseiro, de receita de família.
VISUAL: doce e artesanal — creme, rosa queimado, chocolate, dourado; serifada calorosa, fotos macro do produto.`,

  bar: `SEÇÕES: topo com o clima do lugar + horário e reserva · drinks e cerveja em destaque · petiscos · programação (música ao vivo, jogos, happy hour) com dias · ambiente em fotos · reservas para grupos e aniversários · localização e horário · Instagram.
TOM: descontraído e convidativo, com personalidade.
VISUAL: noturno e vibrante, fundo escuro com neon ou âmbar, tipografia forte, fotos com movimento.`,

  lanchonete: `SEÇÕES: topo com o carro-chefe em foto grande + "peça agora no WhatsApp" · cardápio com preço · combos e promoções · delivery (área de entrega, tempo, taxa) e apps · avaliações · localização e horário.
TOM: direto e apetitoso, sem enrolação. Aqui a pessoa está com fome agora.
VISUAL: alto contraste e apetitoso, vermelho/amarelo/preto, tipografia pesada, foto do lanche gigante.`,

  roupas: `SEÇÕES: topo com o look da estação + "ver novidades no WhatsApp" · categorias de produto · peças em destaque com preço · tabela de tamanhos e trocas · formas de pagamento e parcelamento · a loja física em fotos · Instagram integrado (é a vitrine real) · localização e horário.
TOM: estiloso e atual, na linguagem do público da marca.
VISUAL: editorial de moda — fotos grandes, tipografia marcante, paleta alinhada ao estilo (minimalista, colorido, streetwear).`,

  otica: `SEÇÕES: topo com armações + "agendar exame de vista" · exame de vista grátis em destaque (a maior isca deste ramo) · marcas e tipos de lente (multifocal, antirreflexo, transitions) · óculos de sol · convênios e parcelamento · a loja em fotos · depoimentos · localização.
TOM: técnico e cuidadoso, misturando saúde e moda.
VISUAL: limpo e sofisticado, fundo claro com um acento, fotos de armação em detalhe.`,

  joalheria: `SEÇÕES: topo com a peça principal + "falar com consultor" · coleções · alianças e casamento (maior ticket, merece seção própria) · joias sob encomenda · garantia, certificado e procedência · cuidados com a peça · depoimentos · a loja e o atendimento · localização.
TOM: exclusivo e emocional — vende-se momento, não metal.
VISUAL: luxo escuro — preto/grafite com dourado ou champanhe, muito espaço negativo, foto macro com brilho.`,

  movelaria: `SEÇÕES: topo com um ambiente montado + "solicitar projeto" · ambientes (cozinha, dormitório, home office, closet) · projeto sob medida e como funciona em etapas · portfólio de projetos entregues · materiais e acabamentos · prazo de entrega e montagem · parcelamento · depoimentos · showroom e localização.
TOM: aspiracional e concreto — vende o ambiente pronto, não o móvel.
VISUAL: fotográfico e aconchegante, madeira e tons neutros, imagens grandes de ambiente.`,

  construcao: `SEÇÕES: topo com "orçamento rápido no WhatsApp" · linhas de produto · entrega e frete na região · atendimento a obra e profissional (pedreiro, engenheiro) · condições para grande volume · marcas trabalhadas · localização e horário.
TOM: prático e objetivo, focado em preço, prazo e disponibilidade.
VISUAL: robusto e direto, laranja/amarelo/cinza, tipografia forte, muito preço e informação.`,

  auto: `SEÇÕES: topo com "agendar serviço" + telefone · serviços (revisão, freio, suspensão, elétrica, ar-condicionado, injeção) · marcas atendidas · garantia dos serviços em destaque · orçamento sem compromisso · a oficina e os equipamentos em fotos · depoimentos · localização e horário.
TOM: confiança e transparência — o medo aqui é ser enganado. Fale em orçamento aprovado antes.
VISUAL: técnico e masculino, grafite com vermelho ou azul, ícones de ferramenta, fotos da oficina.`,

  hotel: `SEÇÕES: topo com a vista/fachada + "reservar" · acomodações com foto, capacidade e preço · comodidades (café da manhã, wi-fi, piscina, estacionamento, pet) · o que fazer na região · avaliações de hóspedes · políticas (check-in, check-out, cancelamento) · localização com mapa · contato direto.
TOM: convidativo e hospitaleiro, vendendo a experiência da estadia.
VISUAL: fotográfico e amplo, imagens grandes do quarto e da vista, paleta serena.`,
};

export function briefingDoNicho(chave: string | null | undefined): string {
  return BRIEFINGS[chave ?? ""] ?? PADRAO;
}
