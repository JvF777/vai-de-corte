import type { Papel } from "@/lib/auth";

export type PassoTutorial = {
  id: string;
  titulo: string;
  texto: string;
  /** Valor de data-tutorial do elemento destacado. Sem alvo, o cartão aparece no centro. */
  alvo?: string;
  /** Página onde o alvo está. Sem rota, vale a página em que a pessoa estiver. */
  rota?: string;
  /** O alvo fica na barra lateral: no celular, o tutorial abre o menu ☰ antes. */
  noMenu?: boolean;
  /** Mostra um cliente de exemplo na agenda, se ela estiver vazia. */
  exemplo?: boolean;
  /** Só aparece para o dono (cadastros que o barbeiro não vê). */
  soDono?: boolean;
};

const PASSOS: PassoTutorial[] = [
  {
    id: "boas-vindas",
    titulo: "Seu painel em 1 minuto",
    texto:
      "Vamos passar rapidinho por cada parte do painel para você saber onde fica cada coisa. Dá para pular quando quiser e ver de novo depois.",
  },
  {
    id: "visao-geral",
    alvo: "nav:/painel",
    noMenu: true,
    titulo: "Visão geral",
    texto: "É a tela de início. Mostra quantos serviços, barbeiros e clientes a barbearia tem e o seu link de agendamento.",
  },
  {
    id: "link",
    alvo: "link",
    rota: "/painel",
    titulo: "Seu link de agendamento",
    texto:
      "É o mais importante: por ele o cliente marca sozinho, sem te chamar no WhatsApp. Toque em Copiar e coloque na bio do Instagram, no status e no QR Code do balcão.",
  },
  {
    id: "agenda",
    alvo: "nav:/painel/agenda",
    noMenu: true,
    titulo: "Agenda",
    texto: "Aqui ficam os clientes de cada dia, de cada barbeiro. Vamos abrir a agenda para você ver.",
  },
  {
    id: "agenda-dias",
    alvo: "agenda-dias",
    rota: "/painel/agenda",
    titulo: "Escolha o dia",
    texto:
      "As setas vão para o dia anterior e para o próximo. Hoje volta para o dia de hoje, e o campo de data pula direto para qualquer dia.",
  },
  {
    id: "agenda-acoes",
    alvo: "agenda-acoes",
    rota: "/painel/agenda",
    titulo: "Encaixe ou bloqueie",
    texto:
      "Novo agendamento: marque o cliente que ligou ou chegou na hora. Bloquear horário: feche um horário para almoço, médico ou folga, e ele some do link.",
  },
  {
    id: "agenda-horarios",
    alvo: "agenda-horarios",
    rota: "/painel/agenda",
    exemplo: true,
    titulo: "Toque no cliente",
    texto:
      "Toque em um cliente para confirmar, concluir, marcar falta, cancelar ou mandar lembrete no WhatsApp. Toque em um horário vago para encaixar alguém ali.",
  },
  {
    id: "ganhos",
    alvo: "nav:/painel/ganhos",
    noMenu: true,
    titulo: "Ganhos",
    texto: "Quanto entrou no dia ou no mês, por barbeiro e por serviço. Troque entre Dia e Mês no topo da tela.",
  },
  {
    id: "servicos",
    alvo: "nav:/painel/servicos",
    noMenu: true,
    soDono: true,
    titulo: "Serviços",
    texto: "Corte, barba, combos: cada um com preço e duração. É o que o cliente escolhe quando abre o link.",
  },
  {
    id: "barbeiros",
    alvo: "nav:/painel/barbeiros",
    noMenu: true,
    soDono: true,
    titulo: "Barbeiros",
    texto:
      "A sua equipe: dias e horários de cada um, almoço, folgas e quais serviços cada barbeiro faz.",
  },
  {
    id: "barbearia",
    alvo: "nav:/painel/barbearia",
    noMenu: true,
    soDono: true,
    titulo: "Barbearia",
    texto:
      "Nome, endereço, WhatsApp, horário de funcionamento, logo e fotos. É o que aparece na página que o cliente abre pelo link.",
  },
  {
    id: "avisos",
    alvo: "avisos",
    noMenu: true,
    titulo: "Avisos no celular",
    texto:
      "Toque em Ligar avisos para o celular apitar a cada cliente que marcar pelo link. No iPhone, antes toque em Compartilhar, depois em Adicionar à Tela de Início, e abra o Vai de Corte por lá.",
  },
  {
    id: "fim",
    alvo: "ver-tutorial",
    noMenu: true,
    titulo: "Tudo pronto!",
    texto: "Comece mandando o seu link para um amigo testar. Se quiser ver este passo a passo de novo, é só tocar aqui.",
  },
];

export function passosPara(papel: Papel | null) {
  return PASSOS.filter((p) => !(p.soDono && papel === "barbeiro"));
}
