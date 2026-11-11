/**
 * Textos e links da página inicial, num lugar só.
 * Para mudar uma frase, um preço de exemplo ou uma pergunta do FAQ, edite aqui:
 * as seções em components/inicio só montam o visual.
 */

/**
 * WhatsApp do time para o botão fixo e o "chama no WhatsApp" do FAQ.
 * Só números, com 55 + DDD (ex.: "5511987654321"). Vazio = o botão não aparece.
 */
export const WHATSAPP_CONTATO = "";
export const MENSAGEM_WHATSAPP = "Oi! Vi o site do Vai de Corte e quero saber mais sobre o link de agendamento para a minha barbearia.";

/** Barbearia aberta no botão "Ver uma barbearia de exemplo". */
export const LINK_EXEMPLO = "/barbearia/ficticia-navalha-de-ouro";

export const LINKS = {
  cadastro: "/cadastro",
  entrar: "/login",
  exemplo: LINK_EXEMPLO,
};

export const MENU = [
  { href: "#como-funciona", rotulo: "Como funciona" },
  { href: "#recursos", rotulo: "Recursos" },
  { href: "#duvidas", rotulo: "Dúvidas" },
];

export const SELO_GRATIS = "Grátis · sem cartão · pronto em 5 minutos";

export const HERO = {
  etiqueta: "Agenda online para barbearias",
  // O título fica em duas linhas: "Seu cliente marca." / "Você corta." (com "corta" em dourado).
  subtitulo:
    "Um link de agendamento só da sua barbearia. O cliente escolhe o serviço, o barbeiro e o horário sozinho, e você acompanha tudo num painel com a agenda de cada um.",
  ctaPrincipal: "Criar minha barbearia grátis",
  ctaSecundario: "Ver uma barbearia de exemplo",
  provas: ["Pronto em 5 minutos", "Sem app para o cliente", "Sem horário duplicado"],
};

export const DORES = [
  { titulo: "Mensagem no meio do corte.", texto: "\"Tem horário hoje?\" chega com a máquina na mão, e o cliente da cadeira espera." },
  { titulo: "Cliente das 23h que some.", texto: "Ele pergunta à noite, você responde de manhã, e ele já marcou em outro lugar." },
  { titulo: "Dois no mesmo horário.", texto: "Agenda no caderno ou na cabeça uma hora falha, e alguém fica esperando." },
];

export const SOBRE = {
  titulo: "Feito para quem vive com a máquina na mão.",
  paragrafos: [
    "Barbeiro bom não tem tempo de ficar no WhatsApp. Entre um corte e outro chega \"tem horário hoje?\", \"e amanhã às 18h?\", \"pode ser com o Carlos?\". Você para, responde, perde o ritmo, e às vezes perde o cliente.",
    "O Vai de Corte resolve essa parte. Sua barbearia ganha um link próprio, que vai na bio do Instagram e num QR Code no balcão. O cliente abre, vê os serviços com preço e duração, escolhe o barbeiro e marca num horário que está livre de verdade.",
    "Somos o time Programadores da Fiel, de Mogi das Cruzes, e criamos o Vai de Corte no Startup Challenge da UMC 2026. Começamos pelas barbearias de Mogi e do Alto Tietê, mas o sistema funciona em qualquer cidade do Brasil.",
  ],
};

export const PASSOS = [
  { titulo: "Cadastre sua barbearia.", texto: "Nome, endereço, serviços, preços e barbeiros. Dá para fazer tudo pelo celular." },
  { titulo: "Divulgue o link.", texto: "Coloque na bio do Instagram, mande no status do WhatsApp e deixe o QR Code no balcão." },
  { titulo: "O cliente marca.", texto: "Ele escolhe serviço, barbeiro e horário, e coloca só o nome e o WhatsApp." },
  { titulo: "Você corta.", texto: "O horário aparece na agenda, você recebe o aviso e, se quiser, manda o lembrete na véspera." },
];

export const CLIENTE_VE = {
  titulo: "O que o seu cliente vê.",
  texto: "Sem app. Sem cadastro. Só nome e WhatsApp. Em menos de um minuto ele sai com o horário marcado.",
  telas: [
    { tela: "servico", legenda: "Escolhe o serviço, com preço e duração." },
    { tela: "barbeiro", legenda: "Escolhe o barbeiro, ou qualquer um disponível." },
    { tela: "horario", legenda: "Vê só os horários que cabem de verdade." },
    { tela: "confirmado", legenda: "Recebe a confirmação e salva na agenda." },
  ] as const,
};

/** Dados de exemplo mostrados nos celulares (barbearia fictícia, não é cliente real). */
export const EXEMPLO_CELULAR = {
  barbearia: "Navalha de Ouro",
  servicos: [
    { nome: "Corte", preco: "R$ 40", duracao: "30 min" },
    { nome: "Barba", preco: "R$ 30", duracao: "30 min" },
    { nome: "Corte + barba", preco: "R$ 65", duracao: "1 h" },
  ],
  barbeiros: ["Qualquer disponível", "Carlos", "Rafael"],
  dia: "Sábado, 14 de novembro",
  horarios: ["09:00", "09:30", "10:30", "11:00", "13:30", "14:00", "15:30", "16:00", "17:30"],
  escolhido: { servico: "Corte + barba", barbeiro: "Carlos", horario: "10:30" },
};

