"use server";

import { z } from "zod";
import { calcularHorarios, dataValida, type Horario } from "@/lib/availability";
import { criarClientePublico } from "@/lib/supabase/publico";
import { carregarOcupados, carregarVitrine } from "@/lib/vitrine";

const uuid = z.uuid();

const schemaBusca = z.object({
  slug: z.string().min(3).max(60),
  servicoId: uuid,
  barbeiroId: uuid.nullable(),
  data: z.string().refine(dataValida),
});

export type ResultadoHorarios = { horarios: Horario[]; erro: null } | { horarios: []; erro: string };

/** Horários livres de um dia, calculados no servidor com a agenda do momento. */
export async function buscarHorarios(entrada: z.input<typeof schemaBusca>): Promise<ResultadoHorarios> {
  const dados = schemaBusca.safeParse(entrada);
  if (!dados.success) return { horarios: [], erro: "Escolha o serviço e o dia de novo." };
  const { slug, servicoId, barbeiroId, data } = dados.data;

  try {
    const vitrine = await carregarVitrine(slug);
    const servico = vitrine?.servicos.find((s) => s.id === servicoId);
    if (!vitrine || !servico) return { horarios: [], erro: "Esse serviço não está mais disponível." };

    const ocupados = await carregarOcupados(slug, data, data);
    const horarios = calcularHorarios({
      data,
      servicoId,
      duracaoMinutos: servico.duracaoMinutos,
      barbeiroId,
      barbeiros: vitrine.barbeiros,
      funcionamento: vitrine.funcionamento,
      ocupados,
      regras: vitrine.barbearia.regras,
      agora: new Date(),
    });
    return { horarios, erro: null };
  } catch (e) {
    console.error(e);
    return { horarios: [], erro: "Não foi possível carregar os horários. Verifique a internet e tente de novo." };
  }
}

export type EstadoAgendamento = {
  erro: string | null;
  /** O horário escolhido deixou de valer: a tela volta para a escolha de horário. */
  horarioPerdido?: boolean;
  campos?: { nome?: string; whatsapp?: string; lgpd?: string };
  /** Agendamento criado: endereço da tela de confirmação. */
  destino?: string;
  /** Muda a cada tentativa, para a tela reagir mesmo se o erro repetir. */
  tentativa: number;
};

const schemaAgendamento = z.object({
  slug: z.string().min(3).max(60),
  servicoId: uuid,
  barbeiroId: uuid.nullable(),
  inicio: z.iso.datetime({ offset: true }),
  nome: z
    .string()
    .trim()
    .min(2, "Digite seu nome.")
    .max(120, "Nome muito longo."),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^(55)?\d{10,11}$/.test(v), "Digite o WhatsApp com DDD, como (11) 91234-5678."),
  lgpd: z.literal("sim", { error: "Para agendar, marque que concorda com o uso dos seus dados." }),
});

const ERROS_HORARIO = new Set([
  "HORARIO_INDISPONIVEL",
  "HORARIO_BLOQUEADO",
  "FORA_DO_EXPEDIENTE",
  "FORA_DA_GRADE",
  "ANTECEDENCIA_MINIMA",
  "FORA_DA_JANELA",
  "BARBEIRO_INVALIDO",
]);

export async function agendar(anterior: EstadoAgendamento, formData: FormData): Promise<EstadoAgendamento> {
  const tentativa = anterior.tentativa + 1;
  const barbeiro = String(formData.get("barbeiroId") ?? "");
  const dados = schemaAgendamento.safeParse({
    slug: formData.get("slug"),
    servicoId: formData.get("servicoId"),
    barbeiroId: barbeiro === "" ? null : barbeiro,
    inicio: formData.get("inicio"),
    nome: formData.get("nome") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    lgpd: formData.get("lgpd"),
  });

  if (!dados.success) {
    const campos: EstadoAgendamento["campos"] = {};
    for (const issue of dados.error.issues) {
      const campo = issue.path[0];
      if (campo === "nome" || campo === "whatsapp" || campo === "lgpd") campos[campo] ??= issue.message;
    }
    if (Object.keys(campos).length) return { erro: null, campos, tentativa };
    return { erro: "Escolha o serviço e o horário de novo.", horarioPerdido: true, tentativa };
  }

  const d = dados.data;
  const supabase = await criarClientePublico();
  const { data, error } = await supabase.rpc("criar_agendamento_publico", {
    p_slug: d.slug,
    p_servico_id: d.servicoId,
    p_barbeiro_id: d.barbeiroId,
    p_inicio: d.inicio,
    p_nome: d.nome,
    p_whatsapp: d.whatsapp,
    p_aceite_lgpd: true,
  });

  if (error) {
    // O banco responde com um código estável em message e o texto em details.
    const codigo = error.message;
    const texto = error.details && /^[^\n]{3,200}$/.test(error.details) ? error.details : null;
    if (ERROS_HORARIO.has(codigo)) {
      return { erro: texto ?? "Esse horário não está mais disponível. Escolha outro.", horarioPerdido: true, tentativa };
    }
    if (codigo === "DADOS_INVALIDOS" || codigo === "LIMITE_AGENDAMENTOS" || codigo === "SERVICO_INVALIDO") {
      return { erro: texto ?? "Confira os dados e tente de novo.", tentativa };
    }
    console.error("criar_agendamento_publico", error);
    return { erro: "Não foi possível agendar agora. Tente de novo em instantes.", tentativa };
  }

  const id = (data as { id?: string } | null)?.id;
  if (!id) return { erro: "Não foi possível agendar agora. Tente de novo em instantes.", tentativa };
  // A tela navega sozinha depois da animação do corte.
  return { erro: null, destino: `/barbearia/${d.slug}/agendamento/${id}`, tentativa };
}
