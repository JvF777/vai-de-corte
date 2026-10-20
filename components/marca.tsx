/**
 * Marca do Vai de Corte: um traço diagonal (o corte) sobre o "V".
 * Desenhada em SVG para não depender de imagem e herdar a cor do token.
 */
export function SimboloMarca({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <rect width="32" height="32" rx="8" className="fill-ouro" />
      <path d="M9 9.5 16 23l7-13.5" stroke="#17140E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 19.5 24.5 12" stroke="#17140E" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Marca({ tamanho = "md" }: { tamanho?: "md" | "lg" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <SimboloMarca className={tamanho === "lg" ? "size-9" : "size-7"} />
      <span className={`font-titulo font-bold tracking-[-0.01em] text-texto ${tamanho === "lg" ? "text-[1.375rem]" : "text-[1.125rem]"}`}>
        Vai de Corte
      </span>
    </span>
  );
}
