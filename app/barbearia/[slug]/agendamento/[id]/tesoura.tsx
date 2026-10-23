"use client";

import { useRef } from "react";
import { COM_MOVIMENTO, gsap, useGSAP } from "@/components/animacao/gsap";

// Posição da tesoura sobre a linha pontilhada e abertura de cada lâmina (graus).
const INICIO = 20;
const FIM = 206;
const ABERTA = 22;
const FECHADA = 2;
const FINAL = 6;

/**
 * A tesoura corta a linha pontilhada da comanda, de ponta a ponta, e o corte
 * fica dourado. O HTML do servidor já vem no estado final: sem JS ou com
 * "reduzir movimento", aparece a linha cortada e a tesoura parada no fim.
 */
export function Tesoura() {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const svg = ref.current;
        const tesoura = svg?.querySelector<SVGGElement>("[data-tesoura]");
        const laminaCima = svg?.querySelector<SVGGElement>("[data-lamina='cima']");
        const laminaBaixo = svg?.querySelector<SVGGElement>("[data-lamina='baixo']");
        const corte = svg?.querySelector<SVGLineElement>("[data-corte]");
        if (!tesoura || !laminaCima || !laminaBaixo || !corte) return;

        const estado = { x: INICIO, a: ABERTA };
        const desenhar = () => {
          tesoura.setAttribute("transform", `translate(${estado.x} 0)`);
          laminaCima.setAttribute("transform", `rotate(${-estado.a})`);
          laminaBaixo.setAttribute("transform", `rotate(${estado.a})`);
          corte.setAttribute("x2", String(estado.x));
        };
        desenhar();

        const cortes = 4;
        const porCorte = 0.26;
        const tl = gsap.timeline({ delay: 0.15, onUpdate: desenhar });
        tl.to(estado, { x: FIM, duration: cortes * porCorte, ease: "none" }, 0);
        for (let i = 0; i < cortes; i++) {
          tl.to(estado, { a: FECHADA, duration: porCorte * 0.45, ease: "power2.in" }, i * porCorte).to(
            estado,
            { a: i === cortes - 1 ? FINAL : ABERTA, duration: porCorte * 0.55, ease: "power1.out" },
            i * porCorte + porCorte * 0.45,
          );
        }
        tl.fromTo(tesoura, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, 0);
        return () => tl.kill();
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <svg ref={ref} viewBox="0 0 240 48" className="h-12 w-72 max-w-full text-ouro" fill="none" aria-hidden>
      <g transform="translate(0 24)">
        {/* Linha pontilhada da comanda e o corte dourado que a tesoura deixa. */}
        <line x1="4" x2="236" y1="0" y2="0" className="stroke-borda-forte" strokeWidth="1.5" strokeDasharray="5 5" />
        <line data-corte x1="4" x2={FIM} y1="0" y2="0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

        <g data-tesoura transform={`translate(${FIM} 0)`}>
          <g transform="scale(1.45)">
          <g data-lamina="cima" transform={`rotate(${-FINAL})`}>
            <path d="M0 -1.6 L23 -0.2 L23 0.6 L0 1.6 Z" fill="currentColor" />
            <path d="M0 0 L-8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="-12.5" cy="8" r="4.6" stroke="currentColor" strokeWidth="2" />
          </g>
          <g data-lamina="baixo" transform={`rotate(${FINAL})`}>
            <path d="M0 -1.6 L23 -0.6 L23 0.2 L0 1.6 Z" fill="currentColor" />
            <path d="M0 0 L-8 -5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="-12.5" cy="-8" r="4.6" stroke="currentColor" strokeWidth="2" />
          </g>
          <circle r="1.6" className="fill-fundo" stroke="currentColor" strokeWidth="1" />
          </g>
        </g>
      </g>
    </svg>
  );
}
