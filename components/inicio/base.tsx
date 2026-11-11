import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { classesBotao } from "@/components/ui/botao";
import { LINKS, SELO_GRATIS } from "./conteudo";

/** Peças repetidas em todas as seções da página inicial. */

export const LARGURA = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";
export const ESPACO_SECAO = "py-20 sm:py-24 lg:py-32";

type PropsSecao = {
  id?: string;
  /** "fundo" (mais escuro) ou "superficie" (um tom acima), para alternar as seções. */
  tom?: "fundo" | "superficie";
  rotulo: string;
  children: ReactNode;
  className?: string;
};

export function Secao({ id, tom = "fundo", rotulo, children, className = "" }: PropsSecao) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `titulo-${id}` : undefined}
      aria-label={id ? undefined : rotulo}
      className={`scroll-mt-16 border-t border-borda sm:scroll-mt-20 ${tom === "superficie" ? "bg-superficie" : "bg-fundo"} ${className}`}
    >
      {children}
    </section>
  );
}

/** Etiqueta pequena em dourado acima do título ("COMO FUNCIONA"). */
export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <p data-anima className="flex items-center gap-3 text-label font-semibold uppercase tracking-[0.16em] text-ouro">
      <span aria-hidden className="h-px w-8 bg-ouro" />
      {children}
    </p>
  );
}

export function TituloSecao({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <h2
      id={id}
      data-anima
      className={`mt-5 font-titulo text-[clamp(2rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.035em] ${className}`}
    >
      {children}
    </h2>
  );
}

export function TextoApoio({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p data-anima className={`mt-5 max-w-[56ch] text-[1.0625rem] leading-relaxed text-texto-sec ${className}`}>
      {children}
    </p>
  );
}

/** Botão dourado de cadastro, sempre com a linha "grátis, sem cartão" embaixo. */
export function CtaCadastro({ texto = "Criar minha barbearia grátis", selo = true }: { texto?: string; selo?: boolean }) {
  return (
    <div data-anima className="flex flex-col items-start gap-3">
      <Link href={LINKS.cadastro} className={classesBotao("primario", "lg", "group min-h-[3.25rem] px-6 font-semibold max-[359px]:px-3 max-[359px]:text-[0.9375rem] max-sm:w-full")}>
        {texto}
        <ArrowRight aria-hidden className="transition-transform duration-200 group-hover:translate-x-1" />
      </Link>
      {selo && <p className="text-label text-texto-sec">{SELO_GRATIS}</p>}
    </div>
  );
}
