import "server-only";
import { cache } from "react";
import type { BarbeiroAgenda, Funcionamento, Jornada, Regras } from "@/lib/availability";
import { obterContextoPainel, type Vinculo } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { limitesDoDia, type Status } from "./agenda";

/**
 * Leituras do painel, sempre com a sessão do usuário: o RLS garante que só
 * voltam dados da barbearia dele (e, para o barbeiro, só a própria agenda).
 */

export type Acesso = {
  usuarioId: string;
  atual: Vinculo;
  ehDono: boolean;
  /** Cadastro de barbeiro ligado ao usuário nesta barbearia (nulo para o dono que não atende). */
  meuBarbeiroId: string | null;
};

/** Quem está logado e o que pode fazer na barbearia atual. Nulo se não tem barbearia. */
export const obterAcesso = cache(async (): Promise<Acesso | null> => {
  const { usuario, atual } = await obterContextoPainel();
  if (!atual) return null;
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("barbeiros")
    .select("id")
    .eq("barbearia_id", atual.barbeariaId)
    .eq("usuario_id", usuario.id)
    .maybeSingle<{ id: string }>();
  return { usuarioId: usuario.id, atual, ehDono: atual.papel === "dono", meuBarbeiroId: data?.id ?? null };
});

export type BarbeariaPainel = {
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

export type ServicoPainel = {
  id: string;
  nome: string;
  descricao: string | null;
  precoCentavos: number;
  duracaoMinutos: number;
  ativo: boolean;
  ordem: number;
};

export type BarbeiroPainel = BarbeiroAgenda & {
  nome: string;
  bio: string | null;
  fotoUrl: string | null;
  ativo: boolean;
  ordem: number;
  /** Tem login no painel. */
  temLogin: boolean;
};

export type Cadastro = {
  barbearia: BarbeariaPainel;
  servicos: ServicoPainel[];
  barbeiros: BarbeiroPainel[];
  funcionamento: Funcionamento[];
};

type LinhaBarbeiro = {
  id: string;
  nome: string;
  bio: string | null;
  foto_url: string | null;
  ativo: boolean;
  ordem: number;
  usuario_id: string | null;
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

/** Tudo que o dono cadastra, inclusive o que está desativado. */
export const carregarCadastro = cache(async (barbeariaId: string): Promise<Cadastro> => {
  const supabase = await criarClienteServidor();
  const [barbearia, servicos, barbeiros, jornadas, funcionamento] = await Promise.all([
    supabase
      .from("barbearias")
      .select(
        "id, slug, nome, descricao, logo_url, fotos, whatsapp, instagram, endereco, cidade, uf, maps_url, intervalo_slot_minutos, antecedencia_minima_minutos, janela_agendamento_dias",
      )
      .eq("id", barbeariaId)
      .single(),
    supabase
      .from("servicos")
      .select("id, nome, descricao, preco_centavos, duracao_minutos, ativo, ordem")
      .eq("barbearia_id", barbeariaId)
      .order("ordem")
      .order("nome"),
    supabase
      .from("barbeiros")
      .select("id, nome, bio, foto_url, ativo, ordem, usuario_id, barbeiro_servicos(servico_id)")
      .eq("barbearia_id", barbeariaId)
      .order("ordem")
      .order("nome")
      .returns<LinhaBarbeiro[]>(),
    supabase
      .from("horarios_barbeiros")
      .select("barbeiro_id, dia_semana, inicio, fim, almoco_inicio, almoco_fim")
      .eq("barbearia_id", barbeariaId)
      .returns<LinhaJornada[]>(),
    supabase.from("horarios_funcionamento").select("dia_semana, abre, fecha").eq("barbearia_id", barbeariaId).order("dia_semana"),
  ]);
  for (const r of [barbearia, servicos, barbeiros, jornadas, funcionamento]) {
    if (r.error) throw new Error(`Erro ao carregar o cadastro: ${r.error.message}`);
  }

  const b = barbearia.data!;
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
    servicos: (servicos.data ?? []).map((s) => ({
      id: s.id,
      nome: s.nome,
      descricao: s.descricao,
      precoCentavos: s.preco_centavos,
      duracaoMinutos: s.duracao_minutos,
      ativo: s.ativo,
      ordem: s.ordem,
    })),
    barbeiros: (barbeiros.data ?? []).map((l) => ({
      id: l.id,
      nome: l.nome,
      bio: l.bio,
      fotoUrl: l.foto_url,
      ativo: l.ativo,
      ordem: l.ordem,
      temLogin: Boolean(l.usuario_id),
      servicoIds: l.barbeiro_servicos.map((s) => s.servico_id),
      jornadas: (jornadas.data ?? [])
        .filter((j) => j.barbeiro_id === l.id)
        .sort((x, y) => x.dia_semana - y.dia_semana)
        .map<Jornada>((j) => ({
          diaSemana: j.dia_semana,
          inicio: j.inicio,
          fim: j.fim,
          almocoInicio: j.almoco_inicio,
          almocoFim: j.almoco_fim,
        })),
    })),
    funcionamento: (funcionamento.data ?? []).map((f) => ({ diaSemana: f.dia_semana, abre: f.abre, fecha: f.fecha })),
  };
});

export type AgendamentoPainel = {
  id: string;
  barbeiroId: string;
  inicio: string;
  fim: string;
  status: Status;
  origem: "link_publico" | "manual";
  precoCentavos: number;
  duracaoMinutos: number;
  observacoes: string | null;
  servico: { id: string; nome: string };
  cliente: { id: string; nome: string; whatsapp: string };
};

export type TipoBloqueio = "bloqueio" | "folga" | "feriado";

export type BloqueioPainel = {
  id: string;
  /** Nulo = barbearia inteira. */
  barbeiroId: string | null;
  tipo: TipoBloqueio;
  inicio: string;
  fim: string;
  motivo: string | null;
};

type LinhaAgendamento = {
  id: string;
  barbeiro_id: string;
  inicio: string;
  fim: string;
  status: Status;
  origem: "link_publico" | "manual";
  preco_centavos: number;
  duracao_minutos: number;
  observacoes: string | null;
  servico: { id: string; nome: string };
  cliente: { id: string; nome: string; whatsapp: string };
};

type LinhaBloqueio = {
  id: string;
  barbeiro_id: string | null;
  tipo: TipoBloqueio;
  inicio: string;
  fim: string;
  motivo: string | null;
};

/** Agendamentos e bloqueios que tocam um dia local. */
export async function carregarAgendaDia(barbeariaId: string, data: string) {
  const { de, ate } = limitesDoDia(data);
  const supabase = await criarClienteServidor();
  const [agendamentos, bloqueios] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(
        "id, barbeiro_id, inicio, fim, status, origem, preco_centavos, duracao_minutos, observacoes, servico:servicos(id, nome), cliente:clientes(id, nome, whatsapp)",
      )
      .eq("barbearia_id", barbeariaId)
      .lt("inicio", ate.toISOString())
      .gt("fim", de.toISOString())
      .order("inicio")
      .returns<LinhaAgendamento[]>(),
    supabase
      .from("bloqueios_agenda")
      .select("id, barbeiro_id, tipo, inicio, fim, motivo")
      .eq("barbearia_id", barbeariaId)
      .lt("inicio", ate.toISOString())
      .gt("fim", de.toISOString())
      .order("inicio")
      .returns<LinhaBloqueio[]>(),
  ]);
  if (agendamentos.error) throw new Error(`Erro ao carregar a agenda: ${agendamentos.error.message}`);
  if (bloqueios.error) throw new Error(`Erro ao carregar a agenda: ${bloqueios.error.message}`);

  return {
    agendamentos: (agendamentos.data ?? []).map<AgendamentoPainel>((a) => ({
      id: a.id,
      barbeiroId: a.barbeiro_id,
      inicio: a.inicio,
      fim: a.fim,
      status: a.status,
      origem: a.origem,
      precoCentavos: a.preco_centavos,
      duracaoMinutos: a.duracao_minutos,
      observacoes: a.observacoes,
      servico: a.servico,
      cliente: a.cliente,
    })),
    bloqueios: (bloqueios.data ?? []).map<BloqueioPainel>((b) => ({
      id: b.id,
      barbeiroId: b.barbeiro_id,
      tipo: b.tipo,
      inicio: b.inicio,
      fim: b.fim,
      motivo: b.motivo,
    })),
  };
}

