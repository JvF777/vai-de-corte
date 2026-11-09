/**
 * Regras da agenda do painel, em funções puras (sem banco e sem relógio implícito).
 * A disponibilidade em si (horários livres) continua em lib/availability.
 */

import {
  calcularHorarios,
  diaDaSemana,
  horaParaMinutos,
  instanteLocal,
  paraLocal,
  somarDias,
  type Funcionamento,
  type Horario,
  type Jornada,
  type Ocupado,
} from "@/lib/availability";

export type Status = "agendado" | "confirmado" | "concluido" | "cancelado" | "falta";
export type Acao = "confirmar" | "concluir" | "falta" | "cancelar" | "reabrir";

/** Status que ocupam o horário (os mesmos da constraint do banco). */
export const STATUS_ATIVOS: Status[] = ["agendado", "confirmado", "concluido"];

export const STATUS_DA_ACAO: Record<Acao, Status> = {
  confirmar: "confirmado",
  concluir: "concluido",
  falta: "falta",
  cancelar: "cancelado",
  reabrir: "confirmado",
};

/**
 * O que dá para fazer com um agendamento agora.
 * Concluir e marcar falta só depois que o horário começou; o resto, a qualquer momento.
 */
export function acoesPermitidas(status: Status, inicio: Date | string, agora: Date): Acao[] {
  const comecou = new Date(inicio).getTime() <= agora.getTime();
  switch (status) {
    case "agendado":
      return comecou ? ["confirmar", "concluir", "falta", "cancelar"] : ["confirmar", "cancelar"];
    case "confirmado":
      return comecou ? ["concluir", "falta", "cancelar"] : ["cancelar"];
    case "concluido":
    case "falta":
    case "cancelado":
      return ["reabrir"];
  }
}

/** Início e fim (instantes) de um dia local. */
export function limitesDoDia(data: string): { de: Date; ate: Date } {
  return { de: instanteLocal(data, 0), ate: instanteLocal(somarDias(data, 1), 0) };
}

export type Faixa = { inicio: number; fim: number };

/**
 * Faixa de horas que a grade do dia mostra, em minutos desde a meia-noite,
 * arredondada para horas cheias: do primeiro expediente (ou atendimento) ao último.
 */
export function faixaDoDia(
  data: string,
  funcionamento: Funcionamento[],
  jornadas: Jornada[],
  itens: { inicio: Date | string; fim: Date | string }[],
): Faixa {
  const dia = diaDaSemana(data);
  const pontos: number[] = [];
  for (const f of funcionamento.filter((x) => x.diaSemana === dia)) {
    pontos.push(horaParaMinutos(f.abre), horaParaMinutos(f.fecha));
  }
  for (const j of jornadas.filter((x) => x.diaSemana === dia)) {
    pontos.push(horaParaMinutos(j.inicio), horaParaMinutos(j.fim));
  }
  for (const item of itens) {
    const ini = paraLocal(new Date(item.inicio));
    const fim = paraLocal(new Date(item.fim));
    pontos.push(ini.data < data ? 0 : ini.minutos, fim.data > data ? 24 * 60 : fim.minutos);
  }
  if (!pontos.length) return { inicio: 9 * 60, fim: 18 * 60 };
  return {
    inicio: Math.floor(Math.min(...pontos) / 60) * 60,
    fim: Math.min(24 * 60, Math.ceil(Math.max(...pontos) / 60) * 60),
  };
}

/** Posição de um intervalo dentro da faixa, em minutos a partir do início da faixa (cortado nas bordas). */
export function posicaoNaFaixa(
  data: string,
  faixa: Faixa,
  inicio: Date | string,
  fim: Date | string,
): { topo: number; altura: number } | null {
  const ini = paraLocal(new Date(inicio));
  const f = paraLocal(new Date(fim));
  const de = Math.max(faixa.inicio, ini.data < data ? 0 : ini.data > data ? 24 * 60 : ini.minutos);
  const ate = Math.min(faixa.fim, f.data > data ? 24 * 60 : f.data < data ? 0 : f.minutos);
  if (ate <= de) return null;
  return { topo: de - faixa.inicio, altura: ate - de };
}

