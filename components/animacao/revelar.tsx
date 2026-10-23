"use client";

import { useRef, type ComponentProps } from "react";
import { COM_MOVIMENTO, gsap, useGSAP } from "./gsap";

type Props = ComponentProps<"div"> & {
  /** Anima quando o bloco entra na tela, em vez de logo ao carregar. */
  aoRolar?: boolean;
  atraso?: number;
};

/**
 * Revela os filhos marcados com data-anima em sequência (sobe 16px e aparece).
 * Só transform e opacidade; com "reduzir movimento" nada se move.
 */
export function Revelar({ aoRolar = false, atraso = 0, children, ...props }: Props) {
  const escopo = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const alvos = gsap.utils.toArray<HTMLElement>("[data-anima]", escopo.current);
        if (!alvos.length) return;
        gsap.fromTo(
          alvos,
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            delay: atraso,
            stagger: 0.07,
            clearProps: "transform",
            scrollTrigger: aoRolar ? { trigger: escopo.current, start: "top 82%", once: true } : undefined,
          },
        );
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
