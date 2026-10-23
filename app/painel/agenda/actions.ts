"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { calcularHorarios, dataValida, horaParaMinutos, instanteLocal, somarDias, type Horario } from "@/lib/availability";
import { formatarHora } from "@/lib/formatos";
import { acoesPermitidas, STATUS_ATIVOS, STATUS_DA_ACAO, type Acao, type Status } from "@/lib/painel/agenda";
import { carregarCadastro, carregarOcupadosDia, obterAcesso } from "@/lib/painel/dados";
import { errosDosCampos, textoDoBanco, type EstadoFormulario } from "@/lib/painel/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";

const uuid = z.uuid();
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato 14:30.");
const SEM_ACESSO = "Sua sessão não tem acesso a esta barbearia. Entre de novo.";

// ---------------------------------------------------------------------------
// Status do agendamento
// ---------------------------------------------------------------------------

const schemaStatus = z.object({
  id: uuid,
  acao: z.enum(["confirmar", "concluir", "falta", "cancelar", "reabrir"]),
});

export async function alterarStatus(entrada: { id: string; acao: Acao }): Promise<{ erro: string | null }> {
  const dados = schemaStatus.safeParse(entrada);
  if (!dados.success) return { erro: "Ação inválida." };
  const acesso = await obterAcesso();
  if (!acesso) return { erro: SEM_ACESSO };

  const supabase = await criarClienteServidor();
  // O RLS só devolve o agendamento se o usuário pode mexer nele.
  const { data: atual, error: erroLeitura } = await supabase
    .from("agendamentos")
    .select("id, status, inicio")
    .eq("id", dados.data.id)
    .eq("barbearia_id", acesso.atual.barbeariaId)
    .maybeSingle<{ id: string; status: Status; inicio: string }>();
  if (erroLeitura || !atual) return { erro: "Agendamento não encontrado. Atualize a página." };

  if (!acoesPermitidas(atual.status, atual.inicio, new Date()).includes(dados.data.acao)) {
    return { erro: "Essa ação não vale para este agendamento agora. Atualize a página." };
  }

  const { error } = await supabase
    .from("agendamentos")
    .update({ status: STATUS_DA_ACAO[dados.data.acao] })
    .eq("id", atual.id)
    .eq("status", atual.status); // não sobrescreve se outra pessoa mudou antes
  if (error) {
    if (error.code === "23P01") return { erro: "Esse horário já foi ocupado por outro agendamento. Não dá para reabrir." };
    console.error("alterarStatus", error);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  refresh();
  return { erro: null };
}

// ---------------------------------------------------------------------------
// Bloqueios
// ---------------------------------------------------------------------------

const schemaBloqueio = z
  .object({
    barbeiroId: z.union([uuid, z.literal("")]),
    data: z.string().refine(dataValida, "Escolha a data."),
    diaInteiro: z.boolean(),
    inicio: z.string(),
    fim: z.string(),
    motivo: z.string().trim().max(200, "Use até 200 caracteres."),
  })
  .superRefine((v, ctx) => {
    if (v.diaInteiro) return;
    if (!hora.safeParse(v.inicio).success) ctx.addIssue({ code: "custom", path: ["inicio"], message: "Informe a hora de início." });
    if (!hora.safeParse(v.fim).success) ctx.addIssue({ code: "custom", path: ["fim"], message: "Informe a hora de fim." });
    else if (hora.safeParse(v.inicio).success && horaParaMinutos(v.fim) <= horaParaMinutos(v.inicio)) {
      ctx.addIssue({ code: "custom", path: ["fim"], message: "O fim precisa ser depois do início." });
    }
  });

export async function criarBloqueio(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const dados = schemaBloqueio.safeParse({
    barbeiroId: formData.get("barbeiroId") ?? "",
    data: formData.get("data") ?? "",
    diaInteiro: formData.get("diaInteiro") === "sim",
    inicio: formData.get("inicio") ?? "",
    fim: formData.get("fim") ?? "",
    motivo: formData.get("motivo") ?? "",
  });
  if (!dados.success) return { erro: null, campos: errosDosCampos(dados.error), tentativa };
  const d = dados.data;

  const acesso = await obterAcesso();
  if (!acesso) return { erro: SEM_ACESSO, tentativa };
  const barbeiroId = d.barbeiroId || null;
  if (!acesso.ehDono && (!barbeiroId || barbeiroId !== acesso.meuBarbeiroId)) {
    return { erro: "Você só pode bloquear a sua própria agenda.", tentativa };
  }

  const inicio = d.diaInteiro ? instanteLocal(d.data, 0) : instanteLocal(d.data, horaParaMinutos(d.inicio));
  const fim = d.diaInteiro ? instanteLocal(somarDias(d.data, 1), 0) : instanteLocal(d.data, horaParaMinutos(d.fim));

  const supabase = await criarClienteServidor();

  // Não esconde cliente marcado: quem bloqueia precisa resolver esses atendimentos antes.
  let conflitos = supabase
    .from("agendamentos")
    .select("inicio, cliente:clientes(nome)")
    .eq("barbearia_id", acesso.atual.barbeariaId)
    .in("status", STATUS_ATIVOS)
    .lt("inicio", fim.toISOString())
    .gt("fim", inicio.toISOString())
    .order("inicio");
  if (barbeiroId) conflitos = conflitos.eq("barbeiro_id", barbeiroId);
  const { data: marcados, error: erroConflito } = await conflitos.returns<{ inicio: string; cliente: { nome: string } }[]>();
  if (erroConflito) return { erro: "Não foi possível verificar a agenda. Tente de novo.", tentativa };
  if (marcados?.length) {
    const lista = marcados
      .slice(0, 3)
      .map((m) => `${formatarHora(m.inicio)} ${m.cliente.nome.split(" ")[0]}`)
      .join(", ");
    const quantos = marcados.length === 1 ? "Já tem 1 cliente marcado" : `Já tem ${marcados.length} clientes marcados`;
    return { erro: `${quantos} nesse período (${lista}). Cancele ou remarque antes de bloquear.`, tentativa };
  }

  const tipo = d.diaInteiro ? (barbeiroId ? "folga" : "feriado") : "bloqueio";
  const { error } = await supabase.from("bloqueios_agenda").insert({
    barbearia_id: acesso.atual.barbeariaId,
    barbeiro_id: barbeiroId,
    tipo,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    motivo: d.motivo || null,
  });
  if (error) {
    console.error("criarBloqueio", error);
    return { erro: "Não foi possível bloquear. Tente de novo.", tentativa };
  }
  refresh();
  return { erro: null, ok: true, tentativa };
}

export async function removerBloqueio(id: string): Promise<{ erro: string | null }> {
  if (!uuid.safeParse(id).success) return { erro: "Bloqueio inválido." };
  const acesso = await obterAcesso();
  if (!acesso) return { erro: SEM_ACESSO };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("bloqueios_agenda")
    .delete()
    .eq("id", id)
    .eq("barbearia_id", acesso.atual.barbeariaId)
    .select("id");
  if (error || !data?.length) return { erro: "Não foi possível liberar esse horário. Atualize a página." };
  refresh();
  return { erro: null };
}

// ---------------------------------------------------------------------------
// Agendamento manual
// ---------------------------------------------------------------------------

const schemaBusca = z.object({ servicoId: uuid, barbeiroId: uuid, data: z.string().refine(dataValida) });

/** Horários livres para o agendamento manual (sem antecedência mínima nem janela). */
export async function buscarHorariosManual(entrada: z.input<typeof schemaBusca>): Promise<{ horarios: Horario[]; erro: string | null }> {
  const dados = schemaBusca.safeParse(entrada);
  if (!dados.success) return { horarios: [], erro: "Escolha serviço, barbeiro e data." };
  const acesso = await obterAcesso();
  if (!acesso) return { horarios: [], erro: SEM_ACESSO };

  try {
    const { servicoId, barbeiroId, data } = dados.data;
    const cadastro = await carregarCadastro(acesso.atual.barbeariaId);
    const servico = cadastro.servicos.find((s) => s.id === servicoId && s.ativo);
    if (!servico) return { horarios: [], erro: "Esse serviço está desativado." };
    const ocupados = await carregarOcupadosDia(acesso.atual.barbeariaId, data);
    const horarios = calcularHorarios({
      data,
      servicoId,
      duracaoMinutos: servico.duracaoMinutos,
      barbeiroId,
      barbeiros: cadastro.barbeiros.filter((b) => b.ativo),
      funcionamento: cadastro.funcionamento,
      ocupados,
      regras: { ...cadastro.barbearia.regras, antecedenciaMinutos: 0, janelaDias: 366 },
      agora: new Date(),
    });
    return { horarios, erro: null };
  } catch (e) {
    console.error(e);
    return { horarios: [], erro: "Não foi possível carregar os horários. Tente de novo." };
  }
}

const schemaManual = z
  .object({
    servicoId: uuid.or(z.literal("")).refine(Boolean, "Escolha o serviço."),
    barbeiroId: uuid.or(z.literal("")).refine(Boolean, "Escolha o barbeiro."),
    data: z.string().refine(dataValida, "Escolha a data."),
    inicio: z.string(),
    encaixe: z.string(),
    nome: z.string().trim().min(2, "Digite o nome do cliente.").max(120, "Nome muito longo."),
    whatsapp: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => /^(55)?\d{10,11}$/.test(v), "Digite o WhatsApp com DDD, como (11) 91234-5678."),
    observacoes: z.string().trim().max(500, "Use até 500 caracteres."),
  })
  .superRefine((v, ctx) => {
    if (v.encaixe) {
      if (!hora.safeParse(v.encaixe).success) ctx.addIssue({ code: "custom", path: ["encaixe"], message: "Informe a hora, como 14:10." });
    } else if (!z.iso.datetime({ offset: true }).safeParse(v.inicio).success) {
      ctx.addIssue({ code: "custom", path: ["inicio"], message: "Escolha um horário." });
    }
  });

