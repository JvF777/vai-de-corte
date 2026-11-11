"use client";

import { useId, type ComponentProps, type FocusEvent } from "react";
import { lerPreco } from "@/lib/formatos";

type Props = Omit<ComponentProps<"input">, "type" | "inputMode"> & {
  rotulo: string;
  erro?: string | null;
  dica?: string;
};

const reais = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Campo de preço em reais: mostra "R$" na frente e, ao sair do campo,
 * arruma o valor digitado ("180" vira "180,00", "1500" vira "1.500,00").
 * O servidor lê com lerPreco, que aceita os dois jeitos.
 */
export function CampoPreco({ rotulo, erro, dica, id, className = "", onBlur, ...props }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idDica = dica ? `${idCampo}-dica` : undefined;
  const idErro = erro ? `${idCampo}-erro` : undefined;

  function arrumar(e: FocusEvent<HTMLInputElement>) {
    const centavos = lerPreco(e.currentTarget.value);
    if (centavos !== null) e.currentTarget.value = reais.format(centavos / 100);
    onBlur?.(e);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-label font-medium text-texto-sec">
        {rotulo}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-texto-sec" aria-hidden>
          R$
        </span>
        <input
          id={idCampo}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          onBlur={arrumar}
          aria-invalid={erro ? true : undefined}
          aria-describedby={[idDica, idErro].filter(Boolean).join(" ") || undefined}
          className={`numeros min-h-11 w-full rounded-sm border border-borda-campo bg-superficie pl-10 pr-3 text-base text-texto placeholder:text-texto-disc transition-colors hover:border-texto-disc focus-visible:border-ouro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro/40 aria-invalid:border-erro ${className}`}
          {...props}
        />
      </div>
      {dica && (
        <p id={idDica} className="text-label text-texto-disc">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-label text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
