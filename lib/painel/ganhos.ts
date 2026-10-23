/**
 * Ganhos e números do barbeiro (dia ou mês), em funções puras: sem banco e sem relógio implícito.
 * "Faturado" é a soma do preço dos atendimentos concluídos (o preço gravado no agendamento).
 */

import { dataValida, instanteLocal, paraLocal, somarDias } from "@/lib/availability";
import type { Status } from "./agenda";

export type Periodo = "dia" | "mes";

export type AgendamentoGanho = {
  id: string;
  barbeiroId: string;
  inicio: string;
  status: Status;
  precoCentavos: number;
  servico: { id: string; nome: string };
  clienteNome?: string;
};

/** "2026-10-23" -> "2026-10-01" */
export function inicioDoMes(data: string): string {
  return `${data.slice(0, 7)}-01`;
}

/** Primeiro dia do mês somando (ou tirando) meses: ("2026-01-15", -1) -> "2025-12-01". */
export function somarMeses(data: string, meses: number): string {
  const [ano, mes] = data.split("-").map(Number);
  const total = ano * 12 + (mes - 1) + meses;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

/** Os dias do período, em ordem. */
export function diasDoPeriodo(periodo: Periodo, data: string): string[] {
  if (periodo === "dia") return [data];
  const dias: string[] = [];
  const fim = somarMeses(data, 1);
  for (let d = inicioDoMes(data); d < fim; d = somarDias(d, 1)) dias.push(d);
  return dias;
}

/** Início (inclusivo) e fim (exclusivo) do período, como instantes. O agendamento conta no dia em que começa. */
export function limitesDoPeriodo(periodo: Periodo, data: string): { de: Date; ate: Date } {
  if (periodo === "dia") return { de: instanteLocal(data, 0), ate: instanteLocal(somarDias(data, 1), 0) };
  return { de: instanteLocal(inicioDoMes(data), 0), ate: instanteLocal(somarMeses(data, 1), 0) };
}

/** Lê ?periodo= e ?data= da URL; cai em "hoje" quando vier algo inválido. */
export function lerPeriodo(periodo: string | undefined, data: string | undefined, hoje: string): { periodo: Periodo; data: string } {
  const p: Periodo = periodo === "mes" ? "mes" : "dia";
  const d = data && dataValida(data) ? data : hoje;
  return { periodo: p, data: p === "mes" ? inicioDoMes(d) : d };
}

/** Monta a URL da tela de ganhos (dá para voltar e compartilhar). */
export function urlGanhos(periodo: Periodo, data: string, barbeiro: string | null) {
  const p = new URLSearchParams();
  if (periodo === "mes") p.set("periodo", "mes");
  p.set("data", periodo === "mes" ? inicioDoMes(data) : data);
  if (barbeiro) p.set("barbeiro", barbeiro);
  return `/painel/ganhos?${p}`;
}

export type LinhaServico = { id: string; nome: string; quantidade: number; faturadoCentavos: number };
export type LinhaBarbeiro = { barbeiroId: string; atendidos: number; faturadoCentavos: number; faltas: number; naAgenda: number };

export type Ganhos = {
  /** Soma do que foi concluído. */
  faturadoCentavos: number;
  /** Clientes atendidos (concluídos). */
  atendidos: number;
  /** Faturado / atendidos; nulo sem atendimento. */
  ticketMedioCentavos: number | null;
  /** Ainda vão acontecer (agendado ou confirmado, horário no futuro). */
  naAgenda: number;
  naAgendaCentavos: number;
  /** Já passou do horário e ninguém marcou concluído nem falta: o dinheiro ainda não entrou na conta. */
  semMarcar: number;
  semMarcarCentavos: number;
  faltas: number;
  /** O que deixou de entrar com as faltas. */
  faltasCentavos: number;
  cancelados: number;
  /** Concluídos por serviço, do mais feito ao menos feito. */
  porServico: LinhaServico[];
  /** Números por barbeiro, do que mais faturou ao que menos faturou. */
  porBarbeiro: LinhaBarbeiro[];
  /** Faturado por dia local ("YYYY-MM-DD" -> centavos), só dos dias com atendimento. */
  porDia: Record<string, number>;
};

export function resumirGanhos(agendamentos: AgendamentoGanho[], agora: Date): Ganhos {
  const g: Ganhos = {
    faturadoCentavos: 0,
    atendidos: 0,
    ticketMedioCentavos: null,
    naAgenda: 0,
    naAgendaCentavos: 0,
    semMarcar: 0,
    semMarcarCentavos: 0,
    faltas: 0,
    faltasCentavos: 0,
    cancelados: 0,
    porServico: [],
    porBarbeiro: [],
    porDia: {},
  };
  const servicos = new Map<string, LinhaServico>();
  const barbeiros = new Map<string, LinhaBarbeiro>();
  const doBarbeiro = (id: string) => {
    let linha = barbeiros.get(id);
    if (!linha) barbeiros.set(id, (linha = { barbeiroId: id, atendidos: 0, faturadoCentavos: 0, faltas: 0, naAgenda: 0 }));
    return linha;
  };

  for (const a of agendamentos) {
    const preco = a.precoCentavos;
    switch (a.status) {
      case "concluido": {
        g.atendidos++;
        g.faturadoCentavos += preco;
        const b = doBarbeiro(a.barbeiroId);
        b.atendidos++;
        b.faturadoCentavos += preco;
        const s = servicos.get(a.servico.id) ?? { id: a.servico.id, nome: a.servico.nome, quantidade: 0, faturadoCentavos: 0 };
        s.quantidade++;
        s.faturadoCentavos += preco;
        servicos.set(s.id, s);
        const dia = paraLocal(new Date(a.inicio)).data;
        g.porDia[dia] = (g.porDia[dia] ?? 0) + preco;
        break;
      }
      case "agendado":
      case "confirmado":
        if (new Date(a.inicio).getTime() > agora.getTime()) {
          g.naAgenda++;
          g.naAgendaCentavos += preco;
          doBarbeiro(a.barbeiroId).naAgenda++;
        } else {
          g.semMarcar++;
          g.semMarcarCentavos += preco;
        }
        break;
      case "falta":
        g.faltas++;
        g.faltasCentavos += preco;
        doBarbeiro(a.barbeiroId).faltas++;
        break;
      case "cancelado":
        g.cancelados++;
        break;
    }
  }

  g.ticketMedioCentavos = g.atendidos ? Math.round(g.faturadoCentavos / g.atendidos) : null;
  g.porServico = [...servicos.values()].sort(
    (x, y) => y.quantidade - x.quantidade || y.faturadoCentavos - x.faturadoCentavos || x.nome.localeCompare(y.nome, "pt-BR"),
  );
  g.porBarbeiro = [...barbeiros.values()].sort((x, y) => y.faturadoCentavos - x.faturadoCentavos || y.atendidos - x.atendidos);
  return g;
}

/**
 * Escala do gráfico de colunas: topo redondo acima do maior valor e 4 marcas iguais.
 * Em centavos, com passos de reais "bonitos" (R$ 50, 100, 250...).
 */
export function escalaDoGrafico(maxCentavos: number): { topo: number; marcas: number[] } {
  const passos = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  const passo = passos.find((p) => p * 4 > maxCentavos) ?? Math.ceil(maxCentavos / 4 / 1000000) * 1000000;
  const topo = passo * 4;
  return { topo, marcas: [0, passo, passo * 2, passo * 3, topo] };
}
