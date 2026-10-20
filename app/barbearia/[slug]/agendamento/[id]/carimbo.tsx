"use client";

import { useRef } from "react";
import { COM_MOVIMENTO, gsap, useGSAP } from "@/components/animacao/gsap";

/** O selo de confirmação: o círculo se fecha e o visto é riscado, uma vez. */
export function Carimbo() {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const tracos = gsap.utils.toArray<SVGPathElement | SVGCircleElement>("[data-traco]", ref.current);
        tracos.forEach((t) => {
          const total = t.getTotalLength();
          gsap.set(t, { strokeDasharray: total, strokeDashoffset: total });
        });
        gsap
          .timeline({ delay: 0.1 })
          .to(tracos[0], { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" })
          .to(tracos[1], { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" }, "-=0.1");
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <svg ref={ref} viewBox="0 0 56 56" className="size-14 text-ouro" fill="none" aria-hidden>
      <circle data-traco cx="28" cy="28" r="26" stroke="currentColor" strokeWidth="2" transform="rotate(-90 28 28)" />
      <path data-traco d="M18 28.5 25 35.5 38.5 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