export type ResumoDia = {
  total: number;
  aConfirmar: number;
  concluidos: number;
  cancelados: number;
  faltas: number;
  receitaPrevistaCentavos: number;
  /** Próximo atendimento ativo que ainda não começou. */
  proximo: { inicio: string; barbeiroId: string } | null;
};

export function resumirDia(
  agendamentos: { inicio: string; status: Status; precoCentavos: number; barbeiroId: string }[],
  agora: Date,
): ResumoDia {
  const ativos = agendamentos.filter((a) => STATUS_ATIVOS.includes(a.status));
  const futuros = ativos
    .filter((a) => a.status !== "concluido" && new Date(a.inicio).getTime() > agora.getTime())
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  return {
    total: ativos.length,
    aConfirmar: ativos.filter((a) => a.status === "agendado").length,
    concluidos: ativos.filter((a) => a.status === "concluido").length,
    cancelados: agendamentos.filter((a) => a.status === "cancelado").length,
    faltas: agendamentos.filter((a) => a.status === "falta").length,
    receitaPrevistaCentavos: ativos.reduce((soma, a) => soma + a.precoCentavos, 0),
    proximo: futuros[0] ? { inicio: futuros[0].inicio, barbeiroId: futuros[0].barbeiroId } : null,
  };
}

/** Os dias da semana na ordem do Brasil (segunda primeiro), com o número do Postgres (dow). */
export const SEMANA = [
  { dia: 1, nome: "Segunda", curto: "Seg" },
  { dia: 2, nome: "Terça", curto: "Ter" },
  { dia: 3, nome: "Quarta", curto: "Qua" },
  { dia: 4, nome: "Quinta", curto: "Qui" },
  { dia: 5, nome: "Sexta", curto: "Sex" },
  { dia: 6, nome: "Sábado", curto: "Sáb" },
  { dia: 0, nome: "Domingo", curto: "Dom" },
] as const;

/** [2,3,4,5,6] -> "Ter a Sáb"; [1,3,5] -> "Seg, Qua, Sex"; [] -> "Nenhum dia". */
export function resumirDias(dias: number[]): string {
  const ordem = SEMANA.filter((d) => dias.includes(d.dia));
  if (!ordem.length) return "Nenhum dia";
  if (ordem.length === 7) return "Todos os dias";
  const indices = ordem.map((d) => SEMANA.findIndex((s) => s.dia === d.dia));
  const seguidos = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
  if (seguidos && ordem.length >= 3) return `${ordem[0].curto} a ${ordem[ordem.length - 1].curto}`;
  return ordem.map((d) => d.curto).join(", ");
}

/**
 * Horários vagos de um barbeiro no dia, na grade do intervalo da barbearia, para os atalhos de "tocar e marcar".
 * Usa a mesma regra do link (calcularHorarios) com um "serviço" do tamanho de um intervalo, sem antecedência mínima.
 */
export function horariosVagos(entrada: {
  data: string;
  barbeiroId: string;
  jornada: Jornada | null;
  funcionamento: Funcionamento[];
  intervalo: number;
  ocupados: Ocupado[];
  agora: Date;
}): Horario[] {
  if (!entrada.jornada) return [];
  return calcularHorarios({
    data: entrada.data,
    servicoId: "vago",
    duracaoMinutos: entrada.intervalo,
    barbeiroId: entrada.barbeiroId,
    barbeiros: [{ id: entrada.barbeiroId, servicoIds: ["vago"], jornadas: [entrada.jornada] }],
    funcionamento: entrada.funcionamento,
    ocupados: entrada.ocupados,
    regras: { intervaloMinutos: entrada.intervalo, antecedenciaMinutos: 0, janelaDias: 366 },
    agora: entrada.agora,
  });
}
