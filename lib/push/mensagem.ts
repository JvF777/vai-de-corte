import { paraLocal, somarDias } from "@/lib/availability";
import { formatarHora, partesDoDia } from "@/lib/formatos";

/** O que a notificação mostra e para onde leva ao tocar. Vai assim para o service worker (public/sw.js). */
export type Aviso = {
  titulo: string;
  corpo: string;
  /** Página aberta ao tocar na notificação. */
  url: string;
  /** Avisos com a mesma tag se substituem em vez de empilhar. */
  tag: string;
};

export type DadosAgendamento = {
  id: string;
  barbearia: string;
  barbeiroId: string;
  barbeiro: string;
  servico: string;
  cliente: string;
  inicio: string | Date;
};

/** "hoje", "amanhã" ou "sáb, 7/11", sempre no fuso da barbearia. */
export function quandoCurto(inicio: Date, agora: Date) {
  const dia = paraLocal(inicio).data;
  const hoje = paraLocal(agora).data;
  if (dia === hoje) return "hoje";
  if (dia === somarDias(hoje, 1)) return "amanhã";
  const [, mes, d] = dia.split("-").map(Number);
  return `${partesDoDia(dia).semana}, ${d}/${mes}`;
}

/** Ex.: "Novo agendamento: João Silva" / "Corte com Carlos, amanhã às 15:00". */
export function avisoNovoAgendamento(dados: DadosAgendamento, agora = new Date()): Aviso {
  const inicio = new Date(dados.inicio);
  const dia = paraLocal(inicio).data;
  return {
    titulo: `Novo agendamento: ${dados.cliente}`,
    corpo: `${dados.servico} com ${dados.barbeiro}, ${quandoCurto(inicio, agora)} às ${formatarHora(inicio)}\n${dados.barbearia}`,
    url: `/painel/agenda?data=${dia}&barbeiro=${dados.barbeiroId}`,
    tag: `agendamento-${dados.id}`,
  };
}

export function avisoTeste(): Aviso {
  return {
    titulo: "Avisos ligados",
    corpo: "É assim que vai chegar cada agendamento novo feito pelo link.",
    url: "/painel/agenda",
    tag: "teste",
  };
}