/** Intervalos ocupados (agendamentos ativos e bloqueios) de um dia, no formato do lib/availability. */
export async function carregarOcupadosDia(barbeariaId: string, data: string) {
  const { agendamentos, bloqueios } = await carregarAgendaDia(barbeariaId, data);
  return [
    ...agendamentos
      .filter((a) => a.status === "agendado" || a.status === "confirmado" || a.status === "concluido")
      .map((a) => ({ barbeiroId: a.barbeiroId, inicio: a.inicio, fim: a.fim })),
    ...bloqueios.map((b) => ({ barbeiroId: b.barbeiroId, inicio: b.inicio, fim: b.fim })),
  ];
}

/** Folgas e férias futuras de um barbeiro (e as da barbearia inteira). */
export async function carregarFolgas(barbeariaId: string, barbeiroId: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("bloqueios_agenda")
    .select("id, barbeiro_id, tipo, inicio, fim, motivo")
    .eq("barbearia_id", barbeariaId)
    .eq("barbeiro_id", barbeiroId)
    .in("tipo", ["folga", "feriado"])
    .gt("fim", new Date().toISOString())
    .order("inicio")
    .returns<LinhaBloqueio[]>();
  if (error) throw new Error(`Erro ao carregar folgas: ${error.message}`);
  return (data ?? []).map<BloqueioPainel>((b) => ({
    id: b.id,
    barbeiroId: b.barbeiro_id,
    tipo: b.tipo,
    inicio: b.inicio,
    fim: b.fim,
    motivo: b.motivo,
  }));
}
