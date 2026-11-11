"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";
import { Pause, Play } from "lucide-react";
import { COM_MOVIMENTO, gsap, SplitText, useGSAP } from "@/components/animacao/gsap";
import { VideoLoop } from "./video-loop";

export type Quadro =
  | { tipo: "video"; src: string; poster: string; srcCelular?: string; posterCelular?: string; legenda: string }
  | { tipo: "foto"; foto: StaticImageData; alt: string; legenda: string };

type Props = {
  quadros: Quadro[];
  /** Cabeçalho (marca + navegação), dentro do palco para ficar junto no desktop. */
  cabecalho: ReactNode;
  /** Primeira e segunda metade da frase do título. */
  antes: ReactNode;
  depois: ReactNode;
  /** Frase de apoio e botões, embaixo à esquerda. */
  apoio: ReactNode;
};

const DESKTOP = "(min-width: 1024px) and (min-height: 640px)";

/**
 * Topo da página inicial: a frase "Seu cliente marca. / Você corta." é cortada ao meio
 * por uma janela com um rolo de vídeos e fotos de barbearia.
 * - Desktop: o palco fica preso enquanto a rolagem passa o rolo, quadro a quadro.
 * - Celular e tablet: o rolo avança sozinho a cada poucos segundos.
 * - "Reduzir movimento": nada se mexe, fica o primeiro quadro parado.
 */
