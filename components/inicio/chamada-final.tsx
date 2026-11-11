import Link from "next/link";
import { Revelar } from "@/components/animacao/revelar";
import { VideoLoop } from "@/components/vitrine/video-loop";
import { CtaCadastro, LARGURA } from "./base";
import { CHAMADA_FINAL, LINKS } from "./conteudo";

/** Última chamada para o cadastro, sobre o vídeo das tesouras bem escuro. */
export function ChamadaFinal() {
  return (
    <section id="comecar" aria-labelledby="titulo-comecar" className="relative isolate overflow-hidden border-t border-borda">
      <div className="absolute inset-0 -z-10">
        <VideoLoop src="/vitrine/navalha.mp4" poster="/vitrine/navalha-poster.jpg" className="opacity-30" />
        <div className="absolute inset-0 bg-fundo/75" />
      </div>
      <Revelar aoRolar className={`${LARGURA} flex flex-col items-start py-24 sm:py-28 lg:items-center lg:py-36 lg:text-center`}>
        <h2
          id="titulo-comecar"
          data-anima
          className="max-w-[18ch] font-titulo text-[clamp(2.25rem,5.6vw,4.5rem)] font-bold leading-[1] tracking-[-0.04em]"
        >
          {CHAMADA_FINAL.titulo}
        </h2>
        <p data-anima className="mt-6 max-w-[48ch] text-[1.0625rem] leading-relaxed text-texto sm:text-lg">
          {CHAMADA_FINAL.texto}
        </p>
        <div className="mt-10 flex w-full flex-col items-start lg:items-center [&>div]:lg:items-center">
          <CtaCadastro />
        </div>
        <p data-anima className="mt-6 text-base text-texto-sec">
          Já tem conta?{" "}
          <Link href={LINKS.entrar} className="font-medium text-ouro underline decoration-ouro/40 underline-offset-4 hover:decoration-ouro">
            Entrar no painel
          </Link>
        </p>
        <p data-anima className="mt-10 max-w-[48ch] border-t border-borda pt-6 text-label text-texto-sec">
          {CHAMADA_FINAL.regiao}
        </p>
      </Revelar>
    </section>
  );
}
