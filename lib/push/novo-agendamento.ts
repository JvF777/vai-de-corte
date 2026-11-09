import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
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
    // Roda dentro de after(), depois da resposta. Os aparelhos só saem com a chave
    // secreta (servidor): o visitante não consegue pedir os aparelhos do dono.
    const supabase = criarClienteAdmin();
    if (!supabase) {
      console.warn("Web Push: falta SUPABASE_SECRET_KEY no servidor, aviso não enviado.");
      return;
    }
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
