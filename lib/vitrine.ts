import "server-only";
import { cache } from "react";
import type { BarbeiroAgenda, Funcionamento, Jornada, Regras } from "@/lib/availability";
import { criarClientePublico } from "@/lib/supabase/publico";

/**
 * Catálogo público de uma barbearia (o que o link /barbearia/[slug] mostra).
 * Tudo aqui é lido como visitante: o RLS só entrega barbearias, serviços e
 * barbeiros ativos. Nada de cliente ou agendamento passa por este arquivo.
 */

export type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  precoCentavos: number;
  duracaoMinutos: number;
};

export type Barbeiro = BarbeiroAgenda & {
  nome: string;
  fotoUrl: string | null;
  bio: string | null;
};

export type Barbearia = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  logoUrl: string | null;
  fotos: string[];
  whatsapp: string | null;
  instagram: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  mapsUrl: string | null;
  regras: Regras;
};

export type Vitrine = {
  barbearia: Barbearia;
  servicos: Servico[];
  barbeiros: Barbeiro[];
  funcionamento: Funcionamento[];
};

type LinhaBarbearia = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  logo_url: string | null;
  fotos: string[] | null;
  whatsapp: string | null;
  instagram: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  maps_url: string | null;
  intervalo_slot_minutos: number;
  antecedencia_minima_minutos: number;
  janela_agendamento_dias: number;
};

type LinhaBarbeiro = {
  id: string;
  nome: string;
  foto_url: string | null;
  bio: string | null;
  barbeiro_servicos: { servico_id: string }[];
};

type LinhaJornada = {
  barbeiro_id: string;
  dia_semana: number;
  inicio: string;
  fim: string;
  almoco_inicio: string | null;
  almoco_fim: string | null;
};

const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Carrega a vitrine pelo slug. Nulo se não existe ou está inativa. */
export const carregarVitrine = cache(async (slug: string): Promise<Vitrine | null> => {
  if (!SLUG_VALIDO.test(slug) || slug.length > 60) return null;
  const supabase = await criarClientePublico();

  const { data: b, error } = await supabase
    .from("barbearias")
    .select(
      "id, slug, nome, descricao, logo_url, fotos, whatsapp, instagram, endereco, cidade, uf, maps_url, intervalo_slot_minutos, antecedencia_minima_minutos, janela_agendamento_dias",
    )
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle<LinhaBarbearia>();
  if (error) throw new Error(`Erro ao carregar a barbearia: ${error.message}`);
  if (!b) return null;

  const [servicos, barbeiros, jornadas, funcionamento] = await Promise.all([
    supabase
      .from("servicos")
      .select("id, nome, descricao, preco_centavos, duracao_minutos")
      .eq("barbearia_id", b.id)
      .eq("ativo", true)
      .order("ordem")
      .order("nome"),
    supabase
      .from("barbeiros")
      .select("id, nome, foto_url, bio, barbeiro_servicos(servico_id)")
      .eq("barbearia_id", b.id)
      .eq("ativo", true)
      .order("ordem")
      .order("nome")
      .returns<LinhaBarbeiro[]>(),
    supabase
      .from("horarios_barbeiros")
      .select("barbeiro_id, dia_semana, inicio, fim, almoco_inicio, almoco_fim")
      .eq("barbearia_id", b.id)
      .returns<LinhaJornada[]>(),
    supabase.from("horarios_funcionamento").select("dia_semana, abre, fecha").eq("barbearia_id", b.id).order("dia_semana"),
  ]);
  for (const r of [servicos, barbeiros, jornadas, funcionamento]) {
    if (r.error) throw new Error(`Erro ao carregar a barbearia: ${r.error.message}`);
  }

  const idsServicos = new Set((servicos.data ?? []).map((s) => s.id));
  const listaBarbeiros: Barbeiro[] = (barbeiros.data ?? []).map((l) => ({
    id: l.id,
    nome: l.nome,
    fotoUrl: l.foto_url,
    bio: l.bio,
    servicoIds: l.barbeiro_servicos.map((s) => s.servico_id).filter((id) => idsServicos.has(id)),
    jornadas: (jornadas.data ?? [])
      .filter((j) => j.barbeiro_id === l.id)
      .map<Jornada>((j) => ({
        diaSemana: j.dia_semana,
        inicio: j.inicio,
        fim: j.fim,
        almocoInicio: j.almoco_inicio,
        almocoFim: j.almoco_fim,
      })),
  }));

  // Serviço que nenhum barbeiro ativo faz não tem como ser agendado: fica de fora.
  const feitos = new Set(listaBarbeiros.flatMap((x) => x.servicoIds));

  return {
    barbearia: {
      id: b.id,
      slug: b.slug,
      nome: b.nome,
      descricao: b.descricao,
      logoUrl: b.logo_url,
      fotos: b.fotos ?? [],
      whatsapp: b.whatsapp,
      instagram: b.instagram,
      endereco: b.endereco,
      cidade: b.cidade,
      uf: b.uf,
      mapsUrl: b.maps_url,
      regras: {
        intervaloMinutos: b.intervalo_slot_minutos,
        antecedenciaMinutos: b.antecedencia_minima_minutos,
        janelaDias: b.janela_agendamento_dias,
      },
    },
    servicos: (servicos.data ?? [])
      .filter((s) => feitos.has(s.id))
      .map((s) => ({
        id: s.id,
        nome: s.nome,
        descricao: s.descricao,
        precoCentavos: s.preco_centavos,
        duracaoMinutos: s.duracao_minutos,
      })),
    barbeiros: listaBarbeiros,
    funcionamento: (funcionamento.data ?? []).map((f) => ({ diaSemana: f.dia_semana, abre: f.abre, fecha: f.fecha })),
  };
});

/** Intervalos ocupados (agendamentos ativos e bloqueios) entre duas datas locais, inclusive. */
export async function carregarOcupados(slug: string, de: string, ate: string) {
  const supabase = await criarClientePublico();
  const { data, error } = await supabase.rpc("horarios_ocupados", { p_slug: slug, p_de: de, p_ate: ate });
  if (error) throw new Error(`Erro ao carregar horários: ${error.message}`);
  return ((data ?? []) as { barbeiro_id: string | null; inicio: string; fim: string }[]).map((o) => ({
    barbeiroId: o.barbeiro_id,
    inicio: o.inicio,
    fim: o.fim,
  }));
}

export type AgendamentoPublico = {
  id: string;
  inicio: string;
  fim: string;
  status: "agendado" | "confirmado" | "concluido" | "cancelado" | "falta";
  preco_centavos: number;
  duracao_minutos: number;
  cliente_nome: string;
  servico: { id: string; nome: string };
  barbeiro: { id: string; nome: string };
  barbearia: {
    nome: string;
    slug: string;
    whatsapp: string | null;
    endereco: string | null;
    cidade: string | null;
    uf: string | null;
    maps_url: string | null;
  };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Dados da tela de confirmação. O id é um uuid aleatório, difícil de adivinhar. */
export const carregarAgendamento = cache(async (id: string): Promise<AgendamentoPublico | null> => {
  if (!UUID.test(id)) return null;
  const supabase = await criarClientePublico();
  const { data, error } = await supabase.rpc("consultar_agendamento_publico", { p_id: id });
  if (error) throw new Error(`Erro ao carregar o agendamento: ${error.message}`);
  return (data as AgendamentoPublico | null) ?? null;
});
