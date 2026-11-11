import Image from "next/image";

/**
 * Marca oficial do Vai de Corte: tesoura dourada + "VAI DE CORTE" em serifa.
 * As imagens ficam em public/marca (fundo transparente, já no dourado #C8A96B do tema).
 * Quem envolve a marca num link deve dar o aria-label; aqui o texto alternativo
 * só nomeia o produto.
 */

/** Tesoura + "VAI DE CORTE" numa linha: cabeçalhos e rodapés. */
export function Marca({ tamanho = "md" }: { tamanho?: "md" | "lg" }) {
  return (
    <Image
      src="/marca/logo-horizontal.png"
      alt="Vai de Corte"
      width={1401}
      height={144}
      priority={tamanho === "md"}
      className={`w-auto max-w-full ${tamanho === "lg" ? "h-8" : "h-[1.125rem] min-[380px]:h-6"}`}
    />
  );
}

/** Logo completa (tesoura em cima, "VAI DE / CORTE" embaixo), para áreas de destaque. */
export function LogoCompleta({ className = "h-28 w-auto" }: { className?: string }) {
  return <Image src="/marca/logo.png" alt="Vai de Corte" width={912} height={720} className={className} />;
}
