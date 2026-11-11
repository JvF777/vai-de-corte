"use client";

import { useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { BellRing } from "lucide-react";
import { COM_MOVIMENTO, gsap, useGSAP } from "@/components/animacao/gsap";

// Exemplo ilustrativo dos avisos que chegam no celular do barbeiro (não são clientes reais).
const AVISOS = [
  { quando: "23:42", texto: "Corte com Rafael, sábado às 09:30" },
  { quando: "01:15", texto: "Corte e barba com Diego, sábado às 10:00" },
  { quando: "06:58", texto: "Barba com Rafael, sábado às 11:30" },
];

/**
 * "Sua barbearia aberta 24 horas": a foto do salão vazio de um lado e, do outro,
 * os horários que entraram pelo link enquanto a barbearia estava fechada.
 * Sem tela presa: a foto só desliza de leve com a rolagem e os avisos chegam um a um.
 */
export function Aberta24h({ foto, alt }: { foto: StaticImageData; alt: string }) {
  const escopo = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        // A foto desliza devagar dentro do quadro enquanto a seção passa.
        gsap.fromTo(
          "[data-foto-salao]",
          { yPercent: -6, scale: 1.12 },
          {
            yPercent: 6,
            scale: 1.12,
            ease: "none",
            scrollTrigger: { trigger: escopo.current, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
        const tl = gsap.timeline({ scrollTrigger: { trigger: escopo.current, start: "top 70%", once: true } });
        tl.from("[data-entra]", { autoAlpha: 0, y: 24, duration: 0.7, stagger: 0.09, clearProps: "transform" }).from(
          "[data-aviso]",
          { autoAlpha: 0, x: 32, duration: 0.55, stagger: 0.22, ease: "back.out(1.6)", clearProps: "transform" },
          "-=0.2",
        );
      });
      return () => mm.revert();
    },
    { scope: escopo },
  );

  return (
    <section ref={escopo} aria-labelledby="titulo-aberta" className="overflow-hidden border-t border-borda bg-fundo">
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-4 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:py-32">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-card" data-entra>
          <Image
            data-foto-salao
            src={foto}
            alt={alt}
            sizes="(min-width: 1024px) 52vw, 100vw"
            placeholder="blur"
            className="size-full object-cover"
          />
          <p className="absolute bottom-0 left-0 m-3 rounded-sm bg-fundo/85 px-3 py-1.5 text-label text-texto sm:m-4">
            Barbearia fechada, 23h
          </p>
        </div>

        <div>
          <h2
            id="titulo-aberta"
            data-entra
            className="font-titulo text-[clamp(2rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.035em]"
          >
            Sua barbearia aberta 24 horas.
          </h2>
          <p data-entra className="mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-texto">
            O cliente lembra do corte à noite, no domingo ou enquanto você atende. Pelo link ele marca na hora, e você só
            abre a agenda de manhã para ver quem vem.
          </p>

          <ul className="mt-10 flex max-w-md flex-col gap-3" aria-label="Exemplo de avisos de novos horários" data-ui>
            {AVISOS.map((a) => (
              <li key={a.quando} data-aviso className="flex items-start gap-3 rounded-md bg-card p-4">
                <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ouro/15 text-ouro [&_svg]:size-4">
                  <BellRing aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-texto">Novo horário marcado</span>
                    <span className="numeros text-label text-texto-disc">{a.quando}</span>
                  </span>
                  <span className="block text-base text-texto-sec">{a.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