export function HeroRolo({ quadros, cabecalho, antes, depois, apoio }: Props) {
  const escopo = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [comMovimento, setComMovimento] = useState(false);
  const total = quadros.length;

  // Rolo com o último quadro antes do primeiro e o primeiro depois do último:
  // sempre aparece uma fresta do quadro anterior e do próximo, e o laço não pula.
  const rolo = [quadros[total - 1], ...quadros, quadros[0]];

  useGSAP(
    () => {
      const raiz = escopo.current;
      if (!raiz) return;
      const fita = raiz.querySelector<HTMLElement>("[data-fita]");
      const itens = gsap.utils.toArray<HTMLElement>("[data-quadro]", raiz);
      if (!fita || itens.length < 3) return;
      const posicao = (i: number) => -(itens[i + 1].offsetTop - itens[1].offsetTop);

      const mm = gsap.matchMedia();

      mm.add(COM_MOVIMENTO, () => {
        setComMovimento(true);
        const titulo = raiz.querySelector("h1");
        const entrada = gsap.timeline();
        if (titulo) {
          SplitText.create(titulo.querySelectorAll("[data-metade]"), {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit(self) {
              return entrada.from(self.lines, { yPercent: 110, duration: 0.95, stagger: 0.08, ease: "power4.out" }, 0);
            },
          });
        }
        entrada
          .from("[data-janela]", { autoAlpha: 0, scale: 0.92, duration: 1.1, ease: "power3.out", clearProps: "transform" }, 0.1)
          .from("[data-apoio] > *", { autoAlpha: 0, y: 18, stagger: 0.08, duration: 0.7, clearProps: "transform" }, 0.45)
          .from("[data-cabecalho]", { autoAlpha: 0, y: -10, duration: 0.6, clearProps: "transform" }, 0.2);
        return () => setComMovimento(false);
      });

      // Desktop: o palco fica preso e a rolagem passa o rolo.
      mm.add(`${DESKTOP} and ${COM_MOVIMENTO}`, () => {
        const palco = raiz.querySelector<HTMLElement>("[data-palco]");
        gsap.timeline({
          scrollTrigger: {
            trigger: palco,
            start: "top top",
            end: () => `+=${window.innerHeight * 0.6 * (total - 1)}`,
            pin: true,
            scrub: 0.6,
            snap: { snapTo: 1 / (total - 1), duration: 0.4, ease: "power2.inOut", inertia: false, delay: 0.15 },
            invalidateOnRefresh: true,
            onUpdate(self) {
              setAtual(Math.min(total - 1, Math.round(self.progress * (total - 1))));
            },
          },
        }).fromTo(fita, { y: () => posicao(0) }, { y: () => posicao(total - 1), ease: "none" });
      });

      // Celular e tablet: avança sozinho, em laço.
      mm.add(`not all and ${DESKTOP}`, () => {
        if (!window.matchMedia(COM_MOVIMENTO).matches) return;
        const laco = gsap.timeline({ repeat: -1, repeatRefresh: true });
        for (let i = 1; i <= total; i++) {
          laco.to(fita, {
            y: () => posicao(i),
            duration: 0.9,
            ease: "power3.inOut",
            delay: 3.6,
            onStart: () => setAtual(i % total),
          });
        }
        laco.set(fita, { y: () => posicao(0) });
      });

      return () => mm.revert();
    },
    { scope: escopo },
  );

  const quadroAtual = quadros[atual];

  return (
    <div ref={escopo}>
      <div
        data-palco
        className="mx-auto flex w-full max-w-[1600px] flex-col px-4 pb-14 sm:px-8 lg:h-svh lg:min-h-[640px] lg:pb-8"
        style={
          {
            // Janela do rolo: largura do quadro, altura dele e a fresta dos vizinhos.
            "--fresta": "1.25rem",
            "--vao": "0.625rem",
          } as CSSProperties
        }
      >
        <div data-cabecalho>{cabecalho}</div>

        <h1 className="grid flex-1 grid-cols-1 content-center items-center gap-y-4 py-4 font-titulo font-bold text-[clamp(1.875rem,7.6vw,3.5rem)] leading-[1] tracking-[-0.04em] lg:grid-cols-[minmax(0,1fr)_var(--janela-l)_minmax(0,1fr)] lg:gap-x-10 lg:py-4 lg:text-[clamp(2.75rem,4.1vw,4.75rem)] lg:leading-[0.98] [--janela-l:40vw]">
          <span data-metade className="block text-left">
            {antes}
          </span>

          <span
            aria-hidden
            data-janela
            className="relative block overflow-hidden rounded-sm bg-superficie [--h:min(calc(100vw_-_2rem),34svh)] sm:[--h:calc(min(100vw_-_4rem,44rem)*9/16)] sm:[--fresta:2rem] sm:[--vao:0.875rem] lg:[--fresta:3.25rem] lg:[--vao:1.25rem] lg:[--h:calc(var(--janela-l)*9/16)] sm:mx-auto sm:w-[min(100%,44rem)] lg:mx-0 lg:w-full"
            style={{ height: "calc(var(--h) + 2 * (var(--fresta) + var(--vao)))" }}
          >
            <span data-fita className="absolute inset-x-0 flex flex-col gap-[var(--vao)]" style={{ top: "calc(var(--fresta) - var(--h))" }}>
              {rolo.map((q, i) => {
                const copia = i === 0 || i === rolo.length - 1;
                const indice = (i - 1 + total) % total;
                return (
                  <span key={i} data-quadro className="relative block h-[var(--h)] shrink-0 overflow-hidden rounded-sm bg-card">
                    {q.tipo === "video" ? (
                      copia ? (
                        // Cópia nas pontas do rolo: só a imagem parada.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={q.poster} alt="" loading="lazy" className="size-full object-cover" />
                      ) : (
                        <VideoLoop
                          src={q.src}
                          poster={q.poster}
                          srcCelular={q.srcCelular}
                          posterCelular={q.posterCelular}
                          ativo={comMovimento && atual === indice}
                          pausado={pausado}
                        />
                      )
                    ) : (
                      <Image
                        src={q.foto}
                        alt=""
                        sizes="(min-width: 1024px) 40vw, 100vw"
                        placeholder="blur"
                        className="size-full object-cover"
                      />
                    )}
                    {/* Escurece de leve as frestas para o quadro do meio mandar. */}
                    <span
                      className={`absolute inset-0 bg-fundo transition-opacity duration-500 ${
                        indice === atual && !copia ? "opacity-0" : "opacity-55"
                      }`}
                    />
                  </span>
                );
              })}
            </span>
          </span>

          <span data-metade className="block text-right">
            {depois}
          </span>
        </h1>

        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div data-apoio>{apoio}</div>
          <div className="flex items-center justify-end gap-4 max-lg:hidden">
            <p className="max-w-[30ch] text-right text-base text-texto-sec" aria-hidden>
              {quadroAtual.legenda}
            </p>
            {comMovimento && (
              <BotaoPausa pausado={pausado} alternar={() => setPausado((p) => !p)} />
            )}
          </div>
          {comMovimento && (
            <div className="flex justify-end lg:hidden">
              <BotaoPausa pausado={pausado} alternar={() => setPausado((p) => !p)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BotaoPausa({ pausado, alternar }: { pausado: boolean; alternar: () => void }) {
  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={pausado}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-elevado text-texto-sec transition-colors hover:bg-borda hover:text-texto active:scale-95 [&_svg]:size-4"
    >
      {pausado ? <Play aria-hidden /> : <Pause aria-hidden />}
      <span className="sr-only">{pausado ? "Tocar os vídeos" : "Pausar os vídeos"}</span>
    </button>
  );
}
