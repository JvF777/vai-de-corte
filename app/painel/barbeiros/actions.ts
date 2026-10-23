"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dataValida, instanteLocal, somarDias } from "@/lib/availability";
import { formatarHora } from "@/lib/formatos";
import { STATUS_ATIVOS } from "@/lib/painel/agenda";
import { obterAcesso } from "@/lib/painel/dados";
import { errosDosCampos, type EstadoFormulario } from "@/lib/painel/formulario";
import { apagarImagem, enviarImagem } from "@/lib/painel/imagens";
import { criarClienteServidor } from "@/lib/supabase/server";
import { lerSemana } from "../_componentes/ler-semana";

const SO_DONO = "Só o dono da barbearia pode mudar a equipe.";
const uuid = z.uuid();

async function exigirDono() {
  const acesso = await obterAcesso();
  if (!acesso?.ehDono) return null;
  return { barbeariaId: acesso.atual.barbeariaId, supabase: await criarClienteServidor() };
}

const nome = z.string().trim().min(2, "Digite o nome.").max(80, "Use até 80 caracteres.");
const bio = z.string().trim().max(500, "Use até 500 caracteres.");

// ---------------------------------------------------------------------------
// Novo barbeiro: já nasce com o horário da barbearia e todos os serviços ativos.
// ---------------------------------------------------------------------------
export async function criarBarbeiro(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const dados = z.object({ nome, bio }).safeParse({ nome: formData.get("nome") ?? "", bio: formData.get("bio") ?? "" });
  if (!dados.success) return { erro: null, campos: errosDosCampos(dados.error), tentativa };

  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO, tentativa };
  const { supabase, barbeariaId } = ctx;

  const [{ data: ultimo }, { data: funcionamento }, { data: servicos }] = await Promise.all([
    supabase.from("barbeiros").select("ordem").eq("barbearia_id", barbeariaId).order("ordem", { ascending: false }).limit(1).maybeSingle<{ ordem: number }>(),
    supabase.from("horarios_funcionamento").select("dia_semana, abre, fecha").eq("barbearia_id", barbeariaId),
    supabase.from("servicos").select("id").eq("barbearia_id", barbeariaId).eq("ativo", true),
  ]);

  const { data: novo, error } = await supabase
    .from("barbeiros")
    .insert({ barbearia_id: barbeariaId, nome: dados.data.nome, bio: dados.data.bio || null, ordem: (ultimo?.ordem ?? 0) + 1 })
    .select("id")
    .single<{ id: string }>();
  if (error || !novo) return { erro: "Não foi possível cadastrar. Tente de novo.", tentativa };

  if (funcionamento?.length) {
    await supabase.from("horarios_barbeiros").insert(
      funcionamento.map((f) => ({ barbearia_id: barbeariaId, barbeiro_id: novo.id, dia_semana: f.dia_semana, inicio: f.abre, fim: f.fecha })),
    );
  }
  if (servicos?.length) {
    await supabase
      .from("barbeiro_servicos")
      .insert(servicos.map((s) => ({ barbearia_id: barbeariaId, barbeiro_id: novo.id, servico_id: s.id })));
  }
  redirect(`/painel/barbeiros/${novo.id}?novo=1`);
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------
export async function salvarPerfil(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const dados = z
    .object({ id: uuid, nome, bio, ativo: z.boolean() })
    .safeParse({ id: formData.get("id"), nome: formData.get("nome") ?? "", bio: formData.get("bio") ?? "", ativo: formData.get("ativo") === "sim" });
  if (!dados.success) return { erro: null, campos: errosDosCampos(dados.error), tentativa };
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO, tentativa };

  const { data, error } = await ctx.supabase
    .from("barbeiros")
    .update({ nome: dados.data.nome, bio: dados.data.bio || null, ativo: dados.data.ativo })
    .eq("id", dados.data.id)
    .eq("barbearia_id", ctx.barbeariaId)
    .select("id");
  if (error || !data?.length) return { erro: "Não foi possível salvar. Atualize a página.", tentativa };
  refresh();
  return { erro: null, ok: true, tentativa };
}

