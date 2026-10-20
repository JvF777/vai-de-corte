import type { EventoAgenda } from "@/lib/agenda-links";
import { formatarWhatsapp } from "@/lib/formatos";
import type { AgendamentoPublico } from "@/lib/vitrine";

export function enderecoCompleto(a: AgendamentoPublico) {
  const { endereco, cidade, uf } = a.barbearia;
  return [endereco, [cidade, uf].filter(Boolean).join(" - ")].filter(Boolean).join(", ");
}

/** Evento de agenda do cliente (Google Agenda e .ics). */
export function eventoDoAgendamento(a: AgendamentoPublico): EventoAgenda {
  const contato = a.barbearia.whatsapp ? `\nWhatsApp da barbearia: ${formatarWhatsapp(a.barbearia.whatsapp)}` : "";
  return {
    id: a.id,
    titulo: `${a.servico.nome} na ${a.barbearia.nome}`,
    descricao: `${a.servico.nome} com ${a.barbeiro.nome}.${contato}`,
    local: enderecoCompleto(a) || a.barbearia.nome,
    inicio: a.inicio,
    fim: a.fim,
  };
}
