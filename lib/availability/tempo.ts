/**
 * Datas e horas no fuso fixo do produto (America/Sao_Paulo), sem biblioteca.
 *
 * Convenções usadas em todo o lib/availability:
 *   data     "YYYY-MM-DD", dia do calendário local
 *   minutos  minutos desde a meia-noite local (09:30 = 570)
 *   instante Date (momento absoluto, igual ao timestamptz do banco)
 */

export const FUSO = "America/Sao_Paulo";

const formatoPartes = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type Partes = { ano: number; mes: number; dia: number; hora: number; minuto: number; segundo: number };

function partes(instante: Date): Partes {
  const p: Record<string, number> = {};
  for (const { type, value } of formatoPartes.formatToParts(instante)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return { ano: p.year, mes: p.month, dia: p.day, hora: p.hour, minuto: p.minute, segundo: p.second };
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

function separarData(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return { ano, mes, dia };
}

/** Data e minutos locais de um instante. */
export function paraLocal(instante: Date): { data: string; minutos: number } {
  const p = partes(instante);
  return {
    data: `${p.ano}-${doisDigitos(p.mes)}-${doisDigitos(p.dia)}`,
    minutos: p.hora * 60 + p.minuto,
  };
}

/** Instante correspondente a uma data e hora locais. */
export function instanteLocal(data: string, minutos: number): Date {
  const { ano, mes, dia } = separarData(data);
  const comoUtc = Date.UTC(ano, mes - 1, dia, 0, minutos);
  // Diferença entre o relógio local e o UTC naquele momento (-3 h hoje em dia).
  const deslocamento = (instante: number) => {
    const p = partes(new Date(instante));
    return Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo) - instante;
  };
  let instante = comoUtc - deslocamento(comoUtc);
  // Segunda passada cobre a troca de fuso, caso o horário de verão volte um dia.
  instante = comoUtc - deslocamento(instante);
  return new Date(instante);
}

/** Dia da semana como no Postgres (extract dow): 0 = domingo ... 6 = sábado. */
export function diaDaSemana(data: string): number {
  const { ano, mes, dia } = separarData(data);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function somarDias(data: string, dias: number): string {
  const { ano, mes, dia } = separarData(data);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** "09:00" ou "09:00:00" (time do Postgres) para minutos desde a meia-noite. */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function minutosParaHora(minutos: number): string {
  return `${doisDigitos(Math.floor(minutos / 60))}:${doisDigitos(minutos % 60)}`;
}

export function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const { ano, mes, dia } = separarData(data);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}
