import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export type VarianteBotao = "primario" | "secundario" | "contorno" | "destrutivo" | "fantasma";
type Tamanho = "md" | "lg";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0";

const variantes: Record<VarianteBotao, string> = {
  primario: "bg-ouro text-sobre-ouro hover:bg-ouro-hover active:bg-ouro",
  secundario: "border border-borda-forte bg-elevado text-texto hover:border-texto-disc hover:bg-borda",
  contorno: "border border-ouro-discreto text-ouro-hover hover:border-ouro hover:bg-ouro/10",
  destrutivo: "border border-erro/60 bg-erro-fundo text-erro hover:border-erro hover:bg-erro/15",
  fantasma: "text-texto-sec hover:bg-elevado hover:text-texto",
};

const tamanhos: Record<Tamanho, string> = {
  md: "text-base",
  lg: "min-h-12 px-5 text-[1rem]",
};

export function classesBotao(variante: VarianteBotao = "primario", tamanho: Tamanho = "md", extra = "") {
  return `${base} ${variantes[variante]} ${tamanhos[tamanho]} ${extra}`.trim();
}

type PropsBotao = ComponentProps<"button"> & {
  variante?: VarianteBotao;
  tamanho?: Tamanho;
  carregando?: boolean;
  textoCarregando?: string;
  icone?: ReactNode;
};

export function Botao({
  variante = "primario",
  tamanho = "md",
  carregando = false,
  textoCarregando,
  icone,
  className = "",
  children,
  disabled,
  ...props
}: PropsBotao) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={classesBotao(variante, tamanho, className)}
    >
      {carregando ? <LoaderCircle className="animate-spin" aria-hidden /> : icone}
      {carregando && textoCarregando ? textoCarregando : children}
    </button>
  );
}

type PropsLinkBotao = ComponentProps<typeof Link> & {
  variante?: VarianteBotao;
  tamanho?: Tamanho;
  icone?: ReactNode;
};

export function LinkBotao({ variante = "primario", tamanho = "md", icone, className = "", children, ...props }: PropsLinkBotao) {
  return (
    <Link {...props} className={classesBotao(variante, tamanho, className)}>
      {children}
      {icone}
    </Link>
  );
}
