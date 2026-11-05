import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/env";
import { enviarAviso, pushConfigurado, type Inscricao } from "./envio";
import { avisoNovoAgendamento } from "./mensagem";

type Destinatarios = {
  barbearia: string;
  barbeiro_id: string;
  barbeiro: string;
  servico: string;
  cliente: string;
  inicio: string;
  inscricoes: Inscricao[];
};

/**
 * Avisa o dono e o barbeiro de um agendamento feito pelo link público.
 * Nunca lança erro: o agendamento do cliente já deu certo, o aviso é um extra.
 */
export async function avisarNovoAgendamento(agendamentoId: string) {
  if (!pushConfigurado()) return;
  try {
    // Roda dentro de after(), depois da resposta: sem connection(), então o cliente é criado aqui.
    const { url, chave } = supabaseEnv();
    const supabase = createClient(url, chave, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.rpc("destinatarios_aviso_agendamento", { p_agendamento_id: agendamentoId });
    if (error) throw error;
    const d = data as Destinatarios | null;
    if (!d || d.inscricoes.length === 0) return;

    const aviso = avisoNovoAgendamento({
      id: agendamentoId,
      barbearia: d.barbearia,
      barbeiroId: d.barbeiro_id,
      barbeiro: d.barbeiro,
      servico: d.servico,
      cliente: d.cliente,
      inicio: d.inicio,
    });
    const { expirados } = await enviarAviso(d.inscricoes, aviso);
    if (expirados.length) await supabase.rpc("descartar_inscricoes_push", { p_endpoints: expirados });
  } catch (e) {
    console.error("Aviso de novo agendamento", e);
  }
}
