"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { gsap, SEM_MOVIMENTO, useGSAP } from "@/components/animacao/gsap";

/**
 * Barra superior do celular/tablet com a gaveta de navegação.
 * A gaveta desliza da esquerda (GSAP) e fecha com Esc, no fundo ou ao navegar.
 */
export function MenuMobile({ marca, children }: { marca: ReactNode; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botaoAbrir = useRef<HTMLButtonElement>(null);
  const linhaTempo = useRef<gsap.core.Timeline | null>(null);
  const caminho = usePathname();

  useGSAP(
    () => {
      const reduzir = window.matchMedia(SEM_MOVIMENTO).matches;
      linhaTempo.current = gsap
        .timeline({ paused: true, defaults: { duration: reduzir ? 0 : 0.32, ease: "power3.out" } })
        .set("[data-gaveta]", { display: "block" })
        .fromTo("[data-fundo]", { autoAlpha: 0 }, { autoAlpha: 1 }, 0)
        .fromTo("[data-painel]", { xPercent: -100 }, { xPercent: 0 }, 0);
    },
    { scope: raiz },
  );

  useEffect(() => {
    const tl = linhaTempo.current;
    if (!tl) return;
    if (aberto) {
      tl.timeScale(1).play();
      document.body.style.overflow = "hidden";
      // O painel só fica visível no primeiro quadro da animação; foca logo depois.
      const id = window.setTimeout(() => {
        raiz.current?.querySelector<HTMLElement>("[data-painel] a, [data-painel] select, [data-painel] button")?.focus();
      }, 30);
      return () => {
        window.clearTimeout(id);
        document.body.style.overflow = "";
      };
    } else {
      tl.timeScale(1.6).reverse();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  // Fecha ao trocar de página (ajuste de estado durante o render, sem efeito).
  const [caminhoAnterior, setCaminhoAnterior] = useState(caminho);
  if (caminho !== caminhoAnterior) {
    setCaminhoAnterior(caminho);
    setAberto(false);
  }

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botaoAbrir.current?.focus();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  return (
    <div ref={raiz} className="lg:hidden">
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-borda bg-superficie px-2 pl-4">
        {marca}
        <button
          ref={botaoAbrir}
          type="button"
          onClick={() => setAberto(true)}
          aria-expanded={aberto}
          aria-controls="gaveta-navegacao"
          aria-label="Abrir menu"
          className="flex size-11 items-center justify-center rounded-sm text-texto-sec hover:bg-elevado hover:text-texto"
        >
          <Menu className="size-6" aria-hidden />
        </button>
      </div>

      <div data-gaveta className="fixed inset-0 z-40 hidden" aria-hidden={!aberto}>
        <div data-fundo className="absolute inset-0 bg-fundo/80" onClick={() => setAberto(false)} />
        <div
          data-painel
          id="gaveta-navegacao"
          role="dialog"
          aria-modal="true"
          aria-label="Menu do painel"
          inert={!aberto}
          className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col gap-6 overflow-y-auto border-r border-borda bg-superficie p-4 shadow-flutuante"
        >
          <div className="flex items-center justify-between">
            {marca}
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                botaoAbrir.current?.focus();
              }}
              aria-label="Fechar menu"
              className="flex size-11 items-center justify-center rounded-sm text-texto-sec hover:bg-elevado hover:text-texto"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
