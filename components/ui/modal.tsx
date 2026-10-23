"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { gsap, SEM_MOVIMENTO } from "@/components/animacao/gsap";

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  largura?: "md" | "lg";
};

/**
 * Janela modal com <dialog> nativo: foco preso, Esc fecha e o fundo fica inerte.
 * No celular vira uma folha que sobe da borda de baixo; no desktop, aparece no centro.
 * A entrada usa só transform e opacidade (GSAP) e some com "reduzir movimento".
 */
export function Modal({ aberto, aoFechar, titulo, descricao, children, largura = "md" }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idDescricao = useId();

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (aberto && !el.open) {
      el.showModal();
      if (!window.matchMedia(SEM_MOVIMENTO).matches) {
        const celular = window.matchMedia("(max-width: 639px)").matches;
        gsap.fromTo(
          el,
          celular ? { yPercent: 12, autoAlpha: 0 } : { y: 12, scale: 0.98, autoAlpha: 0 },
          { yPercent: 0, y: 0, scale: 1, autoAlpha: 1, duration: 0.32, ease: "power3.out", clearProps: "transform,opacity,visibility" },
        );
      }
    } else if (!aberto && el.open) {
      el.close();
    }
  }, [aberto]);

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={idTitulo}
      aria-describedby={descricao ? idDescricao : undefined}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      onClick={(e) => {
        // Clique no fundo (fora da caixa) fecha.
        if (e.target === e.currentTarget) aoFechar();
      }}
      className={`m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-lg border border-borda bg-card p-0 text-texto shadow-flutuante backdrop:bg-fundo/80 open:flex open:flex-col sm:m-auto sm:max-h-[88dvh] sm:rounded-lg ${
        largura === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-borda px-5 pb-4 pt-5 sm:px-6">
        <div className="min-w-0">
          <h2 id={idTitulo} className="font-titulo text-secao font-semibold">
            {titulo}
          </h2>
          {descricao && (
            <div id={idDescricao} className="mt-1 text-texto-sec">
              {descricao}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-sm text-texto-sec hover:bg-elevado hover:text-texto"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 sm:px-6">{aberto ? children : null}</div>
    </dialog>
  );
}

/** Botões do fim do formulário dentro do modal: grudam no rodapé enquanto o conteúdo rola. */
export function RodapeModal({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-6 flex flex-col-reverse gap-2 border-t border-borda bg-card px-5 py-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
      {children}
    </div>
  );
}
