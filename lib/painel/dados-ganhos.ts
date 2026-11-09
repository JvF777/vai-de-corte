import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Status } from "./agenda";
import type { AgendamentoGanho } from "./ganhos";

type Linha = {
  id: string;
  barbeiro_id: string;
  inicio: string;
  status: Status;
  preco_centavos: number;
  servico: { id: string; nome: string };
  cliente: { nome: string };
};

/** O Supabase devolve no máximo 1000 linhas por vez; um mês cheio de uma barbearia grande passa disso. */
const PAGINA = 1000;

/**
 * Agendamentos que começam no período, com a sessão do usuário: o RLS já deixa
 * o barbeiro ver só os dele. O filtro por barbeiro é só para o dono escolher um.
 */
export async function carregarGanhos(barbeariaId: string, de: Date, ate: Date, barbeiroId: string | null): Promise<AgendamentoGanho[]> {
  const supabase = await criarClienteServidor();
  const linhas: Linha[] = [];
  for (let pagina = 0; ; pagina++) {
    let consulta = supabase
      .from("agendamentos")
      .select("id, barbeiro_id, inicio, status, preco_centavos, servico:servicos(id, nome), cliente:clientes(nome)")
      .eq("barbearia_id", barbeariaId)
      .gte("inicio", de.toISOString())
      .lt("inicio", ate.toISOString());
    if (barbeiroId) consulta = consulta.eq("barbeiro_id", barbeiroId);
    const { data, error } = await consulta
      .order("inicio")
      .order("id")
      .range(pagina * PAGINA, (pagina + 1) * PAGINA - 1)
      .returns<Linha[]>();
    if (error) throw new Error(`Erro ao carregar os ganhos: ${error.message}`);
    linhas.push(...(data ?? []));
    if (!data || data.length < PAGINA) break;
  }
  return linhas.map((l) => ({
    id: l.id,
    barbeiroId: l.barbeiro_id,
    inicio: l.inicio,
    status: l.status,
    precoCentavos: l.preco_centavos,
    servico: l.servico,
    clienteNome: l.cliente.nome,
  }));
}
