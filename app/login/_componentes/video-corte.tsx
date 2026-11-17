"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/components/animacao/gsap";
import { Marca } from "@/components/marca";
import { VideoLoop } from "@/components/vitrine/video-loop";

/** Fios de cabelo que caem do corte: posição ao longo da linha (0 a 1), tamanho e tom. */
const FIOS = Array.from({ length: 22 }, (_, i) => ({
  ao: (i + 0.5) / 22 + Math.sin(i * 12.9898) * 0.015,
  tam: 7 + ((i * 7) % 9),
  claro: i % 3 === 0,
}));

const COMPUTADOR = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
const CELULAR = "(max-width: 1023px) and (prefers-reduced-motion: no-preference)";

/**
 * Vídeo do corte, ao lado do login (embaixo do logo, no celular).
 * Ao abrir a página, uma tesoura corta a "capa" que cobre o vídeo, as duas metades
 * se abrem e caem fios de cabelo. No computador o corte é de cima para baixo;
 * no celular, da esquerda para a direita. Com "reduzir movimento" ou sem JS, a capa
 * nem aparece e o vídeo fica parado no pôster (o VideoLoop já cuida disso).
 */
type Props = {
  /** Frase grande sobre o vídeo (só no computador). */
  frase?: string;
  /** Texto menor embaixo da frase. */
  apoio?: string;
};

