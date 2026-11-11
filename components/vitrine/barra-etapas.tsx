"use client";

import { useRef } from "react";
import { COM_MOVIMENTO, gsap, useGSAP } from "@/components/animacao/gsap";

export type Etapa = {
  duracao: string;
  texto: string;
  /** Peso da largura: segue quanto tempo a etapa leva de verdade. */
  peso: number;
  cor: "elevado" | "ouro-discreto" | "ouro";
};

const CORES: Record<Etapa["cor"], string> = {
  elevado: "bg-elevado text-texto",
  "ouro-discreto": "bg-ouro-discreto text-sobre-ouro",
  ouro: "bg-ouro text-sobre-ouro",
};

/**
 * "Como funciona" como uma barra de progresso do tamanho da página:
 * cada pedaço tem a largura do tempo que a etapa leva.
 * Ao entrar na tela, os pedaços crescem da esquerda, um depois do outro.
 */
export function BarraEtapas({ etapas }: { etapas: Etapa[] }) {
  const escopo = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: escopo.current, start: "top 78%", once: true } });
        tl.from("[data-pedaco]", {
          scaleX: 0,
          transformOrigin: "0% 50%",
          duration: 0.9,
          ease: "power3.inOut",
          stagger: 0.18,
          clearProps: "transform",
        })
          .from("[data-pedaco] > *", { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.18, clearProps: "transform" }, 0.5)
          .from("[data-clausula]", { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.12, clearProps: "transform" }, 0.6);
      });
      return () => mm.revert();
    },
    { scope: escopo },
  );

  return (
    <div ref={escopo}>
      <ol className="flex flex-col gap-1.5 md:flex-row" data-ui>
        {etapas.map((e) => (
          <li
            key={e.duracao}
            className="flex min-w-0 flex-col gap-3 md:basis-0"
            style={{ flexGrow: e.peso }}
          >
            <div
              data-pedaco
              className={`flex min-h-24 items-start rounded-sm p-5 md:h-[22vh] md:min-h-40 ${CORES[e.cor]}`}
            >
              <span className="font-titulo text-[clamp(1.375rem,2vw,1.875rem)] font-bold leading-tight tracking-[-0.02em]">
                {e.duracao}
              </span>
            </div>
            <p data-clausula className="max-w-[26ch] pb-4 text-[1.0625rem] leading-snug text-texto md:pb-0 md:pr-4">
              {e.texto}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
