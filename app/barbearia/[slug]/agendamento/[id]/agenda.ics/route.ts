import { arquivoIcs } from "@/lib/agenda-links";
import { carregarAgendamento } from "@/lib/vitrine";
import { eventoDoAgendamento } from "../evento";

/** Arquivo .ics do agendamento, para salvar na agenda do celular (iPhone, Outlook...). */
export async function GET(_request: Request, { params }: RouteContext<"/barbearia/[slug]/agendamento/[id]/agenda.ics">) {
  const { slug, id } = await params;
  const agendamento = await carregarAgendamento(id);
  if (!agendamento || agendamento.barbearia.slug !== slug) {
    return new Response("Agendamento não encontrado.", { status: 404 });
  }

  return new Response(arquivoIcs(eventoDoAgendamento(agendamento)), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agendamento.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