export async function trocarFotoBarbeiro(formData: FormData): Promise<{ erro: string | null }> {
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { erro: "Barbeiro inválido." };
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO };

  const { data: atual } = await ctx.supabase
    .from("barbeiros")
    .select("foto_url")
    .eq("id", id.data)
    .eq("barbearia_id", ctx.barbeariaId)
    .maybeSingle<{ foto_url: string | null }>();
  if (!atual) return { erro: "Barbeiro não encontrado." };

  const envio = await enviarImagem(ctx.supabase, ctx.barbeariaId, formData.get("arquivo"), "barbeiro");
  if (envio.erro !== null) return { erro: envio.erro };
  const { error } = await ctx.supabase.from("barbeiros").update({ foto_url: envio.url }).eq("id", id.data);
  if (error) return { erro: "Não foi possível salvar a foto." };
  await apagarImagem(ctx.supabase, ctx.barbeariaId, atual.foto_url);
  refresh();
  return { erro: null };
}

export async function removerFotoBarbeiro(id: string): Promise<{ erro: string | null }> {
  if (!uuid.safeParse(id).success) return { erro: "Barbeiro inválido." };
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO };
  const { data: atual } = await ctx.supabase
    .from("barbeiros")
    .select("foto_url")
    .eq("id", id)
    .eq("barbearia_id", ctx.barbeariaId)
    .maybeSingle<{ foto_url: string | null }>();
  if (!atual) return { erro: "Barbeiro não encontrado." };
  const { error } = await ctx.supabase.from("barbeiros").update({ foto_url: null }).eq("id", id);
  if (error) return { erro: "Não foi possível remover a foto." };
  await apagarImagem(ctx.supabase, ctx.barbeariaId, atual.foto_url);
  refresh();
  return { erro: null };
}

// ---------------------------------------------------------------------------
// Serviços que faz
// ---------------------------------------------------------------------------
export async function salvarServicosBarbeiro(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const dados = z
    .object({ id: uuid, servicos: z.array(uuid) })
    .safeParse({ id: formData.get("id"), servicos: formData.getAll("servicos") });
  if (!dados.success) return { erro: "Dados inválidos. Atualize a página.", tentativa };
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO, tentativa };
  const { supabase, barbeariaId } = ctx;
  const barbeiroId = dados.data.id;

  const { data: atuais, error: erroLeitura } = await supabase
    .from("barbeiro_servicos")
    .select("servico_id")
    .eq("barbeiro_id", barbeiroId)
    .eq("barbearia_id", barbeariaId)
    .returns<{ servico_id: string }[]>();
  if (erroLeitura) return { erro: "Não foi possível salvar. Tente de novo.", tentativa };

  const antes = new Set((atuais ?? []).map((l) => l.servico_id));
  const depois = new Set(dados.data.servicos);
  const sair = [...antes].filter((id) => !depois.has(id));
  const entrar = [...depois].filter((id) => !antes.has(id));
  if (sair.length) {
    const { error } = await supabase.from("barbeiro_servicos").delete().eq("barbeiro_id", barbeiroId).in("servico_id", sair);
    if (error) return { erro: "Não foi possível salvar. Tente de novo.", tentativa };
  }
  if (entrar.length) {
    const { error } = await supabase
      .from("barbeiro_servicos")
      .insert(entrar.map((servicoId) => ({ barbearia_id: barbeariaId, barbeiro_id: barbeiroId, servico_id: servicoId })));
    if (error) return { erro: "Não foi possível salvar. Tente de novo.", tentativa };
  }
  refresh();
  return { erro: null, ok: true, tentativa };
}

