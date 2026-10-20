"use client";

import { useRef } from "react";
import { COM_MOVIMENTO, gsap, useGSAP } from "./gsap";

const formato = new Intl.NumberFormat("pt-BR");

/**
 * Número que conta de 0 até o valor real ao aparecer. O HTML do servidor já vem
 * com o valor final, então sem JS ou com "reduzir movimento" o número está certo.
 */
export function Contador({ valor, className = "" }: { valor: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        if (valor <= 0 || !ref.current) return;
        const estado = { n: 0 };
        gsap.to(estado, {
          n: valor,
          duration: Math.min(1.2, 0.5 + valor * 0.05),
          ease: "power2.out",
          delay: 0.15,
          onUpdate: () => {
            if (ref.current) ref.current.textContent = formato.format(Math.round(estado.n));
          },
        });
      });
      return () => mm.revert();
    },
    { dependencies: [valor] },
  );

  return (
    <span className={`numeros ${className}`}>
      <span ref={ref} aria-hidden>
        {formato.format(valor)}
      </span>
      <span className="sr-only">{formato.format(valor)}</span>
    </span>
  );
}
