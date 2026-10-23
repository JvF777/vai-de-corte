/**
 * Disponibilidade da agenda: único lugar do app que decide quais horários
 * aparecem para o cliente. Funções puras (sem banco, sem relógio implícito),
 * para dar para testar com qualquer cenário.
 *
 * Segue as mesmas regras de privado.motivo_horario_indisponivel no Postgres,
 * que revalida tudo na hora de gravar:
 *   - inícios são múltiplos de intervalo_slot_minutos a partir da meia-noite;
 *   - o serviço inteiro cabe no funcionamento da barbearia e na jornada do barbeiro;
 *   - não encosta no almoço, em bloqueios/folgas nem em outros agendamentos;
 *   - respeita a antecedência mínima e a janela máxima de agendamento;
 *   - não atravessa a meia-noite.
 */

import { diaDaSemana, horaParaMinutos, instanteLocal, minutosParaHora, paraLocal, somarDias } from "./tempo";

export * from "./tempo";

export type Funcionamento = { diaSemana: number; abre: string; fecha: string };

/** Jornada semanal do barbeiro. Dia sem jornada = folga fixa. */
export type Jornada = {
  diaSemana: number;
  inicio: string;
  fim: string;
  almocoInicio: string | null;
  almocoFim: string | null;
};

export type BarbeiroAgenda = { id: string; servicoIds: string[]; jornadas: Jornada[] };

/** Agendamento ativo ou bloqueio. barbeiroId nulo = vale para a barbearia inteira. */
export type Ocupado = { barbeiroId: string | null; inicio: string | Date; fim: string | Date };

export type Regras = {
  intervaloMinutos: number;
  antecedenciaMinutos: number;
  janelaDias: number;
};

export type Horario = {
  /** Instante de início em ISO (UTC), o valor que vai para o banco. */
  inicio: string;
  /** Hora local "HH:MM" para mostrar. */
  hora: string;
  /** Barbeiros livres nesse horário, na ordem recebida. */
  barbeiroIds: string[];
};

export type EntradaHorarios = {
  data: string;
  servicoId: string;
  duracaoMinutos: number;
  /** Nulo = "qualquer disponível". */
  barbeiroId: string | null;
  barbeiros: BarbeiroAgenda[];
  funcionamento: Funcionamento[];
  ocupados: Ocupado[];
  regras: Regras;
  agora: Date;
};

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;
const MINUTOS_NO_DIA = 24 * 60;

/** Barbeiros que fazem o serviço (e, se escolhido, só aquele barbeiro). */
export function barbeirosElegiveis<T extends BarbeiroAgenda>(barbeiros: T[], servicoId: string, barbeiroId: string | null): T[] {
  return barbeiros.filter((b) => b.servicoIds.includes(servicoId) && (barbeiroId === null || b.id === barbeiroId));
}

/** Horários livres de um dia, em ordem. */
export function calcularHorarios(entrada: EntradaHorarios): Horario[] {
  const { data, duracaoMinutos: duracao, regras, agora } = entrada;
  const intervalo = regras.intervaloMinutos;
  if (intervalo <= 0 || duracao <= 0) return [];

  const dia = diaDaSemana(data);
  const funcionamento = entrada.funcionamento.find((f) => f.diaSemana === dia);
  if (!funcionamento) return [];

  const candidatos = barbeirosElegiveis(entrada.barbeiros, entrada.servicoId, entrada.barbeiroId)
    .map((b) => ({ id: b.id, jornada: b.jornadas.find((j) => j.diaSemana === dia) }))
    .filter((b): b is { id: string; jornada: Jornada } => Boolean(b.jornada));
  if (!candidatos.length) return [];

  const ocupados = entrada.ocupados.map((o) => ({
    barbeiroId: o.barbeiroId,
    inicio: new Date(o.inicio).getTime(),
    fim: new Date(o.fim).getTime(),
  }));

  const abre = horaParaMinutos(funcionamento.abre);
  const fecha = horaParaMinutos(funcionamento.fecha);
  const minimo = agora.getTime() + regras.antecedenciaMinutos * MINUTO;
  const maximo = agora.getTime() + regras.janelaDias * DIA;

  const horarios: Horario[] = [];
  const primeiro = Math.ceil(abre / intervalo) * intervalo;

  for (let ini = primeiro; ini + duracao <= fecha && ini + duracao < MINUTOS_NO_DIA; ini += intervalo) {
    const fim = ini + duracao;
    const inicioMs = instanteLocal(data, ini).getTime();
    const fimMs = inicioMs + duracao * MINUTO;
    if (inicioMs < minimo || inicioMs > maximo) continue;

    const livres = candidatos.filter(({ id, jornada }) => {
      if (ini < horaParaMinutos(jornada.inicio) || fim > horaParaMinutos(jornada.fim)) return false;
      if (jornada.almocoInicio && jornada.almocoFim) {
        const almocoIni = horaParaMinutos(jornada.almocoInicio);
        const almocoFim = horaParaMinutos(jornada.almocoFim);
        if (fim > almocoIni && ini < almocoFim) return false;
      }
      return !ocupados.some(
        (o) => (o.barbeiroId === null || o.barbeiroId === id) && o.inicio < fimMs && inicioMs < o.fim,
      );
    });

    if (livres.length) {
      horarios.push({
        inicio: new Date(inicioMs).toISOString(),
        hora: minutosParaHora(ini),
        barbeiroIds: livres.map((b) => b.id),
      });
    }
  }

  return horarios;
}

export type DiaAgenda = {
  data: string;
  /** A barbearia abre e algum barbeiro elegível trabalha nesse dia da semana. */
  atende: boolean;
};

/**
 * Dias que o cliente pode escolher, de hoje até o fim da janela de agendamento.
 * Só olha a semana (funcionamento e jornadas); bloqueios e agenda cheia
 * aparecem quando os horários do dia são calculados.
 */
export function diasDaJanela(entrada: {
  servicoId: string;
  barbeiroId: string | null;
  barbeiros: BarbeiroAgenda[];
  funcionamento: Funcionamento[];
  regras: Regras;
  agora: Date;
}): DiaAgenda[] {
  const hoje = paraLocal(entrada.agora).data;
  const ultimo = paraLocal(new Date(entrada.agora.getTime() + entrada.regras.janelaDias * DIA)).data;
  const elegiveis = barbeirosElegiveis(entrada.barbeiros, entrada.servicoId, entrada.barbeiroId);
  const minimo = entrada.agora.getTime() + entrada.regras.antecedenciaMinutos * MINUTO;

  const dias: DiaAgenda[] = [];
  for (let data = hoje; data <= ultimo; data = somarDias(data, 1)) {
    const dia = diaDaSemana(data);
    const funcionamento = entrada.funcionamento.find((f) => f.diaSemana === dia);
    const atende =
      Boolean(funcionamento) &&
      // Hoje, depois do último horário possível, já não dá.
      instanteLocal(data, horaParaMinutos(funcionamento!.fecha)).getTime() > minimo &&
      elegiveis.some((b) => b.jornadas.some((j) => j.diaSemana === dia));
    dias.push({ data, atende });
  }
  return dias;
}