// ---------------------------------------------------------------------------
// Horário da semana (dia sem linha = folga fixa)
// ---------------------------------------------------------------------------
export async function salvarHorarios(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { erro: "Dados inválidos. Atualize a página.", tentativa };
  const semana = lerSemana(formData, true);
  if (!semana.ok) return { erro: "Confira os horários marcados em vermelho.", campos: semana.campos, tentativa };

  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO, tentativa };
  const { supabase, barbeariaId } = ctx;

  const trabalha = semana.dias.map((d) => d.dia);
  if (semana.dias.length) {
    const { error } = await supabase.from("horarios_barbeiros").upsert(
      semana.dias.map((d) => ({
        barbearia_id: barbeariaId,
        barbeiro_id: id.data,
        dia_semana: d.dia,
        inicio: d.inicio,
        fim: d.fim,
        almoco_inicio: d.almocoInicio,
        almoco_fim: d.almocoFim,
      })),
      { onConflict: "barbeiro_id,dia_semana" },
    );
    if (error) {
      console.error("salvarHorarios", error);
      return { erro: "Não foi possível salvar os horários. Tente de novo.", tentativa };
    }
  }
  let apagar = supabase.from("horarios_barbeiros").delete().eq("barbeiro_id", id.data).eq("barbearia_id", barbeariaId);
  if (trabalha.length) apagar = apagar.not("dia_semana", "in", `(${trabalha.join(",")})`);
  const { error } = await apagar;
  if (error) return { erro: "Não foi possível salvar os horários. Tente de novo.", tentativa };

  refresh();
  return { erro: null, ok: true, tentativa };
}

// ---------------------------------------------------------------------------
// Folgas e férias (bloqueios de dias inteiros)
// ---------------------------------------------------------------------------
export async function adicionarFolga(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const dados = z
    .object({
      id: uuid,
      de: z.string().refine(dataValida, "Escolha o primeiro dia."),
      ate: z.string().refine(dataValida, "Escolha o último dia."),
      motivo: z.string().trim().max(200, "Use até 200 caracteres."),
    })
    .refine((v) => !dataValida(v.de) || !dataValida(v.ate) || v.ate >= v.de, { path: ["ate"], message: "O último dia vem depois do primeiro." })
    .safeParse({ id: formData.get("id"), de: formData.get("de") ?? "", ate: formData.get("ate") ?? "", motivo: formData.get("motivo") ?? "" });
  if (!dados.success) return { erro: null, campos: errosDosCampos(dados.error), tentativa };
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO, tentativa };
  const { supabase, barbeariaId } = ctx;
  const d = dados.data;

  const inicio = instanteLocal(d.de, 0);
  const fim = instanteLocal(somarDias(d.ate, 1), 0);
  const { data: marcados, error: erroConflito } = await supabase
    .from("agendamentos")
    .select("inicio, cliente:clientes(nome)")
    .eq("barbeiro_id", d.id)
    .in("status", STATUS_ATIVOS)
    .lt("inicio", fim.toISOString())
    .gt("fim", inicio.toISOString())
    .order("inicio")
    .returns<{ inicio: string; cliente: { nome: string } }[]>();
  if (erroConflito) return { erro: "Não foi possível verificar a agenda. Tente de novo.", tentativa };
  if (marcados?.length) {
    const primeiro = marcados[0];
    const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(primeiro.inicio));
    return {
      erro: `${marcados.length === 1 ? "Já tem 1 cliente marcado" : `Já tem ${marcados.length} clientes marcados`} nesses dias (o primeiro em ${data} às ${formatarHora(primeiro.inicio)}, ${primeiro.cliente.nome.split(" ")[0]}). Cancele ou remarque antes.`,
      tentativa,
    };
  }

  const { error } = await supabase.from("bloqueios_agenda").insert({
    barbearia_id: barbeariaId,
    barbeiro_id: d.id,
    tipo: "folga",
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    motivo: d.motivo || null,
  });
  if (error) return { erro: "Não foi possível salvar a folga. Tente de novo.", tentativa };
  refresh();
  return { erro: null, ok: true, tentativa };
}

export async function removerFolga(id: string): Promise<{ erro: string | null }> {
  if (!uuid.safeParse(id).success) return { erro: "Folga inválida." };
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO };
  const { data, error } = await ctx.supabase.from("bloqueios_agenda").delete().eq("id", id).eq("barbearia_id", ctx.barbeariaId).select("id");
  if (error || !data?.length) return { erro: "Não foi possível remover. Atualize a página." };
  refresh();
  return { erro: null };
}