export async function criarAgendamentoManual(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const dados = schemaManual.safeParse({
    servicoId: formData.get("servicoId") ?? "",
    barbeiroId: formData.get("barbeiroId") ?? "",
    data: formData.get("data") ?? "",
    inicio: formData.get("inicio") ?? "",
    encaixe: formData.get("encaixe") ?? "",
    nome: formData.get("nome") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    observacoes: formData.get("observacoes") ?? "",
  });
  if (!dados.success) return { erro: null, campos: errosDosCampos(dados.error), tentativa };
  const d = dados.data;

  const acesso = await obterAcesso();
  if (!acesso) return { erro: SEM_ACESSO, tentativa };

  const inicio = d.encaixe ? instanteLocal(d.data, horaParaMinutos(d.encaixe)).toISOString() : d.inicio;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("criar_agendamento_manual", {
    p_barbearia_id: acesso.atual.barbeariaId,
    p_barbeiro_id: d.barbeiroId,
    p_servico_id: d.servicoId,
    p_inicio: inicio,
    p_nome: d.nome,
    p_whatsapp: d.whatsapp,
    p_observacoes: d.observacoes || null,
  });
  if (error) {
    const conhecidos = [
      "SEM_PERMISSAO",
      "DADOS_INVALIDOS",
      "SERVICO_INVALIDO",
      "BARBEIRO_INVALIDO",
      "ANTECEDENCIA_MINIMA",
      "FORA_DO_EXPEDIENTE",
      "HORARIO_BLOQUEADO",
      "HORARIO_INDISPONIVEL",
    ];
    if (conhecidos.includes(error.message)) return { erro: textoDoBanco(error, "Confira os dados e tente de novo."), tentativa };
    console.error("criar_agendamento_manual", error);
    return { erro: "Não foi possível agendar agora. Tente de novo.", tentativa };
  }
  refresh();
  return { erro: null, ok: true, tentativa };
}
