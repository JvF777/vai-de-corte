"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { COM_MOVIMENTO, gsap, useGSAP } from "@/components/animacao/gsap";
import { classesBotao } from "@/components/ui/botao";
import { VideoLoop } from "@/components/vitrine/video-loop";
import { CelularAgendamento, type TelaCelular } from "./celular-agendamento";
import { HERO, LINKS, SELO_GRATIS } from "./conteudo";

const CICLO: TelaCelular[] = ["servico", "barbeiro", "horario", "confirmado"];

/**
 * Topo da página: vídeo de barbearia escurecido ao fundo, a promessa à esquerda
 * e um celular mostrando o agendamento, que troca de tela sozinho.
 */
export function Hero() {
  const escopo = useRef<HTMLElement>(null);
  const [indice, setIndice] = useState(0);

  // O celular passa pelas 4 telas. Com "reduzir movimento" fica parado na primeira.
  useEffect(() => {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduzir.matches) return;
    const id = window.setInterval(() => setIndice((i) => (i + 1) % CICLO.length), 2600);
    return () => window.clearInterval(id);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        gsap
          .timeline({ delay: 0.1 })
          .fromTo("[data-hero]", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, clearProps: "transform" })
          .fromTo(
            "[data-hero-celular]",
            { autoAlpha: 0, y: 48 },
            { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", clearProps: "transform" },
            0.35,
          );
      });
      return () => mm.revert();
    },
    { scope: escopo },
  );

  return (
    <section ref={escopo} id="topo" aria-labelledby="titulo-hero" className="relative isolate overflow-hidden">
      {/* Fundo: vídeo real de barbearia, bem escuro para o texto ler com folga */}
      <div className="absolute inset-0 -z-10">
        <VideoLoop
          src="/vitrine/maquina.mp4"
          poster="/vitrine/maquina-poster.jpg"
          srcCelular="/vitrine/tesouras-vertical.mp4"
          posterCelular="/vitrine/tesouras-vertical-poster.jpg"
          className="opacity-45"
        />
        <div className="absolute inset-0 bg-fundo/70 lg:bg-transparent lg:[background:linear-gradient(90deg,var(--color-fundo)_30%,rgb(11_11_13/0.72)_70%,rgb(11_11_13/0.55))]" />
        <div className="absolute inset-x-0 bottom-0 h-40 [background:linear-gradient(to_top,var(--color-fundo),transparent)]" />
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-8">
        {/* Espaço do menu fixo */}
        <div className="h-16 sm:h-20" />

        <div className="grid items-center gap-14 pt-10 pb-16 sm:pt-16 lg:min-h-[calc(100svh-5rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10 lg:pt-6 lg:pb-24">
          <div>
            <p data-hero className="text-label font-semibold uppercase tracking-[0.16em] text-ouro">
              {HERO.etiqueta}
            </p>
            <h1
              id="titulo-hero"
              data-hero
              className="mt-5 font-titulo text-[clamp(2.5rem,7.2vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.04em]"
            >
              Seu cliente marca.
              <br />
              Você <span className="text-ouro">corta.</span>
            </h1>
            <p data-hero className="mt-6 max-w-[52ch] text-[1.0625rem] leading-relaxed text-texto sm:text-lg">
              {HERO.subtitulo}
            </p>

            <div data-hero className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={LINKS.cadastro} className={classesBotao("primario", "lg", "group min-h-[3.25rem] px-6 font-semibold max-[359px]:px-3 max-[359px]:text-[0.9375rem]")}>
                {HERO.ctaPrincipal}
                <ArrowRight aria-hidden className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link href={LINKS.exemplo} className={classesBotao("secundario", "lg", "min-h-[3.25rem] bg-transparent px-6 hover:border-ouro max-[359px]:px-3")}>
                {HERO.ctaSecundario}
              </Link>
            </div>
            <p data-hero className="mt-4 text-label text-texto-sec">
              {SELO_GRATIS}
            </p>

            <ul data-hero className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-borda pt-6" aria-label="Destaques">
              {HERO.provas.map((p) => (
                <li key={p} className="flex items-center gap-2 text-base text-texto">
                  <Check aria-hidden className="size-4 text-ouro" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div data-hero-celular className="relative mx-auto w-full max-w-[17rem] sm:max-w-[18.5rem] lg:mr-4 lg:ml-auto">
            {/* As 4 telas ficam empilhadas e só a da vez aparece (troca por opacidade) */}
            <div className="relative">
              {CICLO.map((tela, i) => (
                <div
                  key={tela}
                  className={`transition-opacity duration-500 ${i === 0 ? "relative" : "absolute inset-0"} ${
                    i === indice ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <CelularAgendamento tela={tela} />
                </div>
              ))}
            </div>
            <p className="sr-only">Exemplo da tela de agendamento que o cliente vê no celular.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
