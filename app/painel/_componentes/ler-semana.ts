import { horaParaMinutos } from "@/lib/availability";

/**
 * Lê a grade semanal do formulário (barbearia ou barbeiro). Campos por dia d (0 = domingo):
 *   aberto_d = "sim", inicio_d, fim_d e, com almoço, almoco_d = "sim", almoco_inicio_d, almoco_fim_d.
 * Erros voltam com o nome do campo, para a tela marcar a linha certa.
 */

export type DiaSemana = { dia: number; inicio: string; fim: string; almocoInicio: string | null; almocoFim: string | null };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function lerSemana(
  formData: FormData,
  comAlmoco: boolean,
): { ok: true; dias: DiaSemana[] } | { ok: false; campos: Record<string, string> } {
  const dias: DiaSemana[] = [];
  const campos: Record<string, string> = {};
  const texto = (nome: string) => String(formData.get(nome) ?? "").slice(0, 5);

  for (let d = 0; d <= 6; d++) {
    if (formData.get(`aberto_${d}`) !== "sim") continue;
    const inicio = texto(`inicio_${d}`);
    const fim = texto(`fim_${d}`);
    if (!HORA.test(inicio)) campos[`inicio_${d}`] = "Informe a hora.";
    if (!HORA.test(fim)) campos[`fim_${d}`] = "Informe a hora.";
    if (HORA.test(inicio) && HORA.test(fim) && horaParaMinutos(fim) <= horaParaMinutos(inicio)) {
      campos[`fim_${d}`] = "Termina antes de começar.";
    }

    let almocoInicio: string | null = null;
    let almocoFim: string | null = null;
    if (comAlmoco && formData.get(`almoco_${d}`) === "sim") {
      almocoInicio = texto(`almoco_inicio_${d}`);
      almocoFim = texto(`almoco_fim_${d}`);
      if (!HORA.test(almocoInicio)) campos[`almoco_inicio_${d}`] = "Informe a hora.";
      else if (!HORA.test(almocoFim)) campos[`almoco_fim_${d}`] = "Informe a hora.";
      else if (
        horaParaMinutos(almocoFim) <= horaParaMinutos(almocoInicio) ||
        (HORA.test(inicio) && horaParaMinutos(almocoInicio) < horaParaMinutos(inicio)) ||
        (HORA.test(fim) && horaParaMinutos(almocoFim) > horaParaMinutos(fim))
      ) {
        campos[`almoco_fim_${d}`] = "O almoço precisa caber no expediente.";
      }
    }
    dias.push({ dia: d, inicio, fim, almocoInicio, almocoFim });
  }

  return Object.keys(campos).length ? { ok: false, campos } : { ok: true, dias };
}
