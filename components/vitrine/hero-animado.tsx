"use client";

import { useRef, type ReactNode } from "react";
import { COM_MOVIMENTO, gsap, SplitText, useGSAP } from "@/components/animacao/gsap";

/**
 * O único momento orquestrado da página inicial: o título sobe linha a linha
 * por trás de uma máscara, o texto e os botões entram, e os horários da grade
 * aparecem um a um como se a agenda estivesse sendo montada.
 */
export function HeroAnimado({ children, className = "" }: { children: ReactNode; className?: string }) {
  const escopo = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const titulo = escopo.current?.querySelector("h1");
        if (!titulo) return;
        const tl = gsap.timeline();

        SplitText.create(titulo, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            gsap.set(titulo, { autoAlpha: 1 });
            return tl.from(self.lines, { yPercent: 105, duration: 0.9, stagger: 0.09, ease: "power4.out" }, 0);
          },
        });

        tl.fromTo("[data-hero-texto]", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, stagger: 0.08, clearProps: "transform" }, 0.35)
          .fromTo("[data-hero-grade]", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, clearProps: "transform" }, 0.3)
          .from("[data-hero-grade] [role=group] > *", { autoAlpha: 0, scale: 0.94, stagger: 0.035, duration: 0.35, clearProps: "all" }, 0.6);
      });
      return () => mm.revert();
    },
    { scope: escopo },
  );

  return (
    <div ref={escopo} className={className}>
      {children}
    </div>
  );
}
