"use client";

import { useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { COM_MOVIMENTO, gsap, useGSAP } from "@/components/animacao/gsap";

type Props = {
  foto: StaticImageData;
  alt: string;
  /** Primeira e segunda metade do título; a segunda chega no segundo passo. */
  antes: string;
  depois: string;
  legenda: string;
};

/**
 * Uma foto, três distâncias: o palco fica preso e a rolagem aproxima a câmera
 * do salão inteiro até a cadeira e depois até o piso xadrez.
 * Sem movimento: a foto inteira, o título e a legenda já aparecem.
 */
export function ZoomBarbearia({ foto, alt, antes, depois, legenda }: Props) {
  const escopo = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: "[data-zoom-palco]",
            start: "top top",
            end: "+=140%",
            pin: true,
            scrub: 0.7,
          },
        });
        tl.set("[data-zoom-foto]", { transformOrigin: "56% 46%" })
          .to("[data-zoom-foto]", { scale: 1.8, duration: 1 })
          .from("[data-zoom-depois]", { autoAlpha: 0, yPercent: 40, duration: 0.5 }, 0.45)
          .set("[data-zoom-foto]", { transformOrigin: "58% 86%" }, 1.05)
          .to("[data-zoom-foto]", { scale: 2.5, duration: 1 }, 1.05)
          .from("[data-zoom-legenda]", { autoAlpha: 0, y: 24, duration: 0.5 }, 1.5)
          .to({}, { duration: 0.3 });
      });
      return () => mm.revert();
    },
    { scope: escopo },
  );

  return (
    <section ref={escopo} aria-labelledby="titulo-aberta" className="overflow-hidden">
      <div
        data-zoom-palco
        className="mx-auto grid min-h-svh w-full max-w-[1600px] content-center items-center gap-6 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_min(30vw,44svh)_minmax(0,1fr)] lg:gap-10 lg:py-16"
      >
        <h2
          id="titulo-aberta"
          className="relative z-10 font-titulo text-[clamp(2.25rem,9vw,7rem)] font-bold leading-[0.95] tracking-[-0.04em] lg:col-span-3 lg:row-start-1 lg:text-center"
        >
          <span className="block">{antes}</span>
          <span className="sr-only"> {depois}</span>
        </h2>

        <div className="relative mx-auto aspect-[4/5] w-[min(100%,26rem)] overflow-hidden bg-card lg:col-start-2 lg:row-start-2 lg:w-full">
          <Image
            data-zoom-foto
            src={foto}
            alt={alt}
            sizes="(min-width: 1024px) 30vw, 90vw"
            placeholder="blur"
            className="size-full object-cover object-[58%_50%]"
          />
        </div>

        <p
          data-zoom-depois
          aria-hidden
          className="relative z-10 -mt-[0.3em] font-titulo text-[clamp(2.25rem,9vw,7rem)] font-bold leading-[0.95] tracking-[-0.04em] max-lg:text-right lg:col-span-3 lg:row-start-3 lg:-mt-[0.6em] lg:text-center"
        >
          {depois}
        </p>

        <p
          data-zoom-legenda
          className="max-w-[34ch] text-[1.0625rem] leading-relaxed text-texto max-lg:text-right max-lg:justify-self-end lg:col-start-3 lg:row-start-2 lg:self-start lg:pt-2"
        >
          {legenda}
        </p>
      </div>
    </section>
  );
}
