"use client";

import { useRef } from "react";
import { COM_MOVIMENTO, gsap, useGSAP } from "@/components/animacao/gsap";

/**
 * Título que aparece como se uma navalha passasse por ele: um fio dourado corre
 * da esquerda para a direita e o texto vai surgindo atrás. Sem JS ou com
 * "reduzir movimento", o título já aparece pronto.
 */
export function TituloNavalha({ children, atraso = 0.2 }: { children: string; atraso?: number }) {
  const escopo = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const q = gsap.utils.selector(escopo);
        const texto = q("[data-texto]");
        const fio = q("[data-fio-navalha]");
        gsap
          .timeline({ delay: atraso, defaults: { ease: "power2.inOut" } })
          .set(fio, { autoAlpha: 1, left: "0%" })
          .fromTo(texto, { clipPath: "inset(-10% 100% -10% 0%)" }, { clipPath: "inset(-10% 0% -10% 0%)", duration: 0.9 }, 0)
          .to(fio, { left: "100%", duration: 0.9 }, 0)
          .to(fio, { autoAlpha: 0, duration: 0.25 }, 0.8);
      });
      return () => mm.revert();
    },
    { scope: escopo },
  );

  return (
    <h1 ref={escopo} className="relative self-start font-titulo text-titulo font-bold lg:text-[2.5rem] lg:leading-[1.05]">
      <span data-texto className="block [html.anima_&]:[clip-path:inset(-10%_100%_-10%_0%)]">
        {children}
      </span>
      <span
        data-fio-navalha
        aria-hidden
        className="invisible absolute -top-[6%] h-[112%] w-[2px] -translate-x-1/2 rounded-full bg-ouro"
      />
    </h1>
  );
}
