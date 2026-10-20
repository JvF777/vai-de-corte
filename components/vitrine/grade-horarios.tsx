"use client";

import { useState } from "react";
import { Check, Clock } from "lucide-react";

type Horario = { hora: string; estado: "livre" | "ocupado" | "almoco" };

// Exemplo ilustrativo da tela do cliente (não são dados de nenhuma barbearia).
const HORARIOS: Horario[] = [
  { hora: "09:00", estado: "ocupado" },
  { hora: "09:30", estado: "livre" },
  { hora: "10:00", estado: "ocupado" },
  { hora: "10:30", estado: "livre" },
  { hora: "11:00", estado: "livre" },
  { hora: "11:30", estado: "ocupado" },
  { hora: "12:00", estado: "almoco" },
  { hora: "13:00", estado: "livre" },
  { hora: "13:30", estado: "livre" },
];

/**
 * Pedaço da tela de agendamento do cliente, em HTML de verdade:
 * dá para tocar num horário livre e ver a reserva montada.
 */
export function GradeHorarios({ compacta = false }: { compacta?: boolean }) {
  const [escolhido, setEscolhido] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-borda bg-card p-4 sm:p-5" data-ui>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-titulo text-subtitulo font-semibold">Corte masculino</p>
          <p className="text-label text-texto-sec">com Rafael, sábado</p>
        </div>
        <span className="inline-flex items-center gap-1 text-label text-texto-sec">
          <Clock className="size-3.5" aria-hidden />
          30 min
        </span>
      </div>

      <div role="group" aria-label="Horários de sábado" className={`mt-4 grid gap-2 ${compacta ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-3"}`}>
        {HORARIOS.map(({ hora, estado }) => {
          const selecionado = escolhido === hora;
          if (estado !== "livre") {
            return (
              <div
                key={hora}
                className="flex min-h-11 flex-col items-center justify-center rounded-sm bg-superficie text-texto-disc"
              >
                <span className="numeros text-base line-through decoration-texto-disc/60">{hora}</span>
                <span className="text-[0.6875rem] leading-tight">{estado === "almoco" ? "almoço" : "ocupado"}</span>
              </div>
            );
          }
          return (
            <button
              key={hora}
              type="button"
              aria-pressed={selecionado}
              onClick={() => setEscolhido(selecionado ? null : hora)}
              data-grade-livre
              className={`numeros flex min-h-11 items-center justify-center gap-1 rounded-sm border text-base font-medium transition-colors ${
                selecionado
                  ? "border-ouro bg-ouro text-sobre-ouro"
                  : "border-borda-forte bg-elevado text-texto hover:border-ouro-discreto"
              }`}
            >
              {selecionado && <Check className="size-4" aria-hidden />}
              {hora}
            </button>
          );
        })}
      </div>

      <p className="mt-4 min-h-6 text-label text-texto-sec" aria-live="polite">
        {escolhido ? (
          <>
            Reservado: sábado às <span className="numeros font-semibold text-texto">{escolhido}</span>. O barbeiro vê na agenda.
          </>
        ) : (
          "Toque num horário livre para ver como o cliente agenda."
        )}
      </p>
    </div>
  );
}
