"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { obterAcesso } from "@/lib/painel/dados";
import { errosDosCampos, type EstadoFormulario } from "@/lib/painel/formulario";
import { apagarImagem, enviarImagem } from "@/lib/painel/imagens";
import { criarClienteServidor } from "@/lib/supabase/server";
import { lerSemana } from "../_componentes/ler-semana";

const SO_DONO = "Só o dono pode mudar os dados da barbearia.";
const MAX_FOTOS = 12;

async function exigirDono() {
  const acesso = await obterAcesso();
  if (!acesso?.ehDono) return null;
  return { barbeariaId: acesso.atual.barbeariaId, supabase: await criarClienteServidor() };
}

const opcional = (max: number, msg = `Use até ${max} caracteres.`) => z.string().trim().max(max, msg);

const schemaDados = z.object({
  nome: z.string().trim().min(2, "Digite o nome da barbearia.").max(120, "Use até 120 caracteres."),
  descricao: opcional(1000),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || /^(55)?\d{10,11}$/.test(v), "Digite o WhatsApp com DDD, como (11) 91234-5678.")
    .transform((v) => (v === "" ? null : v.length <= 11 ? `55${v}` : v)),
  instagram: opcional(60).transform((v) => v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "")),
  endereco: opcional(300),
  cidade: opcional(100),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "Use a sigla, como SP."),
  mapsUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Cole o link completo, começando com https://")
    .pipe(z.string().max(500, "Link muito longo.")),
});

export async function salvarDados(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const ler = (k: string) => String(formData.get(k) ?? "");
  const dados = schemaDados.safeParse({
    nome: ler("nome"),
    descricao: ler("descricao"),
    whatsapp: ler("whatsapp"),
    instagram: ler("instagram"),
    endereco: ler("endereco"),
    cidade: ler("cidade"),
    uf: ler("uf"),
    mapsUrl: ler("mapsUrl"),
  });
  if (!dados.success) return { erro: null, campos: errosDosCampos(dados.error), tentativa };
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO, tentativa };
  const d = dados.data;

  const { error } = await ctx.supabase
    .from("barbearias")
    .update({
      nome: d.nome,
      descricao: d.descricao || null,
      whatsapp: d.whatsapp,
      instagram: d.instagram || null,
      endereco: d.endereco || null,
      cidade: d.cidade || null,
      uf: d.uf || null,
      maps_url: d.mapsUrl || null,
    })
    .eq("id", ctx.barbeariaId);
  if (error) {
    console.error("salvarDados", error);
    return { erro: "Não foi possível salvar. Tente de novo.", tentativa };
  }
  refresh();
  return { erro: null, ok: true, tentativa };
}

export async function salvarFuncionamento(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const semana = lerSemana(formData, false);
  if (!semana.ok) return { erro: "Confira os horários marcados em vermelho.", campos: semana.campos, tentativa };
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO, tentativa };
  const { supabase, barbeariaId } = ctx;

  if (semana.dias.length) {
    const { error } = await supabase.from("horarios_funcionamento").upsert(
      semana.dias.map((d) => ({ barbearia_id: barbeariaId, dia_semana: d.dia, abre: d.inicio, fecha: d.fim })),
      { onConflict: "barbearia_id,dia_semana" },
    );
    if (error) return { erro: "Não foi possível salvar o horário. Tente de novo.", tentativa };
  }
  let apagar = supabase.from("horarios_funcionamento").delete().eq("barbearia_id", barbeariaId);
  if (semana.dias.length) apagar = apagar.not("dia_semana", "in", `(${semana.dias.map((d) => d.dia).join(",")})`);
  const { error } = await apagar;
  if (error) return { erro: "Não foi possível salvar o horário. Tente de novo.", tentativa };
  refresh();
  return { erro: null, ok: true, tentativa };
}

const schemaRegras = z.object({
  intervalo: z.coerce.number().int().refine((v) => [10, 15, 20, 30, 45, 60].includes(v), "Escolha um intervalo da lista."),
  antecedencia: z.coerce.number().int().min(0).max(10080),
  janela: z.coerce.number().int().min(1).max(180),
});

