"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";

export type SituacaoEtapa = "atual" | "feita" | "futura";

type Props = {
  numero: number;
  titulo: string;
  situacao: SituacaoEtapa;
  /** Resumo da escolha, mostrado quando a etapa está feita. */
  resumo?: ReactNode;
  onAlterar?: () => void;
  /** Rola até a etapa quando ela abre (não na primeira pintura). */
  focarAoAbrir?: boolean;
  children?: ReactNode;
};

/**
 * Uma etapa do agendamento. Feita: vira uma linha da comanda com "Alterar".
 * Atual: abre o conteúdo. Futura: só o título, para o cliente ver o caminho.
 */
export function Etapa({ numero, titulo, situacao, resumo, onAlterar, focarAoAbrir = false, children }: Props) {
  const refTitulo = useRef<HTMLHeadingElement>(null);
  const idTitulo = `etapa-${numero}`;

  useEffect(() => {
    if (situacao !== "atual" || !focarAoAbrir || !refTitulo.current) return;
    const el = refTitulo.current;
    el.focus({ preventScroll: true });
    const { top } = el.getBoundingClientRect();
    if (top < 0 || top > window.innerHeight * 0.55) {
      const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.closest("li")?.scrollIntoView({ block: "start", behavior: reduzir ? "auto" : "smooth" });
    }
  }, [situacao, focarAoAbrir]);

  return (
    <li className="scroll-mt-6 border-t border-borda py-6 first:border-t-0 first:pt-0" aria-current={situacao === "atual" ? "step" : undefined}>
      <div className="flex items-start gap-4">
        <span
          className={`numeros mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-label font-semibold ${
            situacao === "atual"
              ? "bg-ouro text-sobre-ouro"
              : situacao === "feita"
                ? "border border-ouro-discreto text-ouro"
                : "border border-borda-forte text-texto-disc"
          }`}
          aria-hidden
        >
          {situacao === "feita" ? <Check className="size-4" /> : numero}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3
              ref={refTitulo}
              id={idTitulo}
              tabIndex={-1}
              className={`font-titulo text-subtitulo font-semibold outline-none ${situacao === "futura" ? "text-texto-disc" : "text-texto"}`}
            >
              <span className="sr-only">
                Etapa {numero}
                {situacao === "feita" ? ", concluída" : ""}:{" "}
              </span>
              {titulo}
            </h3>
            {situacao === "feita" && onAlterar && (
              <button
                type="button"
                onClick={onAlterar}
                className="-my-2 inline-flex min-h-11 items-center rounded-sm px-2 text-label font-medium text-ouro-hover hover:text-ouro hover:underline underline-offset-4"
              >
                Alterar<span className="sr-only"> {titulo.toLowerCase()}</span>
              </button>
            )}
          </div>
          {situacao === "feita" && resumo && <div className="mt-1 text-texto-sec">{resumo}</div>}
        </div>
      </div>
      {/* No celular o conteúdo usa a largura toda; a partir do sm alinha com o título. */}
      {situacao === "atual" && (
        <div className="mt-5 sm:pl-12" data-etapa-corpo role="group" aria-labelledby={idTitulo}>
          {children}
        </div>
      )}
    </li>
  );
}
