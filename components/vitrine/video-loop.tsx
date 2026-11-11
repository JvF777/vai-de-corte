"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Vídeo para telas a partir de 640px. */
  src: string;
  poster: string;
  /** Vídeo alternativo para celular (ex.: o vertical). */
  srcCelular?: string;
  posterCelular?: string;
  /** Só toca quando for true (o rolo de vídeos do topo liga um por vez). */
  ativo?: boolean;
  /** O visitante apertou "pausar". */
  pausado?: boolean;
  className?: string;
};

const CELULAR = "(max-width: 639px)";
const SEM_MOVIMENTO = "(prefers-reduced-motion: reduce)";

/**
 * Vídeo mudo em loop, leve para a web:
 * - o arquivo só é baixado quando o quadro chega perto da tela;
 * - no celular usa a versão própria (quando houver);
 * - só toca visível, ativo e sem "reduzir movimento" (aí fica o pôster parado).
 */
export function VideoLoop({ src, poster, srcCelular, posterCelular, ativo = true, pausado = false, className = "" }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [fonte, setFonte] = useState<string | null>(null);
  const [capa, setCapa] = useState(poster);
  const [visivel, setVisivel] = useState(false);
  const [semMovimento, setSemMovimento] = useState(false);

  // Escolhe a fonte e o pôster pelo tamanho da tela, já no navegador.
  useEffect(() => {
    const celular = srcCelular ? window.matchMedia(CELULAR) : null;
    const reduzir = window.matchMedia(SEM_MOVIMENTO);
    const atualizar = () => {
      const usarCelular = Boolean(celular?.matches);
      setCapa(usarCelular && posterCelular ? posterCelular : poster);
      setSemMovimento(reduzir.matches);
      setFonte((atual) => (atual === null ? null : usarCelular && srcCelular ? srcCelular : src));
    };
    atualizar();
    celular?.addEventListener("change", atualizar);
    reduzir.addEventListener("change", atualizar);
    return () => {
      celular?.removeEventListener("change", atualizar);
      reduzir.removeEventListener("change", atualizar);
    };
  }, [src, srcCelular, poster, posterCelular]);

  // Carrega só quando chega perto da tela; toca só enquanto aparece.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        setVisivel(entrada.isIntersecting);
        if (entrada.isIntersecting) {
          setFonte((atual) => atual ?? (srcCelular && window.matchMedia(CELULAR).matches ? srcCelular : src));
        }
      },
      { rootMargin: "200px 0px" },
    );
    observador.observe(video);
    return () => observador.disconnect();
  }, [src, srcCelular]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !fonte) return;
    if (ativo && visivel && !pausado && !semMovimento) {
      video.play().catch(() => {
        /* o navegador recusou tocar sozinho: fica o pôster */
      });
    } else {
      video.pause();
    }
  }, [fonte, ativo, visivel, pausado, semMovimento]);

  return (
    <video
      ref={ref}
      src={fonte ?? undefined}
      poster={capa}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      tabIndex={-1}
      className={`size-full object-cover ${className}`}
    />
  );
}