export async function salvarRegras(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const dados = schemaRegras.safeParse({
    intervalo: formData.get("intervalo"),
    antecedencia: formData.get("antecedencia"),
    janela: formData.get("janela"),
  });
  if (!dados.success) return { erro: null, campos: errosDosCampos(dados.error), tentativa };
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO, tentativa };
  const { error } = await ctx.supabase
    .from("barbearias")
    .update({
      intervalo_slot_minutos: dados.data.intervalo,
      antecedencia_minima_minutos: dados.data.antecedencia,
      janela_agendamento_dias: dados.data.janela,
    })
    .eq("id", ctx.barbeariaId);
  if (error) return { erro: "Não foi possível salvar. Tente de novo.", tentativa };
  refresh();
  return { erro: null, ok: true, tentativa };
}

// ---------------------------------------------------------------------------
// Logo e fotos
// ---------------------------------------------------------------------------
async function lerImagens(ctx: NonNullable<Awaited<ReturnType<typeof exigirDono>>>) {
  const { data } = await ctx.supabase
    .from("barbearias")
    .select("logo_url, fotos")
    .eq("id", ctx.barbeariaId)
    .single<{ logo_url: string | null; fotos: string[] | null }>();
  return { logo: data?.logo_url ?? null, fotos: data?.fotos ?? [] };
}

export async function trocarLogo(formData: FormData): Promise<{ erro: string | null }> {
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO };
  const { logo } = await lerImagens(ctx);
  const envio = await enviarImagem(ctx.supabase, ctx.barbeariaId, formData.get("arquivo"), "logo");
  if (envio.erro !== null) return { erro: envio.erro };
  const { error } = await ctx.supabase.from("barbearias").update({ logo_url: envio.url }).eq("id", ctx.barbeariaId);
  if (error) return { erro: "Não foi possível salvar o logo." };
  await apagarImagem(ctx.supabase, ctx.barbeariaId, logo);
  refresh();
  return { erro: null };
}

export async function removerLogo(): Promise<{ erro: string | null }> {
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO };
  const { logo } = await lerImagens(ctx);
  const { error } = await ctx.supabase.from("barbearias").update({ logo_url: null }).eq("id", ctx.barbeariaId);
  if (error) return { erro: "Não foi possível remover o logo." };
  await apagarImagem(ctx.supabase, ctx.barbeariaId, logo);
  refresh();
  return { erro: null };
}

export async function adicionarFoto(formData: FormData): Promise<{ erro: string | null }> {
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO };
  const { fotos } = await lerImagens(ctx);
  if (fotos.length >= MAX_FOTOS) return { erro: `O limite é de ${MAX_FOTOS} fotos. Remova uma antes.` };
  const envio = await enviarImagem(ctx.supabase, ctx.barbeariaId, formData.get("arquivo"), "foto");
  if (envio.erro !== null) return { erro: envio.erro };
  const { error } = await ctx.supabase
    .from("barbearias")
    .update({ fotos: [...fotos, envio.url] })
    .eq("id", ctx.barbeariaId);
  if (error) {
    await apagarImagem(ctx.supabase, ctx.barbeariaId, envio.url);
    return { erro: "Não foi possível salvar a foto." };
  }
  refresh();
  return { erro: null };
}

export async function removerFoto(url: string): Promise<{ erro: string | null }> {
  const ctx = await exigirDono();
  if (!ctx) return { erro: SO_DONO };
  const { fotos } = await lerImagens(ctx);
  if (!fotos.includes(url)) return { erro: "Essa foto já foi removida. Atualize a página." };
  const { error } = await ctx.supabase
    .from("barbearias")
    .update({ fotos: fotos.filter((f) => f !== url) })
    .eq("id", ctx.barbeariaId);
  if (error) return { erro: "Não foi possível remover a foto." };
  await apagarImagem(ctx.supabase, ctx.barbeariaId, url);
  refresh();
  return { erro: null };
}
