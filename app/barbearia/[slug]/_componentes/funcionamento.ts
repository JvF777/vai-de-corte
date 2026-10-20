import { diaDaSemana, horaParaMinutos, minutosParaHora, paraLocal, somarDias, type Funcionamento } from "@/lib/availability";

export const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** "09:00:00" -> "9h", "09:30:00" -> "9h30" */
export function horaCurta(hora: string) {
  const [h, m] = minutosParaHora(horaParaMinutos(hora)).split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/** Frase de agora: "Aberto agora, até 19h" ou "Fechado agora. Abre terça às 9h". */
export function situacaoAgora(funcionamento: Funcionamento[], agora: Date): { aberto: boolean; texto: string } | null {
  if (!funcionamento.length) return null;
  const { data, minutos } = paraLocal(agora);
  const hoje = funcionamento.find((f) => f.diaSemana === diaDaSemana(data));

  if (hoje && minutos >= horaParaMinutos(hoje.abre) && minutos < horaParaMinutos(hoje.fecha)) {
    return { aberto: true, texto: `Aberto agora, até ${horaCurta(hoje.fecha)}` };
  }
  if (hoje && minutos < horaParaMinutos(hoje.abre)) {
    return { aberto: false, texto: `Fechado agora. Abre hoje às ${horaCurta(hoje.abre)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const dia = diaDaSemana(somarDias(data, i));
    const f = funcionamento.find((x) => x.diaSemana === dia);
    if (f) {
      const quando = i === 1 ? "amanhã" : NOMES_DIAS[dia].toLowerCase();
      return { aberto: false, texto: `Fechado agora. Abre ${quando} às ${horaCurta(f.abre)}` };
    }
  }
  return null;
}
