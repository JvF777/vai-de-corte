"use client";

import { useRef } from "react";
import { COM_MOVIMENTO, gsap, useGSAP } from "./gsap";

const formato = new Intl.NumberFormat("pt-BR");
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Número que conta de 0 até o valor real ao aparecer. O HTML do servidor já vem
 * com o valor final, então sem JS ou com "reduzir movimento" o número está certo.
 */
export function Contador({ valor, centavos = false, className = "" }: { valor: number; centavos?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Com centavos=true o valor vem em centavos e aparece como "R$ 240,00".
  const formatar = (n: number) => (centavos ? moeda.format(Math.round(n) / 100) : formato.format(Math.round(n)));

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        if (valor <= 0 || !ref.current) return;
        const estado = { n: 0 };
        gsap.to(estado, {
          n: valor,
          duration: centavos ? 1 : Math.min(1.2, 0.5 + valor * 0.05),
          ease: "power2.out",
          delay: 0.15,
          onUpdate: () => {
            if (ref.current) ref.current.textContent = formatar(estado.n);
          },
        });
      });
      return () => mm.revert();
    },
    { dependencies: [valor, centavos] },
  );

  return (
    <span className={`numeros ${className}`}>
      <span ref={ref} aria-hidden>
        {formatar(valor)}
      </span>
      <span className="sr-only">{formatar(valor)}</span>
    </span>
  );
}