export const PAINEL = {
  titulo: "O que você recebe.",
  texto: "A página da barbearia para o cliente e um painel para você e para cada barbeiro. Sem planilha e sem caderno.",
  // As fotos de cada card ficam em secao-painel.tsx (precisam de import).
  cards: [
    { titulo: "Agenda de cada barbeiro", texto: "Cada um com seus horários, almoço e folgas. Confirmar, concluir, cancelar ou marcar falta com um toque." },
    { titulo: "Página da sua barbearia", texto: "Nome, logo, fotos, endereço, horário de funcionamento, serviços com preço e duração, e os barbeiros da casa." },
    { titulo: "Lembrete pelo WhatsApp", texto: "Um toque abre o WhatsApp do cliente com a mensagem pronta. Sai do seu número, do seu jeito." },
    { titulo: "Ganhos do mês", texto: "Quanto foi faturado, quantas faltas e quais serviços mais saem, por barbeiro." },
  ],
  extras: [
    "Bloqueio de horário para médico, compromisso ou folga extra",
    "Agendamento feito no balcão lançado em segundos",
    "Aviso no celular quando entra horário novo",
    "Botão de Google Agenda para o cliente",
  ],
};

export const DIFERENCIAIS = {
  titulo: "Por que o Vai de Corte.",
  itens: [
    { icone: "gratis", titulo: "Grátis de verdade.", texto: "Sem cartão, sem mensalidade escondida. Você mesmo cadastra tudo em uns 5 minutos." },
    { icone: "duplicado", titulo: "Ninguém marca em cima de ninguém.", texto: "Antes de confirmar, o sistema confere de novo se o horário ainda está livre." },
    { icone: "dia", titulo: "Respeita o seu dia.", texto: "Leva em conta a duração de cada serviço, o almoço, as folgas e os horários bloqueados." },
    { icone: "qualquer", titulo: "\"Qualquer barbeiro disponível\".", texto: "O cliente sem preferência vê quem está livre e escolhe na hora." },
    { icone: "fechado", titulo: "Aberto mesmo fechado.", texto: "Quem lembra do corte às 23h marca na hora, em vez de esperar sua resposta de manhã." },
    { icone: "whatsapp", titulo: "O WhatsApp continua seu.", texto: "O lembrete sai do seu número, com a mensagem pronta. Sem robô, sem número estranho." },
    { icone: "aviso", titulo: "Aviso no celular.", texto: "Entrou horário novo pelo link, você e o barbeiro ficam sabendo." },
    { icone: "agenda", titulo: "Google Agenda para o cliente.", texto: "Depois de marcar, ele salva o horário no celular com um toque." },
  ],
} as const;

/**
 * Barbearias reais que usam o Vai de Corte. Enquanto a lista estiver vazia, a seção não aparece.
 * Só coloque frases e fotos reais, com autorização do dono.
 * Exemplo: { barbearia: "Barbearia do Zé", cidade: "Mogi das Cruzes", dono: "José", frase: "...", link: "/barbearia/ze" }
 */
export const DEPOIMENTOS: { barbearia: string; cidade: string; dono: string; frase: string; link?: string }[] = [];

export const FAQ = [
  {
    pergunta: "É grátis mesmo?",
    resposta: "É. Não pedimos cartão nem cobramos mensalidade. Estamos na fase de colocar o sistema na mão de barbearias reais.",
  },
  { pergunta: "Preciso de computador?", resposta: "Não. Dá para cadastrar e usar o painel pelo celular." },
  {
    pergunta: "Meu cliente precisa baixar aplicativo ou criar conta?",
    resposta: "Não. Ele abre o link, escolhe o horário e coloca nome e WhatsApp.",
  },
  {
    pergunta: "E se dois clientes tentarem o mesmo horário ao mesmo tempo?",
    resposta: "Só um consegue. O sistema confere de novo antes de confirmar, e o segundo vê que o horário já foi.",
  },
  {
    pergunta: "Meus barbeiros têm horários e folgas diferentes. Funciona?",
    resposta: "Funciona. Cada barbeiro tem a própria agenda, com horário, almoço e folgas.",
  },
  {
    pergunta: "E quem marca pelo WhatsApp ou no balcão?",
    resposta: "Você lança o horário no painel em poucos segundos, e ele ocupa a agenda do mesmo jeito.",
  },
  {
    pergunta: "O lembrete é um robô?",
    resposta: "Não. Você toca no botão e o seu WhatsApp abre com a mensagem pronta. Você decide se envia.",
  },
  {
    pergunta: "Consigo bloquear um horário?",
    resposta: "Sim. Médico, compromisso ou folga extra: é só bloquear e ninguém marca ali.",
  },
  {
    pergunta: "Os dados dos clientes ficam seguros?",
    resposta: "Cada barbearia só vê os próprios clientes. Pedimos apenas nome e WhatsApp, e o cliente é avisado disso ao marcar.",
  },
  {
    pergunta: "Quem está por trás do Vai de Corte?",
    resposta: "O time Programadores da Fiel, de Mogi das Cruzes, no Startup Challenge da UMC 2026.",
  },
];

export const CHAMADA_FINAL = {
  titulo: "Sua barbearia com link próprio ainda hoje.",
  texto: "Cadastre em uns 5 minutos, coloque o link na bio e deixe o cliente marcar sozinho.",
  regiao: "Está em Mogi das Cruzes ou no Alto Tietê? A gente te ajuda a configurar.",
};

export const RODAPE = {
  frase: "Agendamento online para barbearias. O cliente marca pelo link e você corta.",
  creditos: "Feito em Mogi das Cruzes pelo time Programadores da Fiel · Startup Challenge UMC 2026.",
};

/** Link wa.me com a mensagem pronta, ou null se o número não foi preenchido. */
export function linkWhatsApp(mensagem = MENSAGEM_WHATSAPP) {
  const numero = WHATSAPP_CONTATO.replace(/\D/g, "");
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
