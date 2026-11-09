"use client";

import { useRef, type ComponentProps } from "react";
import { COM_MOVIMENTO, gsap, useGSAP } from "./gsap";

/**
 * Barras de gráfico que crescem do zero até o valor real ao aparecer.
 * Marque as colunas com data-cresce="y" (sobem da base) e as barras deitadas com data-cresce="x".
 * Só transform; com "reduzir movimento" (ou sem JS) as barras já aparecem no tamanho certo.
 */
export function Crescer({ children, ...props }: ComponentProps<"div">) {
  const escopo = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const colunas = gsap.utils.toArray<HTMLElement>('[data-cresce="y"]', escopo.current);
        const barras = gsap.utils.toArray<HTMLElement>('[data-cresce="x"]', escopo.current);
        if (colunas.length) {
          gsap.from(colunas, { scaleY: 0, transformOrigin: "50% 100%", duration: 0.7, ease: "power3.out", stagger: 0.015, delay: 0.2 });
        }
        if (barras.length) {
          gsap.from(barras, { scaleX: 0, transformOrigin: "0% 50%", duration: 0.8, ease: "power3.out", stagger: 0.05, delay: 0.25 });
        }
      });
      return () => mm.revert();
    },
    { scope: escopo },
  );

  return (
    <div ref={escopo} {...props}>
      {children}
    </div>
  );
}