export function VideoCorte({
  frase = "Enquanto você corta, o cliente marca sozinho.",
  apoio = "A agenda de cada barbeiro, o link da barbearia e os avisos no celular, num painel só.",
}: Props) {
  const escopo = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(escopo);
      const capa = q("[data-capa]")[0];
      const [metadeA, metadeB] = q("[data-metade]");
      const tesoura = q("[data-tesoura]")[0];
      const linha = q("[data-linha]")[0];
      const fios = q("[data-fio]");
      const video = q("[data-video]")[0];
      const frases = q("[data-frase]");
      const mm = gsap.matchMedia();

      const montar = (vertical: boolean) => {
        const caixa = escopo.current!.getBoundingClientRect();
        const comprimento = vertical ? caixa.height : caixa.width;
        const tl = gsap.timeline({ delay: 0.35, defaults: { ease: "power2.inOut" } });

        gsap.set(capa, { display: "block" });
        gsap.set(metadeA, { clipPath: vertical ? "inset(0% 50% 0% 0%)" : "inset(0% 0% 50% 0%)" });
        gsap.set(metadeB, { clipPath: vertical ? "inset(0% 0% 0% 50%)" : "inset(50% 0% 0% 0%)" });
        gsap.set(linha, {
          left: vertical ? "50%" : 0,
          top: vertical ? 0 : "50%",
          width: vertical ? 2 : "100%",
          height: vertical ? "100%" : 2,
          xPercent: vertical ? -50 : 0,
          yPercent: vertical ? 0 : -50,
          scaleX: vertical ? 1 : 0,
          scaleY: vertical ? 0 : 1,
          transformOrigin: vertical ? "50% 0%" : "0% 50%",
          autoAlpha: 1,
        });
        gsap.set(tesoura, {
          left: vertical ? "50%" : 0,
          top: vertical ? 0 : "50%",
          xPercent: -50,
          yPercent: -50,
          x: vertical ? 0 : -60,
          y: vertical ? -60 : 0,
          rotation: vertical ? 90 : 0,
          autoAlpha: 1,
        });
        fios.forEach((fio, i) => {
          const pos = FIOS[i].ao * 100;
          gsap.set(fio, {
            left: vertical ? "50%" : `${pos}%`,
            top: vertical ? `${pos}%` : "50%",
            x: 0,
            y: 0,
            rotation: gsap.utils.random(-50, 50),
            autoAlpha: 0,
          });
        });
        gsap.set(video, { scale: 1.14 });
        gsap.set(frases, { autoAlpha: 0, y: 18 });

        const corte = 1.15;
        // A tesoura atravessa a capa abrindo e fechando as lâminas, e a linha dourada vem atrás.
        tl.to(tesoura, vertical ? { y: comprimento + 60, duration: corte } : { x: comprimento + 60, duration: corte }, 0)
          .to(linha, vertical ? { scaleY: 1, duration: corte } : { scaleX: 1, duration: corte }, 0)
          .fromTo(
            q("[data-lamina='cima']"),
            { rotation: -22 },
            { rotation: 2, duration: 0.11, repeat: 9, yoyo: true, ease: "sine.inOut", svgOrigin: "0 0" },
            0,
          )
          .fromTo(
            q("[data-lamina='baixo']"),
            { rotation: 22 },
            { rotation: -2, duration: 0.11, repeat: 9, yoyo: true, ease: "sine.inOut", svgOrigin: "0 0" },
            0,
          );

        // Fios caem conforme a tesoura passa por eles.
        fios.forEach((fio, i) => {
          const queda = gsap.utils.random(70, 150);
          const lado = gsap.utils.random(-36, 36);
          tl.to(fio, { autoAlpha: 1, duration: 0.08, ease: "none" }, FIOS[i].ao * corte).to(
            fio,
            {
              x: vertical ? lado : lado * 0.6,
              y: vertical ? queda * 0.7 : queda * 0.55,
              rotation: `+=${gsap.utils.random(-160, 160)}`,
              autoAlpha: 0,
              duration: gsap.utils.random(1.1, 1.8),
              ease: "power1.in",
            },
            FIOS[i].ao * corte + 0.08,
          );
        });

        // A capa se abre em duas e mostra o vídeo.
        tl.addLabel("abrir", corte - 0.05)
          .to(linha, { autoAlpha: 0, duration: 0.25 }, "abrir")
          .to(tesoura, { autoAlpha: 0, duration: 0.2 }, "abrir")
          .to(
            metadeA,
            vertical ? { xPercent: -102, rotation: -2, transformOrigin: "0% 100%", duration: 0.95, ease: "power3.inOut" } : { yPercent: -102, duration: 0.85, ease: "power3.inOut" },
            "abrir",
          )
          .to(
            metadeB,
            vertical ? { xPercent: 102, rotation: 2, transformOrigin: "100% 100%", duration: 0.95, ease: "power3.inOut" } : { yPercent: 102, duration: 0.85, ease: "power3.inOut" },
            "abrir",
          )
          .to(video, { scale: 1, duration: 1.8, ease: "power3.out" }, "abrir")
          .to(frases, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power3.out" }, "abrir+=0.55")
          .set(capa, { display: "none" })
          // Depois, um respiro lento no vídeo, quase imperceptível.
          .to(video, { scale: 1.05, duration: 14, ease: "sine.inOut", repeat: -1, yoyo: true });
      };

      mm.add(COMPUTADOR, () => montar(true));
      mm.add(CELULAR, () => montar(false));
      return () => mm.revert();
    },
    { scope: escopo },
  );

  return (
    <div ref={escopo} className="relative h-[34svh] min-h-56 overflow-hidden bg-superficie lg:sticky lg:top-0 lg:h-svh">
      <div data-video className="absolute inset-0 will-change-transform">
        <VideoLoop
          src="/vitrine/login-corte.mp4"
          poster="/vitrine/login-corte-poster.jpg"
          srcCelular="/vitrine/login-corte-celular.mp4"
          posterCelular="/vitrine/login-corte-celular-poster.jpg"
          className="object-[58%_40%]"
        />
      </div>
      {/* Véu escuro só onde há texto por cima (no topo do celular e embaixo no computador). */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgb(11_11_13/0.75),transparent)] lg:hidden" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 hidden h-[45%] bg-[linear-gradient(to_top,rgb(11_11_13/0.9),transparent)] lg:block" />

      <Link href="/" className="absolute left-4 top-5 z-20 rounded-sm sm:left-8 lg:hidden" aria-label="Vai de Corte, página inicial">
        <Marca />
      </Link>

      <div className="absolute inset-x-0 bottom-0 hidden px-12 pb-14 lg:block xl:px-16">
        <p data-frase className="max-w-md font-titulo text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-texto">
          {frase}
        </p>
        <p data-frase className="mt-3 max-w-sm text-texto-sec">
          {apoio}
        </p>
      </div>

      {/* Capa que a tesoura corta. Só existe com animação ligada (html.anima). */}
      <div data-capa aria-hidden className="pointer-events-none absolute inset-0 z-10 hidden [html.anima_&]:block">
        <div data-metade className="absolute inset-0 bg-superficie [clip-path:inset(0_50%_0_0)] will-change-transform" />
        <div data-metade className="absolute inset-0 bg-superficie [clip-path:inset(0_0_0_50%)] will-change-transform" />
        <span data-linha className="invisible absolute block bg-ouro" />
        {FIOS.map((f, i) => (
          <span
            key={i}
            data-fio
            className={`invisible absolute block w-[1.5px] rounded-full ${f.claro ? "bg-texto-sec/70" : "bg-ouro/80"}`}
            style={{ height: f.tam }}
          />
        ))}
        <svg data-tesoura viewBox="-20 -14 50 28" width="96" height="54" className="invisible absolute overflow-visible text-ouro">
          <g data-lamina="cima">
            <path d="M0 -1.6 L26 -0.2 L26 0.6 L0 1.6 Z" fill="currentColor" />
            <path d="M0 0 L-8 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="-12.5" cy="8" r="4.8" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </g>
          <g data-lamina="baixo">
            <path d="M0 -1.6 L26 -0.6 L26 0.2 L0 1.6 Z" fill="currentColor" />
            <path d="M0 0 L-8 -5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="-12.5" cy="-8" r="4.8" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </g>
          <circle r="1.8" fill="var(--color-superficie)" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
