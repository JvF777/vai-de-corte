import type { ComponentProps } from "react";

/** Bloco padrão do painel: fundo de card, borda discreta, sem sombra. */
export function Painel({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-md border border-borda bg-card ${className}`} {...props} />;
}
