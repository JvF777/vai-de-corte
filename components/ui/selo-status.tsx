import { Ban, CalendarClock, CircleCheck, CircleDashed, UserX } from "lucide-react";

export type StatusAgendamento = "agendado" | "confirmado" | "concluido" | "cancelado" | "falta";

const status: Record<StatusAgendamento, { rotulo: string; classe: string; Icone: typeof Ban }> = {
  agendado: { rotulo: "Agendado", classe: "bg-info-fundo text-info", Icone: CalendarClock },
  confirmado: { rotulo: "Confirmado", classe: "bg-ouro/15 text-ouro-hover", Icone: CircleDashed },
  concluido: { rotulo: "Concluído", classe: "bg-sucesso-fundo text-sucesso", Icone: CircleCheck },
  cancelado: { rotulo: "Cancelado", classe: "bg-elevado text-texto-sec", Icone: Ban },
  falta: { rotulo: "Faltou", classe: "bg-erro-fundo text-erro", Icone: UserX },
};

/** Selo de status do agendamento: texto explícito + ícone, nunca só a cor. */
export function SeloStatus({ valor }: { valor: StatusAgendamento }) {
  const { rotulo, classe, Icone } = status[valor];
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-label font-medium ${classe}`}>
      <Icone className="size-3.5" aria-hidden />
      {rotulo}
    </span>
  );
}
